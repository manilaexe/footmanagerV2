package it.footmanager.security;

import java.util.List;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import it.footmanager.entity.Utente;
import it.footmanager.repository.UtenteRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FmUserDetailsService implements UserDetailsService {

    private final UtenteRepository utenteRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Utente utente = utenteRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Utente non trovato: " + username));

        // getRuolo().getNomeRuolo() — es. "STAFF", "ALLENATORE", "GIOCATORE"
        String ruolo = utente.getRuolo() != null ? utente.getRuolo().getNomeRuolo().name() : "GIOCATORE";

        return User.builder()
                .username(utente.getUsername())
                .password(utente.getPassword())   // campo "password" nel DB
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + ruolo.toUpperCase())))
                .build();
    }
}
