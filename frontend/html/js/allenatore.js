// ==========================================
// STATO GLOBALE
// ==========================================
let tuttiGiocatoriDashboard = [];
let tuttiEventiDashboard    = [];
let tuttiMessaggiDashboard  = [];

// ─── 1. INIZIALIZZAZIONE ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (typeof verificaAutenticazione === 'function') verificaAutenticazione();

    // Popola sidebar con nome/ruolo dal localStorage (salvati da login.js)
    const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Utente';
    const cognome = localStorage.getItem('cognomeReale') || '';
    const ruolo   = localStorage.getItem('ruolo')        || '';

    const sbName = document.getElementById('sb-nome');
    const sbRole = document.getElementById('sb-ruolo');
    const sbAv   = document.getElementById('sb-avatar');
    if (sbName) sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
    if (sbRole) sbRole.textContent = ruolo;
    if (sbAv)   sbAv.textContent   = (nome[0] || '').toUpperCase() + (cognome[0] || nome[1] || '').toUpperCase();

    setupFormListeners();
    caricaDatiDashboard();
});

// ─── 2. FORM LISTENERS ────────────────────────────────────────────────────
function setupFormListeners() {
    const msgForm = document.getElementById('dashboard-msg-form');
    if (msgForm) msgForm.addEventListener('submit', e => { e.preventDefault(); sendMsg(); });

    const evtForm = document.getElementById('dashboard-evento-form');
    if (evtForm) evtForm.addEventListener('submit', e => { e.preventDefault(); saveEvento(); });

    const playerForm = document.getElementById('dashboard-giocatore-form');
    if (playerForm) playerForm.addEventListener('submit', e => { e.preventDefault(); saveGiocatore(); });
}

// ─── 3. CARICA DATI DAL BACKEND ───────────────────────────────────────────
async function caricaDatiDashboard() {
    const idSquadra = localStorage.getItem('idSquadra');
    const headers   = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

    if (!idSquadra) {
        console.warn('idSquadra non trovato nel localStorage.');
        return;
    }

    try {
        // Chiamate parallele: giocatori + eventi + messaggi INVIATI dall'allenatore
        const [resGiocatori, resEventi, resMessaggi] = await Promise.all([
            fetch(`http://localhost:8080/api/giocatori/squadra/${idSquadra}`,  { headers }).catch(() => null),
            fetch(`http://localhost:8080/api/eventi/calendario/${idSquadra}`,  { headers }).catch(() => null),
            // CORREZIONE: endpoint corretto per i messaggi inviati dall'allenatore
            fetch('http://localhost:8080/api/messaggi/inviati',                { headers }).catch(() => null)
        ]);

        if (resGiocatori && resGiocatori.status === 401) { logout(); return; }

        tuttiGiocatoriDashboard = (resGiocatori?.ok) ? await resGiocatori.json() : [];
        tuttiEventiDashboard    = (resEventi?.ok)    ? await resEventi.json()    : [];
        tuttiMessaggiDashboard  = (resMessaggi?.ok)  ? await resMessaggi.json()  : [];

        console.log('Dashboard dati:', {
            giocatori: tuttiGiocatoriDashboard.length,
            eventi:    tuttiEventiDashboard.length,
            messaggi:  tuttiMessaggiDashboard.length
        });

        renderizzaKPI();
        renderizzaTabellaRosa();
        renderizzaListaEventi();
        renderizzaListaMessaggi();

        // Popola il <select> destinatario con i giocatori reali dal DB
        popolaSelectDestinatario();

    } catch (err) {
        console.error('Errore caricamento dashboard:', err);
    }
}

// ─── 4. POPOLA SELECT DESTINATARIO CON GIOCATORI REALI ───────────────────
// Carica la lista dei giocatori della squadra e la inserisce nel <select>
// in modo che ogni <option value="ID_numerico"> corrisponda a un giocatore reale.
async function popolaSelectDestinatario() {
    const sel = document.getElementById('msg-dest');
    if (!sel) return;

    // Se abbiamo già i giocatori in cache, usiamo quelli
    const giocatori = tuttiGiocatoriDashboard;

    if (!giocatori || giocatori.length === 0) {
        // Fallback: carica dalla rotta dedicata se la cache è vuota
        try {
            const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};
            const res = await fetch('http://localhost:8080/api/messaggi/giocatori-squadra', { headers });
            if (res.ok) {
                const lista = await res.json();
                sel.innerHTML = '<option value="">Seleziona giocatore…</option>'
                    + lista.map(g =>
                        `<option value="${g.id}">${g.numero ? '#'+g.numero+' ' : ''}${g.nomeCompleto}${g.posizione ? ' ('+g.posizione+')' : ''}</option>`
                    ).join('');
            }
        } catch(e) {
            console.warn('Non è stato possibile caricare i giocatori per il select:', e);
        }
        return;
    }

    // Usa i dati già presenti in tuttiGiocatoriDashboard
    sel.innerHTML = '<option value="">Seleziona giocatore…</option>'
        + giocatori.map(g =>
            `<option value="${g.id}">#${g.numero || '?'} ${g.nome} ${g.cognome}${g.posizione ? ' ('+g.posizione+')' : ''}</option>`
        ).join('');
}

// ─── 5. RENDERING ─────────────────────────────────────────────────────────

function renderizzaKPI() {
    // Prossimo evento
    const kpiEvData = document.getElementById('kpi-prossimo-evento-data');
    const kpiEvDet  = document.getElementById('kpi-prossimo-evento-dettaglio');
    if (tuttiEventiDashboard.length > 0) {
        const prossimi = [...tuttiEventiDashboard].sort((a, b) =>
            new Date(a.dataOraInizio || a.dataInizio || 0) - new Date(b.dataOraInizio || b.dataInizio || 0));
        const ev = prossimi[0];
        const d  = new Date(ev.dataOraInizio || ev.dataInizio || 0);
        if (kpiEvData) kpiEvData.textContent = isNaN(d) ? '—' : d.toLocaleDateString('it-IT', { weekday:'short', day:'numeric', month:'short' });
        if (kpiEvDet)  kpiEvDet.textContent  = `${ev.titolo} – ${ev.luogo || 'Sede'}`;
    } else {
        if (kpiEvData) kpiEvData.textContent = '—';
        if (kpiEvDet)  kpiEvDet.textContent  = 'Nessun evento';
    }

    // Messaggi inviati (KPI count)
    const kpiMsg = document.getElementById('kpi-messaggi');
    if (kpiMsg) kpiMsg.textContent = tuttiMessaggiDashboard.length;

    // Giocatori
    const kpiG = document.getElementById('kpi-giocatori');
    if (kpiG)  kpiG.textContent = tuttiGiocatoriDashboard.length;

    const kpiInf = document.getElementById('kpi-infortunati');
    if (kpiInf) {
        const n = tuttiGiocatoriDashboard.filter(g =>
            ['injured','infortunato'].includes((g.stato||'').toLowerCase())).length;
        kpiInf.textContent = `${n} infortunati`;
    }

    // Media punti
    const kpiGol = document.getElementById('kpi-media-gol');
    if (kpiGol && tuttiGiocatoriDashboard.length > 0) {
        const tot = tuttiGiocatoriDashboard.reduce((s, g) => s + (g.puntiTotali || g.punti_totali || 0), 0);
        kpiGol.textContent = (tot / tuttiGiocatoriDashboard.length).toFixed(1);
    }
}

function renderizzaTabellaRosa() {
    const tbody = document.getElementById('dashboard-rosa-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!tuttiGiocatoriDashboard.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#888;">Nessun giocatore in rosa.</td></tr>`;
        return;
    }

    tuttiGiocatoriDashboard.slice(0, 5).forEach(g => {
        const ini  = g.nome && g.cognome ? (g.nome[0] + g.cognome[0]).toUpperCase() : 'GP';
        const pos  = (g.posizione || '').toLowerCase();
        let posClass = 'pill-blue';
        if (pos.includes('por'))          posClass = 'pill-amber';
        else if (pos.includes('dif'))     posClass = 'pill-green';
        else if (pos.includes('att'))     posClass = 'pill-red';

        let statoClass = 'pill-green', statoTesto = 'Disponibile';
        if (['injured','infortunato'].includes((g.stato||'').toLowerCase())) { statoClass = 'pill-red';   statoTesto = 'Infortunato'; }
        else if ((g.stato||'').toLowerCase() === 'squalificato')             { statoClass = 'pill-amber'; statoTesto = 'Squalificato'; }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div class="player-name"><div class="player-avatar">${ini}</div>${g.nome} ${g.cognome}</div></td>
            <td><span class="pill ${posClass}">${g.posizione || 'N/D'}</span></td>
            <td>${g.presenze || 0}</td>
            <td>${g.puntiTotali || g.punti_totali || 0} pt</td>
            <td><span class="pill ${statoClass}">${statoTesto}</span></td>`;
        tbody.appendChild(tr);
    });
}

function renderizzaListaEventi() {
    const container = document.getElementById('dashboard-eventi-list');
    if (!container) return;
    container.innerHTML = '';

    if (!tuttiEventiDashboard.length) {
        container.innerHTML = `<div style="text-align:center;padding:20px;color:#888;">Nessun evento in programma.</div>`;
        return;
    }

    [...tuttiEventiDashboard]
        .sort((a, b) => new Date(a.dataOraInizio || 0) - new Date(b.dataOraInizio || 0))
        .slice(0, 4)
        .forEach(e => {
            const d    = new Date(e.dataOraInizio || e.dataInizio || 0);
            const gg   = isNaN(d) ? '–' : d.getDate();
            const mm   = isNaN(d) ? '–' : d.toLocaleDateString('it-IT',{month:'short'}).replace('.','');
            const ora  = isNaN(d) ? '–' : d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
            const tipo = (e.tipo || '').toLowerCase();
            const stripe = tipo === 'partita' ? 'stripe-blue' : tipo === 'riunione' ? 'stripe-amber' : 'stripe-green';

            const item = document.createElement('div');
            item.className = 'event-item';
            item.innerHTML = `
                <div class="event-date"><div class="day">${gg}</div><div class="mon">${mm}</div></div>
                <div class="event-stripe ${stripe}"></div>
                <div class="event-info">
                    <div class="event-title">${e.titolo || 'Evento'}</div>
                    <div class="event-meta">${ora} – ${e.luogo || 'Sede'}</div>
                </div>`;
            container.appendChild(item);
        });
}

// CORREZIONE: renderizza i messaggi con i campi reali del MessaggioDto
// MessaggioDto ha: id, testo, dataOra, stato, nomeAllenatore, nomeGiocatore, giocatoreId
function renderizzaListaMessaggi() {
    const container = document.getElementById('dashboard-msg-list');
    if (!container) return;
    container.innerHTML = '';

    if (!tuttiMessaggiDashboard.length) {
        container.innerHTML = `<div style="text-align:center;padding:20px;color:#888;">Nessun messaggio inviato di recente.</div>`;
        return;
    }

    tuttiMessaggiDashboard.slice(0, 3).forEach(m => {
        // Formatta la data (dataOra è LocalDateTime → "2025-07-21T08:30:00")
        let dataFormattata = '—';
        if (m.dataOra) {
            const d = new Date(m.dataOra);
            if (!isNaN(d)) {
                const oggi  = new Date();
                const ieri  = new Date(); ieri.setDate(ieri.getDate() - 1);
                const sameDay = (a, b) => a.toDateString() === b.toDateString();
                const ora = d.toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
                if      (sameDay(d, oggi)) dataFormattata = `Oggi ${ora}`;
                else if (sameDay(d, ieri)) dataFormattata = `Ieri ${ora}`;
                else dataFormattata = d.toLocaleDateString('it-IT', {day:'2-digit', month:'short'}) + ' ' + ora;
            }
        }

        // stato: "INVIATO" → non ancora letto, "LETTO" → letto
        const letto  = (m.stato || '').toUpperCase() === 'LETTO';
        const statoClass = letto ? 'letto' : 'inviato';
        const statoTxt   = letto ? '✔✔ Letto' : '✔ Non ancora letto';

        const div = document.createElement('div');
        div.className = 'msg-item';
        div.innerHTML = `
            <div class="msg-header">
                <span class="msg-to">→ ${m.nomeGiocatore || '—'}</span>
                <span class="msg-time">${dataFormattata}</span>
            </div>
            <div class="msg-text">${m.testo || ''}</div>
            <div class="msg-status ${statoClass}">${statoTxt}</div>`;
        container.appendChild(div);
    });
}

// ─── 6. INVIA MESSAGGIO → POST /api/messaggi ─────────────────────────────
//
// L'endpoint POST /api/messaggi si aspetta:
//   { "giocatoreId": <Integer>, "testo": "<String>" }
//
// Il token JWT nell'header identifica l'allenatore autenticato lato backend.
// NON serve mandare idAllenatore o idSquadra nel body.
//
async function sendMsg() {
    const selDest = document.getElementById('msg-dest');
    const testo   = (document.getElementById('msg-text')?.value || '').trim();

    // Leggi il giocatoreId dal valore del select (deve essere il numeric DB id)
    const giocatoreId = selDest ? parseInt(selDest.value, 10) : NaN;

    // Validazione
    if (!selDest || !selDest.value || isNaN(giocatoreId)) {
        mostraFeedbackMsg('Seleziona un giocatore destinatario.', false);
        return;
    }
    if (!testo) {
        mostraFeedbackMsg('Scrivi il testo del messaggio prima di inviare.', false);
        return;
    }

    // Payload corretto per il backend Spring Boot
    const payload = {
        giocatoreId: giocatoreId,
        testo:       testo
    };

    const headers = typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Content-Type': 'application/json' };

    try {
        const btnInvia = document.querySelector('#dashboard-msg-form button[type="submit"]');
        if (btnInvia) { btnInvia.disabled = true; btnInvia.textContent = 'Invio…'; }

        const response = await fetch('http://localhost:8080/api/messaggi', {
            method:  'POST',
            headers: headers,
            body:    JSON.stringify(payload)
        });

        if (response.ok) {
            const nuovoMsg = await response.json();
            // Aggiorna la cache locale e ri-renderizza la lista senza ricaricare tutto
            tuttiMessaggiDashboard.unshift(nuovoMsg);
            renderizzaListaMessaggi();

            // Aggiorna KPI messaggi
            const kpiMsg = document.getElementById('kpi-messaggi');
            if (kpiMsg) kpiMsg.textContent = tuttiMessaggiDashboard.length;

            // Reset form
            document.getElementById('dashboard-msg-form').reset();
            // Ripristina il placeholder nel select dopo il reset
            await popolaSelectDestinatario();

            mostraFeedbackMsg(`✔ Messaggio inviato a ${nuovoMsg.nomeGiocatore || 'giocatore'}!`, true);
        } else {
            const errTxt = await response.text().catch(() => `HTTP ${response.status}`);
            console.error('Errore invio messaggio:', response.status, errTxt);
            mostraFeedbackMsg(`Errore ${response.status}: impossibile inviare il messaggio.`, false);
        }
    } catch (err) {
        console.error('Errore di rete:', err);
        mostraFeedbackMsg('Server non raggiungibile. Verifica che Spring Boot sia attivo.', false);
    } finally {
        const btnInvia = document.querySelector('#dashboard-msg-form button[type="submit"]');
        if (btnInvia) { btnInvia.disabled = false; btnInvia.textContent = 'Invia →'; }
    }
}

// Mostra feedback inline sotto il form messaggi
function mostraFeedbackMsg(testo, successo) {
    let fb = document.getElementById('msg-feedback');
    if (!fb) {
        fb = document.createElement('div');
        fb.id = 'msg-feedback';
        fb.style.cssText = 'font-size:.82rem;margin-top:6px;padding:6px 10px;border-radius:6px;';
        document.getElementById('dashboard-msg-form')?.appendChild(fb);
    }
    fb.textContent = testo;
    fb.style.background = successo ? 'rgba(58,125,68,.18)' : 'rgba(239,68,68,.12)';
    fb.style.color      = successo ? 'var(--green-l, #4caf50)' : '#f87171';
    fb.style.border     = successo ? '1px solid rgba(76,175,80,.3)' : '1px solid rgba(239,68,68,.35)';
    // Rimuovi dopo 4 secondi
    clearTimeout(fb._timer);
    fb._timer = setTimeout(() => { if (fb.parentNode) fb.remove(); }, 4000);
}

// ─── 7. SALVA EVENTO ──────────────────────────────────────────────────────
async function saveEvento() {
    const idSquadra = localStorage.getItem('idSquadra');
    if (!idSquadra) { alert('Errore: ID Squadra non trovato.'); return; }

    const rawStart = document.getElementById('evt-start')?.value;
    const rawEnd   = document.getElementById('evt-end')?.value;
    if (!rawStart || !rawEnd) { alert('Inserisci data di inizio e fine.'); return; }

    const payload = {
        titolo:        document.getElementById('evt-title')?.value    || '',
        tipo:          document.getElementById('evt-type')?.value     || 'allenamento',
        dataOraInizio: rawStart.length === 16 ? `${rawStart}:00` : rawStart,
        dataOraFine:   rawEnd.length   === 16 ? `${rawEnd}:00`   : rawEnd,
        luogo:         document.getElementById('evt-location')?.value || '',
        calendarioId:  parseInt(idSquadra, 10)
    };

    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' };

    try {
        const res = await fetch('http://localhost:8080/api/eventi', {
            method: 'POST', headers, body: JSON.stringify(payload)
        });
        if (res.ok) {
            const ev = await res.json();
            tuttiEventiDashboard.push(ev);
            renderizzaListaEventi();
            renderizzaKPI();
            closeModal('modal-evento');
            document.getElementById('dashboard-evento-form')?.reset();
        } else {
            alert(`Errore salvataggio evento (${res.status}).`);
        }
    } catch(e) {
        console.error(e);
        alert('Server non raggiungibile.');
    }
}

// ─── 8. SALVA GIOCATORE ───────────────────────────────────────────────────
async function saveGiocatore() {
    const idSquadra = localStorage.getItem('idSquadra');
    if (!idSquadra) { alert('Errore: ID Squadra non trovato.'); return; }

    const payload = {
        nome:        document.getElementById('player-nome')?.value.trim()        || '',
        cognome:     document.getElementById('player-cognome')?.value.trim()     || '',
        numero:      parseInt(document.getElementById('player-numero')?.value, 10) || 1,
        posizione:   document.getElementById('player-ruolo')?.value              || 'ATT',
        piede:       document.getElementById('player-piede')?.value              || 'Destro',
        nazionalita: document.getElementById('player-nazionalita')?.value.trim() || 'Italiana',
        altezza:     parseInt(document.getElementById('player-altezza')?.value, 10) || null,
        peso:        parseInt(document.getElementById('player-peso')?.value, 10)    || null,
        dataNascita: document.getElementById('player-data-nascita')?.value        || null,
        squadraId:   parseInt(idSquadra, 10)
    };

    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' };

    try {
        const res = await fetch('http://localhost:8080/api/giocatori', {
            method: 'POST', headers, body: JSON.stringify(payload)
        });
        if (res.ok) {
            const g = await res.json();
            tuttiGiocatoriDashboard.push(g);
            renderizzaTabellaRosa();
            renderizzaKPI();
            popolaSelectDestinatario();   // aggiorna il select con il nuovo giocatore
            closeModal('modal-giocatore');
            document.getElementById('dashboard-giocatore-form')?.reset();
        } else {
            alert(`Errore salvataggio giocatore (${res.status}).`);
        }
    } catch(e) {
        console.error(e);
        alert('Server non raggiungibile.');
    }
}

// ─── 9. MODAL & LOGOUT ────────────────────────────────────────────────────
function openModal(id)  { const m = document.getElementById(id); if (m) m.style.display = 'flex'; }
function closeModal(id) { const m = document.getElementById(id); if (m) m.style.display = 'none'; }
function logout()       { localStorage.clear(); window.location.href = '/html/login.html'; }