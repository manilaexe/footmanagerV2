package it.footmanager.controller;

import it.footmanager.dto.Dtos.LogSistemaDto;
import it.footmanager.service.LogSistemaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "*") // Permette le richieste da Live Server (porta 5500)
@PreAuthorize("hasAnyRole('IT', 'STAFF')")
public class LogSistemaController {

    @Autowired
    private LogSistemaService logService;

    @GetMapping
    public ResponseEntity<Page<LogSistemaDto>> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        return ResponseEntity.ok(logService.getLogs(page, size));
    }
}