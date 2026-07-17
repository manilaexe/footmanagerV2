package it.footmanager.repository;

import it.footmanager.entity.Statistiche;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface StatisticheRepository extends JpaRepository<Statistiche, Integer> {
    Optional<Statistiche> findByGiocatore_Id(Integer giocatoreId);
}
