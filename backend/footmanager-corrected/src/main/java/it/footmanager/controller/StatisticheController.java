package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.service.GiocatoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController 
@RequestMapping("/api/statistiche") 
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Evita blocchi CORS se frontend e backend sono su porte diverse
public class StatisticheController {
    
    private final GiocatoreService svc;

    @GetMapping("/giocatore/{id}")
    public StatisticheDto get(@PathVariable Integer id) { 
        return svc.getStatistiche(id); 
    }

    @PutMapping("/giocatore/{id}")
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','IT')")
    public StatisticheDto update(@PathVariable Integer id, @RequestBody AggiornaStatisticheRequest req) {
        return svc.aggiornaStatistiche(id, req);
    }

    // ── NUOVO: Endpoint per i grafici e KPI della squadra ──
    @GetMapping("/squadra")
    public ResponseEntity<SquadraStatsResponse> getStatisticheSquadra() {
        return ResponseEntity.ok(svc.getStatisticheCollettiveSquadra());
    }

    // ── NUOVO: Endpoint per la tabella comparativa e Radar Chart dei giocatori ──
    @GetMapping("/giocatori")
    public ResponseEntity<List<GiocatoreCompletoStatsDto>> getStatisticheTuttiGiocatori() {
        return ResponseEntity.ok(svc.getStatisticheTuttiGiocatori());
    }
}
