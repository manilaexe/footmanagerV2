package it.footmanager.repository;

import it.footmanager.entity.Giocatore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface GiocatoreRepository extends JpaRepository<Giocatore, Integer> {
    // Forziamo il JOIN FETCH dell'utente per evitare problemi con il caricamento Lazy
    @Query("SELECT g FROM Giocatore g JOIN FETCH g.utente u WHERE u.id = :utenteId")
    Optional<Giocatore> findByUtente_Id(@Param("utenteId") Integer utenteId);
    
    List<Giocatore> findBySquadra_Id(Integer squadraId);

    // Top marcatori per la squadra (somma gol da Statistiche)
    @Query("""
        SELECT g FROM Giocatore g JOIN FETCH g.utente JOIN g.statistiche s
        WHERE g.squadra.id = :squadraId
        ORDER BY (s.goalRigore + s.goalTesta + s.goalPunizione) DESC
        """)
    List<Giocatore> topMarcatori(@Param("squadraId") Integer squadraId);

    // Classifica per punti settimanali (campo Java è "punti_settimanali")
    @Query("SELECT g FROM Giocatore g WHERE g.squadra.id = :squadraId ORDER BY g.punti_settimanali DESC")
    List<Giocatore> classificaSettimanale(@Param("squadraId") Integer squadraId);
}
