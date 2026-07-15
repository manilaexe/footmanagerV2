package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "badge")
@Getter @Setter @NoArgsConstructor
public class Badge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_badge")
    private Integer id;

    @Column(name = "nome_badge", nullable = false, length = 100)
    private String nomeBadge;

    @Column(name = "soglia_punti")
    private int sogliaPunti = 0;

    @Lob
    @Column(name = "icona", columnDefinition = "BLOB")
    private byte[] icona;
}
