package it.footmanager.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "log_sistema")
public class LogSistema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false, length = 20)
    private String livello; 

    private String utente;  
    private String ruolo;   
    private String modulo;  

    @Column(nullable = false, length = 255)
    private String azione;  

    @Column(columnDefinition = "TEXT")
    private String dettagli; 

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    public LogSistema() {
        this.timestamp = LocalDateTime.now();
    }

    public LogSistema(String livello, String utente, String ruolo, String modulo, String azione, String dettagli, String ipAddress) {
        this();
        this.livello = livello;
        this.utente = utente;
        this.ruolo = ruolo;
        this.modulo = modulo;
        this.azione = azione;
        this.dettagli = dettagli;
        this.ipAddress = ipAddress;
    }

    // --- GETTER E SETTER ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getLivello() { return livello; }
    public void setLivello(String livello) { this.livello = livello; }

    public String getUtente() { return utente; }
    public void setUtente(String utente) { this.utente = utente; }

    public String getRuolo() { return ruolo; }
    public void setRuolo(String ruolo) { this.ruolo = ruolo; }

    public String getModulo() { return modulo; }
    public void setModulo(String modulo) { this.modulo = modulo; }

    public String getAzione() { return azione; }
    public void setAzione(String azione) { this.azione = azione; }

    public String getDettagli() { return dettagli; }
    public void setDettagli(String dettagli) { this.dettagli = dettagli; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
}