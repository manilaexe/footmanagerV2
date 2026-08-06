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

    // ── Contatori per il blocco in alto della pagina Messaggi (allenatore) ─
    @Transactional(readOnly = true)
    public long inviatiNonLetti(Integer allenatoreId) {
        return mesRepo.countByAllenatore_IdAndStato(allenatoreId, "INVIATO");
    }

    @Transactional(readOnly = true)
    public MessaggioDto ultimoInviato(Integer allenatoreId) {
        List<Messaggio> lista = mesRepo.findByAllenatore_IdOrderByDataOraDesc(allenatoreId);
        return lista.isEmpty() ? null : toDto(lista.get(0));
    }

    // ── Risolve l'Allenatore "mittente" per l'utente autenticato ──────────
    // Se l'utente è davvero un allenatore, usa il suo record. Se invece è
    // STAFF/IT (che non hanno una riga propria nella tabella "allenatore" —
    // l'app assume un solo club/un solo staff tecnico condiviso, stesso
    // presupposto "mono-squadra" già usato altrove, es. DashboardService),
    // usa l'unico allenatore del club. Senza questo fallback, un utente
    // STAFF/IT che provava a inviare o leggere i messaggi otteneva un errore
    // silenzioso e l'operazione non veniva mai completata.
    @Transactional(readOnly = true)
    public Allenatore resolveMittente(String username) {
        Integer uid = utenteRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utente: " + username))
                .getId();
        return allenatoreRepo.findByUtente_Id(uid)
                .orElseGet(() -> allenatoreRepo.findAll().stream().findFirst()
                        .orElseThrow(() -> new ResourceNotFoundException("Nessun allenatore configurato nel DB")));
    }

    // Comoda per il controller: evita di dover esporre/gestire l'entity Allenatore lì.
    @Transactional(readOnly = true)
    public Integer resolveMittenteId(String username) {
        return resolveMittente(username).getId();
    }

    // ── Invia un messaggio a un singolo giocatore ─────────────────────────
    public MessaggioDto invia(InviaMessaggioRequest req, String usernameAllenatore) {
        Allenatore all = resolveMittente(usernameAllenatore);
        Giocatore g = giocatoreRepo.findById(req.getGiocatoreId())
                .orElseThrow(() -> new ResourceNotFoundException("Giocatore", Long.valueOf(req.getGiocatoreId())));

        Messaggio m = new Messaggio();
        m.setTesto(req.getTesto());
        m.setAllenatore(all);
        m.setGiocatore(g);
        // dataOra e stato impostati da @PrePersist
        return toDto(mesRepo.save(m));
    }

    // ── Invia lo stesso messaggio a tutti i giocatori di un ruolo ─────────
    // (es. tutti i "Portiere", tutti gli "Attaccante"...) della squadra
    // dell'allenatore. Viene creata una riga Messaggio per ogni giocatore,
    // così ognuno ha il proprio stato di lettura indipendente.
    public List<MessaggioDto> inviaPerRuolo(InviaMessaggioRuoloRequest req, String usernameAllenatore) {
        Allenatore all = resolveMittente(usernameAllenatore);

        List<Giocatore> destinatari = giocatoreRepo.findBySquadra_IdAndPosizione(
                all.getSquadra().getId(), req.getRuolo());

        if (destinatari.isEmpty()) {
            throw new ResourceNotFoundException("Nessun giocatore trovato con ruolo: " + req.getRuolo());
        }

        return destinatari.stream()
                .map(g -> {
                    Messaggio m = new Messaggio();
                    m.setTesto(req.getTesto());
                    m.setAllenatore(all);
                    m.setGiocatore(g);
                    return toDto(mesRepo.save(m));
                })
                .toList();
    }

    // ── Segna il messaggio come letto ─────────────────────────────────────
    // giocatoreId è quello del giocatore autenticato che ha fatto la richiesta:
    // si può segnare come letto solo un messaggio indirizzato a sé stessi.
    public MessaggioDto segnaLetto(Integer id, Integer giocatoreId) {
        Messaggio m = mesRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Messaggio", Long.valueOf(id)));

        if (m.getGiocatore() == null || !m.getGiocatore().getId().equals(giocatoreId)) {
            throw new ResourceNotFoundException("Messaggio", Long.valueOf(id));
        }

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