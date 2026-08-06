package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messaggio")
@Getter @Setter @NoArgsConstructor
public class Messaggio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_messaggio")
    private Integer id;

    @Column(name = "testo", nullable = false, columnDefinition = "TEXT")
    private String testo;

    @Column(name = "data_ora", nullable = false)
    private LocalDateTime dataOra;

    // "INVIATO" oppure "LETTO"
    @Column(name = "stato", length = 20)
    private String stato = "INVIATO";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_giocatore")
    private Giocatore giocatore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_allenatore")
    private Allenatore allenatore;

    // Chi ha davvero scritto il messaggio (utente autenticato al momento
    // dell'invio) — distinto da "allenatore" sopra, che serve solo a risalire
    // alla squadra quando si invia "per ruolo". Con questo campo l'allenatore
    // vede solo i propri messaggi, mentre STAFF/IT vedono tutto.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_utente_mittente")
    private Utente utenteMittente;

    @PrePersist
    protected void onCreate() {
        if (dataOra == null) dataOra = LocalDateTime.now();
        if (stato   == null) stato   = "INVIATO";
    }

    public boolean isLetto() { return "LETTO".equalsIgnoreCase(stato); }
}