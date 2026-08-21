package it.footmanager.repository;

import it.footmanager.entity.LogSistema;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

public interface LogSistemaRepository extends JpaRepository<LogSistema, Long> {
    
    Page<LogSistema> findAllByOrderByTimestampDesc(Pageable pageable);
    
    @Modifying
    @Transactional
    @Query("DELETE FROM LogSistema l WHERE l.timestamp < :cutoffDate")
    int deleteLogsOlderThan(@Param("cutoffDate") LocalDateTime cutoffDate);
}