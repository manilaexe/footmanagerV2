package it.footmanager.repository;

import it.footmanager.entity.RispostaGiocatore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RispostaGiocatoreRepository extends JpaRepository<RispostaGiocatore, Integer> {

    boolean existsByGiocatore_IdAndQuiz_Id(Integer giocatoreId, Integer quizId);

    // Il campo si chiama "corretta", non più "esito"
    long countByGiocatore_IdAndCorrettaTrue(Integer giocatoreId);

    List<RispostaGiocatore> findByGiocatore_Id(Integer giocatoreId);

    // ── Gamification giornaliera ────────────────────────────────────────────
    // Determina se il giocatore ha GIÀ risposto a un quiz (qualunque) OGGI.
    // Non conta il quiz specifico, ma la finestra temporale: un solo tentativo
    // al giorno indipendentemente da quale domanda gli sia stata assegnata.
    boolean existsByGiocatore_IdAndRispostaDataBetween(
            Integer giocatoreId, LocalDateTime inizioGiorno, LocalDateTime fineGiorno);

    // Recupera la risposta data oggi (se esiste) per mostrare l'esito
    // quando il giocatore ricarica la pagina dopo aver già risposto.
    Optional<RispostaGiocatore> findFirstByGiocatore_IdAndRispostaDataBetweenOrderByRispostaDataDesc(
            Integer giocatoreId, LocalDateTime inizioGiorno, LocalDateTime fineGiorno);
}