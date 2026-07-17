package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
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

@RestController @RequestMapping("/api/messaggi") @RequiredArgsConstructor
public class MessaggioController {
    private final MessaggioService    svc;
    private final GiocatoreRepository giocatoreRepo;
    private final UtenteRepository    utenteRepo;

    /** Messaggi ricevuti dal giocatore autenticato */
    @GetMapping("/miei")
    @PreAuthorize("hasRole('GIOCATORE')")
    public List<MessaggioDto> miei(@AuthenticationPrincipal UserDetails ud) {
        Integer uid = utenteRepo.findByUsername(ud.getUsername()).orElseThrow().getId();
        Integer gid = giocatoreRepo.findByUtente_Id(uid).orElseThrow().getId();
        return svc.msgPerGiocatore(gid);
    }

    @GetMapping("/non-letti")
    @PreAuthorize("hasRole('GIOCATORE')")
    public long nonLetti(@AuthenticationPrincipal UserDetails ud) {
        Integer uid = utenteRepo.findByUsername(ud.getUsername()).orElseThrow().getId();
        Integer gid = giocatoreRepo.findByUtente_Id(uid).orElseThrow().getId();
        return svc.nonLetti(gid);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','IT')")
    public ResponseEntity<MessaggioDto> invia(@Valid @RequestBody InviaMessaggioRequest req,
                                              @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.invia(req, ud.getUsername()));
    }

    @PatchMapping("/{id}/letto")
    public MessaggioDto segnaLetto(@PathVariable Integer id) { return svc.segnaLetto(id); }
}
