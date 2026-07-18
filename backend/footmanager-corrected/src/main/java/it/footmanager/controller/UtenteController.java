package it.footmanager.controller;

import it.footmanager.entity.Utente;
import it.footmanager.entity.Allenatore;
import it.footmanager.entity.Giocatore;
import it.footmanager.repository.UtenteRepository;
import it.footmanager.repository.AllenatoreRepository;
import it.footmanager.repository.GiocatoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/utenti")
@RequiredArgsConstructor
public class UtenteController {

    private final UtenteRepository utenteRepo;
    private final AllenatoreRepository allenatoreRepo;
    private final GiocatoreRepository giocatoreRepo; // Assicurati di avere questo import e repository

    @GetMapping("/me/allenatore")
    public ResponseEntity<?> getProfiloAllenatoreCorrente() {
        // 1. Estrae lo username dal token JWT con cui l'utente è autenticato
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        // 2. Cerca l'utente sul database
        Utente utente = utenteRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utente non trovato"));

        // 3. Cerca l'anagrafica nella tabella allenatore usando la relazione dell'id_user
        Allenatore allenatore = allenatoreRepo.findByUtente_Id(utente.getId())
                .orElseThrow(() -> new RuntimeException("Profilo allenatore non associato a questo utente"));

        return ResponseEntity.ok(allenatore);
    }

    @GetMapping("/me/giocatore")
    public ResponseEntity<?> getProfiloGiocatoreCorrente() {
        // Stessa logica speculare per il giocatore
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();

        Utente utente = utenteRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utente non trovato"));

        Giocatore giocatore = giocatoreRepo.findByUtente_Id(utente.getId())
                .orElseThrow(() -> new RuntimeException("Profilo giocatore non associato a questo utente"));

        return ResponseEntity.ok(giocatore);
    }
}