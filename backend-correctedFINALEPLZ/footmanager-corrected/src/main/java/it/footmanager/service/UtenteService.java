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
    private final StatisticheRepository statRepo;
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
                Statistiche s = new Statistiche();
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
