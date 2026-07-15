package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.service.EventoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/eventi") @RequiredArgsConstructor
public class EventoController {
    private final EventoService svc;

    @GetMapping("/calendario/{id}")
    public List<EventoDto> byCalendario(@PathVariable Integer id) { return svc.findByCalendario(id); }

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','IT')")
    public ResponseEntity<EventoDto> crea(@Valid @RequestBody CreaEventoRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.crea(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','IT')")
    public EventoDto aggiorna(@PathVariable Integer id, @Valid @RequestBody CreaEventoRequest req) {
        return svc.aggiorna(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','IT')")
    public ResponseEntity<Void> elimina(@PathVariable Integer id) {
        svc.elimina(id); return ResponseEntity.noContent().build();
    }
}
