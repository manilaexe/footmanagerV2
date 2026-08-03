package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.service.BadgeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Il path /api/badge/** è già configurato in SecurityConfig:
 * GET aperto a chiunque sia autenticato, scritture riservate a STAFF/IT.
 */
@RestController
@RequestMapping("/api/badge")
@RequiredArgsConstructor
public class BadgeController {

    private final BadgeService svc;

    // Elenco di tutti i badge disponibili (usato dal pannello IT e dalla
    // vista "Classifica" del giocatore per mostrare i badge non ancora ottenuti)
    @GetMapping
    public List<BadgeDto> tutti() {
        return svc.tutti();
    }

    // Badge già ottenuti da un giocatore specifico
    @GetMapping("/giocatore/{giocatoreId}")
    public List<GiocatoreBadgeDto> perGiocatore(@PathVariable Integer giocatoreId) {
        return svc.perGiocatore(giocatoreId);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<BadgeDto> crea(@Valid @RequestBody CreaBadgeRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.crea(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public BadgeDto aggiorna(@PathVariable Integer id, @Valid @RequestBody CreaBadgeRequest req) {
        return svc.aggiorna(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<Void> elimina(@PathVariable Integer id) {
        svc.elimina(id);
        return ResponseEntity.noContent().build();
    }
}