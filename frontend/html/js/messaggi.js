// ==========================================
// STATO GLOBALE
// ==========================================
let tuttiMessaggi = [];
let tuttiGiocatori = [];

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

        // Renderizza la UI
        popolaSelectDestinatari();
        renderizzaListaMessaggi();
        renderizzaKPI();

    } catch (error) {
        console.error('Errore durante il caricamento dei messaggi:', error);
    }
}

// ==========================================
// 4. POPOLA SELECT DESTINATARI CON I GIOCATORI REALI
// ==========================================
function popolaSelectDestinatari() {
    const selectPrincipale = document.getElementById('destinatario');
    const selectModal = document.querySelector('#modal-messaggio select');

    if (!tuttiGiocatori || tuttiGiocatori.length === 0) return;

    let optionsHtml = '<option value="">-- Seleziona Giocatore --</option>';
    tuttiGiocatori.forEach(g => {
        const num = g.numero ? `#${g.numero} ` : '';
        const pos = g.posizione ? ` (${g.posizione})` : '';
        optionsHtml += `<option value="${g.id}">${num}${g.nome} ${g.cognome}${pos}</option>`;
    });

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
// 7. INVIA MESSAGGIO (POST /api/messaggi)
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

    const giocatoreId = selectEl ? parseInt(selectEl.value, 10) : NaN;
    const testo = textareaEl ? textareaEl.value.trim() : '';

    if (isNaN(giocatoreId) || !giocatoreId) {
        alert('Seleziona un giocatore valido come destinatario.');
        return;
    }

    if (!testo) {
        alert('Inserisci il testo del messaggio.');
        return;
    }

    const payload = {
        giocatoreId: giocatoreId,
        testo: testo
    };

    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' };

    try {
        const response = await fetch('http://localhost:8080/api/messaggi', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const nuovoMessaggio = await response.json();

            // Aggiungi in cima alla lista locale
            tuttiMessaggi.unshift(nuovoMessaggio);

            // Aggiorna la vista
            renderizzaListaMessaggi();
            renderizzaKPI();

            // Reset dei campi
            if (textareaEl) textareaEl.value = '';
            if (selectEl) selectEl.value = '';

            // Chiudi modal se aperta
            if (isModalOpen) {
                closeModal('modal-messaggio');
            }

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