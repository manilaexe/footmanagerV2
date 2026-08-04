package it.footmanager.service;

import it.footmanager.dto.Dtos.*;
import it.footmanager.entity.*;
import it.footmanager.exception.*;
import it.footmanager.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @RequiredArgsConstructor @Transactional
public class UtenteService {

    private final UtenteRepository      utenteRepo;
    private final RuoloRepository       ruoloRepo;
    private final SquadraRepository     squadraRepo;
    private final GiocatoreRepository   giocatoreRepo;
    private final AllenatoreRepository  allenatoreRepo;
    private final StatisticaGiocatoreRepository statRepo;   // solo la riga COMUNE va creata qui:
    // in fase di registrazione utente non conosciamo ancora la posizione
    // (portiere o meno), quindi la riga movimento/portiere viene creata
    // più tardi da GiocatoreService.creaGiocatore() o in modo lazy.
    private final PasswordEncoder       encoder;

    @Transactional(readOnly = true)
    public List<UtenteDto> findAll() {
        return utenteRepo.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public UtenteDto findById(Integer id) {
        return toDto(utenteRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utente", Long.valueOf(id))));
    }

    public UtenteDto crea(CreaUtenteRequest req) {
        if (utenteRepo.existsByUsername(req.getUsername()))
            throw new BadRequestException("Username '" + req.getUsername() + "' già in uso");

        Ruolo ruolo = ruoloRepo.findByNomeRuolo(Ruolo.NomeRuolo.valueOf(req.getNomeRuolo().toUpperCase()))
            .orElseThrow(() -> new BadRequestException("Ruolo non valido: " + req.getNomeRuolo()));

        Utente u = new Utente();
        u.setUsername(req.getUsername());
        u.setPassword(encoder.encode(req.getPassword()));
        u.setRuolo(ruolo);
        utenteRepo.save(u);

        switch (req.getNomeRuolo().toUpperCase()) {
            case "GIOCATORE" -> {
                Squadra sq = getSquadra(req.getSquadraId());
                Giocatore g = new Giocatore();
                g.setUtente(u);
                g.setSquadra(sq);
                g.setNome(req.getNome() != null ? req.getNome() : "");
                g.setCognome(req.getCognome() != null ? req.getCognome() : "");
                giocatoreRepo.save(g);
                StatisticaGiocatore s = new StatisticaGiocatore();
                s.setGiocatore(g);
                statRepo.save(s);
            }
            case "ALLENATORE" -> {
                Squadra sq = getSquadra(req.getSquadraId());
                Allenatore a = new Allenatore();
                a.setUtente(u);
                a.setSquadra(sq);
                a.setNome(req.getNome() != null ? req.getNome() : "");
                a.setCognome(req.getCognome() != null ? req.getCognome() : "");
                allenatoreRepo.save(a);
            }
            default -> {}
        }
        return toDto(u);
    }

    /**
     * Aggiorna username/password di un utente esistente.
     *
     * Il cambio di RUOLO non è supportato qui: cambiare il ruolo di un
     * utente già collegato a una riga giocatore/allenatore la lascerebbe
     * orfana (punterebbe a un utente con un ruolo diverso, senza che ne
     * venga creata una nuova per il nuovo ruolo) — è un bug che avevamo
     * nella versione precedente di questo metodo. Se il ruolo richiesto è
     * diverso da quello attuale, l'operazione viene rifiutata: per cambiare
     * ruolo a un utente bisogna eliminarlo e ricrearlo.
     *
     * Nome/cognome del profilo collegato (giocatore/allenatore) non vengono
     * toccati da questo endpoint: restano di competenza di
     * GiocatoreService/AllenatoreService, che già li gestiscono.
     */
    public UtenteDto aggiorna(Integer id, CreaUtenteRequest req) {
        Utente u = utenteRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Utente", Long.valueOf(id)));

        if (req.getUsername() != null && !req.getUsername().isBlank()
                && !req.getUsername().equals(u.getUsername())) {
            if (utenteRepo.existsByUsername(req.getUsername()))
                throw new BadRequestException("Username '" + req.getUsername() + "' già in uso");
            u.setUsername(req.getUsername());
        }

        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            u.setPassword(encoder.encode(req.getPassword()));
        }

        if (req.getNomeRuolo() != null && !req.getNomeRuolo().isBlank()) {
            String ruoloAttuale = u.getRuolo() != null ? u.getRuolo().getNomeRuolo().name() : null;
            if (!req.getNomeRuolo().toUpperCase().equals(ruoloAttuale)) {
                throw new BadRequestException(
                    "Non è possibile cambiare il ruolo di un utente esistente (elimina e ricrea l'utente).");
            }
        }

        return toDto(utenteRepo.save(u));
    }

    public void elimina(Integer id) {
        utenteRepo.deleteById(id);
    }

    private Squadra getSquadra(Integer id) {
        if (id == null) throw new BadRequestException("squadraId obbligatorio per questo ruolo");
        return squadraRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Squadra", Long.valueOf(id)));
    }

    public UtenteDto toDto(Utente u) {
        return UtenteDto.builder()
                .id(u.getId())
                .username(u.getUsername())
                .ruolo(u.getRuolo() != null ? u.getRuolo().getNomeRuolo().name() : null)
                .build();
    }
}