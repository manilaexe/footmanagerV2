package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.service.EventoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.YearMonth;
import java.util.List;

@RestController @RequestMapping("/api/eventi") @RequiredArgsConstructor
@CrossOrigin(origins="*")
public class EventoController {
    private final EventoService svc;

    @GetMapping("/calendario/{id}")
    public List<EventoDto> byCalendario(@PathVariable Integer id) { return svc.findByCalendario(id); }

    // Blocco riassuntivo in alto della pagina Calendario: numero eventi del
    // mese (con scomposizione per tipo), prossimi eventi, prossima partita.
    // "mese" opzionale, formato yyyy-MM: se assente si usa il mese corrente.
    @GetMapping("/calendario/{id}/riepilogo")
    public CalendarioRiepilogoDto riepilogo(
            @PathVariable Integer id,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth mese) {
        return svc.riepilogo(id, mese);
    }

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