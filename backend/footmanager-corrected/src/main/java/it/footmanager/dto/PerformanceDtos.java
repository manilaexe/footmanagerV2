package it.footmanager.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * DTO dedicati alla pagina "Performance squadra" (dati reali Serie A).
 * Li tengo in un file separato da Dtos.java per non toccare codice
 * gia' funzionante: se qualcosa qui va storto, il resto del progetto
 * non ne risente.
 */
public class PerformanceDtos {

    /* ── 1. Riga di classifica (usata sia per la classifica completa sia per la Top 6) ── */
    @Data @Builder
    public static class RigaClassificaDto {
        private int     posizione;
        private String  squadra;
        private int     giocate;
        private int     vinte;
        private int     pareggiate;
        private int     perse;
        private int     golFatti;
        private int     golSubiti;
        private int     differenzaReti;
        private int     punti;
        private double  ppm;              // punti per match
        private boolean nostraSquadra;    // true sulla riga della nostra squadra
        private int     distaccoDaPrima;  // punti di distacco dalla capolista
        private int     distaccoDaQuinta; // >0 sopra la 5a, <0 sotto la 5a
    }

    /* ── 2. KPI principali in testa alla pagina ── */
    @Data @Builder
    public static class KpiRealiDto {
        private String  squadra;
        private int     posizione;
        private int     punti;
        private int     giocate;
        private double  ppm;
        private int     golFatti;
        private int     golSubiti;
        private int     differenzaReti;
        private int     distaccoDaPrima;
        private int     distaccoDaQuinta;
        private int     puntiProiettati;  // proiezione a 38 giornate col ritmo attuale
    }

    /* ── 3. Un punto della curva cumulativa ── */
    @Data @Builder
    public static class PuntoTrendDto {
        private int    giornata;          // 1, 2, 3...
        private String avversario;
        private String esito;             // "V" | "N" | "P"
        private int    puntiCumulati;     // i nostri punti fino a quella giornata
        private int    passoChampions;    // linea di riferimento (soglia Champions)
        private int    passoScudetto;     // linea di riferimento (soglia Scudetto)
    }

    /* ── 4. Blocco di aggregazione riutilizzabile (big match, casa/trasferta) ── */
    @Data @Builder
    public static class BloccoAggregatoDto {
        private String etichetta;         // "Top 6", "Resto", "Casa", "Trasferta"
        private int    giocate;
        private int    vinte;
        private int    pareggiate;
        private int    perse;
        private int    golFatti;
        private int    golSubiti;
        private int    punti;
        private double ppm;
    }

    /* ── 5. Una partita della form guide (ultimi 10 turni) ── */
    @Data @Builder
    public static class FormMatchDto {
        private String  data;             // "2025-11-09"
        private String  avversario;
        private boolean inCasa;
        private int     golNostri;
        private int     golAvversari;
        private String  esito;            // "V" | "N" | "P"
        private String  round;            // "Matchday 12"
    }

    /* ── 6. Partita grezza, usata per l'import nel calendario ── */
    @Data @Builder
    public static class MatchEsternoDto {
        private String  idEsterno;        // chiave univoca anti-duplicati
        private String  data;             // "2026-02-15"
        private String  round;
        private String  squadraCasa;
        private String  squadraTrasferta;
        private boolean giocata;
        private Integer golCasa;          // null se non giocata
        private Integer golTrasferta;     // null se non giocata
    }

    /* ── 7. Risposta completa della pagina: un solo fetch, tutto dentro ── */
    @Data @Builder
    public static class PerformanceSquadraDto {
        private String                   nomeStagione;      // "Serie A 2025/26"
        private String                   squadra;
        private String                   fonte;             // URL dell'API, per trasparenza
        private KpiRealiDto              kpi;
        private List<PuntoTrendDto>      trendPunti;
        private List<BloccoAggregatoDto> bigMatch;          // [Top 6, Resto]
        private List<FormMatchDto>       formGuide;         // ultimi 10
        private List<RigaClassificaDto>  verticeClassifica; // Top 6
        private List<BloccoAggregatoDto> splitCasaTrasferta;// [Casa, Trasferta]
    }

    /* ── 8. Esito dell'importazione partite nel calendario ── */
    @Data @Builder
    public static class ImportCalendarioDto {
        private int          partiteTrovate;
        private int          eventiCreati;
        private int          giaPresenti;
        private List<String> titoliCreati;
    }
}
