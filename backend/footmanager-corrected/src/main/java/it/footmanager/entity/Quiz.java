package it.footmanager.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * IMPORTANTE — schema reale (gamification.sql):
 *   risposta_corretta varchar(1)  → è una LETTERA 'A' | 'B' | 'C',
 *                                    NON il testo della risposta giusta!
 *   opzione_a / opzione_b / opzione_c → le 3 opzioni testuali.
 * La lettera indica QUALE delle tre colonne contiene il testo corretto.
 */
@Entity
@Table(name = "quiz")
@Getter @Setter @NoArgsConstructor
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_quiz")
    private Integer id;

    @Column(name = "domanda", nullable = false, columnDefinition = "TEXT")
    private String domanda;

    // Lettera 'A' | 'B' | 'C' — quale opzione è quella giusta, NON il testo.
    @Column(name = "risposta_corretta", nullable = false, length = 1)
    private String risposta_corretta;

    @Column(name = "opzione_a", length = 255)
    private String opzioneA;

    @Column(name = "opzione_b", nullable = false, length = 255)
    private String opzione2;

    @Column(name = "opzione_c", nullable = false, length = 255)
    private String opzione3;

    @Column(name = "punti")
    private int puntiValore = 0;

    /** Restituisce il TESTO della risposta corretta, risolvendo la lettera A/B/C. */
    @Transient
    public String getTestoRispostaCorretta() {
        if (risposta_corretta == null) return null;
        return switch (risposta_corretta.trim().toUpperCase()) {
            case "A" -> opzioneA;
            case "B" -> opzione2;
            case "C" -> opzione3;
            default  -> null;
        };
    }
}