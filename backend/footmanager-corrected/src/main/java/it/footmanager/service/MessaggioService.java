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
    // Usato SOLO per risalire alla squadra (es. quando si invia "per ruolo").
    // NON rappresenta più "chi ha scritto il messaggio" — quello è
    // utenteMittente, vedi invia()/inviaPerRuolo() e resolveUtente() sotto.
    // Se l'utente è davvero un allenatore usa il suo record; se è STAFF/IT
    // (che non hanno una riga propria in "allenatore" — l'app assume un solo
    // club/una sola squadra) usa l'unico allenatore del club.
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
        // dataOra e stato impostati da @PrePersist
        return toDto(mesRepo.save(m));
    }

    // ── Invia lo stesso messaggio a tutti i giocatori di un ruolo ─────────
    // (es. tutti i "Portiere", tutti gli "Attaccante"...) della squadra
    // dell'allenatore. Viene creata una riga Messaggio per ogni giocatore,
    // così ognuno ha il proprio stato di lettura indipendente.
    public List<MessaggioDto> inviaPerRuolo(InviaMessaggioRuoloRequest req, String usernameAllenatore) {
        Utente mittente = resolveUtente(usernameAllenatore);
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
                    m.setUtenteMittente(mittente);
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

    // ── Ruolo dell'utente autenticato ──────────────────────────────────────
    // Usato dal controller per decidere se mostrare solo i messaggi scritti
    // da questo utente (ALLENATORE) oppure tutti quelli del club (STAFF/IT).
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

        // Nome del mittente reale: se è l'allenatore, usa nome/cognome (più
        // familiare); altrimenti (STAFF/IT) usa lo username, non essendoci
        // un nome anagrafico per quei ruoli nello schema attuale.
        String mittenteNome = null, mittenteRuolo = null;
        if (m.getUtenteMittente() != null) {
            var ruolo = m.getUtenteMittente().getRuolo();
            mittenteRuolo = ruolo != null ? ruolo.getNomeRuolo().name() : null;
            mittenteNome = "ALLENATORE".equals(mittenteRuolo) && nomeAll != null
                    ? nomeAll
                    : m.getUtenteMittente().getUsername();
        } else if (nomeAll != null) {
            // Messaggi storici pre-migrazione, senza utenteMittente valorizzato
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