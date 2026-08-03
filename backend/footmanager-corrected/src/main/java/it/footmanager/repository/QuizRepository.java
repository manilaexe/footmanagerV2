package it.footmanager.repository;

import it.footmanager.entity.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, Integer> {
    // Ordine stabile usato per la rotazione deterministica del "quiz del giorno"
    List<Quiz> findAllByOrderByIdAsc();
}