package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Statistiche COMUNI a tutti i giocatori, portieri inclusi.
 * Tabella: statistica_giocatore — PK propria (id_statistica_giocatore),
 * FK unique verso giocatore.id_giocatore.
 */
@Entity
@Table(name = "statistica_giocatore")
@Getter @Setter @NoArgsConstructor
public class StatisticaGiocatore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_statistica_giocatore")
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_giocatore", unique = true, nullable = false)
    private Giocatore giocatore;

    @Column(name = "presenze")             private int presenze            = 0;
    @Column(name = "presenze_titolare")    private int presenzeTitolare    = 0;
    @Column(name = "minuti_giocati")       private int minutiGiocati       = 0;
    @Column(name = "ammonizioni")          private int ammonizioni         = 0;
    @Column(name = "espulsioni")           private int espulsioni          = 0;
    @Column(name = "falli_commessi")       private int falliCommessi       = 0;
    @Column(name = "falli_subiti")         private int falliSubiti         = 0;
    @Column(name = "assist")               private int assist              = 0;
    @Column(name = "duelli_aerei_vinti")   private int duelliAereiVinti    = 0;
    @Column(name = "duelli_aerei_persi")   private int duelliAereiPersi    = 0;
    @Column(name = "duelli_vinti")         private int duelliVinti         = 0;
    @Column(name = "duelli_persi")         private int duelliPersi         = 0;
    @Column(name = "passaggi_tentati")     private int passaggiTentati     = 0;
    @Column(name = "passaggi_riusciti")    private int passaggiRiusciti    = 0;
    @Column(name = "passaggi_chiave")      private int passaggiChiave      = 0;
    // ATTENZIONE: nel DB la colonna si chiama "dribling_*" (una sola 'b'), non "dribbling_*"
    @Column(name = "dribling_tentati")     private int dribblingTentati    = 0;
    @Column(name = "dribling_riusciti")    private int dribblingRiusciti   = 0;
    @Column(name = "palloni_intercettati") private int palloniIntercettati = 0;
}