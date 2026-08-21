package it.footmanager.service;

import it.footmanager.dto.Dtos.LogSistemaDto;
import it.footmanager.entity.LogSistema;
import it.footmanager.repository.LogSistemaRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;


@Service
public class LogSistemaService {

    @Autowired
    private LogSistemaRepository logRepo;

    public void info(String utente, String ruolo, String modulo, String azione, String dettagli) {
        saveLog("INFO", utente, ruolo, modulo, azione, dettagli);
    }

    public void warn(String utente, String ruolo, String modulo, String azione, String dettagli) {
        saveLog("WARN", utente, ruolo, modulo, azione, dettagli);
    }

    public void error(String utente, String ruolo, String modulo, String azione, String dettagli) {
        saveLog("ERROR", utente, ruolo, modulo, azione, dettagli);
    }

    private void saveLog(String livello, String utente, String ruolo, String modulo, String azione, String dettagli) {
        String ipAddress = getClientIp();
        LogSistema log = new LogSistema(livello, utente, ruolo, modulo, azione, dettagli, ipAddress);
        logRepo.save(log);
    }


    public Page<LogSistemaDto> getLogs(int page, int size) {
        return logRepo.findAllByOrderByTimestampDesc(PageRequest.of(page, size))
            .map(log -> LogSistemaDto.builder()
                .id(log.getId())
                .timestamp(log.getTimestamp())
                .livello(log.getLivello())
                .utente(log.getUtente())
                .ruolo(log.getRuolo())
                .modulo(log.getModulo())
                .azione(log.getAzione())
                .dettagli(log.getDettagli())
                .ipAddress(log.getIpAddress())
                .build()
            );
    }

    private String getClientIp() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String xForwardedFor = request.getHeader("X-Forwarded-For");
                if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
                    return xForwardedFor.split(",")[0];
                }
                return request.getRemoteAddr();
            }
        } catch (Exception e) {
            // Nessun contesto web (es. task schedulati interni)
        }
        return "SYSTEM";
    }
}