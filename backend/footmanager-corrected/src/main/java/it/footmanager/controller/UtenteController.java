package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.entity.Allenatore;
import it.footmanager.entity.Giocatore;
import it.footmanager.entity.Utente;
import it.footmanager.exception.ResourceNotFoundException;
import it.footmanager.repository.AllenatoreRepository;
import it.footmanager.repository.GiocatoreRepository;
import it.footmanager.repository.UtenteRepository;
import it.footmanager.service.GiocatoreService;
import it.footmanager.service.UtenteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/utenti")
@RequiredArgsConstructor
public class UtenteController {

    private final UtenteService        svc;
    private final UtenteRepository     utenteRepo;
    private final AllenatoreRepository allenatoreRepo;
    private final GiocatoreRepository  giocatoreRepo;
    private final GiocatoreService     giocatoreService;

    // ── Profilo proprio, risolto dal JWT (nessun ID passato dal client) ────
    // Restituiscono DTO, non le entity JPA: evita LazyInitializationException
    // sulle relazioni LAZY (squadra, statistiche...) e non espone la
    // struttura interna del DB.
    @GetMapping("/me/allenatore")
    public AllenatoreDto meAllenatore(@AuthenticationPrincipal UserDetails ud) {
        Integer uid = utenteRepo.findByUsername(ud.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Utente: " + ud.getUsername()))
                .getId();
        Allenatore a = allenatoreRepo.findByUtente_Id(uid)
                .orElseThrow(() -> new ResourceNotFoundException("Profilo allenatore non associato a questo utente"));
        return AllenatoreDto.builder()
                .id(a.getId()).nome(a.getNome()).cognome(a.getCognome())
                .squadraId(a.getSquadra() != null ? a.getSquadra().getId() : null)
                .utenteId(uid)
                .build();
    }

    @GetMapping("/me/giocatore")
    public GiocatoreDto meGiocatore(@AuthenticationPrincipal UserDetails ud) {
        Integer uid = utenteRepo.findByUsername(ud.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("Utente: " + ud.getUsername()))
                .getId();
        Giocatore g = giocatoreRepo.findByUtente_Id(uid)
                .orElseThrow(() -> new ResourceNotFoundException("Profilo giocatore non associato a questo utente"));
        return giocatoreService.toDto(g);
    }

    // ── CRUD utenti (pannello IT/STAFF) ─────────────────────────────────────
    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','DIRIGENZA','IT')")
    public List<UtenteDto> tutti() { return svc.findAll(); }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','DIRIGENZA','IT')")
    public UtenteDto uno(@PathVariable Integer id) { return svc.findById(id); }

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<UtenteDto> crea(@Valid @RequestBody CreaUtenteRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.crea(req));
    }

    // Niente @Valid qui: a differenza della creazione, l'aggiornamento è
    // parziale (username/password/ruolo possono anche non essere presenti
    // nel body — il service li lascia invariati). CreaUtenteRequest ha
    // @NotBlank su password, che romperebbe un update "solo username".
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public UtenteDto aggiorna(@PathVariable Integer id, @RequestBody CreaUtenteRequest req) {
        return svc.aggiorna(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<Void> elimina(@PathVariable Integer id) {
        svc.elimina(id);
        return ResponseEntity.noContent().build();
    }
}