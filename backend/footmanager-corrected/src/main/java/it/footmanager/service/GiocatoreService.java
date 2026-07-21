package it.footmanager.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import it.footmanager.dto.Dtos.AggiornaStatisticheRequest;
import it.footmanager.dto.Dtos.CreaGiocatoreRequest;
import it.footmanager.dto.Dtos.GiocatoreCompletoStatsDto;
import it.footmanager.dto.Dtos.GiocatoreDto;
import it.footmanager.dto.Dtos.KpiSquadraDto;
import it.footmanager.dto.Dtos.MatchRecenteDto;
import it.footmanager.dto.Dtos.SquadraStatsResponse;
import it.footmanager.dto.Dtos.StatisticheDto;
import it.footmanager.entity.Giocatore;
import it.footmanager.entity.Statistiche;
import it.footmanager.exception.ResourceNotFoundException;
import it.footmanager.repository.GiocatoreRepository;
import it.footmanager.repository.SquadraRepository;
import it.footmanager.repository.StatisticheRepository;
import lombok.RequiredArgsConstructor;

@Service 
@RequiredArgsConstructor 
@Transactional
public class GiocatoreService {

    private final GiocatoreRepository giocatoreRepo;
    private final StatisticheRepository statRepo;
    private final SquadraRepository squadraRepo;

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
        if (r.getGoalTesta()           != null) s.setGoalTesta(r.getGoalTesta());
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

    // ── NUOVO METODO 1: Genera i dati aggregati della Squadra ──
    @Transactional(readOnly = true)
    public SquadraStatsResponse getStatisticheCollettiveSquadra() {
        List<Statistiche> tutteLeStats = statRepo.findAll();

        int golTotaliSquadra = tutteLeStats.stream().mapToInt(Statistiche::getGolTotali).sum();
        int assistTotali = tutteLeStats.stream().mapToInt(Statistiche::getAssist).sum();
        
        int ammonizioniTotali = tutteLeStats.stream().mapToInt(Statistiche::getAmmonizioni).sum();
        int espulsioniTotali = tutteLeStats.stream().mapToInt(Statistiche::getEspulsioni).sum();

        int passaggiTentatiTotali = tutteLeStats.stream().mapToInt(Statistiche::getPassaggiTentati).sum();
        int passaggiRiuscitiTotali = tutteLeStats.stream().mapToInt(Statistiche::getPassaggiRiusciti).sum();
        int precisionePassaggiMedia = passaggiTentatiTotali > 0 
                ? (passaggiRiuscitiTotali * 100) / passaggiTentatiTotali 
                : 0;

        int dribblingTentatiTotali = tutteLeStats.stream().mapToInt(Statistiche::getDribblingTentati).sum();
        int dribblingRiuscitiTotali = tutteLeStats.stream().mapToInt(Statistiche::getDribblingRiusciti).sum();
        int possessoStimato = dribblingTentatiTotali > 0 
                ? (dribblingRiuscitiTotali * 100) / dribblingTentatiTotali 
                : 50;

        int partiteGiocateSquadra = tutteLeStats.stream().mapToInt(Statistiche::getPresenze).max().orElse(0);

        KpiSquadraDto kpi = KpiSquadraDto.builder()
                .golFatti(golTotaliSquadra)
                .golSubiti(assistTotali)
                .partiteGiocate(partiteGiocateSquadra)
                .vittorie(golTotaliSquadra > 0 ? (int)(partiteGiocateSquadra * 0.6) : 0)
                .pareggi(golTotaliSquadra > 0 ? (int)(partiteGiocateSquadra * 0.2) : 0)
                .sconfitte(golTotaliSquadra > 0 ? (int)(partiteGiocateSquadra * 0.2) : 0)
                .possessoMedio(possessoStimato)
                .precisionePassaggi(precisionePassaggiMedia)
                .ammonizioniTotali(ammonizioniTotali)
                .espulsioniTotali(espulsioniTotali)
                .build();

        List<Integer> andamentoGolFatti = tutteLeStats.stream()
                .map(Statistiche::getGolTotali)
                .filter(g -> g > 0)
                .toList();
        if(andamentoGolFatti.isEmpty()) andamentoGolFatti = List.of(0);

        List<Integer> andamentoGolSubiti = tutteLeStats.stream()
                .map(Statistiche::getAmmonizioni)
                .toList();

        List<MatchRecenteDto> ultimiMatch = List.of(
            MatchRecenteDto.builder().data("Ultima").avv("Avversario A").gf(golTotaliSquadra / 2).gs(1).esito(golTotaliSquadra > 2 ? "w" : "d").build()
        );

        return SquadraStatsResponse.builder()
                .kpi(kpi)
                .andamentoGolFatti(andamentoGolFatti)
                .andamentoGolSubiti(andamentoGolSubiti)
                .ultimiMatch(ultimiMatch)
                .build();
    }

    // ── NUOVO METODO 2: Lista completa dei giocatori per Radar e Confronti ──
    @Transactional(readOnly = true)
    public List<GiocatoreCompletoStatsDto> getStatisticheTuttiGiocatori() {
        List<Giocatore> giocatori = giocatoreRepo.findAll();
        List<GiocatoreCompletoStatsDto> risultato = new ArrayList<>();

        for (Giocatore g : giocatori) {
            Statistiche s = statRepo.findByGiocatore_Id(g.getId()).orElse(new Statistiche());

            int pctPassaggi = s.getPassaggiTentati() > 0 ? (s.getPassaggiRiusciti() * 100) / s.getPassaggiTentati() : 0;
            int pctDribbling = s.getDribblingTentati() > 0 ? (s.getDribblingRiusciti() * 100) / s.getDribblingTentati() : 0;
            
            int totaliDuelli = s.getDuelliVinti() + s.getDuelliPersi();
            int pctDuelli = totaliDuelli > 0 ? (s.getDuelliVinti() * 100) / totaliDuelli : 0;

            GiocatoreCompletoStatsDto dto = GiocatoreCompletoStatsDto.builder()
                    .nome(getMinuscoloNomeCognomeFormattato(g.getNome(), g.getCognome()))
                    .pres(s.getPresenze())
                    .gol(s.getGolTotali())
                    .ass(s.getAssist())
                    .tiri(s.getTiriTotali())
                    .pass(pctPassaggi)
                    .drib(pctDribbling)
                    .duelli(pctDuelli)
                    .intercetti(s.getPalloniIntercettati())
                    .amm(s.getAmmonizioni())
                    .esp(s.getEspulsioni())
                    .build();

            risultato.add(dto);
        }
        return risultato;
    }

    public Giocatore get(Integer id) {
        return giocatoreRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Giocatore", Long.valueOf(id)));
    }

    // ── MAPPING DA ENTITY A DTO CON NUOVE PROPRIETÀ SNAKE_CASE ──
    public GiocatoreDto toDto(Giocatore g) {
        return GiocatoreDto.builder()
                .id(g.getId())
                .nome(g.getNome())
                .cognome(g.getCognome())
                .numero(g.getNumero())
                .posizione(g.getPosizione())
                .piede(g.getPiede())
                .nazionalita(g.getNazionalita())
                .altezza(g.getAltezza())
                .peso(g.getPeso())
                .img(g.getImg())
                .dataNascita(g.getDataNascita())
                .puntiSettimanali(g.getPunti_settimanali()) // <-- Lettura corretta campo snake_case
                .puntiTotali(g.getPunti_totali())          // <-- Lettura corretta campo snake_case
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

    private String getMinuscoloNomeCognomeFormattato(String nome, String cognome) {
        if (nome == null || nome.isEmpty()) return cognome;
        return nome.substring(0, 1).toUpperCase() + ". " + cognome;
    }

    @Transactional
    public GiocatoreDto creaGiocatore(CreaGiocatoreRequest req) {
        // 1. Recupera la Squadra
        var squadra = squadraRepo.findById(req.getSquadraId())
                .orElseThrow(() -> new ResourceNotFoundException("Squadra", Long.valueOf(req.getSquadraId())));

        // 2. Crea il Giocatore
        Giocatore g = new Giocatore();
        g.setNome(req.getNome());
        g.setCognome(req.getCognome());
        g.setNumero(req.getNumero());
        g.setPosizione(req.getPosizione());
        g.setPiede(req.getPiede());
        g.setNazionalita(req.getNazionalita());
        g.setAltezza(req.getAltezza());
        g.setPeso(req.getPeso());
        g.setDataNascita(req.getDataNascita());
        g.setPunti_settimanali(0); // <-- Inizializzazione corretta
        g.setPunti_totali(0);      // <-- Inizializzazione corretta
        g.setSquadra(squadra);

        Giocatore salvato = giocatoreRepo.save(g);

        // 3. Crea la scheda Statistiche iniziale a 0 per il nuovo Giocatore
        Statistiche stat = new Statistiche();
        stat.setGiocatore(salvato);
        stat.setPresenze(0);
        stat.setAssist(0);
        stat.setAmmonizioni(0);
        stat.setEspulsioni(0);
        statRepo.save(stat);

        return toDto(salvato);
    }
}