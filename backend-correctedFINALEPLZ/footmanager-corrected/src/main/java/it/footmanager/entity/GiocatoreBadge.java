package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "giocatore_badge")
@Getter @Setter @NoArgsConstructor
@IdClass(GiocatoreBadge.GiocatoreBadgeId.class)
public class GiocatoreBadge {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_giocatore")
    private Giocatore giocatore;

    @Id
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_badge")
    private Badge badge;

    @Column(name = "data_ottenimento", nullable = false)
    private LocalDateTime dataOttenimento = LocalDateTime.now();

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class GiocatoreBadgeId implements Serializable {
        private Integer giocatore;
        private Integer badge;
    }
}
