package it.footmanager.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

public class AuthDto {

    @Data
    public static class LoginRequest {
        @NotBlank private String username;
        @NotBlank private String password;
    }

    @Data @AllArgsConstructor @NoArgsConstructor @Builder // Aggiunti NoArgsConstructor e Builder per comodità
    public static class LoginResponse {
        private String  token;
        private String  ruolo;     // nome dell'enum, es. "ALLENATORE"
        private String  username;
        private Integer utenteId;
        // ── AGGIUNGI QUESTI DUE CAMPI ──
        private String  nome;      // Verrà popolato con il nome dell'allenatore
        private String  cognome;   // Verrà popolato con il cognome dell'allenatore
    }
}