package it.footmanager.service;

import it.footmanager.dto.Dtos.*;
import it.footmanager.entity.*;
import it.footmanager.exception.*;
import it.footmanager.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service 
@RequiredArgsConstructor 
@Transactional
public class MessaggioService {

    private final MessaggioRepository  mesRepo;
    private final GiocatoreRepository  giocatoreRepo;
    private final AllenatoreRepository allenatoreRepo;
    private final UtenteRepository     utenteRepo;
    
    // Iniezione automatica tramite @RequiredArgsConstructor (essendo 'final')
    private final LogSistemaService    logService; 

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

    // ── Solo i messaggi scritti da QUESTO utente (ruolo ALLENATORE) ───────
    @Transactional(readOnly = true)
    public List<MessaggioDto> msgInviatiDaUtente(Integer utenteId) {
        return mesRepo.findByUtenteMittente_IdOrderByDataOraDesc(utenteId)
                .stream().map(this::toDto).toList();
    }

    // ── Tutti i messaggi inviati da chiunque (vista admin: STAFF/IT) ──────
    @Transactional(readOnly = true)
    public List<MessaggioDto> msgTuttiInviati() {
        return mesRepo.findAllByOrderByDataOraDesc()
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

    // ── Varianti "solo i miei" (allenatore) vs "tutti" (admin) ─────────────
    @Transactional(readOnly = true)
    public long inviatiNonLettiDaUtente(Integer utenteId) {
        return mesRepo.countByUtenteMittente_IdAndStato(utenteId, "INVIATO");
    }

    @Transactional(readOnly = true)
    public MessaggioDto ultimoInviatoDaUtente(Integer utenteId) {
        List<Messaggio> lista = mesRepo.findByUtenteMittente_IdOrderByDataOraDesc(utenteId);
        return lista.isEmpty() ? null : toDto(lista.get(0));
    }

    @Transactional(readOnly = true)
    public long tuttiNonLetti() {
        return mesRepo.countByStato("INVIATO");
    }

    @Transactional(readOnly = true)
    public MessaggioDto ultimoInviatoGlobale() {
        List<Messaggio> lista = mesRepo.findAllByOrderByDataOraDesc();
        return lista.isEmpty() ? null : toDto(lista.get(0));
    }

    // ── Risolve l'Allenatore "di squadra" per l'utente autenticato ────────
    @Transactional(readOnly = true)
    public Allenatore resolveMittente(String username) {
        Integer uid = utenteRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utente: " + username))
                .getId();
        return allenatoreRepo.findByUtente_Id(uid)
                .orElseGet(() -> allenatoreRepo.findAll().stream().findFirst()
                        .orElseThrow(() -> new ResourceNotFoundException("Nessun allenatore configurato nel DB")));
    }

    @Transactional(readOnly = true)
    public Integer resolveMittenteId(String username) {
        return resolveMittente(username).getId();
    }

    // ── Risolve l'Utente autenticato (il vero mittente del messaggio) ─────
    @Transactional(readOnly = true)
    public Utente resolveUtente(String username) {
        return utenteRepo.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Utente: " + username));
    }

    // ── Invia un messaggio a un singolo giocatore ─────────────────────────
    public MessaggioDto invia(InviaMessaggioRequest req, String usernameAllenatore) {
        Utente mittente = resolveUtente(usernameAllenatore);
        Allenatore all = resolveMittente(usernameAllenatore);
        Giocatore g = giocatoreRepo.findById(req.getGiocatoreId())
                .orElseThrow(() -> new ResourceNotFoundException("Giocatore", Long.valueOf(req.getGiocatoreId())));

        Messaggio m = new Messaggio();
        m.setTesto(req.getTesto());
        m.setAllenatore(all);
        m.setUtenteMittente(mittente);
        m.setGiocatore(g);

        MessaggioDto salvato = toDto(mesRepo.save(m));

        // Tracciamento evento
        logService.info(
            "MESSAGGI", 
            "INVIO_SINGOLO", 
            "Inviato messaggio ID " + salvato.getId() + " al giocatore " + g.getNome() + " " + g.getCognome() + " (ID: " + g.getId() + ")"
        );

        return salvato;
    }

    // ── Invia lo stesso messaggio a tutti i giocatori di un ruolo ─────────
    public List<MessaggioDto> inviaPerRuolo(InviaMessaggioRuoloRequest req, String usernameAllenatore) {
        Utente mittente = resolveUtente(usernameAllenatore);
        Allenatore all = resolveMittente(usernameAllenatore);

        List<Giocatore> destinatari = giocatoreRepo.findBySquadra_IdAndPosizione(
                all.getSquadra().getId(), req.getRuolo());

        if (destinatari.isEmpty()) {
            throw new ResourceNotFoundException("Nessun giocatore trovato con ruolo: " + req.getRuolo());
        }

        List<MessaggioDto> risultati = destinatari.stream()
                .map(g -> {
                    Messaggio m = new Messaggio();
                    m.setTesto(req.getTesto());
                    m.setAllenatore(all);
                    m.setUtenteMittente(mittente);
                    m.setGiocatore(g);
                    return toDto(mesRepo.save(m));
                })
                .toList();

        // Tracciamento evento
        logService.info(
            "MESSAGGI", 
            "INVIO_RUOLO", 
            "Inviato messaggio di gruppo al ruolo " + req.getRuolo() + " (" + risultati.size() + " destinatari)"
        );

        return risultati;
    }

    // ── Segna il messaggio come letto ─────────────────────────────────────
    public MessaggioDto segnaLetto(Integer id, Integer giocatoreId) {
        Messaggio m = mesRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Messaggio", Long.valueOf(id)));

        if (m.getGiocatore() == null || !m.getGiocatore().getId().equals(giocatoreId)) {
            throw new ResourceNotFoundException("Messaggio", Long.valueOf(id));
        }

        m.setStato("LETTO");
        MessaggioDto aggiornato = toDto(mesRepo.save(m));

        // Tracciamento evento
        logService.info(
            "MESSAGGI", 
            "LETTURA_MESSAGGIO", 
            "Messaggio ID " + id + " segnato come letto dal giocatore ID: " + giocatoreId
        );

        return aggiornato;
    }

    // ── Ruolo dell'utente autenticato ──────────────────────────────────────
    @Transactional(readOnly = true)
    public String ruoloDi(String username) {
        return resolveUtente(username).getRuolo().getNomeRuolo().name();
    }

    // ── Conversione Entity → DTO ──────────────────────────────────────────
    private MessaggioDto toDto(Messaggio m) {
        String nomeAll = m.getAllenatore() != null
                ? m.getAllenatore().getNome() + " " + m.getAllenatore().getCognome() : null;
        String nomeG   = m.getGiocatore() != null
                ? m.getGiocatore().getNome()  + " " + m.getGiocatore().getCognome()  : null;
        Integer gid    = m.getGiocatore() != null ? m.getGiocatore().getId() : null;

        String mittenteNome = null, mittenteRuolo = null;
        if (m.getUtenteMittente() != null) {
            var ruolo = m.getUtenteMittente().getRuolo();
            mittenteRuolo = ruolo != null ? ruolo.getNomeRuolo().name() : null;
            mittenteNome = "ALLENATORE".equals(mittenteRuolo) && nomeAll != null
                    ? nomeAll
                    : m.getUtenteMittente().getUsername();
        } else if (nomeAll != null) {
            mittenteNome = nomeAll;
            mittenteRuolo = "ALLENATORE";
        }

        return MessaggioDto.builder()
                .id(m.getId())
                .testo(m.getTesto())
                .dataOra(m.getDataOra())
                .stato(m.getStato())
                .nomeAllenatore(nomeAll)
                .nomeGiocatore(nomeG)
                .giocatoreId(gid)
                .mittenteNome(mittenteNome)
                .mittenteRuolo(mittenteRuolo)
                .build();
    }
}