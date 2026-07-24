package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.repository.AllenatoreRepository;
import it.footmanager.repository.GiocatoreRepository;
import it.footmanager.repository.UtenteRepository;
import it.footmanager.service.MessaggioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/messaggi")
@RequiredArgsConstructor
public class MessaggioController {

    private final MessaggioService     svc;
    private final GiocatoreRepository  giocatoreRepo;
    private final AllenatoreRepository allenatoreRepo;
    private final UtenteRepository     utenteRepo;

    // ── GET /api/messaggi/inviati ─────────────────────────────────────────
    // Restituisce tutti i messaggi inviati dall'allenatore autenticato.
    // Usato dalla dashboard e dalla pagina messaggi per popolare la lista.
    @GetMapping("/inviati")
    @PreAuthorize("hasAnyRole('ALLENATORE','STAFF','IT')")
    public List<MessaggioDto> inviati(@AuthenticationPrincipal UserDetails ud) {
        Integer uid = utenteRepo.findByUsername(ud.getUsername()).orElseThrow().getId();
        Integer aid = allenatoreRepo.findByUtente_Id(uid).orElseThrow().getId();
        return svc.msgInviatiDaAllenatore(aid);
    }

    // ── GET /api/messaggi/giocatori-squadra ───────────────────────────────
    // Restituisce la lista leggera dei giocatori della squadra dell'allenatore.
    // Usata per popolare il <select> destinatario nel form di composizione.
    @GetMapping("/giocatori-squadra")
    @PreAuthorize("hasAnyRole('ALLENATORE','STAFF','IT')")
    public List<GiocatoreSelectDto> giocatoriSquadra(@AuthenticationPrincipal UserDetails ud) {
        Integer uid     = utenteRepo.findByUsername(ud.getUsername()).orElseThrow().getId();
        Integer idSquad = allenatoreRepo.findByUtente_Id(uid).orElseThrow().getSquadra().getId();
        return giocatoreRepo.findBySquadra_Id(idSquad).stream()
                .map(g -> GiocatoreSelectDto.builder()
                        .id(g.getId())
                        .nomeCompleto(g.getNome() + " " + g.getCognome())
                        .posizione(g.getPosizione())
                        .numero(g.getNumero())
                        .build())
                .toList();
    }

    // ── GET /api/messaggi/miei ────────────────────────────────────────────
    // Messaggi ricevuti dal giocatore autenticato (view giocatore).
    @GetMapping("/miei")
    @PreAuthorize("hasRole('GIOCATORE')")
    public List<MessaggioDto> miei(@AuthenticationPrincipal UserDetails ud) {
        Integer uid = utenteRepo.findByUsername(ud.getUsername()).orElseThrow().getId();
        Integer gid = giocatoreRepo.findByUtente_Id(uid).orElseThrow().getId();
        return svc.msgPerGiocatore(gid);
    }

    // ── GET /api/messaggi/non-letti ───────────────────────────────────────
    @GetMapping("/non-letti")
    @PreAuthorize("hasRole('GIOCATORE')")
    public long nonLetti(@AuthenticationPrincipal UserDetails ud) {
        Integer uid = utenteRepo.findByUsername(ud.getUsername()).orElseThrow().getId();
        Integer gid = giocatoreRepo.findByUtente_Id(uid).orElseThrow().getId();
        return svc.nonLetti(gid);
    }

    // ── POST /api/messaggi ────────────────────────────────────────────────
    // Invia un messaggio a un singolo giocatore.
    // Body: { "giocatoreId": 3, "testo": "..." }
    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','IT')")
    public ResponseEntity<MessaggioDto> invia(
            @Valid @RequestBody InviaMessaggioRequest req,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(svc.invia(req, ud.getUsername()));
    }

    // ── PATCH /api/messaggi/{id}/letto ────────────────────────────────────
    // Segna il messaggio come letto (chiamato dalla view giocatore).
    @PatchMapping("/{id}/letto")
    public MessaggioDto segnaLetto(@PathVariable Integer id) {
        return svc.segnaLetto(id);
    }
}