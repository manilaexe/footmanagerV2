package it.footmanager.repository;

import it.footmanager.entity.Allenatore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AllenatoreRepository extends JpaRepository<Allenatore, Integer> {
    Optional<Allenatore> findByUtente_Id(Integer utenteId);
}
