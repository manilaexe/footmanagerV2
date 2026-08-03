package it.footmanager.service;

import it.footmanager.dto.Dtos.*;
import it.footmanager.entity.Squadra;
import it.footmanager.exception.ResourceNotFoundException;
import it.footmanager.repository.GiocatoreRepository;
import it.footmanager.repository.SquadraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class SquadraService {

    private final SquadraRepository   squadraRepo;
    private final GiocatoreRepository giocatoreRepo;

    @Transactional(readOnly = true)
    public List<SquadraDto> tutte() {
        return squadraRepo.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public SquadraDto una(Integer id) {
        return toDto(squadraRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Squadra", Long.valueOf(id))));
    }

    public SquadraDto crea(CreaSquadraRequest req) {
        Squadra s = new Squadra();
        s.setNome(req.getNome());
        s.setCategoria(req.getCategoria());
        return toDto(squadraRepo.save(s));
    }

    public SquadraDto aggiorna(Integer id, CreaSquadraRequest req) {
        Squadra s = squadraRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Squadra", Long.valueOf(id)));
        s.setNome(req.getNome());
        s.setCategoria(req.getCategoria());
        return toDto(squadraRepo.save(s));
    }

    public void elimina(Integer id) {
        squadraRepo.deleteById(id);
    }

    private SquadraDto toDto(Squadra s) {
        return SquadraDto.builder()
                .id(s.getId()).nome(s.getNome()).categoria(s.getCategoria())
                .numeroGiocatori(giocatoreRepo.findBySquadra_Id(s.getId()).size())
                .build();
    }
}