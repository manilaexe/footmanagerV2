package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.service.GiocatoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/statistiche") @RequiredArgsConstructor
public class StatisticheController {
    private final GiocatoreService svc;

    @GetMapping("/giocatore/{id}")
    public StatisticheDto get(@PathVariable Integer id) { return svc.getStatistiche(id); }

    @PutMapping("/giocatore/{id}")
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','IT')")
    public StatisticheDto update(@PathVariable Integer id, @RequestBody AggiornaStatisticheRequest req) {
        return svc.aggiornaStatistiche(id, req);
    }
}
