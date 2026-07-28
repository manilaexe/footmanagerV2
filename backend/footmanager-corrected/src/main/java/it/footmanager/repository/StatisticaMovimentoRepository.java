package it.footmanager.repository;

import it.footmanager.entity.StatisticaMovimento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface StatisticaMovimentoRepository extends JpaRepository<StatisticaMovimento, Integer> {
    // id della entity == id_giocatore (shared PK), quindi findById(giocatoreId) funziona già;
    // manteniamo comunque il metodo esplicito per coerenza con gli altri repository.
    Optional<StatisticaMovimento> findByGiocatore_Id(Integer giocatoreId);
}