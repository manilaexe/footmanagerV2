package it.footmanager;

import com.fasterxml.jackson.databind.ObjectMapper;
import it.footmanager.dto.AuthDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper om;

    @Test
    void loginCorrettoRestituisceToken() throws Exception {
        var req = new AuthDto.LoginRequest();
        req.setUsername("admin");
        req.setPassword("admin");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.token").isNotEmpty())
               .andExpect(jsonPath("$.ruolo").value("STAFF"));
    }

    @Test
    void loginCredenzialiBagliateRestituisce401() throws Exception {
        var req = new AuthDto.LoginRequest();
        req.setUsername("admin");
        req.setPassword("passwordSbagliata");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(om.writeValueAsString(req)))
               .andExpect(status().isUnauthorized());
    }
}
