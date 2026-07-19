// Variabili globali per salvare i dati del DB in locale
let tuttiGiocatoriDashboard = [];
let tuttiEventiDashboard = [];
let tuttiMessaggiDashboard = [];

// ─── 1. INIZIALIZZAZIONE DELLA PAGINA ───
document.addEventListener('DOMContentLoaded', () => {
    // 1. Esegue il controllo sulla validità del login
    verificaAutenticazione();

    // 2. Popola la sidebar con nome/ruolo dal localStorage
    const sbName = document.getElementById('sb-nome');
    const sbRole = document.getElementById('sb-ruolo');
    const sbAv   = document.getElementById('sb-avatar');
    
    const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Utente';
    const cognome = localStorage.getItem('cognomeReale') || '';
    const ruolo   = localStorage.getItem('ruolo')        || '';
    
    if (sbName) sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
    if (sbRole) sbRole.textContent = ruolo;
    if (sbAv)   sbAv.textContent   = (nome[0]||('')).toUpperCase() + (cognome[0]||nome[1]||'').toUpperCase();

    // 3. Configura l'intercettazione dei form (Invia messaggio e Nuovo Evento)
    setupFormListeners();

    // 4. Scarica tutti i dati reali dal backend
    caricaDatiDashboard(); 
});

// Configura i listener per evitare i ricaricamenti nativi della pagina dei tag <form>
function setupFormListeners() {
    const msgForm = document.getElementById('dashboard-msg-form');
    if (msgForm) {
        msgForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendMsg();
        });
    }

    const evtForm = document.getElementById('dashboard-evento-form');
    if (evtForm) {
        evtForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveEvento();
        });
    }
}

// ─── 2. RECUPERO DATI DAL BACKEND (Logica coordinata a rosa.js) ───
async function caricaDatiDashboard() {
    try {
        const idSquadra = localStorage.getItem('idSquadra'); 

        if (!idSquadra) {
            console.error("Nessun ID squadra trovato nel localStorage.");
            return;
        }

        // Chiamate in parallelo per ottimizzare i tempi usando i tuoi endpoint reali basati su idSquadra
        // Nota: se gli endpoint di eventi e messaggi sono leggermente diversi, basta allinearli qui sotto
        const [resGiocatori, resEventi, resMessaggi] = await Promise.all([
            fetch(`http://localhost:8080/api/giocatori/squadra/${idSquadra}`, { method: 'GET', headers: getAuthHeaders() }),
            fetch(`http://localhost:8080/api/eventi/squadra/${idSquadra}`, { method: 'GET', headers: getAuthHeaders() }),
            fetch(`http://localhost:8080/api/messaggi/squadra/${idSquadra}`, { method: 'GET', headers: getAuthHeaders() })
        ]);

        // Controllo centralizzato della validità del token (se uno fallisce per 401/403, slogga)
        if (resGiocatori.status === 401 || resGiocatori.status === 403) {
            logout();
            return;
        }

        // Parsing sicuro dei dati (se l'endpoint risponde correttamente, altrimenti array vuoto)
        tuttiGiocatoriDashboard = resGiocatori.ok ? await resGiocatori.json() : [];
        tuttiEventiDashboard = resEventi.ok ? await resEventi.json() : [];
        tuttiMessaggiDashboard = resMessaggi.ok ? await resMessaggi.json() : [];

        console.log("Dati Dashboard Caricati:", { tuttiGiocatoriDashboard, tuttiEventiDashboard, tuttiMessaggiDashboard });

        // Eseguiamo il rendering grafico dei componenti a schermo
        renderizzaKPI();
        renderizzaTabellaRosa();
        renderizzaListaEventi();
        renderizzaListaMessaggi();

    } catch (error) {
        console.error("Errore durante il recupero dei dati della dashboard:", error);
    }
}

// ─── 3. RENDERING GRAFICO DEI COMPONENTI ───

function renderizzaKPI() {
    // 1. Giocatori Totali ed Infortunati
    const kpiGiocatori = document.getElementById('kpi-giocatori');
    const kpiInfortunati = document.getElementById('kpi-infortunati');
    if (kpiGiocatori) kpiGiocatori.textContent = tuttiGiocatoriDashboard.length;
    
    if (kpiInfortunati) {
        // Controlla sia la stringa 'injured' (usata in rosa.js) che la stringa 'infortunato'
        const infCount = tuttiGiocatoriDashboard.filter(g => 
            g.stato?.toLowerCase() === 'injured' || g.stato?.toLowerCase() === 'infortunato'
        ).length;
        kpiInfortunati.textContent = `${infCount} infortunati`;
    }

    // 2. Prossimo Evento in programma
    const kpiEvData = document.getElementById('kpi-prossimo-evento-data');
    const kpiEvDet = document.getElementById('kpi-prossimo-evento-dettaglio');
    
    if (tuttiEventiDashboard.length > 0) {
        // Ordina cronologicamente per mostrare il più recente in cima
        const prossimi = [...tuttiEventiDashboard].sort((a, b) => new Date(a.dataInizio || a.data_inizio) - new Date(b.dataInizio || b.data_inizio));
        const ev = prossimi[0];
        const dataEv = new Date(ev.dataInizio || ev.data_inizio);
        
        if (kpiEvData) {
            kpiEvData.textContent = dataEv.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
        }
        if (kpiEvDet) kpiEvDet.textContent = `${ev.titolo} – ${ev.luogo || 'Sede'}`;
    } else {
        if (kpiEvData) kpiEvData.textContent = "—";
        if (kpiEvDet) kpiEvDet.textContent = "Nessun evento";
    }

    // 3. Conteggio Messaggi Inviati
    const kpiMsg = document.getElementById('kpi-messaggi');
    if (kpiMsg) kpiMsg.textContent = tuttiMessaggiDashboard.length;

    // 4. Calcolo Media Gol o Punti Totali della squadra
    const kpiMediaGol = document.getElementById('kpi-media-gol');
    if (kpiMediaGol && tuttiGiocatoriDashboard.length > 0) {
        const puntiTotaliSquadra = tuttiGiocatoriDashboard.reduce((sum, g) => sum + (g.puntiTotali || g.punti_totali || 0), 0);
        const media = (puntiTotaliSquadra / tuttiGiocatoriDashboard.length).toFixed(1);
        kpiMediaGol.textContent = media;
    }
}

function renderizzaTabellaRosa() {
    const tbody = document.getElementById('dashboard-rosa-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (tuttiGiocatoriDashboard.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Nessun giocatore in rosa.</td></tr>`;
        return;
    }

    // Mostriamo solo le prime 5 righe per non appesantire la dashboard (esattamente come il vecchio statico)
    tuttiGiocatoriDashboard.slice(0, 5).forEach(g => {
        const iniziali = g.nome && g.cognome ? (g.nome[0] + g.cognome[0]).toUpperCase() : 'GP';
        const puntiTotali = g.puntiTotali || g.punti_totali || 0;
        const tr = document.createElement('tr');
        
        let statoClass = 'pill-green';
        let statoTesto = 'Disponibile';
        
        if (g.stato?.toLowerCase() === 'injured' || g.stato?.toLowerCase() === 'infortunato') {
            statoClass = 'pill-red';
            statoTesto = 'Infortunato';
        } else if (g.stato?.toLowerCase() === 'squalificato') {
            statoClass = 'pill-amber';
            statoTesto = 'Squalificato';
        }

        tr.innerHTML = `
            <td>
                <div class="player-name">
                    <div class="player-avatar">${iniziali}</div>
                    ${g.nome} ${g.cognome}
                </div>
            </td>
            <td><span class="pill pill-blue">${g.posizione || 'N/D'}</span></td>
            <td>${g.presenze || 0}</td>
            <td>${puntiTotali} pt</td>
            <td><span class="pill ${statoClass}">${statoTesto}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderizzaListaEventi() {
    const container = document.getElementById('dashboard-eventi-list');
    if (!container) return;
    container.innerHTML = '';

    if (tuttiEventiDashboard.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: #888;">Nessun evento in programma.</div>`;
        return;
    }

    // Mostriamo i primi 4 eventi futuri
    tuttiEventiDashboard.slice(0, 4).forEach(e => {
        const dataEv = new Date(e.dataInizio || e.data_inizio);
        const giorno = dataEv.getDate();
        const mese = dataEv.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '');
        const ora = dataEv.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        let stripeColor = 'stripe-green'; 
        if (e.tipo?.toLowerCase() === 'partita') stripeColor = 'stripe-blue';
        if (e.tipo?.toLowerCase() === 'riunione') stripeColor = 'stripe-amber';

        const item = document.createElement('div');
        item.className = 'event-item';
        item.innerHTML = `
            <div class="event-date">
                <div class="day">${giorno}</div>
                <div class="mon">${mese}</div>
            </div>
            <div class="event-stripe ${stripeColor}"></div>
            <div class="event-info">
                <div class="event-title">${e.titolo}</div>
                <div class="event-meta">${ora} – ${e.luogo || 'Campo'}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderizzaListaMessaggi() {
    const container = document.getElementById('dashboard-msg-list');
    if (!container) return;
    container.innerHTML = '';

    if (tuttiMessaggiDashboard.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: #888;">Nessun messaggio inviato di recente.</div>`;
        return;
    }

    // Mostriamo gli ultimi 3 messaggi inviati
    tuttiMessaggiDashboard.slice(0, 3).forEach(m => {
        const div = document.createElement('div');
        div.className = 'msg-item';
        div.innerHTML = `
            <div class="msg-header">
                <span class="msg-to">→ ${m.destinatario || 'Tutta la squadra'}</span>
                <span class="msg-time">${m.dataInvio || m.data_invio || 'Recentemente'}</span>
            </div>
            <div class="msg-title" style="font-weight:600; font-size:0.9rem; margin: 4px 0;">${m.titolo || 'Comunicazione'}</div>
            <div class="msg-text">${m.testo || m.messaggio}</div>
        `;
        container.appendChild(div);
    });
}

// ─── 4. AZIONI FORM (POST VERSO IL BACKEND) ───

async function saveEvento() {
    const idSquadra = localStorage.getItem('idSquadra');
    const titolo = document.getElementById('evt-title').value;
    const tipo = document.getElementById('evt-type').value;
    const dataInizio = document.getElementById('evt-start').value;
    const luogo = document.getElementById('evt-location').value;

    const nuovoEvento = { titolo, tipo, dataInizio, luogo, idSquadra };

    try {
        const response = await fetch('http://localhost:8080/api/eventi', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(nuovoEvento)
        });

        if (response.ok) {
            closeModal('modal-evento');
            document.getElementById('dashboard-evento-form').reset();
            caricaDatiDashboard(); // Aggiorna istantaneamente lo schermo
        } else {
            alert('Errore nel salvataggio dell\'evento.');
        }
    } catch (error) {
        console.error('Errore durante il salvataggio dell\'evento:', error);
    }
}

async function sendMsg() {
    const idSquadra = localStorage.getItem('idSquadra');
    const destinatario = document.getElementById('msg-dest').value;
    const titolo = document.getElementById('msg-title').value;
    const testo = document.getElementById('msg-text').value.trim();

    const nuovoMessaggio = { destinatario, titolo, testo, idSquadra };

    try {
        const response = await fetch('http://localhost:8080/api/messaggi', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(nuovoMessaggio)
        });

        if (response.ok) {
            document.getElementById('dashboard-msg-form').reset();
            caricaDatiDashboard(); // Aggiorna istantaneamente lo schermo
        } else {
            alert('Impossibile inviare il messaggio.');
        }
    } catch (error) {
        console.error('Errore durante l\'invio del messaggio:', error);
    }
}

// ─── 5. UTILITY MODALI & LOGOUT ───
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function logout() {
    localStorage.clear();
    window.location.href = '/html/login.html';
}