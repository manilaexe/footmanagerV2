package it.footmanager.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

public class AuthDto {

    @Data
    public static class LoginRequest {
        @NotBlank private String username;
        @NotBlank private String password;
    }

    @Data @AllArgsConstructor
    public static class LoginResponse {
        private String  token;
        private String  ruolo;     // nome dell'enum, es. "STAFF"
        private String  username;
        private Integer utenteId;
    }
}
