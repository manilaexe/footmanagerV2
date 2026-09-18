package it.footmanager.controller;

import it.footmanager.dto.PerformanceDtos.*;
import it.footmanager.external.FootballJsonClient;
//import it.footmanager.service.ImportCalendarioService;
import it.footmanager.service.LogSistemaService;
import it.footmanager.service.SerieAStatsService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Tutti gli endpoint che espongono dati provenienti dall'API esterna.
 * Il frontend chiama SEMPRE questo controller, mai GitHub direttamente:
 * cosi' evitiamo problemi di CORS e i calcoli li facciamo una volta sola.
 */
@RestController
@RequestMapping("/api/esterno")
@RequiredArgsConstructor
public class EsternoController {

    private final SerieAStatsService      statsService;
    //private final ImportCalendarioService importService;
    private final FootballJsonClient      client;
    private final LogSistemaService       logService;

    /** Classifica Serie A completa, calcolata dai risultati reali. */
    @GetMapping("/classifica")
    public List<RigaClassificaDto> classifica() {
        return statsService.classificaCompleta();
    }

    /** Tutti i dati della pagina "Performance squadra" in una sola chiamata. */
    @GetMapping("/performance-squadra")
    public PerformanceSquadraDto performance() {
        return statsService.performanceSquadra();
    }

    /** Elenco grezzo delle partite della nostra squadra (anteprima import). */
    @GetMapping("/partite")
    public List<MatchEsternoDto> partite() {
        return statsService.partiteSquadra();
    }

    /** Forza il riscaricamento del JSON ignorando la cache. */
    @PostMapping("/refresh")
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','IT')")
    public String refresh() {
        client.svuotaCache();
        client.scaricaStagione();
        return "Dati Serie A ricaricati da " + client.urlCorrente();
    }

    /**
     * Importa nel calendario interno le partite prese dall'API.
     * Riservato a chi puo' gia' creare eventi (STAFF / ALLENATORE / IT),
     * esattamente come POST /api/eventi.
    
    @PostMapping("/importa-calendario")
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','IT')")
    public ImportCalendarioDto importaCalendario(
            @RequestParam Integer calendarioId,
            @RequestParam(defaultValue = "true") boolean soloFuture,
            @AuthenticationPrincipal UserDetails ud,
            HttpServletRequest request) {

        ImportCalendarioDto esito = importService.importa(calendarioId, soloFuture);

        logService.registraLog("INFO", "Calendario", "IMPORT_API",
                "Importate " + esito.getEventiCreati() + " partite da football.json",
                ud != null ? ud.getUsername() : "sistema",
                request.getRemoteAddr());

        return esito;
    } */
}
