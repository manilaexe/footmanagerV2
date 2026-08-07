package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.service.GiocatoreService;
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

    // ── GET /api/giocatori/me ──────────────────────────────────────────────
    // Profilo del giocatore autenticato (usato dalla card in alto della
    // dashboard giocatore). Il giocatore è sempre risolto dal token JWT,
    // non da un id passato dal client.
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
    public GiocatoreDto crea(@RequestBody CreaGiocatoreRequest req) {
        return svc.creaGiocatore(req);
    }

    // ── PUT /api/giocatori/{id} ─────────────────────────────────────────────
    // Aggiorna i dati anagrafici di un giocatore esistente (nome, cognome,
    // numero, posizione, piede, nazionalità, altezza, peso, data nascita).
    // Permessi già garantiti da SecurityConfig sulla regola generale
    // "/api/giocatori/**" per i metodi non-GET: STAFF, ALLENATORE, IT.
    @PutMapping("/{id}")
    public GiocatoreDto aggiorna(@PathVariable Integer id, @RequestBody CreaGiocatoreRequest req) {
        return svc.aggiornaGiocatore(id, req);
    }
}