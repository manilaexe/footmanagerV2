package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

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

    // Nel DB: "esito" (boolean/tinyint), non "corretta"
    @Column(name = "corretta", nullable = false)
    private boolean corretta;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_giocatore")
    private Giocatore giocatore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_quiz")
    private Quiz quiz;

    @PrePersist
    protected void onCreate() {
        if (rispostaData == null) rispostaData = LocalDateTime.now();
    }
}
