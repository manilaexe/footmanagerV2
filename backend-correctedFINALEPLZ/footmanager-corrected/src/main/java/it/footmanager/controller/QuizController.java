package it.footmanager.controller;

import it.footmanager.dto.Dtos.*;
import it.footmanager.repository.GiocatoreRepository;
import it.footmanager.repository.UtenteRepository;
import it.footmanager.service.QuizService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

    private Integer getGiocatoreId(UserDetails ud) {
        Integer uid = utenteRepo.findByUsername(ud.getUsername()).orElseThrow().getId();
        return giocatoreRepo.findByUtente_Id(uid).orElseThrow().getId();
    }
}
