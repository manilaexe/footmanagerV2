package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * Un endpoint per ogni dashboard di ruolo: evita che ciascuna pagina
 * "Dashboard" debba fare 5-6 chiamate separate solo per riempire i blocchi
 * riassuntivi in alto/centro pagina.
 *
 * Il path /api/dashboard/** è già .authenticated() in SecurityConfig; il
 * controllo puntuale per ruolo avviene qui con @PreAuthorize, come per gli
 * altri controller del progetto (MessaggioController, QuizController...).
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService svc;

    @GetMapping("/allenatore")
    @PreAuthorize("hasAnyRole('ALLENATORE','STAFF','IT')")
    public DashboardAllenatoreDto allenatore(@AuthenticationPrincipal UserDetails ud) {
        return svc.perAllenatore(ud.getUsername());
    }

    @GetMapping("/giocatore")
    @PreAuthorize("hasRole('GIOCATORE')")
    public DashboardGiocatoreDto giocatore(@AuthenticationPrincipal UserDetails ud) {
        return svc.perGiocatore(ud.getUsername());
    }

    @GetMapping("/dirigenza")
    @PreAuthorize("hasAnyRole('DIRIGENZA','IT')")
    public DashboardDirigenzaDto dirigenza() {
        return svc.perDirigenza();
    }

    @GetMapping("/it")
    @PreAuthorize("hasRole('IT')")
    public DashboardItDto it() {
        return svc.perIt();
    }
}