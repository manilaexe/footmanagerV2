package it.footmanager.service;

import it.footmanager.dto.Dtos.*;
import it.footmanager.entity.*;
import it.footmanager.exception.ResourceNotFoundException;
import it.footmanager.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Aggrega i dati per le 4 dashboard di ruolo (Allenatore/Staff, Giocatore,
 * Dirigenza, IT), evitando che il frontend debba fare 5-6 chiamate separate
 * solo per popolare i blocchi in alto di ogni pagina "Dashboard".
 *
 * Riusa deliberatamente i service esistenti (GiocatoreService, QuizService,
 * EventoService, MessaggioService) invece di duplicarne la logica:
 * - il quiz del giorno viene preso da QuizService.quizDiOggi(), lo stesso
 *   flusso già usato dalla pagina giocatore standalone (rotazione
 *   deterministica, un tentativo al giorno, risposta mai rivelata prima);
 * - le statistiche usano lo schema a 3 tabelle (comune/movimento/portiere)
 *   già in uso nel resto del backend.
 *
 * Applicazione a squadra/calendario unico: come nel resto del backend
 * (EventoController, GiocatoreService...) si assume un solo club con un solo
 * calendario attivo (id 1).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final Integer CALENDARIO_ID = 1;
    private static final int     PREVIEW_SIZE  = 5;

    private final GiocatoreRepository           giocatoreRepo;
    private final AllenatoreRepository          allenatoreRepo;
    private final UtenteRepository              utenteRepo;
    private final SquadraRepository             squadraRepo;
    private final EventoRepository              eventoRepo;
    private final MessaggioRepository           messaggioRepo;
    private final QuizRepository                quizRepo;
    private final BadgeRepository               badgeRepo;
    private final GiocatoreBadgeRepository      gbRepo;
    private final StatisticaGiocatoreRepository statGiocatoreRepo;

    private final GiocatoreService  giocatoreService;
    private final QuizService       quizService;
    private final EventoService     eventoService;
    private final MessaggioService  messaggioService;

    // ══════════════════════════════════════════════════════════════════
    // ── ALLENATORE / STAFF ───────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════
    public DashboardAllenatoreDto perAllenatore(String username) {
        // Un utente STAFF potrebbe non avere una riga propria in "allenatore"
        // (quella tabella è pensata principalmente per il mister): in tal caso
        // si degrada elegantemente mostrando i dati a livello di squadra invece
        // di far fallire l'intera dashboard con un 404.
        Integer uid = utenteRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utente: " + username)).getId();
        var allenatoreOpt = allenatoreRepo.findByUtente_Id(uid);

        Integer squadraId = allenatoreOpt.map(Allenatore::getSquadra).map(Squadra::getId)
                .orElseGet(() -> squadraRepo.findAll().stream().findFirst().map(Squadra::getId).orElse(null));

        List<Giocatore> rosaCompleta = squadraId != null ? giocatoreRepo.findBySquadra_Id(squadraId) : List.of();
        List<Evento> prossimi = eventoService.prossimi(CALENDARIO_ID);

        List<RosaRigaDto> rosaPreview = rosaCompleta.stream()
                .limit(PREVIEW_SIZE)
                .map(this::toRosaRiga)
                .toList();

        int messaggiInviati = 0;
        List<MessaggioDto> ultimiMessaggi = List.of();
        if (allenatoreOpt.isPresent()) {
            Integer allId = allenatoreOpt.get().getId();
            messaggiInviati = (int) messaggioRepo.countByAllenatore_Id(allId);
            ultimiMessaggi = messaggioService.msgInviatiDaAllenatore(allId).stream().limit(PREVIEW_SIZE).toList();
        }

        return DashboardAllenatoreDto.builder()
                .numeroGiocatori(rosaCompleta.size())
                .prossimoEvento(prossimi.isEmpty() ? null : eventoService.toDto(prossimi.get(0)))
                .messaggiInviati(messaggiInviati)
                .rosa(rosaPreview)
                .prossimiEventi(prossimi.stream().limit(PREVIEW_SIZE).map(eventoService::toDto).toList())
                .ultimiMessaggi(ultimiMessaggi)
                .build();
    }

    // Dati reali dallo schema statistiche a 3 tabelle (statistica_giocatore
    // è comune a tutti, portiere incluso: presenze e minuti sono sempre lì).
    private RosaRigaDto toRosaRiga(Giocatore g) {
        int presenze = 0, minuti = 0;
        var stat = statGiocatoreRepo.findByGiocatore_Id(g.getId());
        if (stat.isPresent()) { presenze = stat.get().getPresenze(); minuti = stat.get().getMinutiGiocati(); }
        return RosaRigaDto.builder()
                .id(g.getId()).nome(g.getNome()).cognome(g.getCognome())
                .posizione(g.getPosizione()).presenze(presenze).minutiGiocati(minuti)
                .build();
    }

    // ══════════════════════════════════════════════════════════════════
    // ── GIOCATORE ─────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════
    public DashboardGiocatoreDto perGiocatore(String username) {
        Giocatore g = getGiocatoreByUsername(username);
        Integer squadraId = g.getSquadra() != null ? g.getSquadra().getId() : null;

        // Riusa il flusso "quiz del giorno" esistente: stessa domanda per
        // tutti nella giornata, un tentativo al giorno, risposta corretta
        // esposta solo dopo che il giocatore ha già risposto.
        QuizGiornalieroDto quizDelGiorno = quizService.quizDiOggi(g.getId());

        List<MessaggioDto> ricevuti = messaggioService.msgPerGiocatore(g.getId()).stream()
                .limit(PREVIEW_SIZE).toList();

        List<Evento> prossimi = eventoService.prossimi(CALENDARIO_ID);

        List<BadgeDto> badge = gbRepo.findByGiocatore_Id(g.getId()).stream()
                .map(gb -> BadgeDto.builder()
                        .id(gb.getBadge().getId())
                        .nomeBadge(gb.getBadge().getNomeBadge())
                        .sogliaPunti(gb.getBadge().getSogliaPunti())
                        .build())
                .toList();

        return DashboardGiocatoreDto.builder()
                .giocatore(giocatoreService.toDto(g))
                .quizDelGiorno(quizDelGiorno)
                .statistiche(giocatoreService.getStatistiche(g.getId()))
                .messaggiDallAllenatore(ricevuti)
                .prossimiEventi(prossimi.stream().limit(PREVIEW_SIZE).map(eventoService::toDto).toList())
                .classificaSettimanale(squadraId != null ? quizService.classifica(squadraId) : List.of())
                .badgeOttenuti(badge)
                .build();
    }

    // ══════════════════════════════════════════════════════════════════
    // ── DIRIGENZA ─────────────────────────────────────────────────────
    // ══════════════════════════════════════════════════════════════════
    public DashboardDirigenzaDto perDirigenza() {
        // Applicazione mono-squadra: si prende l'unica (o la prima) squadra registrata.
        Integer squadraId = squadraRepo.findAll().stream().findFirst()
                .map(Squadra::getId)
                .orElseThrow(() -> new ResourceNotFoundException("Nessuna squadra configurata nel DB"));

        List<Evento> prossimi = eventoService.prossimi(CALENDARIO_ID);

        return DashboardDirigenzaDto.builder()
                .numeroGiocatori(giocatoreRepo.findBySquadra_Id(squadraId).size())
                .performanceSquadra(giocatoreService.getStatisticheCollettiveSquadra())
                .classificaInterna(quizService.classifica(squadraId))
                .prossimoEvento(prossimi.isEmpty() ? null : eventoService.toDto(prossimi.get(0)))
                .prossimiEventi(prossimi.stream().limit(PREVIEW_SIZE).map(eventoService::toDto).toList())
                .build();
    }

    // ══════════════════════════════════════════════════════════════════
    // ── IT (conteggi generali per il pannello di controllo DB) ─────────
    // ══════════════════════════════════════════════════════════════════
    public DashboardItDto perIt() {
        return DashboardItDto.builder()
                .numeroUtenti(utenteRepo.count())
                .numeroGiocatori(giocatoreRepo.count())
                .numeroAllenatori(allenatoreRepo.count())
                .numeroSquadre(squadraRepo.count())
                .numeroQuiz(quizRepo.count())
                .numeroBadge(badgeRepo.count())
                .numeroMessaggi(messaggioRepo.count())
                .numeroEventi(eventoRepo.count())
                .build();
    }

    // ── Helper condivisi ─────────────────────────────────────────────────
    private Giocatore getGiocatoreByUsername(String username) {
        Integer uid = utenteRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utente: " + username)).getId();
        return giocatoreRepo.findByUtente_Id(uid)
                .orElseThrow(() -> new ResourceNotFoundException("Giocatore per utente: " + username));
    }
}