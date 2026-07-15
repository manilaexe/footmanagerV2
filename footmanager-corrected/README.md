# FootManager — Back-end Spring Boot

Piattaforma RESTful per la gestione di società calcistiche.

## Stack tecnologico
- **Java 21** + **Spring Boot 3.3**
- **Spring Security** con autenticazione **JWT** (jjwt 0.12)
- **Spring Data JPA** + **Hibernate** su **MySQL 8.0**
- **Flyway** per le migrazioni del database
- **Lombok** per ridurre il boilerplate
- **Maven** come build tool

---

## Avvio rapido

### 1 — Crea il database MySQL
```sql
CREATE DATABASE footmanager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'footmanager'@'localhost' IDENTIFIED BY 'footmanager_pwd';
GRANT ALL PRIVILEGES ON footmanager.* TO 'footmanager'@'localhost';
FLUSH PRIVILEGES;
```

### 2 — Configura le variabili sensibili
Copia `src/main/resources/application.properties` e cambia:
- `spring.datasource.password`
- `app.jwt.secret` → genera con: `openssl rand -base64 64`

### 3 — Avvia
```bash
mvn spring-boot:run
```
Flyway eseguirà automaticamente `V1__schema_iniziale.sql` al primo avvio,
creando tutte le tabelle e gli utenti demo.

---

## Utenti demo precaricati

| Username     | Password   | Ruolo      |
|--------------|------------|------------|
| `staff1`     | `staff123` | STAFF      |
| `allenatore` | `coach123` | ALLENATORE |
| `giocatore1` | `play123`  | GIOCATORE  |
| `dirigente1` | `dir123`   | DIRIGENZA  |

---

## Struttura del progetto

```
src/main/java/it/footmanager/
├── config/          SecurityConfig.java (CORS, JWT filter chain, permessi per ruolo)
├── controller/      REST controllers (Auth, Utente, Giocatore, Evento, Messaggio, Quiz, Dashboard)
├── dto/             DTO request/response (Dtos.java, AuthDto.java)
├── entity/          Entità JPA (Utente, Giocatore, Allenatore, Evento, Messaggio, Quiz, Badge...)
├── exception/       GlobalExceptionHandler, ResourceNotFoundException, BadRequestException
├── repository/      Spring Data JPA repositories
├── scheduler/       QuizScheduler (reset classifica ogni lunedì)
├── security/        JwtUtils, JwtAuthenticationFilter, FmUserDetailsService
└── service/         UtenteService, GiocatoreService, EventoService, MessaggioService, QuizService
```

---

## Endpoint principali

### Autenticazione
| Metodo | Path              | Accesso    | Descrizione                  |
|--------|-------------------|------------|------------------------------|
| POST   | /api/auth/login   | Pubblico   | Login → JWT + ruolo          |

### Utenti / Rosa
| Metodo | Path                    | Accesso           |
|--------|-------------------------|-------------------|
| GET    | /api/utenti             | STAFF, IT         |
| POST   | /api/utenti             | STAFF, IT         |
| PUT    | /api/utenti/{id}        | STAFF, IT         |
| DELETE | /api/utenti/{id}        | STAFF, IT         |
| GET    | /api/giocatori/squadra/{id} | Tutti loggati |

### Statistiche
| Metodo | Path                             | Accesso                |
|--------|----------------------------------|------------------------|
| GET    | /api/statistiche/giocatore/{id}  | Tutti loggati          |
| PUT    | /api/statistiche/giocatore/{id}  | STAFF, ALLENATORE, IT  |

### Calendario
| Metodo | Path                              | Accesso                |
|--------|-----------------------------------|------------------------|
| GET    | /api/eventi/squadra/{id}          | Tutti loggati          |
| GET    | /api/eventi/squadra/{id}/mese     | Tutti loggati          |
| POST   | /api/eventi                       | STAFF, ALLENATORE, IT  |
| PUT    | /api/eventi/{id}                  | STAFF, ALLENATORE, IT  |
| DELETE | /api/eventi/{id}                  | STAFF, ALLENATORE, IT  |

### Messaggi
| Metodo | Path                    | Accesso                |
|--------|-------------------------|------------------------|
| GET    | /api/messaggi/arrivo    | Tutti loggati          |
| GET    | /api/messaggi/inviati   | Tutti loggati          |
| GET    | /api/messaggi/non-letti | Tutti loggati          |
| POST   | /api/messaggi           | STAFF, ALLENATORE, IT  |
| PATCH  | /api/messaggi/{id}/letto| Tutti loggati          |

### Quiz & Gamification
| Metodo | Path                         | Accesso           |
|--------|------------------------------|-------------------|
| GET    | /api/quiz/oggi               | GIOCATORE         |
| POST   | /api/quiz/risposta           | GIOCATORE         |
| GET    | /api/quiz/classifica/{sqId}  | Tutti loggati     |
| POST   | /api/quiz                    | STAFF, ALLENATORE |

### Dashboard aggregati
| Metodo | Path                         | Accesso       |
|--------|------------------------------|---------------|
| GET    | /api/dashboard/giocatore     | GIOCATORE     |
| GET    | /api/dashboard/dirigenza/{id}| DIRIGENZA+    |

---

## Integrazione con il frontend

Nel file `login.html` il form chiama `/api/auth/login`.
Sostituire l'URL relativo con `http://localhost:8080/api/auth/login` in fase di sviluppo,
oppure configurare un reverse proxy (Nginx/Vite) per evitare problemi CORS.

Il JWT restituito va salvato in `localStorage` come già fa il codice demo:
```js
localStorage.setItem('fm_token', data.token);
```
Ogni chiamata successiva deve includere:
```
Authorization: Bearer <token>
```

---

## Scheduler settimanale
Ogni **lunedì alle 00:05** (fuso Europe/Rome) `QuizScheduler` esegue:
1. Assegna badge eventualmente sbloccati durante la settimana
2. Azzera `punti_sett` di tutti i giocatori

---

## Sicurezza
- Password hashate con **BCrypt** (strength 12)
- Token JWT firmati con chiave HMAC-SHA256
- Scadenza token configurabile (`app.jwt.expiration-ms`, default 24h)
- CORS configurato su `app.cors.allowed-origins`
- Autorizzazione per ruolo su ogni endpoint tramite `@PreAuthorize`
