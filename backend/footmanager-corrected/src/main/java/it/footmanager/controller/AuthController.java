package it.footmanager.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import it.footmanager.dto.AuthDto;
import it.footmanager.entity.Utente;
import it.footmanager.repository.UtenteRepository;
import it.footmanager.security.JwtUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final UserDetailsService    uds;
    private final JwtUtils              jwtUtils;
    private final UtenteRepository      utenteRepo;

    @PostMapping("/login")
    public ResponseEntity<AuthDto.LoginResponse> login(@Valid @RequestBody AuthDto.LoginRequest req) {
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));

        UserDetails ud  = uds.loadUserByUsername(req.getUsername());
        String token    = jwtUtils.generateToken(ud);
        Utente utente   = utenteRepo.findByUsername(req.getUsername()).orElseThrow();

        // Utente nel DB ha solo: id_user, username, password, id_ruolo
        // NON ha nome/cognome — quelli stanno in giocatore/allenatore
        String ruolo = utente.getRuolo() != null ? utente.getRuolo().getNomeRuolo().name() : "";

        return ResponseEntity.ok(
                new AuthDto.LoginResponse(token, ruolo, utente.getUsername(), utente.getId()));
    }
}
