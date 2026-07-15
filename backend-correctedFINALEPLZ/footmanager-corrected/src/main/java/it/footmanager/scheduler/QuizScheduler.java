package it.footmanager.scheduler;

import it.footmanager.entity.*;
import it.footmanager.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component @RequiredArgsConstructor @Slf4j
public class QuizScheduler {

    private final GiocatoreRepository        giocatoreRepo;
    private final BadgeRepository            badgeRepo;
    private final GiocatoreBadgeRepository   gbRepo;
    private final RispostaGiocatoreRepository rispostaRepo;

    /** Ogni lunedì alle 00:05 assegna badge guadagnati nella settimana */
    @Scheduled(cron = "0 5 0 * * MON", zone = "Europe/Rome")
    @Transactional
    public void assegnaBadgeSettimanali() {
        log.info("Avvio assegnazione badge settimanale...");
        giocatoreRepo.findAll().forEach(g -> {
            long tot = rispostaRepo.countByGiocatore_IdAndCorrettaTrue(g.getId());
            badgeRepo.findBySogliaPuntiLessThanEqualOrderBySogliaPuntiAsc((int) tot).forEach(b -> {
                if (!gbRepo.existsByGiocatore_IdAndBadge_Id(g.getId(), b.getId())) {
                    GiocatoreBadge gb = new GiocatoreBadge();
                    gb.setGiocatore(g); gb.setBadge(b);
                    gbRepo.save(gb);
                    log.info("Badge '{}' assegnato a {}", b.getNomeBadge(), g.getNome());
                }
            });
        });
        log.info("Assegnazione badge completata.");
    }
}
