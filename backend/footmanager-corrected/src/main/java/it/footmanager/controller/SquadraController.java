package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.service.SquadraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Il path /api/squadre/** è configurato in SecurityConfig:
 * GET aperto a chiunque sia autenticato, scritture riservate a STAFF/IT.
 */
@RestController
@RequestMapping("/api/squadre")
@RequiredArgsConstructor
public class SquadraController {

    private final SquadraService svc;

    @GetMapping
    public List<SquadraDto> tutte() { return svc.tutte(); }

    @GetMapping("/{id}")
    public SquadraDto una(@PathVariable Integer id) { return svc.una(id); }

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<SquadraDto> crea(@Valid @RequestBody CreaSquadraRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.crea(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public SquadraDto aggiorna(@PathVariable Integer id, @Valid @RequestBody CreaSquadraRequest req) {
        return svc.aggiorna(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<Void> elimina(@PathVariable Integer id) {
        svc.elimina(id);
        return ResponseEntity.noContent().build();
    }
}