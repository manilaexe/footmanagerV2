package it.footmanager.service;

import it.footmanager.dto.Dtos.*;
import it.footmanager.entity.*;
import it.footmanager.exception.*;
import it.footmanager.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class QuizService {

    private final QuizRepository               quizRepo;
    private final RispostaGiocatoreRepository  rispostaRepo;
    private final GiocatoreRepository          giocatoreRepo;
    private final BadgeRepository              badgeRepo;
    private final GiocatoreBadgeRepository     gbRepo;

    @Value("${app.quiz.timeout-seconds}") private int timeoutSec;

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

        // Confronto testuale con la risposta corretta
        boolean corretta = quiz.getRisposta_corretta().equalsIgnoreCase(req.getRispostaScelta().trim());

        RispostaGiocatore rg = new RispostaGiocatore();
        rg.setGiocatore(g); rg.setQuiz(quiz);
        rg.setCorretta(corretta);
        rg.setSecondiImpiegati(req.getSecondiImpiegati());
        rispostaRepo.save(rg);

        int puntiAssegnati = corretta ? quiz.getPuntiValore() : 0;
        List<BadgeDto> nuoviBadge = corretta ? verificaBadge(g) : List.of();

        return RispostaQuizResponse.builder()
                .corretta(corretta).puntiAssegnati(puntiAssegnati).nuoviBadge(nuoviBadge).build();
    }

    @Transactional(readOnly = true)
    public List<ClassificaItemDto> classifica(Integer squadraId) {
        List<Giocatore> lista = giocatoreRepo.findBySquadra_Id(squadraId);
        List<ClassificaItemDto> result = new ArrayList<>();
        for (Giocatore g : lista) {
            long risp = rispostaRepo.countByGiocatore_IdAndCorrettaTrue(g.getId());
            result.add(ClassificaItemDto.builder()
                    .giocatoreId(g.getId()).nome(g.getNome()).cognome(g.getCognome())
                    .risposteCorrette(risp).build());
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
                .rispostaCorretta(q.getRisposta_corretta())
                .opzione2(q.getOpzione2()).opzione3(q.getOpzione3())
                .puntiValore(q.getPuntiValore()).giaRisposto(giaRisposto).build();
    }
}
