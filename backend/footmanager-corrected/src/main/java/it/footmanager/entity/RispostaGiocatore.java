package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * IMPORTANTE — schema reale (gamification.sql):
 * la tabella risposta_utente ha DUE colonne booleane: `esito` (NOT NULL,
 * senza default) e `corretta` (NOT NULL, default 0). Sono duplicate per un
 * refuso di migrazione, ma `esito` non avendo default va sempre valorizzata
 * esplicitamente, altrimenti MySQL (strict mode) rifiuta l'INSERT con
 * "Field 'esito' doesn't have a default value" — causa dei 500 su ogni
 * tentativo di risposta al quiz.
 */
@Entity
@Table(name = "risposta_utente")
@Getter @Setter @NoArgsConstructor
public class RispostaGiocatore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_risposta")
    private Integer id;

    @Column(name = "risposta_data", nullable = false)
    private LocalDateTime rispostaData;

    @Column(name = "secondi_impiegati")
    private Integer secondiImpiegati;

    @Column(name = "corretta", nullable = false)
    private boolean corretta;

    // Colonna legacy duplicata, NOT NULL senza default: va sempre allineata
    // a "corretta" prima del salvataggio (vedi setCorrettaESincronizza / @PrePersist).
    @Column(name = "esito", nullable = false)
    private boolean esito;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_giocatore")
    private Giocatore giocatore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_quiz")
    private Quiz quiz;

    /** Imposta corretta e mantiene automaticamente allineata la colonna legacy esito. */
    public void setCorretta(boolean corretta) {
        this.corretta = corretta;
        this.esito = corretta;
    }

    @PrePersist
    protected void onCreate() {
        if (rispostaData == null) rispostaData = LocalDateTime.now();
        // Sicurezza extra: se per qualche motivo esito non è stato allineato
        // (es. settato corretta direttamente sul campo), lo risincronizziamo.
        this.esito = this.corretta;
    }
}