package it.footmanager.service;

import it.footmanager.dto.Dtos.*;
import it.footmanager.entity.*;
import it.footmanager.exception.*;
import it.footmanager.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class QuizService {

    private final QuizRepository               quizRepo;
    private final RispostaGiocatoreRepository  rispostaRepo;
    private final GiocatoreRepository          giocatoreRepo;
    private final BadgeRepository              badgeRepo;
    private final GiocatoreBadgeRepository     gbRepo;

    @Value("${app.quiz.timeout-seconds}") private int timeoutSec;

    // ═══════════════════════════════════════════════════════════════════════
    // QUIZ DEL GIORNO — gamification: 1 domanda al primo accesso giornaliero
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Restituisce il quiz assegnato per la giornata odierna. La scelta è
     * deterministica (rotazione sull'elenco dei quiz ordinato per id, indice
     * = giorno dell'era % numero di quiz), quindi TUTTI i giocatori vedono
     * la stessa domanda lo stesso giorno, e la domanda cambia ogni giorno
     * ruotando sull'elenco disponibile.
     *
     * Se il giocatore ha già risposto oggi (a qualunque quiz), il DTO
     * riporta l'esito già dato invece delle opzioni da scegliere, così il
     * frontend mostra il risultato invece di riproporre la domanda.
     */
    @Transactional(readOnly = true)
    public QuizGiornalieroDto quizDiOggi(Integer giocatoreId) {
        LocalDate oggi = LocalDate.now();
        Quiz quiz = trovaQuizDelGiorno(oggi);

        LocalDateTime inizioGiorno = oggi.atStartOfDay();
        LocalDateTime fineGiorno   = oggi.plusDays(1).atStartOfDay();

        Optional<RispostaGiocatore> rispostaOggi = rispostaRepo
                .findFirstByGiocatore_IdAndRispostaDataBetweenOrderByRispostaDataDesc(
                        giocatoreId, inizioGiorno, fineGiorno);

        List<String> opzioni = opzioniMescolate(quiz, oggi);

        QuizGiornalieroDto.QuizGiornalieroDtoBuilder b = QuizGiornalieroDto.builder()
                .id(quiz.getId())
                .domanda(quiz.getDomanda())
                .puntiValore(quiz.getPuntiValore())
                .opzioni(opzioni);

        if (rispostaOggi.isPresent()) {
            RispostaGiocatore r = rispostaOggi.get();
            b.giaRisposto(true)
             .rispostaCorretta(r.isCorretta())
             .rispostaScelta(null) // il testo esatto scelto non è persistito separatamente; l'esito basta alla UI
             .soluzioneTesto(quiz.getTestoRispostaCorretta());
        } else {
            b.giaRisposto(false);
        }

        return b.build();
    }

    /**
     * Registra la risposta del giocatore al quiz di OGGI. Il quiz non viene
     * scelto dal client (che potrebbe manomettere il quizId per rispondere
     * a domande già note): viene sempre ricalcolato lato server con la
     * stessa rotazione deterministica usata da quizDiOggi().
     *
     * Applica il vincolo "un tentativo al giorno": se il giocatore ha già
     * risposto oggi (a qualunque quiz) la richiesta viene rifiutata.
     * Se la risposta è corretta, i punti vengono sommati a punti_totali e
     * punti_settimanali del giocatore (in precedenza calcolati ma mai
     * salvati) e vengono verificati eventuali nuovi badge.
     */
    public RispostaQuizResponse rispondiOggi(RispondiQuizGiornalieroRequest req, Integer giocatoreId) {
        if (req.getSecondiImpiegati() > timeoutSec)
            throw new BadRequestException("Tempo scaduto (" + timeoutSec + "s)");

        LocalDate oggi = LocalDate.now();
        LocalDateTime inizioGiorno = oggi.atStartOfDay();
        LocalDateTime fineGiorno   = oggi.plusDays(1).atStartOfDay();

        if (rispostaRepo.existsByGiocatore_IdAndRispostaDataBetween(giocatoreId, inizioGiorno, fineGiorno))
            throw new BadRequestException("Hai già risposto al quiz di oggi. Torna domani!");

        Quiz quiz = trovaQuizDelGiorno(oggi);

        Giocatore g = giocatoreRepo.findById(giocatoreId)
                .orElseThrow(() -> new ResourceNotFoundException("Giocatore", Long.valueOf(giocatoreId)));

        // Confronto sul TESTO: risposta_corretta nel DB è una lettera (A/B/C),
        // va risolta nel testo dell'opzione corrispondente prima di confrontare
        // con ciò che il giocatore ha effettivamente selezionato in UI.
        String testoCorretto = quiz.getTestoRispostaCorretta();
        boolean corretta = testoCorretto != null
                && testoCorretto.equalsIgnoreCase(req.getRispostaScelta().trim());

        RispostaGiocatore rg = new RispostaGiocatore();
        rg.setGiocatore(g);
        rg.setQuiz(quiz);
        rg.setCorretta(corretta);   // sincronizza anche la colonna legacy "esito"
        rg.setSecondiImpiegati(req.getSecondiImpiegati());
        rispostaRepo.save(rg);

        int puntiAssegnati = corretta ? quiz.getPuntiValore() : 0;

        // I punti calcolati vanno effettivamente salvati sul giocatore
        // (prima venivano solo restituiti nella response, mai persistiti).
        if (puntiAssegnati > 0) {
            g.setPunti_totali((g.getPunti_totali() == null ? 0 : g.getPunti_totali()) + puntiAssegnati);
            g.setPunti_settimanali((g.getPunti_settimanali() == null ? 0 : g.getPunti_settimanali()) + puntiAssegnati);
            giocatoreRepo.save(g);
        }

        List<BadgeDto> nuoviBadge = corretta ? verificaBadge(g) : List.of();

        return RispostaQuizResponse.builder()
                .corretta(corretta)
                .puntiAssegnati(puntiAssegnati)
                .nuoviBadge(nuoviBadge)
                .rispostaCorretta(testoCorretto)
                .puntiTotali(g.getPunti_totali())
                .puntiSettimanali(g.getPunti_settimanali())
                .build();
    }

    /** Rotazione deterministica: stesso giorno → stesso quiz per tutti. */
    private Quiz trovaQuizDelGiorno(LocalDate data) {
        List<Quiz> tutti = quizRepo.findAllByOrderByIdAsc();
        if (tutti.isEmpty())
            throw new ResourceNotFoundException("Nessuna domanda quiz disponibile nel database");
        long epochDay = data.toEpochDay();
        int indice = (int) (Math.floorMod(epochDay, tutti.size()));
        return tutti.get(indice);
    }

    /**
     * Mescola le 3 opzioni con un ordine deterministico per (quiz, giorno):
     * stesso ordine per tutta la giornata (niente "salti" a ogni refresh),
     * ma cambia il giorno successivo o con un'altra domanda.
     */
    private List<String> opzioniMescolate(Quiz quiz, LocalDate oggi) {
        // Le 3 opzioni testuali reali: opzione_a, opzione_b (opzione2), opzione_c (opzione3).
        // NON usare risposta_corretta qui: è la lettera 'A'/'B'/'C', non un testo.
        List<String> opzioni = new ArrayList<>(List.of(
                quiz.getOpzioneA(), quiz.getOpzione2(), quiz.getOpzione3()));
        long seed = oggi.toEpochDay() * 31L + quiz.getId();
        Collections.shuffle(opzioni, new Random(seed));
        return opzioni;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Endpoint "legacy" — lista completa quiz, usati per viste admin/staff.
    // Il flusso giocatore usa SOLO quizDiOggi()/rispondiOggi() qui sopra.
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<QuizDto> tutti(Integer giocatoreId) {
        return quizRepo.findAll().stream()
                .map(q -> toDto(q, rispostaRepo.existsByGiocatore_IdAndQuiz_Id(giocatoreId, q.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public QuizDto getQuiz(Integer quizId, Integer giocatoreId) {
        Quiz q = quizRepo.findById(quizId)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz", Long.valueOf(quizId)));
        return toDto(q, rispostaRepo.existsByGiocatore_IdAndQuiz_Id(giocatoreId, quizId));
    }

    public RispostaQuizResponse rispondi(RispostaQuizRequest req, Integer giocatoreId) {
        if (req.getSecondiImpiegati() > timeoutSec)
            throw new BadRequestException("Tempo scaduto (" + timeoutSec + "s)");

        Quiz quiz = quizRepo.findById(req.getQuizId())
                .orElseThrow(() -> new ResourceNotFoundException("Quiz", Long.valueOf(req.getQuizId())));

        if (rispostaRepo.existsByGiocatore_IdAndQuiz_Id(giocatoreId, quiz.getId()))
            throw new BadRequestException("Hai già risposto a questo quiz");

        Giocatore g = giocatoreRepo.findById(giocatoreId)
                .orElseThrow(() -> new ResourceNotFoundException("Giocatore", Long.valueOf(giocatoreId)));

        String testoCorretto = quiz.getTestoRispostaCorretta();
        boolean corretta = testoCorretto != null
                && testoCorretto.equalsIgnoreCase(req.getRispostaScelta().trim());

        RispostaGiocatore rg = new RispostaGiocatore();
        rg.setGiocatore(g); rg.setQuiz(quiz);
        rg.setCorretta(corretta);
        rg.setSecondiImpiegati(req.getSecondiImpiegati());
        rispostaRepo.save(rg);

        int puntiAssegnati = corretta ? quiz.getPuntiValore() : 0;
        if (puntiAssegnati > 0) {
            g.setPunti_totali((g.getPunti_totali() == null ? 0 : g.getPunti_totali()) + puntiAssegnati);
            g.setPunti_settimanali((g.getPunti_settimanali() == null ? 0 : g.getPunti_settimanali()) + puntiAssegnati);
            giocatoreRepo.save(g);
        }

        List<BadgeDto> nuoviBadge = corretta ? verificaBadge(g) : List.of();

        return RispostaQuizResponse.builder()
                .corretta(corretta).puntiAssegnati(puntiAssegnati).nuoviBadge(nuoviBadge)
                .rispostaCorretta(testoCorretto)
                .puntiTotali(g.getPunti_totali())
                .puntiSettimanali(g.getPunti_settimanali())
                .build();
    }

    @Transactional(readOnly = true)
    public List<ClassificaItemDto> classifica(Integer squadraId) {
        List<Giocatore> lista = giocatoreRepo.findBySquadra_Id(squadraId);
        List<ClassificaItemDto> result = new ArrayList<>();
        for (Giocatore g : lista) {
            long risp = rispostaRepo.countByGiocatore_IdAndCorrettaTrue(g.getId());
            result.add(ClassificaItemDto.builder()
                    .giocatoreId(g.getId()).nome(g.getNome()).cognome(g.getCognome())
                    .risposteCorrette(risp)
                    .puntiSettimanali(g.getPunti_settimanali())
                    .puntiTotali(g.getPunti_totali())
                    .build());
        }
        result.sort(Comparator.comparingLong(ClassificaItemDto::getRisposteCorrette).reversed());
        for (int i = 0; i < result.size(); i++) result.get(i).setPosizione(i + 1);
        return result;
    }

    private List<BadgeDto> verificaBadge(Giocatore g) {
        long tot = rispostaRepo.countByGiocatore_IdAndCorrettaTrue(g.getId());
        List<BadgeDto> nuovi = new ArrayList<>();
        for (Badge b : badgeRepo.findBySogliaPuntiLessThanEqualOrderBySogliaPuntiAsc((int) tot)) {
            if (!gbRepo.existsByGiocatore_IdAndBadge_Id(g.getId(), b.getId())) {
                GiocatoreBadge gb = new GiocatoreBadge();
                gb.setGiocatore(g); gb.setBadge(b);
                gbRepo.save(gb);
                nuovi.add(
                    BadgeDto.builder()
                        .id(b.getId())
                        .nomeBadge(b.getNomeBadge())
                        .sogliaPunti(b.getSogliaPunti())
                        .build());
            }
        }
        return nuovi;
    }

    private QuizDto toDto(Quiz q, boolean giaRisposto) {
        return QuizDto.builder().id(q.getId()).domanda(q.getDomanda())
                .rispostaCorretta(q.getTestoRispostaCorretta())
                .opzioneA(q.getOpzioneA())
                .opzione2(q.getOpzione2()).opzione3(q.getOpzione3())
                .puntiValore(q.getPuntiValore()).giaRisposto(giaRisposto).build();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PANNELLO ADMIN (STAFF/IT) — CRUD domande quiz.
    // Oggi l'unico modo per aggiungere/correggere/eliminare una domanda è una
    // query SQL a mano; questi metodi permettono di farlo dall'app. Scrivono
    // sempre la LETTERA (A/B/C) in risposta_corretta, mai il testo — è lo
    // stesso formato già usato da quizDiOggi()/rispondiOggi() qui sopra, così
    // una domanda creata da qui funziona subito con la gamification esistente.
    // ═══════════════════════════════════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<QuizAdminDto> tuttiAdmin() {
        return quizRepo.findAllByOrderByIdAsc().stream().map(this::toAdminDto).toList();
    }

    public QuizAdminDto creaAdmin(CreaQuizRequest req) {
        Quiz q = new Quiz();
        applicaRequestAdmin(q, req);
        return toAdminDto(quizRepo.save(q));
    }

    public QuizAdminDto aggiornaAdmin(Integer id, CreaQuizRequest req) {
        Quiz q = quizRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz", Long.valueOf(id)));
        applicaRequestAdmin(q, req);
        return toAdminDto(quizRepo.save(q));
    }

    // L'eliminazione di una domanda ancora "in rotazione" per il quiz del
    // giorno è consentita: trovaQuizDelGiorno() ricalcola la rotazione sulla
    // lista rimanente al prossimo accesso, non tiene riferimenti stantii.
    public void eliminaAdmin(Integer id) {
        if (!quizRepo.existsById(id))
            throw new ResourceNotFoundException("Quiz", Long.valueOf(id));
        quizRepo.deleteById(id);
    }

    private void applicaRequestAdmin(Quiz q, CreaQuizRequest req) {
        q.setDomanda(req.getDomanda());
        q.setOpzioneA(req.getOpzioneA());
        q.setOpzione2(req.getOpzioneB());
        q.setOpzione3(req.getOpzioneC());
        q.setRisposta_corretta(req.getRispostaCorretta().trim().toUpperCase());
        q.setPuntiValore(req.getPuntiValore());
    }

    private QuizAdminDto toAdminDto(Quiz q) {
        return QuizAdminDto.builder()
                .id(q.getId()).domanda(q.getDomanda())
                .opzioneA(q.getOpzioneA()).opzioneB(q.getOpzione2()).opzioneC(q.getOpzione3())
                .rispostaCorretta(q.getRisposta_corretta())
                .puntiValore(q.getPuntiValore())
                .build();
    }
}