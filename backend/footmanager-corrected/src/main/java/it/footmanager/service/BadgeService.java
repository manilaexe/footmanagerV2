package it.footmanager.service;

import it.footmanager.dto.Dtos.*;
import it.footmanager.entity.Badge;
import it.footmanager.exception.ResourceNotFoundException;
import it.footmanager.repository.BadgeRepository;
import it.footmanager.repository.GiocatoreBadgeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * CRUD dei badge (riservato a STAFF/IT) e lettura dei badge già ottenuti
 * da un giocatore. L'assegnazione automatica dei badge in base ai punti
 * resta in QuizService.verificaBadge(), invocata a ogni risposta corretta
 * al quiz del giorno: qui c'è solo la parte di gestione/consultazione.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class BadgeService {

    private final BadgeRepository          badgeRepo;
    private final GiocatoreBadgeRepository gbRepo;

    @Transactional(readOnly = true)
    public List<BadgeDto> tutti() {
        return badgeRepo.findAll().stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<GiocatoreBadgeDto> perGiocatore(Integer giocatoreId) {
        return gbRepo.findByGiocatore_Id(giocatoreId).stream()
                .map(gb -> GiocatoreBadgeDto.builder()
                        .giocatoreId(gb.getGiocatore().getId())
                        .giocatoreNomeCompleto(gb.getGiocatore().getNome() + " " + gb.getGiocatore().getCognome())
                        .badgeId(gb.getBadge().getId())
                        .nomeBadge(gb.getBadge().getNomeBadge())
                        .dataOttenimento(gb.getDataOttenimento())
                        .build())
                .toList();
    }

    // Crea un nuovo badge (pannello IT/STAFF).
    public BadgeDto crea(CreaBadgeRequest req) {
        Badge b = new Badge();
        b.setNomeBadge(req.getNomeBadge());
        b.setSogliaPunti(req.getSogliaPunti());
        b.setIcona(req.getIcona());
        return toDto(badgeRepo.save(b));
    }

    public BadgeDto aggiorna(Integer id, CreaBadgeRequest req) {
        Badge b = badgeRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Badge", Long.valueOf(id)));
        b.setNomeBadge(req.getNomeBadge());
        b.setSogliaPunti(req.getSogliaPunti());
        b.setIcona(req.getIcona());
        return toDto(badgeRepo.save(b));
    }

    public void elimina(Integer id) {
        badgeRepo.deleteById(id);
    }

    private BadgeDto toDto(Badge b) {
        return BadgeDto.builder()
                .id(b.getId())
                .nomeBadge(b.getNomeBadge())
                .sogliaPunti(b.getSogliaPunti())
                .icona(b.getIcona())
                .build();
    }
}