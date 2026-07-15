package it.footmanager.config;

import it.footmanager.security.FmUserDetailsService;
import it.footmanager.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import java.util.List;

/**
 * Configurazione Spring Security.
 * <ul>
 *   <li>Sessione stateless (JWT)</li>
 *   <li>CORS configurabile via properties</li>
 *   <li>Permessi per ruolo su ogni gruppo di endpoint</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity          // abilita @PreAuthorize sui metodi
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final FmUserDetailsService    userDetailsService;

    @Value("${app.cors.allowed-origins}")
    private String[] allowedOrigins;

    // ── Password encoder ────────────────────────────────────────────────
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    // ── AuthenticationProvider (DAO) ────────────────────────────────────
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        var provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    // ── AuthenticationManager ───────────────────────────────────────────
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }

    // ── CORS ─────────────────────────────────────────────────────────────
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        var cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(List.of(allowedOrigins));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);

        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", cfg);
        return source;
    }

    // ── Security filter chain ────────────────────────────────────────────
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth

                // ── Endpoint pubblici ──────────────────────────────────
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // ── Utenti / Rosa ─────────────────────────────────────
                .requestMatchers(HttpMethod.GET,  "/api/utenti/**")     .hasAnyRole("STAFF","ALLENATORE","DIRIGENZA","IT")
                .requestMatchers(HttpMethod.POST, "/api/utenti/**")     .hasAnyRole("STAFF","IT")
                .requestMatchers(HttpMethod.PUT,  "/api/utenti/**")     .hasAnyRole("STAFF","IT")
                .requestMatchers(HttpMethod.DELETE,"/api/utenti/**")    .hasAnyRole("STAFF","IT")

                // ── Giocatori ─────────────────────────────────────────
                .requestMatchers(HttpMethod.GET, "/api/giocatori/**")   .hasAnyRole("STAFF","ALLENATORE","DIRIGENZA","IT")
                .requestMatchers("/api/giocatori/**")                   .hasAnyRole("STAFF","ALLENATORE","IT")

                // ── Statistiche ───────────────────────────────────────
                .requestMatchers(HttpMethod.GET, "/api/statistiche/**") .authenticated()
                .requestMatchers("/api/statistiche/**")                 .hasAnyRole("STAFF","ALLENATORE","IT")

                // ── Calendario ───────────────────────────────────────
                .requestMatchers(HttpMethod.GET, "/api/eventi/**")      .authenticated()
                .requestMatchers("/api/eventi/**")                      .hasAnyRole("STAFF","ALLENATORE","IT")

                // ── Messaggi ──────────────────────────────────────────
                .requestMatchers(HttpMethod.GET, "/api/messaggi/**")    .authenticated()
                .requestMatchers(HttpMethod.POST,"/api/messaggi")       .hasAnyRole("STAFF","ALLENATORE","IT")
                .requestMatchers("/api/messaggi/**")                    .hasAnyRole("STAFF","ALLENATORE","IT")

                // ── Quiz ──────────────────────────────────────────────
                .requestMatchers(HttpMethod.GET, "/api/quiz/**")        .hasAnyRole("GIOCATORE","STAFF","IT")
                .requestMatchers(HttpMethod.POST,"/api/quiz/risposta")  .hasRole("GIOCATORE")
                .requestMatchers("/api/quiz/**")                        .hasAnyRole("STAFF","ALLENATORE","IT")

                // ── Classifica ────────────────────────────────────────
                .requestMatchers("/api/classifica/**")                  .authenticated()

                // ── Dashboard aggregata ───────────────────────────────
                .requestMatchers("/api/dashboard/**")                   .authenticated()

                .anyRequest().authenticated()
            );

        return http.build();
    }
}
