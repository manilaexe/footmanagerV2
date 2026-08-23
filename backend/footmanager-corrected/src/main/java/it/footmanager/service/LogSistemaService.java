package it.footmanager.service;

import it.footmanager.dto.Dtos.LogSistemaDto;
import it.footmanager.entity.LogSistema;
import it.footmanager.repository.LogSistemaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class LogSistemaService {

    @Autowired
    private LogSistemaRepository logRepository;

    // =========================================================================
    // METODO COMPLETO CON RUOLO (7 Parametri)
    // =========================================================================
    public void registraLog(String livello, String modulo, String azione, String dettagli, String utente, String ruolo, String ipAddress) {
        try {
            LogSistema log = new LogSistema();
            log.setTimestamp(LocalDateTime.now());
            log.setLivello(livello);
            log.setModulo(modulo);
            log.setAzione(azione);
            log.setDettagli(dettagli);
            log.setUtente(utente != null ? utente : "ANONIMO");
            log.setRuolo(ruolo); // Valorizza il campo ruolo
            log.setIpAddress(ipAddress != null ? ipAddress : "127.0.0.1");

            logRepository.save(log);
        } catch (Exception e) {
            System.err.println("Errore durante il salvataggio del log: " + e.getMessage());
        }
    }

    // Overload per chiamate a 6 parametri (senza ruolo specificato)
    public void registraLog(String livello, String modulo, String azione, String dettagli, String utente, String ipAddress) {
        registraLog(livello, modulo, azione, dettagli, utente, null, ipAddress);
    }

    // Overload a 4 parametri (per chiamate di sistema)
    public void registraLog(String livello, String modulo, String azione, String dettagli) {
        registraLog(livello, modulo, azione, dettagli, "SISTEMA", null, "127.0.0.1");
    }

    // Scorciatoie
    public void info(String modulo, String azione, String dettagli) {
        registraLog("INFO", modulo, azione, dettagli);
    }

    public void warn(String modulo, String azione, String dettagli) {
        registraLog("WARN", modulo, azione, dettagli);
    }

    public void error(String modulo, String azione, String dettagli) {
        registraLog("ERROR", modulo, azione, dettagli);
    }

    public Page<LogSistemaDto> getLogs(int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("timestamp").descending());
        return logRepository.findAll(pageRequest).map(this::toDto);
    }

    private LogSistemaDto toDto(LogSistema entity) {
        return LogSistemaDto.builder()
                .id(entity.getId())
                .timestamp(entity.getTimestamp())
                .livello(entity.getLivello())
                .modulo(entity.getModulo())
                .azione(entity.getAzione())
                .dettagli(entity.getDettagli())
                .utente(entity.getUtente())
                .ruolo(entity.getRuolo())
                .ipAddress(entity.getIpAddress())
                .build();
    }
}