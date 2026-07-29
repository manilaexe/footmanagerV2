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

    // Giocatori di una squadra filtrati per ruolo (es. "Portiere", "Difensore"...).
    // Usato per l'invio di messaggi raggruppati per ruolo.
    List<Giocatore> findBySquadra_IdAndPosizione(Integer squadraId, String posizione);

    // Top marcatori per la squadra (somma gol da StatisticaMovimento).
    // I gol sono ora nella tabella statistica_movimento, non più in statistiche;
    // i portieri non hanno riga in statistica_movimento, quindi il JOIN (non LEFT JOIN)
    // li esclude automaticamente dalla classifica marcatori — comportamento corretto.
    @Query("""
        SELECT g FROM Giocatore g JOIN FETCH g.utente JOIN g.statisticaMovimento sm
        WHERE g.squadra.id = :squadraId
        ORDER BY (sm.goalRigore + sm.goalTesta + sm.goalPunizione) DESC
        """)
    List<Giocatore> topMarcatori(@Param("squadraId") Integer squadraId);

    // Classifica per punti settimanali (campo Java è "punti_settimanali")
    @Query("SELECT g FROM Giocatore g WHERE g.squadra.id = :squadraId ORDER BY g.punti_settimanali DESC")
    List<Giocatore> classificaSettimanale(@Param("squadraId") Integer squadraId);
}