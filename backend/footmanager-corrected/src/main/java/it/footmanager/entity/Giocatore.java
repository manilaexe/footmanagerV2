package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "giocatore")
@Getter @Setter @NoArgsConstructor
public class Giocatore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_giocatore")
    private Integer id;

    @Column(name = "nome", nullable = false, length = 50)
    private String nome;

    @Column(name = "cognome", nullable = false, length = 50)
    private String cognome;

    @Column(name = "numero")
    private Integer numero;

    @Column(name = "img", length = 255)
    private String img;

    @Column(name = "piede", length = 10)
    private String piede;

    @Column(name = "posizione", length = 50)
    private String posizione;

    @Column(name = "nazionalita", length = 50)
    private String nazionalita;

    @Column(name = "altezza")
    private Integer altezza;

    @Column(name = "peso")
    private Integer peso;

    @Column(name = "punti_settimanali")
    private Integer punti_settimanali = 0;

    @Column(name = "punti_totali")
    private Integer punti_totali = 0;

    @Column(name = "data_nascita")
    private LocalDate dataNascita;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_squadra")
    @JsonIgnore
    private Squadra squadra;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_user")
    @JsonIgnore
    private Utente utente;

    // ── STATISTICHE (schema separato in 3 tabelle) ─────────────────────────
    // Comuni a tutti i giocatori, portieri inclusi.
    @OneToOne(mappedBy = "giocatore", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private StatisticaGiocatore statisticaGiocatore;

    // Presente solo se il giocatore NON è portiere.
    @OneToOne(mappedBy = "giocatore", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private StatisticaMovimento statisticaMovimento;

    // Presente solo se il giocatore è portiere.
    @OneToOne(mappedBy = "giocatore", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonIgnore
    private StatisticaPortiere statisticaPortiere;

    /** true se il ruolo del giocatore è "Portiere" (case-insensitive) */
    @Transient
    public boolean isPortiere() {
        return posizione != null && posizione.equalsIgnoreCase("Portiere");
    }
}