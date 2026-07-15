package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "allenatore")
@Getter @Setter @NoArgsConstructor
public class Allenatore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_allenatore")
    private Integer id;

    @Column(name = "nome", nullable = false, length = 50)
    private String nome;

    @Column(name = "cognome", nullable = false, length = 50)
    private String cognome;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_squadra")
    private Squadra squadra;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_user")
    private Utente utente;
}
