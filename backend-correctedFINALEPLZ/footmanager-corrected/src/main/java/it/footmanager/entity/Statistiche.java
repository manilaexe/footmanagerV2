package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "statistiche")
@Getter @Setter @NoArgsConstructor
public class Statistiche {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_statistica")
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_giocatore", unique = true)
    private Giocatore giocatore;

    @Column(name = "presenze")              private int presenze            = 0;
    @Column(name = "presenze_titolare")     private int presenzeTitolare    = 0;
    @Column(name = "minuti_giocati")        private int minutiGiocati       = 0;
    @Column(name = "goal_rigore")           private int goalRigore          = 0;
    @Column(name = "goal_testa")         private int goalTesta         = 0;
    @Column(name = "goal_punizione")        private int goalPunizione       = 0;
    @Column(name = "assist")               private int assist               = 0;
    @Column(name = "tiri_totali")           private int tiriTotali          = 0;
    @Column(name = "tiri_in_porta")         private int tiriInPorta         = 0;
    @Column(name = "pali_traverse")         private int paliTraverse        = 0;
    @Column(name = "big_chance_mancate")    private int bigChanceMancate    = 0;
    @Column(name = "big_chance_create")     private int bigChanceCreate     = 0;
    @Column(name = "passaggi_tentati")      private int passaggiTentati     = 0;
    @Column(name = "passaggi_riusciti")     private int passaggiRiusciti    = 0;
    @Column(name = "passaggi_chiave")       private int passaggiChiave      = 0;
    @Column(name = "cross_tentati")         private int crossTentati        = 0;
    @Column(name = "cross_riusciti")        private int crossRiusciti       = 0;
    @Column(name = "dribbling_tentati")     private int dribblingTentati    = 0;
    @Column(name = "dribbling_riusciti")    private int dribblingRiusciti   = 0;
    @Column(name = "duelli_vinti")          private int duelliVinti         = 0;
    @Column(name = "duelli_persi")          private int duelliPersi         = 0;
    @Column(name = "duelli_aerei_vinti")    private int duelliAereiVinti    = 0;
    @Column(name = "duelli_aerei_persi")    private int duelliAereiPersi    = 0;
    @Column(name = "palloni_rubati")        private int palloniRubati       = 0;
    @Column(name = "palloni_intercettati")  private int palloniIntercettati = 0;
    @Column(name = "tackle")               private int tackle               = 0;
    @Column(name = "falli_commessi")        private int falliCommessi       = 0;
    @Column(name = "falli_subiti")          private int falliSubiti         = 0;
    @Column(name = "ammonizioni")           private int ammonizioni         = 0;
    @Column(name = "espulsioni")            private int espulsioni          = 0;

    /** Gol totali = rigore + testa + punizione */
    public int getGolTotali() { return goalRigore + goalTesta + goalPunizione; }
}
