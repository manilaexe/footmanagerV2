package it.footmanager.repository;

import it.footmanager.entity.Messaggio;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MessaggioRepository extends JpaRepository<Messaggio, Integer> {
    List<Messaggio> findByGiocatore_IdOrderByDataOraDesc(Integer giocatoreId);
    List<Messaggio> findByAllenatore_IdOrderByDataOraDesc(Integer allenatoreId);
    long countByGiocatore_IdAndStato(Integer giocatoreId, String stato);
}
