package it.footmanager.controller;

import it.footmanager.dto.AuthDto; // Adatta il pacchetto in base al tuo progetto
import it.footmanager.entity.Allenatore;
import it.footmanager.entity.Giocatore;
import it.footmanager.entity.Utente;
import it.footmanager.repository.AllenatoreRepository;
import it.footmanager.repository.GiocatoreRepository;
import it.footmanager.repository.UtenteRepository;
import it.footmanager.security.JwtUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor // Genera il costruttore automatico per inserire i componenti final
public class AuthController {

    // ── INIEZIONE DEI COMPONENTI (Risolve gli errori di compilazione) ──
    private final AuthenticationManager authManager;
    private final UserDetailsService userDetailsService; // Modificato il nome per coincidere con Spring Security
    private final UtenteRepository utenteRepository;
    private final AllenatoreRepository allenatoreRepository;
    private final GiocatoreRepository giocatoreRepository;
    private final JwtUtils jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthDto.LoginRequest req) {
        // 1. Autenticazione standard tramite le credenziali fornite
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));

        // 2. Carichiamo i dettagli dell'utente per generare il token
        UserDetails userDetails = userDetailsService.loadUserByUsername(req.getUsername());
        Utente utente = utenteRepository.findByUsername(req.getUsername())
                .orElseThrow(() -> new RuntimeException("Utente non trovato"));

        String ruolo = utente.getRuolo() != null ? utente.getRuolo().getNomeRuolo().name() : "";
        
        // Impostiamo un valore di ripiego (fallback) iniziale
        String nomeReale = utente.getUsername(); 
        String cognomeReale = "";

        // 3. Andiamo a cercare nelle relative tabelle di ruolo
        if (ruolo != null && ruolo.toUpperCase().contains("ALLENATORE")) {
            Optional<Allenatore> allenatoreOpt = allenatoreRepository.findByUtente_Id(utente.getId());
            if (allenatoreOpt.isPresent()) {
                nomeReale = allenatoreOpt.get().getNome();
                cognomeReale = allenatoreOpt.get().getCognome();
            }
        } else if (ruolo != null && (ruolo.toUpperCase().contains("GIOCATORE") || ruolo.isEmpty())) {
            // Usiamo il metodo custom del repository che fa il JOIN FETCH dell'utente
            Optional<Giocatore> giocatoreOpt = giocatoreRepository.findByUtente_Id(utente.getId());
            if (giocatoreOpt.isPresent()) {
                nomeReale = giocatoreOpt.get().getNome();
                cognomeReale = giocatoreOpt.get().getCognome();
            }
        }

        // 4. Generiamo il token arricchito passando anche nome e cognome reali
        String token = jwtUtils.generateToken(userDetails, nomeReale, cognomeReale);

        // 5. Costruiamo la risposta JSON da inviare al frontend senza rompere il DTO esistente
        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("token", token);
        responseBody.put("ruolo", ruolo);
        responseBody.put("username", utente.getUsername());
        responseBody.put("utenteId", utente.getId());
        responseBody.put("nome", nomeReale);
        responseBody.put("cognome", cognomeReale);

        return ResponseEntity.ok(responseBody);
    }
}