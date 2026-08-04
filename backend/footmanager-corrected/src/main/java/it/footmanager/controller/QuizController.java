package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.repository.GiocatoreRepository;
import it.footmanager.repository.UtenteRepository;
import it.footmanager.service.QuizService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/quiz") @RequiredArgsConstructor
public class QuizController {
    private final QuizService         svc;
    private final GiocatoreRepository giocatoreRepo;
    private final UtenteRepository    utenteRepo;

    // ── GAMIFICATION: quiz del giorno ───────────────────────────────────────
    // GET  /api/quiz/oggi           → la domanda assegnata per oggi (o l'esito se già risposto)
    // POST /api/quiz/oggi/risposta  → invia la risposta al quiz di oggi
    @GetMapping("/oggi")
    @PreAuthorize("hasRole('GIOCATORE')")
    public QuizGiornalieroDto quizDiOggi(@AuthenticationPrincipal UserDetails ud) {
        return svc.quizDiOggi(getGiocatoreId(ud));
    }

    @PostMapping("/oggi/risposta")
    @PreAuthorize("hasRole('GIOCATORE')")
    public RispostaQuizResponse rispondiOggi(@Valid @RequestBody RispondiQuizGiornalieroRequest req,
                                              @AuthenticationPrincipal UserDetails ud) {
        return svc.rispondiOggi(req, getGiocatoreId(ud));
    }

    // ── Endpoint legacy (lista completa, uso admin/staff) ───────────────────
    @GetMapping
    @PreAuthorize("hasAnyRole('GIOCATORE','STAFF','IT')")
    public List<QuizDto> tutti(@AuthenticationPrincipal UserDetails ud) {
        return svc.tutti(getGiocatoreId(ud));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('GIOCATORE','STAFF','IT')")
    public QuizDto uno(@PathVariable Integer id, @AuthenticationPrincipal UserDetails ud) {
        return svc.getQuiz(id, getGiocatoreId(ud));
    }

    @PostMapping("/risposta")
    @PreAuthorize("hasRole('GIOCATORE')")
    public RispostaQuizResponse rispondi(@Valid @RequestBody RispostaQuizRequest req,
                                          @AuthenticationPrincipal UserDetails ud) {
        return svc.rispondi(req, getGiocatoreId(ud));
    }

    @GetMapping("/classifica/{squadraId}")
    public List<ClassificaItemDto> classifica(@PathVariable Integer squadraId) {
        return svc.classifica(squadraId);
    }

    // ── PANNELLO ADMIN (STAFF/IT) — CRUD domande quiz ───────────────────────
    // Unico punto dell'app da cui aggiungere/correggere/eliminare una domanda
    // senza scrivere query SQL a mano. La risposta corretta va sempre passata
    // come lettera 'A'/'B'/'C' (vedi CreaQuizRequest), mai come testo.
    @GetMapping("/admin")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public List<QuizAdminDto> tuttiAdmin() {
        return svc.tuttiAdmin();
    }

    @PostMapping("/admin")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<QuizAdminDto> creaAdmin(@Valid @RequestBody CreaQuizRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(svc.creaAdmin(req));
    }

    @PutMapping("/admin/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public QuizAdminDto aggiornaAdmin(@PathVariable Integer id, @Valid @RequestBody CreaQuizRequest req) {
        return svc.aggiornaAdmin(id, req);
    }

    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<Void> eliminaAdmin(@PathVariable Integer id) {
        svc.eliminaAdmin(id);
        return ResponseEntity.noContent().build();
    }

    private Integer getGiocatoreId(UserDetails ud) {
        Integer uid = utenteRepo.findByUsername(ud.getUsername()).orElseThrow().getId();
        return giocatoreRepo.findByUtente_Id(uid).orElseThrow().getId();
    }
}