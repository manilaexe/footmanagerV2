package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "calendario")
@Getter @Setter @NoArgsConstructor
public class Calendario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_calendar")
    private Integer id;

    @OneToMany(mappedBy = "calendario", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Evento> eventi = new ArrayList<>();
}
