package it.footmanager.repository;

import it.footmanager.entity.GiocatoreBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GiocatoreBadgeRepository extends JpaRepository<GiocatoreBadge, GiocatoreBadge.GiocatoreBadgeId> {
    boolean existsByGiocatore_IdAndBadge_Id(Integer giocatoreId, Integer badgeId);
    List<GiocatoreBadge> findByGiocatore_Id(Integer giocatoreId);
}
