package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ruolo")
@Getter @Setter @NoArgsConstructor
public class Ruolo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_ruolo")
    private Integer id;

    @Enumerated(EnumType.STRING)
    @Column(name = "nome_ruolo", nullable = false, length = 50)
    private NomeRuolo nomeRuolo;

    public enum NomeRuolo {
        ALLENATORE,
        STAFF,
        GIOCATORE,
        DIRIGENZA,
        IT
    }
}
