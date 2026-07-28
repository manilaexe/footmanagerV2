package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Statistiche di MOVIMENTO — solo per i giocatori che non sono portieri
 * (gol, tiri, cross, tackle, palloni rubati...).
 * Tabella: statistica_movimento — PK condivisa con giocatore
 * (id_statistica_movimento = id_giocatore, pattern shared-PK via @MapsId).
 */
@Entity
@Table(name = "statistica_movimento")
@Getter @Setter @NoArgsConstructor
public class StatisticaMovimento {

    @Id
    @Column(name = "id_statistica_movimento")
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "id_statistica_movimento")
    private Giocatore giocatore;

    @Column(name = "goal_rigore")         private int goalRigore       = 0;
    @Column(name = "goal_testa")          private int goalTesta        = 0;
    @Column(name = "goal_punizione")      private int goalPunizione    = 0;
    @Column(name = "tiri_totali")         private int tiriTotali       = 0;
    @Column(name = "tiri_in_porta")       private int tiriInPorta      = 0;
    @Column(name = "pali_traverse")       private int paliTraverse     = 0;
    @Column(name = "big_chance_mancate")  private int bigChanceMancate = 0;
    @Column(name = "big_chance_create")   private int bigChanceCreate  = 0;
    @Column(name = "cross_tentati")       private int crossTentati     = 0;
    @Column(name = "cross_riusciti")      private int crossRiusciti    = 0;
    @Column(name = "tackle")              private int tackle           = 0;
    @Column(name = "palloni_rubati")      private int palloniRubati    = 0;

    /** Gol totali = rigore + testa + punizione */
    public int getGolTotali() { return goalRigore + goalTesta + goalPunizione; }
}