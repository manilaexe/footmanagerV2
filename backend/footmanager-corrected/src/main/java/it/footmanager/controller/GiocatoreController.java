package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.service.GiocatoreService;
import it.footmanager.service.LogSistemaService; // Aggiunto
import jakarta.servlet.http.HttpServletRequest; // Aggiunto
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController 
@RequestMapping("/api/giocatori") 
@RequiredArgsConstructor
public class GiocatoreController {

    private final GiocatoreService svc;
    private final LogSistemaService logService; // Iniezione LogService

    @GetMapping("/me")
    public GiocatoreDto me(@AuthenticationPrincipal UserDetails ud) {
        return svc.findMyProfile(ud.getUsername());
    }

    @GetMapping("/squadra/{squadraId}")
    public List<GiocatoreDto> bySquadra(@PathVariable Integer squadraId) { 
        return svc.findBySquadra(squadraId); 
    }

    @GetMapping("/{id}")
    public GiocatoreDto byId(@PathVariable Integer id) { 
        return svc.findById(id); 
    }

    @GetMapping("/squadra/{squadraId}/top-marcatori")
    public List<GiocatoreDto> top(@PathVariable Integer squadraId) { 
        return svc.topMarcatori(squadraId); 
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GiocatoreDto crea(@RequestBody CreaGiocatoreRequest req, @AuthenticationPrincipal UserDetails ud, HttpServletRequest request) { // Aggiunti UserDetails e request
        GiocatoreDto dto = svc.creaGiocatore(req);
        // Log: Creazione giocatore
        logService.registraLog("INFO", "Rosa", "CREATE_GIOCATORE", "Inserito nuovo giocatore in rosa", ud.getUsername(), request.getRemoteAddr());
        return dto;
    }

    @PutMapping("/{id}")
    public GiocatoreDto aggiorna(@PathVariable Integer id, @RequestBody CreaGiocatoreRequest req, @AuthenticationPrincipal UserDetails ud, HttpServletRequest request) { // Aggiunti UserDetails e request
        GiocatoreDto dto = svc.aggiornaGiocatore(id, req);
        // Log: Modifica giocatore
        logService.registraLog("INFO", "Rosa", "UPDATE_GIOCATORE", "Aggiornati dati anagrafici giocatore ID: " + id, ud.getUsername(), request.getRemoteAddr());
        return dto;
    }
}