/* =========================================================
   giocatore.js
   ─ Carica i messaggi reali dal backend via GET /api/messaggi/miei
   ─ Segna i messaggi come letti via PATCH /api/messaggi/{id}/letto
   ─ Carica gli eventi dal backend via GET /api/eventi/calendario/{id}
   ─ Gamification: quiz del giorno via GET/POST /api/quiz/oggi(/risposta)
   ========================================================= */

const API = 'http://localhost:8080';

// ─── 1. INIT ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Controllo autenticazione
    if (typeof verificaAutenticazione === 'function') {
        verificaAutenticazione();
    } else {
        if (!localStorage.getItem('token')) {
            window.location.href = '../login.html';
            return;
        }
    }

    popolaSidebar();
    popolaTopbar();
    caricaProfiloGiocatore(); // ← dati reali del profilo (posizione, numero, punti...) in alto
    caricaMessaggi();          // ← carica dal DB
    caricaEventi();            // ← carica dal DB
    caricaQuizGiornaliero();   // ← gamification: quiz del primo accesso del giorno
});

// ─── 2. SIDEBAR ───────────────────────────────────────────────────────────
function popolaSidebar() {
    const nome    = localStorage.getItem('nomeReale')    || '';
    const cognome = localStorage.getItem('cognomeReale') || '';
    const ruolo   = localStorage.getItem('ruolo')        || 'Giocatore';
    const username = localStorage.getItem('username')    || 'Utente';

    const sbName = document.getElementById('sb-nome');
    const sbRole = document.getElementById('sb-ruolo');
    const sbAv   = document.getElementById('sb-avatar');

    if (sbName) sbName.textContent = nome ? (cognome ? `${nome} ${cognome}` : nome) : username;
    if (sbRole) sbRole.textContent = ruolo;
    if (sbAv) {
        const n = nome || username;
        const c = cognome || '';
        sbAv.textContent = (n[0] || '').toUpperCase() + (c[0] || n[1] || '').toUpperCase();
    }
}

// ─── 3. TOPBAR + PROFILO ──────────────────────────────────────────────────
function popolaTopbar() {
    const nome    = localStorage.getItem('nomeReale')    || '';
    const cognome = localStorage.getItem('cognomeReale') || '';
    const nomeCompleto = nome ? (cognome ? `${nome} ${cognome}` : nome) : 'Giocatore';

    // Topbar welcome
    const welcome = document.getElementById('topbar-welcome');
    if (welcome) welcome.textContent = `Benvenuto, ${nome || 'Giocatore'} 👋`;

    // Data odierna
    const dataEl = document.getElementById('topbar-data');
    if (dataEl) {
        dataEl.textContent = new Date().toLocaleDateString('it-IT', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    // Profilo hero
    const picEl  = document.getElementById('profile-pic');
    const nomeEl = document.getElementById('profile-nome');
    if (picEl) {
        const ini = (nome[0] || '').toUpperCase() + (cognome[0] || nome[1] || '').toUpperCase();
        picEl.textContent = ini || '?';
    }
    if (nomeEl) nomeEl.textContent = nomeCompleto;
}

// ─── 3bis. PROFILO REALE (card in alto) ────────────────────────────────────
/*
 * Endpoint: GET /api/giocatori/me
 * Auth:     JWT — il backend identifica il giocatore dal token, non da un id
 *           passato dal client.
 * Risposta: GiocatoreDto
 *   { id, nome, cognome, numero, posizione, piede, nazionalita, altezza,
 *     peso, puntiTotali, puntiSettimanali, ... }
 *
 * Sostituisce i valori demo hardcoded nella card "profile-hero" con i dati
 * reali del giocatore (posizione, numero, piede, nazionalità, altezza, punti).
 */
async function caricaProfiloGiocatore() {
    const headers = typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') };

    try {
        const res = await fetch(`${API}/api/giocatori/me`, { headers });
        if (res.status === 401) { logout(); return; }
        if (!res.ok) { console.error('Errore caricamento profilo:', res.status); return; }

        const g = await res.json();
        renderizzaProfilo(g);

    } catch (err) {
        console.error('Errore di rete profilo:', err);
    }
}

function renderizzaProfilo(g) {
    if (!g) return;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('profile-posizione',   g.posizione   || 'N/D');
    set('profile-numero',      g.numero ? `#${g.numero}` : 'N/D');
    set('profile-piede',       g.piede       || 'N/D');
    set('profile-nazionalita', g.nazionalita || 'N/D');
    set('profile-altezza',     g.altezza ? `${g.altezza} cm` : 'N/D');
    set('profile-punti-totali', g.puntiTotali ?? 0);

    // Aggiorna anche localStorage: utile se manca (es. token generato prima
    // di questa modifica) o se il valore era rimasto disallineato.
    if (g.id) localStorage.setItem('idGiocatore', g.id);
}

// ─── 4. CARICA MESSAGGI DAL BACKEND ───────────────────────────────────────
/*
 * Endpoint: GET /api/messaggi/miei
 * Auth:     JWT nel header → il backend identifica il giocatore dal token
 * Risposta: List<MessaggioDto>
 *   { id, testo, dataOra, stato, nomeAllenatore, nomeGiocatore, giocatoreId, mittenteNome, mittenteRuolo }
 *
 * stato = "INVIATO" → non ancora letto dal giocatore
 * stato = "LETTO"   → già letto
 */
async function caricaMessaggi() {
    const loader  = document.getElementById('msg-loading');
    const listEl  = document.getElementById('msg-list-giocatore');
    const emptyEl = document.getElementById('msg-empty');
    const badge   = document.getElementById('msg-badge-nonletti');

    // Mostra loader, nascondi gli altri
    if (loader)  loader.style.display  = 'block';
    if (listEl)  listEl.style.display  = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    const headers = typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') };

    try {
        const res = await fetch(`${API}/api/messaggi/miei`, { headers });

        if (res.status === 401) { logout(); return; }

        if (!res.ok) {
            console.error('Errore caricamento messaggi:', res.status);
            if (loader) loader.textContent = 'Impossibile caricare i messaggi.';
            return;
        }

        const messaggi = await res.json();

        // Nascondi loader
        if (loader) loader.style.display = 'none';

        if (!messaggi || messaggi.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            if (badge)   badge.style.display   = 'none';
            return;
        }

        // Conta non letti (stato === 'INVIATO' = non ancora letto dal giocatore)
        const nonLetti = messaggi.filter(m => m.stato === 'INVIATO').length;
        if (badge) {
            if (nonLetti > 0) {
                badge.textContent   = `${nonLetti} non ${nonLetti === 1 ? 'letto' : 'letti'}`;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }

        // Renderizza
        renderizzaMessaggi(messaggi, listEl);
        if (listEl) listEl.style.display = 'block';

    } catch (err) {
        console.error('Errore di rete messaggi:', err);
        if (loader) loader.textContent = 'Server non raggiungibile.';
    }
}

// ─── 5. RENDERIZZA LISTA MESSAGGI ─────────────────────────────────────────
function renderizzaMessaggi(messaggi, container) {
    if (!container) return;
    container.innerHTML = '';

    messaggi.forEach(m => {
        const nonLetto = m.stato === 'INVIATO';

        // Formatta data/ora
        let dataStr = '—';
        if (m.dataOra) {
            const d    = new Date(m.dataOra);
            const oggi = new Date();
            const ieri = new Date(); ieri.setDate(ieri.getDate() - 1);
            const ora  = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
            if (d.toDateString() === oggi.toDateString())      dataStr = `Oggi ${ora}`;
            else if (d.toDateString() === ieri.toDateString()) dataStr = `Ieri ${ora}`;
            else dataStr = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) + ' ' + ora;
        }

        const mittente = m.mittenteNome || m.nomeAllenatore || 'Allenatore';

        // Costruisci il div usando le classi CSS già presenti in stylegiocatore.css:
        // .msg-item, .msg-item.unread, .msg-head, .msg-from, .msg-time,
        // .msg-text, .unread-dot
        const div = document.createElement('div');
        div.className = `msg-item${nonLetto ? ' unread' : ''}`;
        div.style.cssText = 'margin:8px 12px;';
        div.dataset.msgId = m.id;

        div.innerHTML = `
            <div class="msg-head">
                <span class="msg-from">
                    ${nonLetto ? '<span class="unread-dot"></span>' : ''}${esc(mittente)}
                </span>
                <span class="msg-time">${dataStr}</span>
            </div>
            <div class="msg-text" style="white-space:normal;overflow:visible;">
                ${esc(m.testo)}
            </div>`;

        // Click → segna come letto
        div.addEventListener('click', () => apriMessaggio(div, m.id));
        container.appendChild(div);
    });
}

// ─── 6. SEGNA MESSAGGIO COME LETTO ────────────────────────────────────────
/*
 * Endpoint: PATCH /api/messaggi/{id}/letto
 * Cambia stato da "INVIATO" a "LETTO" nel DB.
 * L'allenatore vedrà "✔✔ Letto" nella sua dashboard.
 */
async function apriMessaggio(el, idMessaggio) {
    // Già letto → niente da fare
    if (!el.classList.contains('unread')) return;

    // Aggiorna UI subito (ottimistic update)
    el.classList.remove('unread');
    const dot = el.querySelector('.unread-dot');
    if (dot) dot.remove();

    // Aggiorna il badge non letti
    aggiornaBadgeNonLetti(-1);

    // Chiama il backend
    const headers = typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') };

    try {
        const res = await fetch(`${API}/api/messaggi/${idMessaggio}/letto`, {
            method:  'PATCH',
            headers: headers
        });
        if (res.ok) {
            console.log(`Messaggio #${idMessaggio} segnato come letto.`);
        } else {
            console.warn(`PATCH /letto → ${res.status}`);
        }
    } catch (err) {
        console.error('Errore PATCH /letto:', err);
    }
}

function aggiornaBadgeNonLetti(delta) {
    const badge = document.getElementById('msg-badge-nonletti');
    if (!badge) return;

    // Conta i .msg-item.unread ancora nella lista
    const rimasti = document.querySelectorAll('#msg-list-giocatore .msg-item.unread').length;
    if (rimasti > 0) {
        badge.textContent   = `${rimasti} non ${rimasti === 1 ? 'letto' : 'letti'}`;
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }
}

// ─── 7. UTILITY ───────────────────────────────────────────────────────────
function esc(s) {
    return String(s || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function logout() {
    localStorage.clear();
    window.location.href = '../login.html';
}

// ─── 8. CARICA EVENTI DAL BACKEND ─────────────────────────────────────────
/*
 * Endpoint: GET /api/eventi/calendario/{idCalendario}
 * Auth:     JWT — accessibile a tutti i ruoli autenticati (SecurityConfig: .authenticated())
 * idCalendario = idSquadra salvato al login (coincidono per questo progetto)
 *
 * Il giocatore può SOLO vedere gli eventi, non crearli né modificarli.
 * Mostra i prossimi 4 eventi futuri, ordinati per data crescente.
 */
async function caricaEventi() {
    const loader  = document.getElementById('eventi-loading');
    const listEl  = document.getElementById('eventi-list');
    const emptyEl = document.getElementById('eventi-empty');

    if (loader)  loader.style.display  = 'block';
    if (listEl)  listEl.style.display  = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    const idCalendario = localStorage.getItem('idSquadra') || '1';
    const headers = typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') };

    try {
        const res = await fetch(`${API}/api/eventi/calendario/${idCalendario}`, { headers });

        if (res.status === 401) { logout(); return; }

        if (!res.ok) {
            console.error('Errore caricamento eventi:', res.status);
            if (loader) loader.textContent = 'Impossibile caricare gli eventi.';
            return;
        }

        const tutti = await res.json();
        if (loader) loader.style.display = 'none';

        // Filtra solo eventi futuri (o in corso oggi) e ordina per data
        const ora  = new Date();
        const futuri = (Array.isArray(tutti) ? tutti : [])
            .filter(e => e.dataOraInizio && new Date(e.dataOraInizio) >= ora)
            .sort((a, b) => new Date(a.dataOraInizio) - new Date(b.dataOraInizio));

        if (!futuri.length) {
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        renderizzaEventi(futuri.slice(0, 4), listEl);
        if (listEl) listEl.style.display = 'block';

    } catch (err) {
        console.error('Errore di rete eventi:', err);
        if (loader) loader.textContent = 'Server non raggiungibile.';
    }
}

function renderizzaEventi(eventi, container) {
    if (!container) return;
    container.innerHTML = '';

    // Mappa tipo ENUM → classe stripe CSS già definita in stylegiocatore.css
    const stripeClass = { PARTITA: 'stripe-blue', RIUNIONE: 'stripe-amber' };

    eventi.forEach(e => {
        const d = new Date(e.dataOraInizio);

        const giorno = isNaN(d) ? '—' : d.getDate();
        const mese   = isNaN(d) ? '—' : d.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '');
        const ora    = isNaN(d) ? '—' : d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        // Titolo: include il luogo se presente
        const titolo  = esc(e.titolo || 'Evento');
        const luogo   = e.luogo ? ` – ${esc(e.luogo)}` : '';
        const metaTxt = e.dataOraFine
            ? `${ora} – ${new Date(e.dataOraFine).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}${luogo}`
            : `${ora}${luogo}`;

        const tipo   = (e.tipo || '').toUpperCase();
        const stripe = stripeClass[tipo] || 'stripe-green';

        // Usa esattamente le classi CSS già presenti in stylegiocatore.css:
        // .event-item, .event-date, .day, .mon, .event-stripe, .event-info, .title, .meta
        const item = document.createElement('div');
        item.className = 'event-item';
        item.innerHTML = `
            <div class="event-date">
                <div class="day">${giorno}</div>
                <div class="mon">${mese}</div>
            </div>
            <div class="event-stripe ${stripe}"></div>
            <div class="event-info">
                <div class="title">${titolo}</div>
                <div class="meta">${metaTxt}</div>
            </div>`;
        container.appendChild(item);
    });
}

// ─── 9. GAMIFICATION: QUIZ DEL GIORNO ──────────────────────────────────────
/*
 * Endpoint: GET /api/quiz/oggi
 * Auth:     JWT — il backend identifica il giocatore dal token
 * Risposta: QuizGiornalieroDto
 *   { id, domanda, opzioni[], puntiValore, giaRisposto,
 *     rispostaCorretta (bool|null), rispostaScelta, soluzioneTesto }
 *
 * La domanda è la stessa per tutti i giocatori nella stessa giornata
 * (rotazione lato server) e cambia il giorno successivo. Un solo
 * tentativo al giorno per giocatore: se ha già risposto oggi, il backend
 * restituisce direttamente l'esito invece delle opzioni da scegliere.
 */
const QUIZ_TIMEOUT_SEC = 40;
let quizTimerInterval  = null;
let quizSecondsLeft    = QUIZ_TIMEOUT_SEC;
let quizOpzioneScelta  = null;
let quizIdCorrente     = null;
let quizAvviato        = false; // evita doppio invio

async function caricaQuizGiornaliero() {
    const body    = document.getElementById('quiz-body');
    const subt    = document.getElementById('quiz-subtitle');
    const ptsBadge = document.getElementById('quiz-pts-badge');
    if (!body) return; // pagina senza quiz-card

    const headers = typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') };

    try {
        const res = await fetch(`${API}/api/quiz/oggi`, { headers });

        if (res.status === 401) { logout(); return; }

        if (!res.ok) {
            body.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:0.85rem">
                Quiz non disponibile al momento.</div>`;
            if (subt) subt.textContent = '—';
            return;
        }

        const quiz = await res.json();
        quizIdCorrente = quiz.id;

        if (ptsBadge) ptsBadge.textContent = `+${quiz.puntiValore} punti se corretto`;

        if (quiz.giaRisposto) {
            renderizzaQuizGiaFatto(quiz, body, subt);
        } else {
            renderizzaQuizDaCompilare(quiz, body, subt);
        }

    } catch (err) {
        console.error('Errore caricamento quiz del giorno:', err);
        body.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:0.85rem">
            Server non raggiungibile.</div>`;
    }
}

// Stato: il giocatore ha già risposto oggi → mostra solo l'esito, niente opzioni
function renderizzaQuizGiaFatto(quiz, body, subt) {
    if (subt) subt.textContent = 'Hai già risposto oggi — torna domani per una nuova domanda';

    const esito = quiz.rispostaCorretta === true;
    const colore = esito ? '#4caf50' : '#f87171';
    const icona  = esito ? '✔' : '✘';
    const testo  = esito ? 'Risposta corretta!' : 'Risposta errata';

    body.innerHTML = `
        <div class="quiz-question">${esc(quiz.domanda)}</div>
        <div style="text-align:center;padding:1.25rem;border-radius:10px;background:rgba(255,255,255,0.03);margin-bottom:0.5rem">
            <div style="font-size:2rem;color:${colore};margin-bottom:6px">${icona}</div>
            <div style="font-weight:600;color:${colore};margin-bottom:4px">${testo}</div>
            <div style="font-size:0.82rem;color:var(--muted)">
                La risposta corretta era: <strong style="color:var(--text)">${esc(quiz.soluzioneTesto || '')}</strong>
            </div>
        </div>`;
}

// Stato: quiz da compilare — timer + opzioni reali dal backend
function renderizzaQuizDaCompilare(quiz, body, subt) {
    if (subt) subt.textContent = `Rispondi entro ${QUIZ_TIMEOUT_SEC} secondi`;

    const lettere = ['A', 'B', 'C'];
    const opzioniHtml = (quiz.opzioni || []).map((testo, i) => `
        <div class="quiz-option" data-opt="${esc(testo)}" onclick="selectOpt(this,'${lettere[i]}')">
            <div class="option-letter">${lettere[i]}</div>${esc(testo)}
        </div>`).join('');

    body.innerHTML = `
        <div class="timer-bar"><div class="timer-fill" id="timer-fill" style="width:100%"></div></div>
        <div class="quiz-question" id="quiz-q">${esc(quiz.domanda)}</div>
        <div class="quiz-options" id="quiz-opts">${opzioniHtml}</div>
        <div class="quiz-footer">
            <div class="timer-text">Tempo rimasto: <span id="timer-val">${QUIZ_TIMEOUT_SEC}</span>s</div>
            <button class="btn-primary" id="btn-confirm" onclick="confirmAnswer()" disabled>Conferma</button>
        </div>`;

    avviaTimerQuiz();
}

function avviaTimerQuiz() {
    quizSecondsLeft = QUIZ_TIMEOUT_SEC;
    quizOpzioneScelta = null;
    quizAvviato = false;
    if (quizTimerInterval) clearInterval(quizTimerInterval);

    const timerFill = document.getElementById('timer-fill');
    const timerVal  = document.getElementById('timer-val');

    quizTimerInterval = setInterval(() => {
        quizSecondsLeft--;
        if (timerVal) timerVal.textContent = quizSecondsLeft;

        if (timerFill) {
            const pct = (quizSecondsLeft / QUIZ_TIMEOUT_SEC) * 100;
            timerFill.style.width = pct + '%';
            if (quizSecondsLeft <= 10) timerFill.classList.add('danger');
        }

        if (quizSecondsLeft <= 0) {
            clearInterval(quizTimerInterval);
            // Tempo scaduto senza risposta selezionata: invia comunque per
            // registrare il tentativo (risposta vuota → conteggiata errata).
            inviaRispostaQuiz('');
        }
    }, 1000);
}

function selectOpt(el, letter) {
    const btnConfirm = document.getElementById('btn-confirm');
    if (quizAvviato) return;
    document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    quizOpzioneScelta = el.dataset.opt;
    if (btnConfirm) btnConfirm.disabled = false;
}

function confirmAnswer() {
    if (!quizOpzioneScelta || quizAvviato) return;
    clearInterval(quizTimerInterval);
    inviaRispostaQuiz(quizOpzioneScelta);
}

/*
 * Endpoint: POST /api/quiz/oggi/risposta
 * Body:     { rispostaScelta, secondiImpiegati }
 * Il backend deduce da solo QUALE quiz è quello di oggi — non si manda
 * il quizId dal client, per evitare che si possa rispondere a piacere.
 */
async function inviaRispostaQuiz(rispostaScelta) {
    if (quizAvviato) return;
    quizAvviato = true;

    const btnConfirm = document.getElementById('btn-confirm');
    if (btnConfirm) { btnConfirm.disabled = true; btnConfirm.textContent = 'Invio…'; }

    const secondiImpiegati = QUIZ_TIMEOUT_SEC - Math.max(0, quizSecondsLeft);

    const headers = typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Authorization': 'Bearer ' + localStorage.getItem('token'), 'Content-Type': 'application/json' };

    try {
        const res = await fetch(`${API}/api/quiz/oggi/risposta`, {
            method:  'POST',
            headers: headers,
            body: JSON.stringify({ rispostaScelta, secondiImpiegati })
        });

        if (res.status === 401) { logout(); return; }

        if (!res.ok) {
            // Es. "hai già risposto oggi" per doppio click/tab multipli: ricarica lo stato reale
            await caricaQuizGiornaliero();
            return;
        }

        const esito = await res.json();
        mostraEsitoQuiz(esito);

        if (esito.corretta) {
            aggiornaPuntiSchermo(esito.puntiTotali);
            if (esito.nuoviBadge && esito.nuoviBadge.length) mostraNuoviBadge(esito.nuoviBadge);
        }

    } catch (err) {
        console.error('Errore invio risposta quiz:', err);
        if (btnConfirm) { btnConfirm.disabled = false; btnConfirm.textContent = 'Conferma'; }
        quizAvviato = false;
    }
}

// Colora le opzioni mostrando quale era corretta e quale (eventualmente) sbagliata
function mostraEsitoQuiz(esito) {
    const timerFill = document.getElementById('timer-fill');
    if (timerFill) timerFill.style.width = '0%';

    document.querySelectorAll('.quiz-option').forEach(o => {
        const testo = o.dataset.opt;
        if (testo === esito.rispostaCorretta) {
            o.classList.add('correct');
        } else if (testo === quizOpzioneScelta && !esito.corretta) {
            o.classList.add('wrong');
        }
    });

    const btnConfirm = document.getElementById('btn-confirm');
    if (btnConfirm) {
        btnConfirm.textContent = esito.corretta
            ? `✔ Corretto! +${esito.puntiAssegnati} pt`
            : '✘ Risposta errata';
        btnConfirm.style.background = esito.corretta ? '#4caf50' : '#ef4444';
        btnConfirm.disabled = true;
        btnConfirm.onclick  = null;
    }

    const subt = document.getElementById('quiz-subtitle');
    if (subt) subt.textContent = 'Hai già risposto oggi — torna domani per una nuova domanda';
}

// Aggiorna il totale punti mostrato nel profilo con il valore reale dal backend
function aggiornaPuntiSchermo(nuovoTotale) {
    const el = document.getElementById('profile-punti-totali');
    if (el && typeof nuovoTotale === 'number') el.textContent = nuovoTotale;
}

// Mostra i badge appena sbloccati (se ce ne sono) accanto ai punti
function mostraNuoviBadge(badges) {
    const container = document.getElementById('profile-badge-list');
    if (!container) return;
    badges.forEach(b => {
        const el = document.createElement('div');
        el.className = 'badge-icon';
        el.textContent = `🎖 ${b.nomeBadge}`;
        container.appendChild(el);
    });
}

// Compatibilità con i chiamanti HTML onclick="openMsg(this)" rimasti (se presenti)
function openMsg(el, idMessaggio) {
    apriMessaggio(el, idMessaggio);
}