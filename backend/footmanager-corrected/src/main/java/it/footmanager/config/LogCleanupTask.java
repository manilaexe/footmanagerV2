package it.footmanager.config;

import it.footmanager.repository.LogSistemaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@EnableScheduling
public class LogCleanupTask {

    @Autowired
    private LogSistemaRepository logRepo;

    @Scheduled(cron = "0 0 3 * * ?") // 03:00 di notte
    public void pulisciLogVecchi() {
        LocalDateTime limite = LocalDateTime.now().minusDays(90);
        int eliminati = logRepo.deleteLogsOlderThan(limite);
        System.out.println("Pulizia Log completata. Eliminati " + eliminati + " record precedenti al " + limite);
    }
}