// ==========================================
// STATO GLOBALE
// ==========================================
let tuttiMessaggi = [];
let tuttiGiocatori = [];
let selectDestinatariPopolato = false;

// ==========================================
// 1. INIZIALIZZAZIONE DELLA PAGINA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Verifica che l'utente sia autenticato (funzione da utils.js)
    if (typeof verificaAutenticazione === 'function') {
        verificaAutenticazione();
    }

    // Popola le info dell'allenatore nella sidebar
    popolaInfoUtente();

    // Carica i dati dal backend
    caricaDatiMessaggi();

    // Assegna gli eventi ai form/pulsanti
    setupListeners();

    // Ricarica automaticamente i messaggi ogni 15 secondi, così se un giocatore
    // apre un messaggio lo stato "Letto" compare senza dover ricaricare la pagina.
    setInterval(caricaDatiMessaggi, 15000);
});

// ==========================================
// 2. INFO UTENTE NELLA SIDEBAR
// ==========================================
function popolaInfoUtente() {
    const nome = localStorage.getItem('nomeReale') || localStorage.getItem('username') || 'Allenatore';
    const cognome = localStorage.getItem('cognomeReale') || '';
    const ruolo = localStorage.getItem('ruolo') || 'Allenatore';

    const avatarEl = document.querySelector('.sidebar-footer .avatar');
    const userStrong = document.querySelector('.sidebar-footer .user-info strong');
    const userSmall = document.querySelector('.sidebar-footer .user-info small');
    const btnLogout = document.querySelector('.sidebar-footer .btn-logout');

    if (userStrong) userStrong.textContent = cognome ? `${nome} ${cognome}` : nome;
    if (userSmall) userSmall.textContent = ruolo;
    if (avatarEl) avatarEl.textContent = (nome[0] || '').toUpperCase() + (cognome[0] || nome[1] || '').toUpperCase();
    if (btnLogout) btnLogout.setAttribute('onclick', 'logout()');
}

// ==========================================
// 3. CARICAMENTO DATI DAL DB (SPRING BOOT)
// ==========================================
async function caricaDatiMessaggi() {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' };
    const idSquadra = localStorage.getItem('idSquadra') || '1';

    try {
        // Esegue in parallelo il recupero dei messaggi inviati e dei giocatori della squadra
        const [resMessaggi, resGiocatori] = await Promise.all([
            fetch('http://localhost:8080/api/messaggi/inviati', { headers }).catch(() => null),
            fetch(`http://localhost:8080/api/giocatori/squadra/${idSquadra}`, { headers }).catch(() => null)
        ]);

        if (resMessaggi && resMessaggi.status === 401) {
            logout();
            return;
        }

        tuttiMessaggi = (resMessaggi && resMessaggi.ok) ? await resMessaggi.json() : [];
        tuttiGiocatori = (resGiocatori && resGiocatori.ok) ? await resGiocatori.json() : [];

        // Renderizza la UI. Il <select> destinatari viene popolato solo al primo
        // caricamento: nei refresh automatici successivi non lo tocchiamo, per non
        // perdere la selezione dell'allenatore mentre sta scrivendo un messaggio.
        if (!selectDestinatariPopolato) {
            popolaSelectDestinatari();
            selectDestinatariPopolato = true;
        }
        renderizzaListaMessaggi();
        renderizzaKPI();

    } catch (error) {
        console.error('Errore durante il caricamento dei messaggi:', error);
    }
}

// ==========================================
// 4. POPOLA SELECT DESTINATARI CON I GIOCATORI REALI
// ==========================================
// Ogni <select> destinatario propone due gruppi di opzioni:
//  - "Per ruolo"          → value = "ruolo:Portiere" / "ruolo:Difensore" / ...
//  - "Singolo giocatore"  → value = "giocatore:<id>"
// sendMsg() legge il prefisso per capire quale endpoint chiamare.
const RUOLI_SQUADRA = [
    { valore: 'Portiere',       etichetta: 'Tutti i portieri' },
    { valore: 'Difensore',      etichetta: 'Tutti i difensori' },
    { valore: 'Centrocampista', etichetta: 'Tutti i centrocampisti' },
    { valore: 'Attaccante',     etichetta: 'Tutti gli attaccanti' }
];

function popolaSelectDestinatari() {
    const selectPrincipale = document.getElementById('destinatario');
    const selectModal = document.querySelector('#modal-messaggio select');

    if (!tuttiGiocatori || tuttiGiocatori.length === 0) return;

    let optionsHtml = '<option value="">-- Seleziona destinatario --</option>';

    // Gruppo "per ruolo": solo i ruoli effettivamente presenti in rosa, col conteggio
    optionsHtml += '<optgroup label="Per ruolo">';
    RUOLI_SQUADRA.forEach(r => {
        const count = tuttiGiocatori.filter(g => g.posizione === r.valore).length;
        if (count > 0) {
            optionsHtml += `<option value="ruolo:${r.valore}">${r.etichetta} (${count})</option>`;
        }
    });
    optionsHtml += '</optgroup>';

    // Gruppo "singolo giocatore"
    optionsHtml += '<optgroup label="Singolo giocatore">';
    tuttiGiocatori.forEach(g => {
        const num = g.numero ? `#${g.numero} ` : '';
        const pos = g.posizione ? ` (${g.posizione})` : '';
        optionsHtml += `<option value="giocatore:${g.id}">${num}${g.nome} ${g.cognome}${pos}</option>`;
    });
    optionsHtml += '</optgroup>';

    if (selectPrincipale) selectPrincipale.innerHTML = optionsHtml;
    if (selectModal) selectModal.innerHTML = optionsHtml;
}

// ==========================================
// 5. RENDERING LISTA MESSAGGI
// ==========================================
function renderizzaListaMessaggi() {
    const msgListContainer = document.querySelector('.msg-list');
    if (!msgListContainer) return;

    msgListContainer.innerHTML = '';

    if (!tuttiMessaggi || tuttiMessaggi.length === 0) {
        msgListContainer.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--muted);">Nessun messaggio inviato trovato nel database.</div>`;
        return;
    }

    tuttiMessaggi.forEach(m => {
        const dataOraFormatted = formattaDataOra(m.dataOra);
        const letto = (m.stato || '').toUpperCase() === 'LETTO';
        
        const statusClass = letto ? 'letto' : 'inviato';
        const statusText = letto ? '✔✔ Letto' : '✔ Inviato - Non ancora letto';
        const destinatarioName = m.nomeGiocatore || 'Giocatore';

        const msgItem = document.createElement('div');
        msgItem.className = 'msg-item';
        msgItem.innerHTML = `
            <div class="msg-header">
                <span class="msg-to">→ ${destinatarioName}</span>
                <span class="msg-time">${dataOraFormatted}</span>
            </div>
            <div class="msg-text">${m.testo || ''}</div>
            <div class="msg-status ${statusClass}">${statusText}</div>
        `;

        msgListContainer.appendChild(msgItem);
    });
}

// ==========================================
// 6. RENDERING KPI STATISTICHE
// ==========================================
function renderizzaKPI() {
    const statCards = document.querySelectorAll('.stats-grid .stat-card');
    if (statCards.length < 3) return;

    // KPI 1: Totale inviati
    const kpiTotaleVal = statCards[0].querySelector('.stat-value');
    if (kpiTotaleVal) kpiTotaleVal.textContent = tuttiMessaggi.length;

    // KPI 2: Da leggere
    const nonLetti = tuttiMessaggi.filter(m => (m.stato || '').toUpperCase() !== 'LETTO');
    const kpiDaLeggereVal = statCards[1].querySelector('.stat-value');
    const kpiDaLeggereSub = statCards[1].querySelector('.stat-sub');
    if (kpiDaLeggereVal) kpiDaLeggereVal.textContent = nonLetti.length;
    if (kpiDaLeggereSub) kpiDaLeggereSub.textContent = `${nonLetti.length} non ancora letti`;

    // KPI 3: Ultimo invio
    const kpiUltimoVal = statCards[2].querySelector('.stat-value');
    const kpiUltimoSub = statCards[2].querySelector('.stat-sub');
    if (tuttiMessaggi.length > 0 && kpiUltimoVal && kpiUltimoSub) {
        const ultimo = tuttiMessaggi[0]; // Assumendo che siano in ordine cronologico decrescente
        if (ultimo.dataOra) {
            const d = new Date(ultimo.dataOra);
            kpiUltimoVal.textContent = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
            kpiUltimoSub.textContent = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        }
    } else if (kpiUltimoVal && kpiUltimoSub) {
        kpiUltimoVal.textContent = '—';
        kpiUltimoSub.textContent = 'Nessun invio';
    }
}

// ==========================================
// 7. INVIA MESSAGGIO (POST /api/messaggi oppure /api/messaggi/ruolo)
// ==========================================
async function sendMsg() {
    // Determina se il messaggio viene dal Form principale o dalla Modal
    const isModalOpen = document.getElementById('modal-messaggio')?.classList.contains('open');

    let selectEl, textareaEl;

    if (isModalOpen) {
        selectEl = document.querySelector('#modal-messaggio select');
        textareaEl = document.querySelector('#modal-messaggio textarea');
    } else {
        selectEl = document.getElementById('destinatario');
        textareaEl = document.querySelector('.compose-box textarea');
    }

    const valoreSelezionato = selectEl ? selectEl.value : '';
    const testo = textareaEl ? textareaEl.value.trim() : '';

    if (!valoreSelezionato) {
        alert('Seleziona un destinatario (un giocatore oppure un ruolo).');
        return;
    }

    if (!testo) {
        alert('Inserisci il testo del messaggio.');
        return;
    }

    // Il valore dell'opzione indica se inviare a un singolo giocatore o a un ruolo intero:
    // "giocatore:<id>" oppure "ruolo:<Portiere|Difensore|Centrocampista|Attaccante>"
    const [tipo, valore] = valoreSelezionato.split(':');

    if (tipo === 'ruolo') {
        await inviaMessaggioPerRuolo(valore, testo, isModalOpen, selectEl, textareaEl);
    } else {
        await inviaMessaggioSingolo(parseInt(valore, 10), testo, isModalOpen, selectEl, textareaEl);
    }
}

// ── Invio a un singolo giocatore ───────────────────────────────────────────
async function inviaMessaggioSingolo(giocatoreId, testo, isModalOpen, selectEl, textareaEl) {
    if (isNaN(giocatoreId) || !giocatoreId) {
        alert('Seleziona un giocatore valido come destinatario.');
        return;
    }

    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' };

    try {
        const response = await fetch('http://localhost:8080/api/messaggi', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ giocatoreId, testo })
        });

        if (response.ok) {
            const nuovoMessaggio = await response.json();
            tuttiMessaggi.unshift(nuovoMessaggio);
            renderizzaListaMessaggi();
            renderizzaKPI();
            resetFormInvio(isModalOpen, selectEl, textareaEl);
            alert('✔ Messaggio inviato con successo!');
        } else {
            const errorTxt = await response.text();
            alert(`Errore invio messaggio (${response.status}): ${errorTxt}`);
        }
    } catch (err) {
        console.error('Errore di rete durante l’invio:', err);
        alert('Impossibile raggiungere il server. Verifica la connessione.');
    }
}

// ── Invio a tutti i giocatori di un ruolo ──────────────────────────────────
// Crea un messaggio indipendente per ogni giocatore del ruolo scelto, così
// ognuno ha il proprio stato di lettura (letto/non letto) separato.
async function inviaMessaggioPerRuolo(ruolo, testo, isModalOpen, selectEl, textareaEl) {
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' };

    try {
        const response = await fetch('http://localhost:8080/api/messaggi/ruolo', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ ruolo, testo })
        });

        if (response.ok) {
            const nuoviMessaggi = await response.json(); // array, uno per giocatore del ruolo
            tuttiMessaggi = [...nuoviMessaggi, ...tuttiMessaggi];
            renderizzaListaMessaggi();
            renderizzaKPI();
            resetFormInvio(isModalOpen, selectEl, textareaEl);
            alert(`✔ Messaggio inviato a ${nuoviMessaggi.length} giocatori (ruolo: ${ruolo}).`);
        } else {
            const errorTxt = await response.text();
            alert(`Errore invio messaggio (${response.status}): ${errorTxt}`);
        }
    } catch (err) {
        console.error('Errore di rete durante l’invio per ruolo:', err);
        alert('Impossibile raggiungere il server. Verifica la connessione.');
    }
}

// ── Reset campi form/modal dopo un invio riuscito ──────────────────────────
function resetFormInvio(isModalOpen, selectEl, textareaEl) {
    if (textareaEl) textareaEl.value = '';
    if (selectEl) selectEl.value = '';
    if (isModalOpen) closeModal('modal-messaggio');
}

// ==========================================
// 8. UTILITY PER APERTURA / CHIUSURA MODAL
// ==========================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
}

// ==========================================
// 9. HELPER PER FORMATTARE LE DATE
// ==========================================
function formattaDataOra(dataOraStr) {
    if (!dataOraStr) return '—';
    const d = new Date(dataOraStr);
    if (isNaN(d.getTime())) return dataOraStr;

    const oggi = new Date();
    const ieri = new Date();
    ieri.setDate(oggi.getDate() - 1);

    const sameDay = (a, b) =>
        a.getDate() === b.getDate() &&
        a.getMonth() === b.getMonth() &&
        a.getFullYear() === b.getFullYear();

    const oraMinuto = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    if (sameDay(d, oggi)) {
        return `Oggi ${oraMinuto}`;
    } else if (sameDay(d, ieri)) {
        return `Ieri ${oraMinuto}`;
    } else {
        return `${d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} ${oraMinuto}`;
    }
}

function setupListeners() {
    // Eventuali listener aggiuntivi se necessari
}