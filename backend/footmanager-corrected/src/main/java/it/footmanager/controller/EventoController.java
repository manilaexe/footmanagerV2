package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.service.EventoService;
import it.footmanager.service.LogSistemaService; // Aggiunto
import jakarta.servlet.http.HttpServletRequest; // Aggiunto
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal; // Aggiunto
import org.springframework.security.core.userdetails.UserDetails; // Aggiunto
import org.springframework.web.bind.annotation.*;
import java.time.YearMonth;
import java.util.List;

@RestController @RequestMapping("/api/eventi") @RequiredArgsConstructor
@CrossOrigin(origins="*")
public class EventoController {
    private final EventoService svc;
    private final LogSistemaService logService; // Iniezione LogService

    @GetMapping("/calendario/{id}")
    public List<EventoDto> byCalendario(@PathVariable Integer id) { return svc.findByCalendario(id); }

    @GetMapping("/calendario/{id}/riepilogo")
    public CalendarioRiepilogoDto riepilogo(
            @PathVariable Integer id,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth mese) {
        return svc.riepilogo(id, mese);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','IT')")
    public ResponseEntity<EventoDto> crea(@Valid @RequestBody CreaEventoRequest req, @AuthenticationPrincipal UserDetails ud, HttpServletRequest request) {
        EventoDto dto = svc.crea(req);
        // Log: Creazione evento (utilizzando req.getTipo())
        logService.registraLog("INFO", "Calendario", "CREATE_EVENTO", "Pianificato nuovo evento tipo: " + req.getTipo(), ud.getUsername(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','IT')")
    public EventoDto aggiorna(@PathVariable Integer id, @Valid @RequestBody CreaEventoRequest req, @AuthenticationPrincipal UserDetails ud, HttpServletRequest request) { // Aggiunti UserDetails e request
        EventoDto dto = svc.aggiorna(id, req);
        // Log: Aggiornamento evento
        logService.registraLog("INFO", "Calendario", "UPDATE_EVENTO", "Modificato evento ID: " + id, ud.getUsername(), request.getRemoteAddr());
        return dto;
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','IT')")
    public ResponseEntity<Void> elimina(@PathVariable Integer id, @AuthenticationPrincipal UserDetails ud, HttpServletRequest request) { // Aggiunti UserDetails e request
        svc.elimina(id);
        // Log: Eliminazione evento
        logService.registraLog("WARN", "Calendario", "DELETE_EVENTO", "Annullato/Eliminato evento ID: " + id, ud.getUsername(), request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}