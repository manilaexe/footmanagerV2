package it.footmanager.service;

import it.footmanager.dto.Dtos.*;
import it.footmanager.entity.*;
import it.footmanager.exception.*;
import it.footmanager.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @RequiredArgsConstructor @Transactional
public class GiocatoreService {

    private final GiocatoreRepository   giocatoreRepo;
    private final StatisticheRepository statRepo;

    @Transactional(readOnly = true)
    public List<GiocatoreDto> findBySquadra(Integer squadraId) {
        return giocatoreRepo.findBySquadra_Id(squadraId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public GiocatoreDto findById(Integer id) {
        return toDto(get(id));
    }

    @Transactional(readOnly = true)
    public StatisticheDto getStatistiche(Integer giocatoreId) {
        return toStatDto(statRepo.findByGiocatore_Id(giocatoreId)
                .orElseThrow(() -> new ResourceNotFoundException("Statistiche", Long.valueOf(giocatoreId))));
    }

    public StatisticheDto aggiornaStatistiche(Integer giocatoreId, AggiornaStatisticheRequest r) {
        Statistiche s = statRepo.findByGiocatore_Id(giocatoreId)
                .orElseThrow(() -> new ResourceNotFoundException("Statistiche", Long.valueOf(giocatoreId)));
        if (r.getPresenze()            != null) s.setPresenze(r.getPresenze());
        if (r.getPresenzeTitolare()    != null) s.setPresenzeTitolare(r.getPresenzeTitolare());
        if (r.getMinutiGiocati()       != null) s.setMinutiGiocati(r.getMinutiGiocati());
        if (r.getGoalRigore()          != null) s.setGoalRigore(r.getGoalRigore());
        if (r.getGoalTesta()         != null) s.setGoalTesta(r.getGoalTesta());
        if (r.getGoalPunizione()       != null) s.setGoalPunizione(r.getGoalPunizione());
        if (r.getAssist()              != null) s.setAssist(r.getAssist());
        if (r.getTiriTotali()          != null) s.setTiriTotali(r.getTiriTotali());
        if (r.getTiriInPorta()         != null) s.setTiriInPorta(r.getTiriInPorta());
        if (r.getPaliTraverse()        != null) s.setPaliTraverse(r.getPaliTraverse());
        if (r.getBigChanceMancate()    != null) s.setBigChanceMancate(r.getBigChanceMancate());
        if (r.getBigChanceCreate()     != null) s.setBigChanceCreate(r.getBigChanceCreate());
        if (r.getPassaggiTentati()     != null) s.setPassaggiTentati(r.getPassaggiTentati());
        if (r.getPassaggiRiusciti()    != null) s.setPassaggiRiusciti(r.getPassaggiRiusciti());
        if (r.getPassaggiChiave()      != null) s.setPassaggiChiave(r.getPassaggiChiave());
        if (r.getCrossTentati()        != null) s.setCrossTentati(r.getCrossTentati());
        if (r.getCrossRiusciti()       != null) s.setCrossRiusciti(r.getCrossRiusciti());
        if (r.getDribblingTentati()    != null) s.setDribblingTentati(r.getDribblingTentati());
        if (r.getDribblingRiusciti()   != null) s.setDribblingRiusciti(r.getDribblingRiusciti());
        if (r.getDuelliVinti()         != null) s.setDuelliVinti(r.getDuelliVinti());
        if (r.getDuelliPersi()         != null) s.setDuelliPersi(r.getDuelliPersi());
        if (r.getDuelliAereiVinti()    != null) s.setDuelliAereiVinti(r.getDuelliAereiVinti());
        if (r.getDuelliAereiPersi()    != null) s.setDuelliAereiPersi(r.getDuelliAereiPersi());
        if (r.getPalloniRubati()       != null) s.setPalloniRubati(r.getPalloniRubati());
        if (r.getPalloniIntercettati() != null) s.setPalloniIntercettati(r.getPalloniIntercettati());
        if (r.getTackle()              != null) s.setTackle(r.getTackle());
        if (r.getFalliCommessi()       != null) s.setFalliCommessi(r.getFalliCommessi());
        if (r.getFalliSubiti()         != null) s.setFalliSubiti(r.getFalliSubiti());
        if (r.getAmmonizioni()         != null) s.setAmmonizioni(r.getAmmonizioni());
        if (r.getEspulsioni()          != null) s.setEspulsioni(r.getEspulsioni());
        return toStatDto(statRepo.save(s));
    }

    @Transactional(readOnly = true)
    public List<GiocatoreDto> topMarcatori(Integer squadraId) {
        return giocatoreRepo.topMarcatori(squadraId).stream().map(this::toDto).toList();
    }

    public Giocatore get(Integer id) {
        return giocatoreRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Giocatore", Long.valueOf(id)));
    }

    public GiocatoreDto toDto(Giocatore g) {
        return GiocatoreDto.builder()
                .id(g.getId()).nome(g.getNome()).cognome(g.getCognome())
                .numero(g.getNumero()).posizione(g.getPosizione()).piede(g.getPiede())
                .nazionalita(g.getNazionalita()).altezza(g.getAltezza()).img(g.getImg())
                .squadraId(g.getSquadra() != null ? g.getSquadra().getId() : null)
                .utenteId(g.getUtente()   != null ? g.getUtente().getId()  : null)
                .build();
    }

    private StatisticheDto toStatDto(Statistiche s) {
        return StatisticheDto.builder()
                .giocatoreId(s.getGiocatore().getId())
                .presenze(s.getPresenze()).presenzeTitolare(s.getPresenzeTitolare()).minutiGiocati(s.getMinutiGiocati())
                .goalRigore(s.getGoalRigore()).goalTesta(s.getGoalTesta()).goalPunizione(s.getGoalPunizione())
                .golTotali(s.getGolTotali())
                .assist(s.getAssist()).tiriTotali(s.getTiriTotali()).tiriInPorta(s.getTiriInPorta())
                .paliTraverse(s.getPaliTraverse()).bigChanceMancate(s.getBigChanceMancate()).bigChanceCreate(s.getBigChanceCreate())
                .passaggiTentati(s.getPassaggiTentati()).passaggiRiusciti(s.getPassaggiRiusciti()).passaggiChiave(s.getPassaggiChiave())
                .crossTentati(s.getCrossTentati()).crossRiusciti(s.getCrossRiusciti())
                .dribblingTentati(s.getDribblingTentati()).dribblingRiusciti(s.getDribblingRiusciti())
                .duelliVinti(s.getDuelliVinti()).duelliPersi(s.getDuelliPersi())
                .duelliAereiVinti(s.getDuelliAereiVinti()).duelliAereiPersi(s.getDuelliAereiPersi())
                .palloniRubati(s.getPalloniRubati()).palloniIntercettati(s.getPalloniIntercettati())
                .tackle(s.getTackle()).falliCommessi(s.getFalliCommessi()).falliSubiti(s.getFalliSubiti())
                .ammonizioni(s.getAmmonizioni()).espulsioni(s.getEspulsioni())
                .build();
    }
}
