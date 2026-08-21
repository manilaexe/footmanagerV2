package it.footmanager.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class Dtos {

    // ── Utente ────────────────────────────────────────────────────────────
    @Data @Builder
    public static class UtenteDto {
        private Integer id;
        private String  username;
        private String  ruolo;   // nome dell'enum NomeRuolo
    }

    @Data
    public static class CreaUtenteRequest {
        @NotBlank private String username;
        @NotBlank private String password;
        @NotBlank private String nomeRuolo;   // "STAFF" | "ALLENATORE" | "GIOCATORE" | "DIRIGENZA" | "IT"
        private String  nome;
        private String  cognome;
        private Integer squadraId;
        // Valorizzati solo quando nomeRuolo = "GIOCATORE"; ignorati per gli altri ruoli.
        private String    posizione;    // es. "Attaccante", "Portiere"...
        private String    piede;        // "Destro" | "Sinistro" | "Ambidestro"
        private String    nazionalita;
        private Integer   altezza;      // cm
        private Integer   peso;         // kg
        private Integer   numero;       // numero di maglia
        private LocalDate dataNascita;
    }

    // ── Giocatore ─────────────────────────────────────────────────────────
    @Data @Builder
    public static class GiocatoreDto {
        private Integer  id;
        private String   nome;
        private String   cognome;
        private Integer  numero;
        private String   posizione;
        private String   piede;
        private String   nazionalita;
        private Integer  altezza;
        private Integer  peso;
        private String   img;
        private LocalDate dataNascita;
        private Integer  puntiSettimanali;
        private Integer  puntiTotali;
        private Integer  squadraId;
        private Integer  utenteId;
    }

    @Data
    public static class CreaGiocatoreRequest {
        @NotBlank private String nome;
        @NotBlank private String cognome;
        private Integer   numero;
        private String    posizione;
        private String    piede;
        private String    nazionalita;
        private Integer   altezza;
        private Integer   peso;
        private LocalDate dataNascita;
        @NotNull  private Integer squadraId;
    }

    // ── Statistiche ───────────────────────────────────────────────────────
    // Il DB ora divide le statistiche in 3 tabelle:
    //   statistica_giocatore  → dati comuni a tutti (sempre presenti)
    //   statistica_movimento  → solo per chi NON è portiere (gol, tiri, cross...)
    //   statistica_portiere   → solo per i portieri (parate, clean sheet...)
    // Questo DTO li appiattisce in un'unica risposta: i campi non pertinenti
    // al ruolo del giocatore restano a 0. Il flag "portiere" dice al frontend
    // quale blocco (movimento vs portiere) mostrare.
    @Data @Builder
    public static class StatisticheDto {
        private Integer giocatoreId;
        private boolean portiere;   // true se il giocatore è un portiere

        // ── Comuni (statistica_giocatore) ──
        private int presenze;          private int presenzeTitolare; private int minutiGiocati;
        private int assist;
        private int passaggiTentati;   private int passaggiRiusciti; private int passaggiChiave;
        private int dribblingTentati;  private int dribblingRiusciti;
        private int duelliVinti;       private int duelliPersi;
        private int duelliAereiVinti;  private int duelliAereiPersi;
        private int palloniIntercettati;
        private int falliCommessi;     private int falliSubiti;
        private int ammonizioni;       private int espulsioni;

        // ── Movimento (statistica_movimento) — valorizzati solo se !portiere ──
        private int goalRigore;        private int goalTesta;        private int goalPunizione;
        private int golTotali;
        private int tiriTotali;        private int tiriInPorta;
        private int paliTraverse;      private int bigChanceMancate; private int bigChanceCreate;
        private int crossTentati;      private int crossRiusciti;
        private int tackle;            private int palloniRubati;

        // ── Portiere (statistica_portiere) — valorizzati solo se portiere ──
        private int parate;            private int cleanSheet;
        private int goalSubiti;        private int rigoriParati;     private int rigoriSubiti;
    }

    @Data
    public static class AggiornaStatisticheRequest {
        // ── Comuni ──
        private Integer presenze;          private Integer presenzeTitolare; private Integer minutiGiocati;
        private Integer assist;
        private Integer passaggiTentati;   private Integer passaggiRiusciti; private Integer passaggiChiave;
        private Integer dribblingTentati;  private Integer dribblingRiusciti;
        private Integer duelliVinti;       private Integer duelliPersi;
        private Integer duelliAereiVinti;  private Integer duelliAereiPersi;
        private Integer palloniIntercettati;
        private Integer falliCommessi;     private Integer falliSubiti;
        private Integer ammonizioni;       private Integer espulsioni;

        // ── Movimento (ignorati se il giocatore è portiere) ──
        private Integer goalRigore;        private Integer goalTesta;        private Integer goalPunizione;
        private Integer tiriTotali;        private Integer tiriInPorta;
        private Integer paliTraverse;      private Integer bigChanceMancate; private Integer bigChanceCreate;
        private Integer crossTentati;      private Integer crossRiusciti;
        private Integer tackle;            private Integer palloniRubati;

        // ── Portiere (ignorati se il giocatore non è portiere) ──
        private Integer parate;            private Integer cleanSheet;
        private Integer goalSubiti;        private Integer rigoriParati;     private Integer rigoriSubiti;
    }

    // ── Evento ────────────────────────────────────────────────────────────
    @Data @Builder
    public static class EventoDto {
        private Integer       id;
        private String        titolo;
        private String        tipo;     // ALLENAMENTO | PARTITA | RIUNIONE | ALTRO
        private LocalDateTime dataOraInizio;
        private LocalDateTime dataOraFine;
        private String        luogo;
    }

    @Data
    public static class CreaEventoRequest {
        @NotBlank private String        titolo;
        @NotNull  private LocalDateTime dataOraInizio;
        @NotNull  private LocalDateTime dataOraFine;
        private String  tipo;
        private String  luogo;
        @NotNull private Integer calendarioId;
    }

    // ── Messaggio ─────────────────────────────────────────────────────────
    @Data @Builder
    public static class MessaggioDto {
        private Integer       id;
        private String        testo;
        private LocalDateTime dataOra;
        private String        stato;          // "INVIATO" | "LETTO"
        private String        nomeAllenatore;
        private String        nomeGiocatore;
        private Integer       giocatoreId;    // aggiunto: utile al frontend per raggruppare
        private String        mittenteNome;   // nome di chi ha davvero scritto il messaggio
        private String        mittenteRuolo;  // "ALLENATORE" | "STAFF" | "IT" | ...
    }

    @Data
    public static class InviaMessaggioRequest {
        @NotNull  private Integer giocatoreId;
        @NotBlank private String  testo;
    }

    // Richiesta per inviare lo stesso messaggio a tutti i giocatori di un ruolo
    // (es. "Portiere", "Difensore", "Centrocampista", "Attaccante") della propria squadra.
    @Data
    public static class InviaMessaggioRuoloRequest {
        @NotBlank private String ruolo;
        @NotBlank private String testo;
    }

    /**
     * DTO leggero usato per popolare il <select> destinatari nel form
     * di composizione messaggi — restituito da GET /api/messaggi/giocatori-squadra
     */
    @Data @Builder
    public static class GiocatoreSelectDto {
        private Integer id;
        private String  nomeCompleto;   // "Nome Cognome"
        private String  posizione;      // es. "Attaccante"
        private Integer numero;         // numero di maglia
    }

    // ── Quiz (risposta_corretta + opzione_b + opzione_c) ─────────────────
    // DTO "legacy" usato dagli endpoint generici (lista completa, admin/staff).
    // Espone anche rispostaCorretta: NON va usato per il flusso giocatore,
    // altrimenti la risposta giusta arriverebbe già nel payload iniziale.
    @Data @Builder
    public static class QuizDto {
        private Integer id;
        private String  domanda;
        private String  rispostaCorretta;   // testo risolto, non la lettera grezza del DB
        private String  opzioneA;           // mappa su opzione_a
        private String  opzione2;           // mappa su opzione_b
        private String  opzione3;           // mappa su opzione_c
        private int     puntiValore;
        private boolean giaRisposto;
    }

    // ── Quiz — vista amministrazione (pannello STAFF/IT) ──────────────────
    // A differenza di QuizDto/QuizGiornalieroDto (che nascondono la risposta
    // corretta al giocatore prima che risponda), qui viene sempre esposta —
    // serve per gestire le domande, non per giocare. La risposta corretta è
    // la LETTERA 'A'/'B'/'C' (coerente con lo schema reale gamification.sql),
    // non il testo risolto.
    @Data @Builder
    public static class QuizAdminDto {
        private Integer id;
        private String  domanda;
        private String  opzioneA;
        private String  opzioneB;
        private String  opzioneC;
        private String  rispostaCorretta;   // 'A' | 'B' | 'C'
        private int     puntiValore;
    }

    // Richiesta di creazione/modifica di una domanda dal pannello admin.
    // rispostaCorretta è la LETTERA che indica quale opzione è quella giusta,
    // NON il testo — se si scrivesse il testo qui si romperebbe il quiz del
    // giorno per i giocatori (Quiz.getTestoRispostaCorretta() si aspetta
    // sempre una lettera in questa colonna).
    @Data
    public static class CreaQuizRequest {
        @NotBlank private String domanda;
        @NotBlank private String opzioneA;
        @NotBlank private String opzioneB;
        @NotBlank private String opzioneC;
        @NotBlank
        @Pattern(regexp = "(?i)^[ABC]$", message = "La risposta corretta deve essere 'A', 'B' o 'C'")
        private String rispostaCorretta;
        @Min(0) private int puntiValore;
    }

    @Data
    public static class RispostaQuizRequest {
        @NotNull  private Integer quizId;
        @NotBlank private String  rispostaScelta;
        @Min(0)   private int     secondiImpiegati;
    }

    @Data @Builder
    public static class RispostaQuizResponse {
        private boolean        corretta;
        private int            puntiAssegnati;
        private List<BadgeDto> nuoviBadge;
        // Aggiunti per il flusso "quiz del giorno":
        private String         rispostaCorretta;   // testo dell'opzione giusta, per il feedback
        private Integer        puntiTotali;         // nuovo totale del giocatore dopo l'assegnazione
        private Integer        puntiSettimanali;    // nuovo totale settimanale del giocatore
    }

    // ── Gamification: QUIZ DEL GIORNO ─────────────────────────────────────
    // Esposto al giocatore SENZA rivelare quale opzione sia corretta finché
    // non ha risposto. Le opzioni sono mescolate in modo deterministico
    // (stesso ordine per tutta la giornata, diverso ogni giorno).
    @Data @Builder
    public static class QuizGiornalieroDto {
        private Integer      id;
        private String       domanda;
        private List<String> opzioni;           // mescolate, senza indicare quale è corretta
        private int          puntiValore;
        private boolean      giaRisposto;
        // Valorizzati SOLO se giaRisposto = true (per mostrare l'esito al reload):
        private Boolean      rispostaCorretta;   // true/false se aveva risposto giusto/sbagliato
        private String       rispostaScelta;     // cosa aveva scelto il giocatore
        private String       soluzioneTesto;     // testo dell'opzione corretta
    }

    // Richiesta semplificata: il giocatore NON specifica quale quiz sta
    // rispondendo — lo deduce sempre il server dalla data odierna, per
    // evitare che si possa rispondere a un quizId arbitrario (cheat).
    @Data
    public static class RispondiQuizGiornalieroRequest {
        @NotBlank private String rispostaScelta;
        @Min(0)   private int    secondiImpiegati;
    }

    // ── Badge (icona è BLOB -> esposta come Base64 String nel DTO) ───────
    @Data @Builder
    public static class BadgeDto {
        private Integer id;
        private String  nomeBadge;
        private int     sogliaPunti;
        private String  iconaBase64;   // null se il giocatore non ha ancora icona caricata
    }

    // Richiesta di creazione/modifica badge (pannello STAFF/IT).
    // L'icona, se fornita, arriva come stringa Base64 e viene decodificata in BLOB.
    @Data
    public static class CreaBadgeRequest {
        @NotBlank private String nomeBadge;
        private int    sogliaPunti;
        private String iconaBase64;
    }

    // Badge ottenuto da un giocatore specifico, con data di ottenimento
    // (usato sia dalla vista Classifica del giocatore che dal pannello IT)
    @Data @Builder
    public static class GiocatoreBadgeDto {
        private Integer       giocatoreId;
        private String        giocatoreNomeCompleto;
        private Integer       badgeId;
        private String        nomeBadge;
        private LocalDateTime dataOttenimento;
    }

    // ── Classifica ────────────────────────────────────────────────────────
    @Data @Builder
    public static class ClassificaItemDto {
        private int     posizione;
        private Integer giocatoreId;
        private String  nome;
        private String  cognome;
        private long    risposteCorrette;
        private Integer puntiSettimanali;
        private Integer puntiTotali;
    }

    // ── PER LE STATISTICHE SQUADRA E CONFRONTI ──
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SquadraStatsResponse {
        private KpiSquadraDto kpi;
        private List<Integer> andamentoGolFatti;
        private List<Integer> andamentoGolSubiti;
        private List<MatchRecenteDto> ultimiMatch;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class KpiSquadraDto {
        private int golFatti;
        private int golSubiti;
        private int partiteGiocate;
        private int vittorie;
        private int pareggi;
        private int sconfitte;
        private int possessoMedio;
        private int precisionePassaggi;
        private int ammonizioniTotali;
        private int espulsioniTotali;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MatchRecenteDto {
        private String data;
        private String avv;
        private int gf;
        private int gs;
        private String esito; // "w" | "d" | "l"
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class GiocatoreCompletoStatsDto {
        private String nome;
        private boolean portiere;
        private int pres;
        private int gol;         // 0 per i portieri
        private int ass;
        private int tiri;        // 0 per i portieri
        private int pass;       // Percentuale passaggi riusciti
        private int drib;       // Percentuale dribbling réussiti
        private int duelli;     // Percentuale duelli vinti
        private int intercetti;
        private int amm;
        private int esp;
        // Valorizzati solo se portiere = true
        private int parate;
        private int cleanSheet;
    }

    // ══════════════════════════════════════════════════════════════════════
    // DASHBOARD AGGREGATA — un DTO per ruolo, un'unica chiamata invece di
    // 5-6 richieste separate per riempire la pagina "Dashboard".
    // ══════════════════════════════════════════════════════════════════════

    // Riga sintetica di rosa mostrata nella preview della dashboard allenatore
    // (la tabella completa resta sulla pagina "Rosa" dedicata).
    @Data @Builder
    public static class RosaRigaDto {
        private Integer id;
        private String  nome;
        private String  cognome;
        private String  posizione;
        private int     presenze;
        private int     minutiGiocati;
    }

    @Data @Builder
    public static class DashboardAllenatoreDto {
        private int                numeroGiocatori;
        private EventoDto          prossimoEvento;      // null se non ce ne sono
        private int                messaggiInviati;
        private List<RosaRigaDto>  rosa;                // preview, primi N giocatori
        private List<EventoDto>    prossimiEventi;       // preview
        private List<MessaggioDto> ultimiMessaggi;       // preview
    }

    @Data @Builder
    public static class DashboardGiocatoreDto {
        private GiocatoreDto             giocatore;
        // Riusa il DTO del sistema "quiz del giorno" già esistente: non rivela
        // mai la risposta corretta finché il giocatore non ha risposto oggi.
        private QuizGiornalieroDto       quizDelGiorno;
        private StatisticheDto           statistiche;
        private List<MessaggioDto>       messaggiDallAllenatore;   // preview
        private List<EventoDto>          prossimiEventi;           // preview
        private List<ClassificaItemDto>  classificaSettimanale;
        private List<BadgeDto>           badgeOttenuti;
    }

    @Data @Builder
    public static class DashboardDirigenzaDto {
        private int                     numeroGiocatori;
        private SquadraStatsResponse    performanceSquadra;
        private List<ClassificaItemDto> classificaInterna;
        private EventoDto               prossimoEvento;   // null se non ce ne sono
        private List<EventoDto>         prossimiEventi;   // preview
    }

    @Data @Builder
    public static class DashboardItDto {
        private long numeroUtenti;
        private long numeroGiocatori;
        private long numeroAllenatori;
        private long numeroSquadre;
        private long numeroQuiz;
        private long numeroBadge;
        private long numeroMessaggi;
        private long numeroEventi;
    }

    // ══════════════════════════════════════════════════════════════════════
    // SQUADRE — CRUD riservato a STAFF/IT (pannello di gestione club)
    // ══════════════════════════════════════════════════════════════════════
    @Data @Builder
    public static class SquadraDto {
        private Integer id;
        private String  nome;
        private String  categoria;
        private int     numeroGiocatori;   // calcolato, non persistito
    }

    @Data
    public static class CreaSquadraRequest {
        @NotBlank private String nome;
        private String categoria;
    }

    // ══════════════════════════════════════════════════════════════════════
    // ALLENATORE — DTO minimale per esporre il profilo (/api/utenti/me/allenatore)
    // senza restituire l'entity JPA grezza (rischio LazyInitializationException
    // e struttura interna del DB esposta direttamente).
    // ══════════════════════════════════════════════════════════════════════
    @Data @Builder
    public static class AllenatoreDto {
        private Integer id;
        private String  nome;
        private String  cognome;
        private Integer squadraId;
        private Integer utenteId;
    }

    // ══════════════════════════════════════════════════════════════════════
    // Riepilogo per il blocco in alto della pagina Calendario: eventi del
    // mese (con scomposizione per tipo), prossimi eventi, prossima partita.
    // ══════════════════════════════════════════════════════════════════════
    @Data @Builder
    public static class CalendarioRiepilogoDto {
        private int eventiDelMese;
        private int numPartite;
        private int numAllenamenti;
        private int numRiunioni;
        private int numAltro;
        private List<EventoDto> prossimiEventi;   // prossimi 5, non limitati al mese corrente
        private EventoDto       prossimaPartita;  // null se nessuna partita futura pianificata
    }
    // ── Log Sistema ────────────────────────────────────────────────────────
    @Data @Builder
    public static class LogSistemaDto {
        private Long          id;
        private LocalDateTime timestamp;
        private String        livello;
        private String        utente;
        private String        ruolo;
        private String        modulo;
        private String        azione;
        private String        dettagli;
        private String        ipAddress;
    }
}