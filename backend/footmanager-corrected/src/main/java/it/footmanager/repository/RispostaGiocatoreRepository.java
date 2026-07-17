package it.footmanager.repository;

import it.footmanager.entity.RispostaGiocatore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RispostaGiocatoreRepository extends JpaRepository<RispostaGiocatore, Integer> {
    boolean existsByGiocatore_IdAndQuiz_Id(Integer giocatoreId, Integer quizId);

    // Il campo si chiama "corretta", non più "esito"
    long countByGiocatore_IdAndCorrettaTrue(Integer giocatoreId);

    List<RispostaGiocatore> findByGiocatore_Id(Integer giocatoreId);
}
