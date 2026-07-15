package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.service.UtenteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/utenti") @RequiredArgsConstructor
public class UtenteController {
    private final UtenteService svc;

    @GetMapping
    public List<UtenteDto> findAll() { return svc.findAll(); }

    @GetMapping("/{id}")
    public UtenteDto findById(@PathVariable Integer id) { return svc.findById(id); }

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<UtenteDto> crea(@Valid @RequestBody CreaUtenteRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.crea(req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<Void> elimina(@PathVariable Integer id) {
        svc.elimina(id); return ResponseEntity.noContent().build();
    }
}
