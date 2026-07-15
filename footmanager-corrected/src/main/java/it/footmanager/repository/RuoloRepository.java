package it.footmanager.repository;

import it.footmanager.entity.Ruolo;
import it.footmanager.entity.Ruolo.NomeRuolo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RuoloRepository extends JpaRepository<Ruolo, Integer> {
    // nomeRuolo è ora un ENUM, non una String
    Optional<Ruolo> findByNomeRuolo(NomeRuolo nomeRuolo);
}
