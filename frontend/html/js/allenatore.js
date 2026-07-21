// Variabili globali per salvare i dati del DB in locale
let tuttiGiocatoriDashboard = [];
let tuttiEventiDashboard = [];
let tuttiMessaggiDashboard = [];

// ─── 1. INIZIALIZZAZIONE DELLA PAGINA ───
document.addEventListener('DOMContentLoaded', () => {
    // 1. Esegue il controllo sulla validità del login
    if (typeof verificaAutenticazione === 'function') {
        verificaAutenticazione();
    }

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

    // NUOVO: Listener per il form Giocatore
    const playerForm = document.getElementById('dashboard-giocatore-form');
    if (playerForm) {
        playerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveGiocatore();
        });
    }
}

// ─── 2. RECUPERO DATI DAL BACKEND ───
async function caricaDatiDashboard() {
    try {
        const idSquadra = localStorage.getItem('idSquadra'); 

        if (!idSquadra) {
            console.error("Nessun ID squadra trovato nel localStorage.");
            return;
        }

        const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {};

        // NOTA: Usiamo l'endpoint CORRETTO /api/eventi/calendario/ al posto di /api/eventi/squadra/
        const [resGiocatori, resEventi, resMessaggi] = await Promise.all([
            fetch(`http://localhost:8080/api/giocatori/squadra/${idSquadra}`, { method: 'GET', headers: headers }).catch(e => e),
            fetch(`http://localhost:8080/api/eventi/calendario/${idSquadra}`, { method: 'GET', headers: headers }).catch(e => e),
            fetch(`http://localhost:8080/api/messaggi/squadra/${idSquadra}`, { method: 'GET', headers: headers }).catch(e => e)
        ]);

        if (resGiocatori.status === 401 || resGiocatori.status === 403) {
            logout();
            return;
        }

        tuttiGiocatoriDashboard = (resGiocatori && resGiocatori.ok) ? await resGiocatori.json() : [];
        tuttiEventiDashboard    = (resEventi && resEventi.ok) ? await resEventi.json() : [];
        tuttiMessaggiDashboard  = (resMessaggi && resMessaggi.ok) ? await resMessaggi.json() : [];

        console.log(" Dati Dashboard Caricati con successo:", { 
            giocatori: tuttiGiocatoriDashboard.length, 
            eventi: tuttiEventiDashboard, 
            messaggi: tuttiMessaggiDashboard.length 
        });

        // Rendering grafico degli elementi
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
    // 1. Prossimo Evento
    const kpiEvData = document.getElementById('kpi-prossimo-evento-data');
    const kpiEvDet  = document.getElementById('kpi-prossimo-evento-dettaglio');

    if (tuttiEventiDashboard && tuttiEventiDashboard.length > 0) {
        const prossimi = [...tuttiEventiDashboard].sort((a, b) => {
            const dataA = new Date(a.dataOraInizio || a.dataInizio || 0);
            const dataB = new Date(b.dataOraInizio || b.dataInizio || 0);
            return dataA - dataB;
        });

        const ev = prossimi[0];
        const rawDate = ev.dataOraInizio || ev.dataInizio || ev.data_inizio;
        const dataEv = rawDate ? new Date(rawDate) : null;

        if (kpiEvData && dataEv && !isNaN(dataEv.getTime())) {
            kpiEvData.textContent = dataEv.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
        } else if (kpiEvData) {
            kpiEvData.textContent = "—";
        }

        if (kpiEvDet) kpiEvDet.textContent = `${ev.titolo} – ${ev.luogo || 'Sede'}`;
    } else {
        if (kpiEvData) kpiEvData.textContent = "—";
        if (kpiEvDet)  kpiEvDet.textContent  = "Nessun evento";
    }

    // 2. Conteggio Messaggi Inviati
    const kpiMsg = document.getElementById('kpi-messaggi');
    if (kpiMsg) kpiMsg.textContent = tuttiMessaggiDashboard.length;

    // 3. Calcolo Media Gol o Punti Totali della squadra
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

    if (!tuttiGiocatoriDashboard || tuttiGiocatoriDashboard.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Nessun giocatore in rosa.</td></tr>`;
        return;
    }

    tuttiGiocatoriDashboard.slice(0, 5).forEach(g => {
        const iniziali = g.nome && g.cognome ? (g.nome[0] + g.cognome[0]).toUpperCase() : 'GP';
        const puntiTotali = g.puntiTotali || g.punti_totali || 0;
        const tr = document.createElement('tr');
        
        // GESTIONE DINAMICA DEL COLORE DEL RUOLO
        let ruoloClass = 'pill-blue'; 
        const pos = (g.posizione || '').toLowerCase();
        if (pos.includes('portiere') || pos.includes('por')) ruoloClass = 'pill-amber';
        else if (pos.includes('difensore') || pos.includes('dif')) ruoloClass = 'pill-green';
        else if (pos.includes('attaccante') || pos.includes('att')) ruoloClass = 'pill-red';

        // GESTIONE DINAMICA DEL COLORE DELLO STATO
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
            <td><span class="pill ${ruoloClass}">${g.posizione || 'N/D'}</span></td>
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

    if (!tuttiEventiDashboard || !Array.isArray(tuttiEventiDashboard) || tuttiEventiDashboard.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: #888;">Nessun evento in programma.</div>`;
        return;
    }

    // Ordiniamo gli eventi in base alla data di inizio
    const eventiOrdinati = [...tuttiEventiDashboard].sort((a, b) => {
        const dataA = new Date(a.dataOraInizio || a.dataInizio || a.inizio || 0);
        const dataB = new Date(b.dataOraInizio || b.dataInizio || b.inizio || 0);
        return dataA - dataB;
    });

    eventiOrdinati.slice(0, 4).forEach(e => {
        // Estrazione della data da qualsiasi formato del DTO Java
        const rawDate = e.dataOraInizio || e.dataInizio || e.data_ora_inizio || e.inizio;
        const dataEv = rawDate ? new Date(rawDate) : null;

        let giorno = '–';
        let mese = '–';
        let ora = '–';

        if (dataEv && !isNaN(dataEv.getTime())) {
            giorno = dataEv.getDate();
            mese = dataEv.toLocaleDateString('it-IT', { month: 'short' }).replace('.', '');
            ora = dataEv.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        }

        let stripeColor = 'stripe-green'; 
        const tipoLower = (e.tipo || '').toLowerCase();
        if (tipoLower === 'partita') stripeColor = 'stripe-blue';
        if (tipoLower === 'riunione') stripeColor = 'stripe-amber';

        const item = document.createElement('div');
        item.className = 'event-item';
        item.innerHTML = `
            <div class="event-date">
                <div class="day">${giorno}</div>
                <div class="mon">${mese}</div>
            </div>
            <div class="event-stripe ${stripeColor}"></div>
            <div class="event-info">
                <div class="event-title">${e.titolo || e.nome || 'Evento'}</div>
                <div class="event-meta">${ora} – ${e.luogo || 'Sede'}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderizzaListaMessaggi() {
    const container = document.getElementById('dashboard-msg-list');
    if (!container) return;
    container.innerHTML = '';

    if (!tuttiMessaggiDashboard || tuttiMessaggiDashboard.length === 0) {
        container.innerHTML = `<div style="text-align: center; padding: 20px; color: #888;">Nessun messaggio inviato di recente.</div>`;
        return;
    }

    tuttiMessaggiDashboard.slice(0, 3).forEach(m => {
        const div = document.createElement('div');
        div.className = 'msg-item';
        div.innerHTML = `
            <div class="msg-header">
                <span class="msg-to">→ ${m.destinatario || 'Tutta la squadra'}</span>
                <span class="msg-time">${m.dataInvio || m.data_invio || 'Recentemente'}</span>
            </div>
            <div class="msg-title" style="font-weight:600; font-size:0.9rem; margin: 4px 0;">${m.titolo || 'Comunicazione'}</div>
            <div class="msg-text">${m.testo || m.messaggio || ''}</div>
        `;
        container.appendChild(div);
    });
}

// ─── 4. AZIONI FORM (POST VERSO IL BACKEND) ───
async function saveEvento() {
    const idSquadra = localStorage.getItem('idSquadra');
    const titolo = document.getElementById('evt-title').value;
    const tipo = document.getElementById('evt-type').value;
    const rawStart = document.getElementById('evt-start').value; 
    const rawEnd = document.getElementById('evt-end').value; 
    const luogo = document.getElementById('evt-location').value;

    if (!idSquadra) {
        alert("Errore: ID Squadra non trovato in sessione. Fai di nuovo il login.");
        return;
    }

    if (!rawStart || !rawEnd) {
        alert("Inserisci sia la data di inizio che la data di fine.");
        return;
    }

    const dataOraInizio = rawStart.length === 16 ? `${rawStart}:00` : rawStart;
    const dataOraFine = rawEnd.length === 16 ? `${rawEnd}:00` : rawEnd;
    const idSquadraNum = parseInt(idSquadra, 10);

    const nuovoEvento = { 
        titolo: titolo, 
        tipo: tipo, 
        dataOraInizio: dataOraInizio,
        dataOraFine: dataOraFine,
        luogo: luogo, 
        calendarioId: idSquadraNum,
        squadraId: idSquadraNum,
        idSquadra: idSquadraNum,
        squadra: { id: idSquadraNum }
    };

    console.log("Payload inviato al backend:", nuovoEvento);

    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token') || localStorage.getItem('jwt');
    if (token) {
        headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    try {
        const response = await fetch('http://localhost:8080/api/eventi', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(nuovoEvento)
        });

        if (response.ok) {
            alert("Evento salvato con successo!");
            if (typeof closeModal === 'function') closeModal('modal-evento');
            document.getElementById('dashboard-evento-form')?.reset();
            caricaDatiDashboard(); 
        } else {
            const errorText = await response.text();
            console.error("Dettagli errore dal backend Java:", errorText);
            alert(`Errore nel salvataggio dell'evento (${response.status}). Guarda la console per i dettagli.`);
        }
    } catch (error) {
        console.error("Errore di rete:", error);
        alert("Impossibile contattare il server backend.");
    }
}

async function saveGiocatore() {
    const idSquadra = localStorage.getItem('idSquadra');
    if (!idSquadra) {
        alert("Errore: ID Squadra non trovato. Effettua il login.");
        return;
    }

    const nome = document.getElementById('player-nome').value.trim();
    const cognome = document.getElementById('player-cognome').value.trim();
    const posizione = document.getElementById('player-ruolo').value;
    const numero = parseInt(document.getElementById('player-numero').value, 10);
    const dataNascita = document.getElementById('player-data-nascita')?.value || null;
    const nazionalita = document.getElementById('player-nazionalita')?.value.trim() || "Italiana";
    const piede = document.getElementById('player-piede')?.value || "Destro";
    const altezza = parseInt(document.getElementById('player-altezza')?.value, 10) || null;
    const peso = parseInt(document.getElementById('player-peso')?.value, 10) || null;

    const payload = {
        nome: nome,
        cognome: cognome,
        numero: isNaN(numero) ? 1 : numero,
        posizione: posizione,
        piede: piede,
        nazionalita: nazionalita,
        altezza: altezza,
        peso: peso,
        dataNascita: dataNascita,
        squadraId: parseInt(idSquadra, 10)
    };

    const headers = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('token') || localStorage.getItem('jwt');
    if (token) {
        headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    try {
        const response = await fetch('http://localhost:8080/api/giocatori', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Giocatore aggiunto con successo!");
            if (typeof closeModal === 'function') closeModal('modal-giocatore');
            document.getElementById('dashboard-giocatore-form')?.reset();
            if (typeof caricaDatiDashboard === 'function') caricaDatiDashboard();
        } else {
            const errorText = await response.text();
            console.error("Errore salvataggio:", errorText);
            alert("Impossibile salvare il giocatore.");
        }
    } catch (error) {
        console.error("Errore di rete:", error);
        alert("Server non raggiungibile.");
    }
}

async function sendMsg() {
    const idSquadra = localStorage.getItem('idSquadra');
    const destinatario = document.getElementById('msg-dest').value;
    const titolo = document.getElementById('msg-title').value;
    const testo = document.getElementById('msg-text').value.trim();

    if (!idSquadra) {
        alert("Errore: ID Squadra non presente.");
        return;
    }

    const nuovoMessaggio = { 
        destinatario: destinatario, 
        titolo: titolo, 
        testo: testo, 
        messaggio: testo,
        idSquadra: Number(idSquadra),
        squadraId: Number(idSquadra)
    };

    const headers = {
        'Content-Type': 'application/json',
        ...(typeof getAuthHeaders === 'function' ? getAuthHeaders() : {})
    };

    try {
        const response = await fetch('http://localhost:8080/api/messaggi', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(nuovoMessaggio)
        });

        if (response.ok) {
            document.getElementById('dashboard-msg-form').reset();
            caricaDatiDashboard(); 
        } else {
            console.error('Errore invio messaggio:', response.status);
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