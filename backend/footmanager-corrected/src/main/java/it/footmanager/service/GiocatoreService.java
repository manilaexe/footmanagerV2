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
import it.footmanager.entity.StatisticaGiocatore;
import it.footmanager.entity.StatisticaMovimento;
import it.footmanager.entity.StatisticaPortiere;
import it.footmanager.exception.ResourceNotFoundException;
import it.footmanager.repository.GiocatoreRepository;
import it.footmanager.repository.SquadraRepository;
import it.footmanager.repository.StatisticaGiocatoreRepository;
import it.footmanager.repository.StatisticaMovimentoRepository;
import it.footmanager.repository.StatisticaPortiereRepository;
import it.footmanager.repository.UtenteRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class GiocatoreService {

    private final GiocatoreRepository            giocatoreRepo;
    private final StatisticaGiocatoreRepository  statGiocatoreRepo;
    private final StatisticaMovimentoRepository  statMovimentoRepo;
    private final StatisticaPortiereRepository   statPortiereRepo;
    private final SquadraRepository              squadraRepo;
    private final UtenteRepository               utenteRepo;

    // ── PROFILO "ME" ─────────────────────────────────────────────────────────
    // Usato dalla dashboard giocatore per popolare la card in alto (profile-hero)
    // con i dati reali del giocatore autenticato, senza esporre un lookup per id
    // arbitrario: il giocatore viene sempre risolto dal token, mai passato dal client.
    @Transactional(readOnly = true)
    public GiocatoreDto findMyProfile(String username) {
        Integer uid = utenteRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utente: " + username))
                .getId();
        Giocatore g = giocatoreRepo.findByUtente_Id(uid)
                .orElseThrow(() -> new ResourceNotFoundException("Giocatore per utente: " + username));
        return toDto(g);
    }

    @Transactional(readOnly = true)
    public List<GiocatoreDto> findBySquadra(Integer squadraId) {
        return giocatoreRepo.findBySquadra_Id(squadraId).stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public GiocatoreDto findById(Integer id) {
        return toDto(get(id));
    }

    // ── LETTURA STATISTICHE ─────────────────────────────────────────────────
    // Aggrega statistica_giocatore (comune) + statistica_movimento OPPURE
    // statistica_portiere, a seconda del ruolo del giocatore.
    @Transactional(readOnly = true)
    public StatisticheDto getStatistiche(Integer giocatoreId) {
        Giocatore g = get(giocatoreId);

        StatisticaGiocatore comune = statGiocatoreRepo.findByGiocatore_Id(giocatoreId)
                .orElseThrow(() -> new ResourceNotFoundException("Statistiche", Long.valueOf(giocatoreId)));

        boolean portiere = g.isPortiere();

        StatisticheDto.StatisticheDtoBuilder b = StatisticheDto.builder()
                .giocatoreId(giocatoreId)
                .portiere(portiere)
                .presenze(comune.getPresenze())
                .presenzeTitolare(comune.getPresenzeTitolare())
                .minutiGiocati(comune.getMinutiGiocati())
                .assist(comune.getAssist())
                .passaggiTentati(comune.getPassaggiTentati())
                .passaggiRiusciti(comune.getPassaggiRiusciti())
                .passaggiChiave(comune.getPassaggiChiave())
                .dribblingTentati(comune.getDribblingTentati())
                .dribblingRiusciti(comune.getDribblingRiusciti())
                .duelliVinti(comune.getDuelliVinti())
                .duelliPersi(comune.getDuelliPersi())
                .duelliAereiVinti(comune.getDuelliAereiVinti())
                .duelliAereiPersi(comune.getDuelliAereiPersi())
                .palloniIntercettati(comune.getPalloniIntercettati())
                .falliCommessi(comune.getFalliCommessi())
                .falliSubiti(comune.getFalliSubiti())
                .ammonizioni(comune.getAmmonizioni())
                .espulsioni(comune.getEspulsioni());

        if (portiere) {
            StatisticaPortiere p = statPortiereRepo.findByGiocatore_Id(giocatoreId)
                    .orElseGet(() -> creaStatisticaPortiereVuota(g));
            b.parate(p.getParate())
             .cleanSheet(p.getCleanSheet())
             .goalSubiti(p.getGoalSubiti())
             .rigoriParati(p.getRigoriParati())
             .rigoriSubiti(p.getRigoriSubiti());
        } else {
            StatisticaMovimento m = statMovimentoRepo.findByGiocatore_Id(giocatoreId)
                    .orElseGet(() -> creaStatisticaMovimentoVuota(g));
            b.goalRigore(m.getGoalRigore())
             .goalTesta(m.getGoalTesta())
             .goalPunizione(m.getGoalPunizione())
             .golTotali(m.getGolTotali())
             .tiriTotali(m.getTiriTotali())
             .tiriInPorta(m.getTiriInPorta())
             .paliTraverse(m.getPaliTraverse())
             .bigChanceMancate(m.getBigChanceMancate())
             .bigChanceCreate(m.getBigChanceCreate())
             .crossTentati(m.getCrossTentati())
             .crossRiusciti(m.getCrossRiusciti())
             .tackle(m.getTackle())
             .palloniRubati(m.getPalloniRubati());
        }

        return b.build();
    }

    // ── AGGIORNAMENTO STATISTICHE ───────────────────────────────────────────
    // Aggiorna la riga comune e, in base al ruolo, la riga movimento o portiere.
    // I campi non pertinenti al ruolo nella request vengono semplicemente ignorati.
    public StatisticheDto aggiornaStatistiche(Integer giocatoreId, AggiornaStatisticheRequest r) {
        Giocatore g = get(giocatoreId);

        StatisticaGiocatore comune = statGiocatoreRepo.findByGiocatore_Id(giocatoreId)
                .orElseThrow(() -> new ResourceNotFoundException("Statistiche", Long.valueOf(giocatoreId)));

        if (r.getPresenze()             != null) comune.setPresenze(r.getPresenze());
        if (r.getPresenzeTitolare()     != null) comune.setPresenzeTitolare(r.getPresenzeTitolare());
        if (r.getMinutiGiocati()        != null) comune.setMinutiGiocati(r.getMinutiGiocati());
        if (r.getAssist()               != null) comune.setAssist(r.getAssist());
        if (r.getPassaggiTentati()      != null) comune.setPassaggiTentati(r.getPassaggiTentati());
        if (r.getPassaggiRiusciti()     != null) comune.setPassaggiRiusciti(r.getPassaggiRiusciti());
        if (r.getPassaggiChiave()       != null) comune.setPassaggiChiave(r.getPassaggiChiave());
        if (r.getDribblingTentati()     != null) comune.setDribblingTentati(r.getDribblingTentati());
        if (r.getDribblingRiusciti()    != null) comune.setDribblingRiusciti(r.getDribblingRiusciti());
        if (r.getDuelliVinti()          != null) comune.setDuelliVinti(r.getDuelliVinti());
        if (r.getDuelliPersi()          != null) comune.setDuelliPersi(r.getDuelliPersi());
        if (r.getDuelliAereiVinti()     != null) comune.setDuelliAereiVinti(r.getDuelliAereiVinti());
        if (r.getDuelliAereiPersi()     != null) comune.setDuelliAereiPersi(r.getDuelliAereiPersi());
        if (r.getPalloniIntercettati()  != null) comune.setPalloniIntercettati(r.getPalloniIntercettati());
        if (r.getFalliCommessi()        != null) comune.setFalliCommessi(r.getFalliCommessi());
        if (r.getFalliSubiti()          != null) comune.setFalliSubiti(r.getFalliSubiti());
        if (r.getAmmonizioni()          != null) comune.setAmmonizioni(r.getAmmonizioni());
        if (r.getEspulsioni()           != null) comune.setEspulsioni(r.getEspulsioni());
        statGiocatoreRepo.save(comune);

        if (g.isPortiere()) {
            StatisticaPortiere p = statPortiereRepo.findByGiocatore_Id(giocatoreId)
                    .orElseGet(() -> creaStatisticaPortiereVuota(g));
            if (r.getParate()       != null) p.setParate(r.getParate());
            if (r.getCleanSheet()   != null) p.setCleanSheet(r.getCleanSheet());
            if (r.getGoalSubiti()   != null) p.setGoalSubiti(r.getGoalSubiti());
            if (r.getRigoriParati() != null) p.setRigoriParati(r.getRigoriParati());
            if (r.getRigoriSubiti() != null) p.setRigoriSubiti(r.getRigoriSubiti());
            statPortiereRepo.save(p);
        } else {
            StatisticaMovimento m = statMovimentoRepo.findByGiocatore_Id(giocatoreId)
                    .orElseGet(() -> creaStatisticaMovimentoVuota(g));
            if (r.getGoalRigore()        != null) m.setGoalRigore(r.getGoalRigore());
            if (r.getGoalTesta()         != null) m.setGoalTesta(r.getGoalTesta());
            if (r.getGoalPunizione()     != null) m.setGoalPunizione(r.getGoalPunizione());
            if (r.getTiriTotali()        != null) m.setTiriTotali(r.getTiriTotali());
            if (r.getTiriInPorta()       != null) m.setTiriInPorta(r.getTiriInPorta());
            if (r.getPaliTraverse()      != null) m.setPaliTraverse(r.getPaliTraverse());
            if (r.getBigChanceMancate()  != null) m.setBigChanceMancate(r.getBigChanceMancate());
            if (r.getBigChanceCreate()   != null) m.setBigChanceCreate(r.getBigChanceCreate());
            if (r.getCrossTentati()      != null) m.setCrossTentati(r.getCrossTentati());
            if (r.getCrossRiusciti()     != null) m.setCrossRiusciti(r.getCrossRiusciti());
            if (r.getTackle()            != null) m.setTackle(r.getTackle());
            if (r.getPalloniRubati()     != null) m.setPalloniRubati(r.getPalloniRubati());
            statMovimentoRepo.save(m);
        }

        return getStatistiche(giocatoreId);
    }

    @Transactional(readOnly = true)
    public List<GiocatoreDto> topMarcatori(Integer squadraId) {
        return giocatoreRepo.topMarcatori(squadraId).stream().map(this::toDto).toList();
    }

    // ── STATISTICHE COLLETTIVE SQUADRA ──────────────────────────────────────
    // Gol/assist/duelli/passaggi vengono ora sommati leggendo entrambe le
    // tabelle: statistica_giocatore (comune, per tutti) e statistica_movimento
    // (gol, solo giocatori di movimento — i portieri non ne hanno).
    @Transactional(readOnly = true)
    public SquadraStatsResponse getStatisticheCollettiveSquadra() {
        List<StatisticaGiocatore> comuni    = statGiocatoreRepo.findAll();
        List<StatisticaMovimento> movimento = statMovimentoRepo.findAll();

        int golTotaliSquadra = movimento.stream().mapToInt(StatisticaMovimento::getGolTotali).sum();
        int assistTotali     = comuni.stream().mapToInt(StatisticaGiocatore::getAssist).sum();

        int ammonizioniTotali = comuni.stream().mapToInt(StatisticaGiocatore::getAmmonizioni).sum();
        int espulsioniTotali  = comuni.stream().mapToInt(StatisticaGiocatore::getEspulsioni).sum();

        int passaggiTentatiTotali  = comuni.stream().mapToInt(StatisticaGiocatore::getPassaggiTentati).sum();
        int passaggiRiuscitiTotali = comuni.stream().mapToInt(StatisticaGiocatore::getPassaggiRiusciti).sum();
        int precisionePassaggiMedia = passaggiTentatiTotali > 0
                ? (passaggiRiuscitiTotali * 100) / passaggiTentatiTotali
                : 0;

        int dribblingTentatiTotali  = comuni.stream().mapToInt(StatisticaGiocatore::getDribblingTentati).sum();
        int dribblingRiuscitiTotali = comuni.stream().mapToInt(StatisticaGiocatore::getDribblingRiusciti).sum();
        int possessoStimato = dribblingTentatiTotali > 0
                ? (dribblingRiuscitiTotali * 100) / dribblingTentatiTotali
                : 50;

        int partiteGiocateSquadra = comuni.stream().mapToInt(StatisticaGiocatore::getPresenze).max().orElse(0);

        KpiSquadraDto kpi = KpiSquadraDto.builder()
                .golFatti(golTotaliSquadra)
                .golSubiti(assistTotali)
                .partiteGiocate(partiteGiocateSquadra)
                .vittorie(golTotaliSquadra > 0 ? (int) (partiteGiocateSquadra * 0.6) : 0)
                .pareggi(golTotaliSquadra > 0 ? (int) (partiteGiocateSquadra * 0.2) : 0)
                .sconfitte(golTotaliSquadra > 0 ? (int) (partiteGiocateSquadra * 0.2) : 0)
                .possessoMedio(possessoStimato)
                .precisionePassaggi(precisionePassaggiMedia)
                .ammonizioniTotali(ammonizioniTotali)
                .espulsioniTotali(espulsioniTotali)
                .build();

        List<Integer> andamentoGolFatti = movimento.stream()
                .map(StatisticaMovimento::getGolTotali)
                .filter(g -> g > 0)
                .toList();
        if (andamentoGolFatti.isEmpty()) andamentoGolFatti = List.of(0);

        List<Integer> andamentoGolSubiti = comuni.stream()
                .map(StatisticaGiocatore::getAmmonizioni)
                .toList();

        List<MatchRecenteDto> ultimiMatch = List.of(
                MatchRecenteDto.builder().data("Ultima").avv("Avversario A")
                        .gf(golTotaliSquadra / 2).gs(1)
                        .esito(golTotaliSquadra > 2 ? "w" : "d").build()
        );

        return SquadraStatsResponse.builder()
                .kpi(kpi)
                .andamentoGolFatti(andamentoGolFatti)
                .andamentoGolSubiti(andamentoGolSubiti)
                .ultimiMatch(ultimiMatch)
                .build();
    }

    // ── LISTA COMPLETA GIOCATORI PER RADAR/CONFRONTI ────────────────────────
    // Per i portieri: gol=0, tiri=0, e vengono valorizzati parate/cleanSheet.
    @Transactional(readOnly = true)
    public List<GiocatoreCompletoStatsDto> getStatisticheTuttiGiocatori() {
        List<Giocatore> giocatori = giocatoreRepo.findAll();
        List<GiocatoreCompletoStatsDto> risultato = new ArrayList<>();

        for (Giocatore g : giocatori) {
            StatisticaGiocatore s = statGiocatoreRepo.findByGiocatore_Id(g.getId())
                    .orElse(new StatisticaGiocatore());

            int pctPassaggi  = s.getPassaggiTentati() > 0 ? (s.getPassaggiRiusciti() * 100) / s.getPassaggiTentati() : 0;
            int pctDribbling = s.getDribblingTentati() > 0 ? (s.getDribblingRiusciti() * 100) / s.getDribblingTentati() : 0;

            int totaliDuelli = s.getDuelliVinti() + s.getDuelliPersi();
            int pctDuelli = totaliDuelli > 0 ? (s.getDuelliVinti() * 100) / totaliDuelli : 0;

            boolean portiere = g.isPortiere();
            int gol = 0, tiri = 0, parate = 0, cleanSheet = 0;

            if (portiere) {
                StatisticaPortiere p = statPortiereRepo.findByGiocatore_Id(g.getId()).orElse(new StatisticaPortiere());
                parate     = p.getParate();
                cleanSheet = p.getCleanSheet();
            } else {
                StatisticaMovimento m = statMovimentoRepo.findByGiocatore_Id(g.getId()).orElse(new StatisticaMovimento());
                gol  = m.getGolTotali();
                tiri = m.getTiriTotali();
            }

            GiocatoreCompletoStatsDto dto = GiocatoreCompletoStatsDto.builder()
                    .nome(getMinuscoloNomeCognomeFormattato(g.getNome(), g.getCognome()))
                    .portiere(portiere)
                    .pres(s.getPresenze())
                    .gol(gol)
                    .ass(s.getAssist())
                    .tiri(tiri)
                    .pass(pctPassaggi)
                    .drib(pctDribbling)
                    .duelli(pctDuelli)
                    .intercetti(s.getPalloniIntercettati())
                    .amm(s.getAmmonizioni())
                    .esp(s.getEspulsioni())
                    .parate(parate)
                    .cleanSheet(cleanSheet)
                    .build();

            risultato.add(dto);
        }
        return risultato;
    }

    public Giocatore get(Integer id) {
        return giocatoreRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Giocatore", Long.valueOf(id)));
    }

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
                .puntiSettimanali(g.getPunti_settimanali())
                .puntiTotali(g.getPunti_totali())
                .squadraId(g.getSquadra() != null ? g.getSquadra().getId() : null)
                .utenteId(g.getUtente()   != null ? g.getUtente().getId()  : null)
                .build();
    }

    private String getMinuscoloNomeCognomeFormattato(String nome, String cognome) {
        if (nome == null || nome.isEmpty()) return cognome;
        return nome.substring(0, 1).toUpperCase() + ". " + cognome;
    }

    // ── CREAZIONE GIOCATORE ──────────────────────────────────────────────────
    // Crea sempre la riga comune (statistica_giocatore) e, in base alla
    // posizione indicata nella request, la riga movimento OPPURE portiere.
    @Transactional
    public GiocatoreDto creaGiocatore(CreaGiocatoreRequest req) {
        var squadra = squadraRepo.findById(req.getSquadraId())
                .orElseThrow(() -> new ResourceNotFoundException("Squadra", Long.valueOf(req.getSquadraId())));

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
        g.setPunti_settimanali(0);
        g.setPunti_totali(0);
        g.setSquadra(squadra);

        Giocatore salvato = giocatoreRepo.save(g);

        // Riga comune, sempre creata
        StatisticaGiocatore comune = new StatisticaGiocatore();
        comune.setGiocatore(salvato);
        statGiocatoreRepo.save(comune);

        // Riga specifica in base al ruolo
        if (salvato.isPortiere()) {
            creaStatisticaPortiereVuota(salvato);
        } else {
            creaStatisticaMovimentoVuota(salvato);
        }

        return toDto(salvato);
    }

    // ── HELPER: crea la riga movimento/portiere vuota se manca ─────────────
    // Usati sia in creazione sia come fallback lazy (es. giocatore importato
    // via SQL senza le righe di dettaglio, o creato prima di questa modifica).
    private StatisticaMovimento creaStatisticaMovimentoVuota(Giocatore g) {
        StatisticaMovimento m = new StatisticaMovimento();
        m.setGiocatore(g);
        return statMovimentoRepo.save(m);
    }

    private StatisticaPortiere creaStatisticaPortiereVuota(Giocatore g) {
        StatisticaPortiere p = new StatisticaPortiere();
        p.setGiocatore(g);
        return statPortiereRepo.save(p);
    }
}