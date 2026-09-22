package it.footmanager.service;

import it.footmanager.dto.PerformanceDtos.*;
import it.footmanager.external.FootballJsonClient;
import it.footmanager.external.FootballJsonModels.MatchRaw;
import it.footmanager.external.FootballJsonModels.StagioneRaw;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Cuore della funzionalita': prende le partite grezze dall'API e ne ricava
 * classifica e KPI.
 *
 * NOTA IMPORTANTE: openfootball NON fornisce una classifica gia' pronta,
 * fornisce solo l'elenco delle partite con i risultati. La classifica la
 * calcoliamo qui (3 punti a vittoria, 1 a pareggio, 0 a sconfitta).
 */
@Service
@RequiredArgsConstructor
public class SerieAStatsService {

    private final FootballJsonClient client;

    @Value("${app.external.squadra-nome}")   private String squadraNome;
    @Value("${app.external.squadra-alias}")  private String squadraAlias;   // separati da virgola
    @Value("${app.external.ppm-champions:2.0}") private double ppmChampions;
    @Value("${app.external.ppm-scudetto:2.3}")  private double ppmScudetto;

    private static final int GIORNATE_STAGIONE = 38;

    /* =====================================================================
       UTILITY DI CONFRONTO NOMI SQUADRA
       Il JSON puo' scrivere "Juventus", "Juventus FC", "Juventus Turin"...
       quindi normalizziamo e confrontiamo in modo tollerante.
       ===================================================================== */
    private static String norm(String s) {
        return s == null ? "" : s.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private List<String> alias() {
        List<String> out = new ArrayList<>();
        out.add(norm(squadraNome));
        if (squadraAlias != null && !squadraAlias.isBlank()) {
            for (String a : squadraAlias.split(",")) {
                if (!a.isBlank()) out.add(norm(a));
            }
        }
        return out;
    }

    /** true se il nome passato identifica la NOSTRA squadra. */
    private boolean eNostra(String nomeSquadra) {
        String n = norm(nomeSquadra);
        for (String a : alias()) {
            if (!a.isEmpty() && (n.equals(a) || n.contains(a) || a.contains(n))) return true;
        }
        return false;
    }

    /* =====================================================================
       ACCESSORI DI BASE
       ===================================================================== */

    /** true se la partita ha un risultato valido (quindi e' gia' stata giocata). */
    private static boolean giocata(MatchRaw m) {
        return it.footmanager.external.FootballJsonModels.golFullTime(m.score()) != null;
    }

    private static int golCasa(MatchRaw m)      { return it.footmanager.external.FootballJsonModels.golFullTime(m.score())[0]; }
    private static int golTrasferta(MatchRaw m) { return it.footmanager.external.FootballJsonModels.golFullTime(m.score())[1]; }

    /** Le partite della nostra squadra, ordinate per data crescente. */
    private List<MatchRaw> partiteNostre(StagioneRaw s) {
        return s.matches().stream()
                .filter(m -> eNostra(m.team1()) || eNostra(m.team2()))
                .sorted(Comparator.comparing(m -> m.date() == null ? "" : m.date()))
                .toList();
    }

    /* =====================================================================
       1. CLASSIFICA COMPLETA CALCOLATA DAI RISULTATI
       ===================================================================== */

    /** Contatore mutabile usato solo durante il calcolo. */
    private static class Acc {
        String squadra; int g, v, n, p, gf, gs;
        int punti() { return v * 3 + n; }
        int diff()  { return gf - gs; }
    }

    public List<RigaClassificaDto> classificaCompleta() {
        StagioneRaw s = client.scaricaStagione();
        Map<String, Acc> tab = new LinkedHashMap<>();

        for (MatchRaw m : s.matches()) {
            if (!giocata(m)) continue;

            Acc casa  = tab.computeIfAbsent(m.team1(), k -> { Acc a = new Acc(); a.squadra = k; return a; });
            Acc ospite = tab.computeIfAbsent(m.team2(), k -> { Acc a = new Acc(); a.squadra = k; return a; });

            int gc = golCasa(m), gt = golTrasferta(m);

            casa.g++;   casa.gf += gc;   casa.gs += gt;
            ospite.g++; ospite.gf += gt; ospite.gs += gc;

            if (gc > gt)      { casa.v++; ospite.p++; }
            else if (gc < gt) { casa.p++; ospite.v++; }
            else              { casa.n++; ospite.n++; }
        }

        // Ordinamento: punti desc, differenza reti desc, gol fatti desc, nome asc
        List<Acc> ordinata = tab.values().stream()
                .sorted(Comparator.comparingInt(Acc::punti).reversed()
                        .thenComparing(Comparator.comparingInt(Acc::diff).reversed())
                        .thenComparing(Comparator.comparingInt((Acc a) -> a.gf).reversed())
                        .thenComparing(a -> a.squadra))
                .toList();

        int puntiPrima  = ordinata.isEmpty() ? 0 : ordinata.get(0).punti();
        int puntiQuinta = ordinata.size() >= 5 ? ordinata.get(4).punti() : 0;

        List<RigaClassificaDto> out = new ArrayList<>();
        for (int i = 0; i < ordinata.size(); i++) {
            Acc a = ordinata.get(i);
            out.add(RigaClassificaDto.builder()
                    .posizione(i + 1)
                    .squadra(a.squadra)
                    .giocate(a.g).vinte(a.v).pareggiate(a.n).perse(a.p)
                    .golFatti(a.gf).golSubiti(a.gs)
                    .differenzaReti(a.diff())
                    .punti(a.punti())
                    .ppm(a.g == 0 ? 0 : arrotonda((double) a.punti() / a.g))
                    .nostraSquadra(eNostra(a.squadra))
                    .distaccoDaPrima(puntiPrima - a.punti())
                    .distaccoDaQuinta(a.punti() - puntiQuinta)
                    .build());
        }
        return out;
    }

    private static double arrotonda(double d) {
        return Math.round(d * 100.0) / 100.0;
    }

    /* =====================================================================
       2. KPI REALI
       ===================================================================== */
    private KpiRealiDto kpi(List<RigaClassificaDto> classifica) {
        RigaClassificaDto noi = classifica.stream()
                .filter(RigaClassificaDto::isNostraSquadra)
                .findFirst()
                .orElse(null);

        if (noi == null) {
            // La squadra configurata non compare nel dataset (nome sbagliato o
            // stagione non ancora iniziata): restituiamo KPI vuoti invece di
            // far esplodere la pagina.
            return KpiRealiDto.builder().squadra(squadraNome).build();
        }

        int proiettati = noi.getGiocate() == 0
                ? 0
                : (int) Math.round(noi.getPpm() * GIORNATE_STAGIONE);

        return KpiRealiDto.builder()
                .squadra(noi.getSquadra())
                .posizione(noi.getPosizione())
                .punti(noi.getPunti())
                .giocate(noi.getGiocate())
                .ppm(noi.getPpm())
                .golFatti(noi.getGolFatti())
                .golSubiti(noi.getGolSubiti())
                .differenzaReti(noi.getDifferenzaReti())
                .distaccoDaPrima(noi.getDistaccoDaPrima())
                .distaccoDaQuinta(noi.getDistaccoDaQuinta())
                .puntiProiettati(proiettati)
                .build();
    }

    /* =====================================================================
       3. TREND CUMULATIVO PUNTI
       ===================================================================== */
    private List<PuntoTrendDto> trend(StagioneRaw s) {
        List<PuntoTrendDto> out = new ArrayList<>();
        int cumulati = 0, giornata = 0;

        for (MatchRaw m : partiteNostre(s)) {
            if (!giocata(m)) continue;
            giornata++;

            boolean inCasa  = eNostra(m.team1());
            int nostri      = inCasa ? golCasa(m) : golTrasferta(m);
            int loro        = inCasa ? golTrasferta(m) : golCasa(m);
            String avversario = inCasa ? m.team2() : m.team1();

            String esito;
            if (nostri > loro)      { esito = "V"; cumulati += 3; }
            else if (nostri == loro){ esito = "N"; cumulati += 1; }
            else                    { esito = "P"; }

            out.add(PuntoTrendDto.builder()
                    .giornata(giornata)
                    .avversario(avversario)
                    .esito(esito)
                    .puntiCumulati(cumulati)
                    .passoChampions((int) Math.round(ppmChampions * giornata))
                    .passoScudetto((int) Math.round(ppmScudetto  * giornata))
                    .build());
        }
        return out;
    }

    /* =====================================================================
       4. AGGREGATORE RIUTILIZZABILE (big match + casa/trasferta)
       ===================================================================== */
    private BloccoAggregatoDto aggrega(String etichetta, List<MatchRaw> partite) {
        int g = 0, v = 0, n = 0, p = 0, gf = 0, gs = 0;

        for (MatchRaw m : partite) {
            if (!giocata(m)) continue;
            boolean inCasa = eNostra(m.team1());
            int nostri = inCasa ? golCasa(m) : golTrasferta(m);
            int loro   = inCasa ? golTrasferta(m) : golCasa(m);

            g++; gf += nostri; gs += loro;
            if (nostri > loro) v++;
            else if (nostri == loro) n++;
            else p++;
        }

        int punti = v * 3 + n;
        return BloccoAggregatoDto.builder()
                .etichetta(etichetta)
                .giocate(g).vinte(v).pareggiate(n).perse(p)
                .golFatti(gf).golSubiti(gs)
                .punti(punti)
                .ppm(g == 0 ? 0 : arrotonda((double) punti / g))
                .build();
    }

    /* =====================================================================
       5. FORM GUIDE — ULTIMI 10 TURNI
       ===================================================================== */
    private List<FormMatchDto> formGuide(StagioneRaw s, int quante) {
        List<MatchRaw> giocate = partiteNostre(s).stream()
                .filter(SerieAStatsService::giocata)
                .toList();

        int da = Math.max(0, giocate.size() - quante);
        List<FormMatchDto> out = new ArrayList<>();

        for (MatchRaw m : giocate.subList(da, giocate.size())) {
            boolean inCasa = eNostra(m.team1());
            int nostri = inCasa ? golCasa(m) : golTrasferta(m);
            int loro   = inCasa ? golTrasferta(m) : golCasa(m);

            out.add(FormMatchDto.builder()
                    .data(m.date())
                    .avversario(inCasa ? m.team2() : m.team1())
                    .inCasa(inCasa)
                    .golNostri(nostri)
                    .golAvversari(loro)
                    .esito(nostri > loro ? "V" : nostri == loro ? "N" : "P")
                    .round(m.round())
                    .build());
        }
        return out;
    }

    /* =====================================================================
       6. METODO PRINCIPALE: assembla tutto per la pagina
       ===================================================================== */
    public PerformanceSquadraDto performanceSquadra() {
        StagioneRaw s = client.scaricaStagione();
        List<RigaClassificaDto> classifica = classificaCompleta();

        // Le "Top 6" NON sono fisse: sono le prime 6 della classifica calcolata
        // in questo momento. Cosi' la pagina si aggiorna da sola.
        List<String> top6 = classifica.stream()
                .limit(6)
                .map(RigaClassificaDto::getSquadra)
                .collect(Collectors.toList());

        List<MatchRaw> nostre = partiteNostre(s);

        List<MatchRaw> controTop6 = nostre.stream()
                .filter(m -> {
                    String avv = eNostra(m.team1()) ? m.team2() : m.team1();
                    return top6.stream().anyMatch(t -> norm(t).equals(norm(avv)));
                }).toList();

        List<MatchRaw> controResto = nostre.stream()
                .filter(m -> {
                    String avv = eNostra(m.team1()) ? m.team2() : m.team1();
                    return top6.stream().noneMatch(t -> norm(t).equals(norm(avv)));
                }).toList();

        List<MatchRaw> inCasa      = nostre.stream().filter(m -> eNostra(m.team1())).toList();
        List<MatchRaw> inTrasferta = nostre.stream().filter(m -> eNostra(m.team2())).toList();

        return PerformanceSquadraDto.builder()
                .nomeStagione(s.name())
                .squadra(squadraNome)
                .fonte(client.urlCorrente())
                .kpi(kpi(classifica))
                .trendPunti(trend(s))
                .bigMatch(List.of(
                        aggrega("Top 6", controTop6),
                        aggrega("Resto", controResto)))
                .formGuide(formGuide(s, 38))
                .verticeClassifica(classifica.stream().limit(6).toList())
                .splitCasaTrasferta(List.of(
                        aggrega("Casa", inCasa),
                        aggrega("Trasferta", inTrasferta)))
                .build();
    }

    /* =====================================================================
       7. PARTITE DELLA NOSTRA SQUADRA (serve all'import nel calendario)
       ===================================================================== */
    public List<MatchEsternoDto> partiteSquadra() {
        StagioneRaw s = client.scaricaStagione();
        List<MatchEsternoDto> out = new ArrayList<>();

        for (MatchRaw m : partiteNostre(s)) {
            boolean g = giocata(m);
            out.add(MatchEsternoDto.builder()
                    .idEsterno(idEsterno(m))
                    .data(m.date())
                    .round(m.round())
                    .squadraCasa(m.team1())
                    .squadraTrasferta(m.team2())
                    .giocata(g)
                    .golCasa(g ? golCasa(m) : null)
                    .golTrasferta(g ? golTrasferta(m) : null)
                    .build());
        }
        return out;
    }

    /**
     * Chiave univoca e DETERMINISTICA di una partita: ricalcolandola domani
     * viene identica, cosi' possiamo capire se l'evento e' gia' in calendario
     * ed evitare i duplicati.
     * Esempio: "2025-08-23-juventus-parma"
     */
    public static String idEsterno(MatchRaw m) {
        return (m.date() == null ? "nodate" : m.date())
                + "-" + norm(m.team1())
                + "-" + norm(m.team2());
    }
}
