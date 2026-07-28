package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Statistiche specifiche del PORTIERE (parate, clean sheet, rigori parati...).
 * Tabella: statistica_portiere — PK condivisa con giocatore
 * (id_giocatore, pattern shared-PK via @MapsId).
 */
@Entity
@Table(name = "statistica_portiere")
@Getter @Setter @NoArgsConstructor
public class StatisticaPortiere {

    @Id
    @Column(name = "id_giocatore")
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "id_giocatore")
    private Giocatore giocatore;

    @Column(name = "parate")         private int parate       = 0;
    @Column(name = "clean_sheet")    private int cleanSheet    = 0;
    @Column(name = "goal_subiti")    private int goalSubiti    = 0;
    @Column(name = "rigori_parati")  private int rigoriParati  = 0;
    @Column(name = "rigori_subiti")  private int rigoriSubiti  = 0;
}