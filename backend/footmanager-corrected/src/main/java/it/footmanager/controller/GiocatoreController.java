package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.service.GiocatoreService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController 
@RequestMapping("/api/giocatori") 
@RequiredArgsConstructor
public class GiocatoreController {

    private final GiocatoreService svc;

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

    // ── METODO POST MANCANTE AGGIUNTO ──
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GiocatoreDto crea(@RequestBody CreaGiocatoreRequest req) {
        return svc.creaGiocatore(req);
    }
}
