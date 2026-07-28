package it.footmanager.repository;

import it.footmanager.entity.StatisticaPortiere;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface StatisticaPortiereRepository extends JpaRepository<StatisticaPortiere, Integer> {
    Optional<StatisticaPortiere> findByGiocatore_Id(Integer giocatoreId);
}