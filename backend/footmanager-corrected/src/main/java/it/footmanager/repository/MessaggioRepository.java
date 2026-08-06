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

    // Usata dalla dashboard aggregata per il KPI "messaggi inviati"
    long countByAllenatore_Id(Integer allenatoreId);

    // Usata dal riepilogo messaggi: quanti dei messaggi inviati dall'allenatore
    // non sono ancora stati letti dal destinatario.
    long countByAllenatore_IdAndStato(Integer allenatoreId, String stato);

    // ── Mittente reale (utente autenticato che ha scritto il messaggio) ────
    // Usati per distinguere "vedo solo i miei" (allenatore) da "vedo tutto" (admin).
    List<Messaggio> findByUtenteMittente_IdOrderByDataOraDesc(Integer utenteId);
    long countByUtenteMittente_IdAndStato(Integer utenteId, String stato);

    // Vista admin: tutti i messaggi inviati da chiunque, più recenti prima.
    List<Messaggio> findAllByOrderByDataOraDesc();
    long countByStato(String stato);
}