package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.repository.GiocatoreRepository;
import it.footmanager.repository.UtenteRepository;
import it.footmanager.service.QuizService;
import it.footmanager.service.LogSistemaService; // Aggiunto
import jakarta.servlet.http.HttpServletRequest; // Aggiunto
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
    private final LogSistemaService   logService; // Iniezione LogService

    @GetMapping("/oggi")
    @PreAuthorize("hasRole('GIOCATORE')")
    public QuizGiornalieroDto quizDiOggi(@AuthenticationPrincipal UserDetails ud) {
        return svc.quizDiOggi(getGiocatoreId(ud));
    }

    @PostMapping("/oggi/risposta")
    @PreAuthorize("hasRole('GIOCATORE')")
    public RispostaQuizResponse rispondiOggi(@Valid @RequestBody RispondiQuizGiornalieroRequest req,
                                              @AuthenticationPrincipal UserDetails ud, HttpServletRequest request) { // Aggiunta request
        RispostaQuizResponse res = svc.rispondiOggi(req, getGiocatoreId(ud));
        // Log: Risposta Quiz
        logService.registraLog("INFO", "Quiz", "SUBMIT_QUIZ", "Inviata risposta per il quiz giornaliero", ud.getUsername(), request.getRemoteAddr());
        return res;
    }

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
                                          @AuthenticationPrincipal UserDetails ud, HttpServletRequest request) { // Aggiunta request
        RispostaQuizResponse res = svc.rispondi(req, getGiocatoreId(ud));
        // Log: Risposta Quiz Generico
        logService.registraLog("INFO", "Quiz", "SUBMIT_QUIZ", "Inviata risposta per il quiz ID: " + req.getQuizId(), ud.getUsername(), request.getRemoteAddr());
        return res;
    }

    @GetMapping("/classifica/{squadraId}")
    public List<ClassificaItemDto> classifica(@PathVariable Integer squadraId) {
        return svc.classifica(squadraId);
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public List<QuizAdminDto> tuttiAdmin() {
        return svc.tuttiAdmin();
    }

    @PostMapping("/admin")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<QuizAdminDto> creaAdmin(@Valid @RequestBody CreaQuizRequest req, @AuthenticationPrincipal UserDetails ud, HttpServletRequest request) { // Aggiunti UserDetails e request
        QuizAdminDto dto = svc.creaAdmin(req);
        // Log: Creazione domanda
        logService.registraLog("INFO", "Quiz", "CREATE_QUIZ", "Aggiunta nuova domanda al database quiz", ud.getUsername(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PutMapping("/admin/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public QuizAdminDto aggiornaAdmin(@PathVariable Integer id, @Valid @RequestBody CreaQuizRequest req, @AuthenticationPrincipal UserDetails ud, HttpServletRequest request) { // Aggiunti UserDetails e request
        QuizAdminDto dto = svc.aggiornaAdmin(id, req);
        // Log: Modifica domanda
        logService.registraLog("INFO", "Quiz", "UPDATE_QUIZ", "Modificata domanda quiz ID: " + id, ud.getUsername(), request.getRemoteAddr());
        return dto;
    }

    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasAnyRole('STAFF','IT')")
    public ResponseEntity<Void> eliminaAdmin(@PathVariable Integer id, @AuthenticationPrincipal UserDetails ud, HttpServletRequest request) { // Aggiunti UserDetails e request
        svc.eliminaAdmin(id);
        // Log: Eliminazione domanda
        logService.registraLog("WARN", "Quiz", "DELETE_QUIZ", "Eliminata domanda quiz ID: " + id, ud.getUsername(), request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    private Integer getGiocatoreId(UserDetails ud) {
        Integer uid = utenteRepo.findByUsername(ud.getUsername()).orElseThrow().getId();
        return giocatoreRepo.findByUtente_Id(uid).orElseThrow().getId();
    }
}