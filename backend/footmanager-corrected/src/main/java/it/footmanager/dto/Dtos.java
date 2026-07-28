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
    }

    @Data
    public static class InviaMessaggioRequest {
        @NotNull  private Integer giocatoreId;
        @NotBlank private String  testo;
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
    @Data @Builder
    public static class QuizDto {
        private Integer id;
        private String  domanda;
        private String  rispostaCorretta;
        private String  opzione2;   // mappa su opzione_b
        private String  opzione3;   // mappa su opzione_c
        private int     puntiValore;
        private boolean giaRisposto;
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
    }

    // ── Badge (icona è BLOB -> esposta come Base64 String nel DTO) ───────
    @Data @Builder
    public static class BadgeDto {
        private Integer id;
        private String  nomeBadge;
        private int     sogliaPunti;
        private String  iconaBase64;   // null se il giocatore non ha ancora icona caricata
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
}