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
import it.footmanager.service.LogSistemaService; // Aggiunto
import jakarta.servlet.http.HttpServletRequest; // Aggiunto
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
    private final LogSistemaService    logService; // Iniezione LogService

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

    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','DIRIGENZA','IT')")
    public List<UtenteDto> tutti() { return svc.findAll(); }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','ALLENATORE','DIRIGENZA','IT')")
    public UtenteDto uno(@PathVariable Integer id) { return svc.findById(id); }

    @PostMapping
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<UtenteDto> crea(@Valid @RequestBody CreaUtenteRequest req, @AuthenticationPrincipal UserDetails ud, HttpServletRequest request) { // Aggiunti UserDetails e request
        UtenteDto dto = svc.crea(req);
        // Log: Creazione utente
        logService.registraLog("INFO", "Utenti", "CREATE_USER", "Creato nuovo utente: " + req.getUsername(), ud.getUsername(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public UtenteDto aggiorna(@PathVariable Integer id, @RequestBody CreaUtenteRequest req, @AuthenticationPrincipal UserDetails ud, HttpServletRequest request) { // Aggiunti UserDetails e request
        UtenteDto dto = svc.aggiorna(id, req);
        // Log: Modifica utente (inclusi permessi/ruoli)
        logService.registraLog("INFO", "Utenti", "UPDATE_ROLE", "Modificato utente ID: " + id, ud.getUsername(), request.getRemoteAddr());
        return dto;
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<Void> elimina(@PathVariable Integer id, @AuthenticationPrincipal UserDetails ud, HttpServletRequest request) { // Aggiunti UserDetails e request
        svc.elimina(id);
        // Log: Eliminazione utente
        logService.registraLog("WARN", "Utenti", "DELETE_USER", "Eliminato utente ID: " + id, ud.getUsername(), request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}