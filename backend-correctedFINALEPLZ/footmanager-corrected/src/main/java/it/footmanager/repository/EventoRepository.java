package it.footmanager.repository;

import it.footmanager.entity.Evento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventoRepository extends JpaRepository<Evento, Integer> {
    List<Evento> findByCalendario_IdOrderByDataOraInizioAsc(Integer calendarioId);

    @Query("SELECT e FROM Evento e WHERE e.calendario.id = :cid AND e.dataOraInizio BETWEEN :da AND :a ORDER BY e.dataOraInizio")
    List<Evento> findByCalendarioAndPeriodo(@Param("cid") Integer calId,
                                             @Param("da")  LocalDateTime da,
                                             @Param("a")   LocalDateTime a);
}
