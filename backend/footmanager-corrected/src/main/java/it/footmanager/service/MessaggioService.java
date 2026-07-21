package it.footmanager.service;

import it.footmanager.dto.Dtos.*;
import it.footmanager.entity.*;
import it.footmanager.exception.*;
import it.footmanager.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @RequiredArgsConstructor @Transactional
public class MessaggioService {

    private final MessaggioRepository  mesRepo;
    private final GiocatoreRepository  giocatoreRepo;
    private final AllenatoreRepository allenatoreRepo;
    private final UtenteRepository     utenteRepo;

    // ── Messaggi ricevuti da un giocatore (usato dalla view giocatore) ────
    @Transactional(readOnly = true)
    public List<MessaggioDto> msgPerGiocatore(Integer giocatoreId) {
        return mesRepo.findByGiocatore_IdOrderByDataOraDesc(giocatoreId)
                .stream().map(this::toDto).toList();
    }

    // ── Messaggi inviati da un allenatore (usato dalla view allenatore) ───
    @Transactional(readOnly = true)
    public List<MessaggioDto> msgInviatiDaAllenatore(Integer allenatoreId) {
        return mesRepo.findByAllenatore_IdOrderByDataOraDesc(allenatoreId)
                .stream().map(this::toDto).toList();
    }

    // ── Conta messaggi non letti per un giocatore ─────────────────────────
    @Transactional(readOnly = true)
    public long nonLetti(Integer giocatoreId) {
        return mesRepo.countByGiocatore_IdAndStato(giocatoreId, "INVIATO");
    }

    // ── Invia un messaggio a un singolo giocatore ─────────────────────────
    public MessaggioDto invia(InviaMessaggioRequest req, String usernameAllenatore) {
        Integer uid = utenteRepo.findByUsername(usernameAllenatore)
                .orElseThrow(() -> new ResourceNotFoundException("Utente: " + usernameAllenatore))
                .getId();
        Allenatore all = allenatoreRepo.findByUtente_Id(uid)
                .orElseThrow(() -> new ResourceNotFoundException("Allenatore: " + usernameAllenatore));
        Giocatore g = giocatoreRepo.findById(req.getGiocatoreId())
                .orElseThrow(() -> new ResourceNotFoundException("Giocatore", Long.valueOf(req.getGiocatoreId())));

        Messaggio m = new Messaggio();
        m.setTesto(req.getTesto());
        m.setAllenatore(all);
        m.setGiocatore(g);
        // dataOra e stato impostati da @PrePersist
        return toDto(mesRepo.save(m));
    }

    // ── Segna il messaggio come letto ─────────────────────────────────────
    public MessaggioDto segnaLetto(Integer id) {
        Messaggio m = mesRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Messaggio", Long.valueOf(id)));
        m.setStato("LETTO");
        return toDto(mesRepo.save(m));
    }

    // ── Conversione Entity → DTO ──────────────────────────────────────────
    private MessaggioDto toDto(Messaggio m) {
        String nomeAll = m.getAllenatore() != null
                ? m.getAllenatore().getNome() + " " + m.getAllenatore().getCognome() : null;
        String nomeG   = m.getGiocatore() != null
                ? m.getGiocatore().getNome()  + " " + m.getGiocatore().getCognome()  : null;
        Integer gid    = m.getGiocatore() != null ? m.getGiocatore().getId() : null;

        return MessaggioDto.builder()
                .id(m.getId())
                .testo(m.getTesto())
                .dataOra(m.getDataOra())
                .stato(m.getStato())
                .nomeAllenatore(nomeAll)
                .nomeGiocatore(nomeG)
                .giocatoreId(gid)
                .build();
    }
}