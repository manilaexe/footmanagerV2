package it.footmanager.controller;

import it.footmanager.dto.AuthDto;
import it.footmanager.entity.Allenatore;
import it.footmanager.entity.Giocatore;
import it.footmanager.entity.Utente;
import it.footmanager.repository.AllenatoreRepository;
import it.footmanager.repository.GiocatoreRepository;
import it.footmanager.repository.UtenteRepository;
import it.footmanager.security.JwtUtils;
import it.footmanager.service.LogSistemaService;
import jakarta.servlet.http.HttpServletRequest;
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
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final UserDetailsService userDetailsService;
    private final UtenteRepository utenteRepository;
    private final AllenatoreRepository allenatoreRepository;
    private final GiocatoreRepository giocatoreRepository;
    private final JwtUtils jwtUtils;
    private final LogSistemaService logService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthDto.LoginRequest req, HttpServletRequest request) {
        try {
            // 1. Autenticazione standard
            authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));

            // 2. Carichiamo i dettagli
            UserDetails userDetails = userDetailsService.loadUserByUsername(req.getUsername());
            Utente utente = utenteRepository.findByUsername(req.getUsername())
                    .orElseThrow(() -> new RuntimeException("Utente non trovato"));

            String ruolo = utente.getRuolo() != null ? utente.getRuolo().getNomeRuolo().name() : "";
            
            String nomeReale = utente.getUsername(); 
            String cognomeReale = "";

            // 3. Logica Ruoli
            Integer idGiocatore = null;
            Integer idAllenatore = null;
            String imgProfilo = null;

            if (ruolo != null && ruolo.toUpperCase().contains("ALLENATORE")) {
                Optional<Allenatore> allenatoreOpt = allenatoreRepository.findByUtente_Id(utente.getId());
                if (allenatoreOpt.isPresent()) {
                    nomeReale = allenatoreOpt.get().getNome();
                    cognomeReale = allenatoreOpt.get().getCognome();
                    idAllenatore = allenatoreOpt.get().getId();
                }
            } else if (ruolo != null && (ruolo.toUpperCase().contains("GIOCATORE") || ruolo.isEmpty())) {
                Optional<Giocatore> giocatoreOpt = giocatoreRepository.findByUtente_Id(utente.getId());
                if (giocatoreOpt.isPresent()) {
                    nomeReale = giocatoreOpt.get().getNome();
                    cognomeReale = giocatoreOpt.get().getCognome();
                    idGiocatore = giocatoreOpt.get().getId();
                    imgProfilo = giocatoreOpt.get().getImg();
                }
            }

            // 4. Token
            String token = jwtUtils.generateToken(userDetails, nomeReale, cognomeReale);

            // Log: Login Riuscito (passando il ruolo)
            logService.registraLog("INFO", "Autenticazione", "LOGIN", "Login effettuato con successo", req.getUsername(), ruolo, request.getRemoteAddr());

            // 5. Risposta
            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("token", token);
            responseBody.put("ruolo", ruolo);
            responseBody.put("username", utente.getUsername());
            responseBody.put("utenteId", utente.getId());
            responseBody.put("nome", nomeReale);
            responseBody.put("cognome", cognomeReale);
            responseBody.put("idGiocatore", idGiocatore);
            responseBody.put("idAllenatore", idAllenatore);
            responseBody.put("img", imgProfilo);

            return ResponseEntity.ok(responseBody);
        } catch (Exception e) {
            // Log: Login Fallito
            logService.registraLog("WARN", "Autenticazione", "LOGIN_FAILED", "Tentativo di login fallito", req.getUsername(), null, request.getRemoteAddr());
            throw e;
        }
    }
}