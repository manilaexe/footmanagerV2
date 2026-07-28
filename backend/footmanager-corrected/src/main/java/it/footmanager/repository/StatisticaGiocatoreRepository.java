package it.footmanager.repository;

import it.footmanager.entity.StatisticaGiocatore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface StatisticaGiocatoreRepository extends JpaRepository<StatisticaGiocatore, Integer> {
    Optional<StatisticaGiocatore> findByGiocatore_Id(Integer giocatoreId);
}