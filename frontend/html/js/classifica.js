/* ==========================================================================
   CONFIGURAZIONE API E STATO GLOBALE
   ========================================================================== */
const API_BASE_URL = 'http://localhost:8080/api';
const token = localStorage.getItem('token');

/* ==========================================================================
   INIZIALIZZAZIONE DELLA PAGINA
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Controllo autenticazione
    if (typeof verificaAutenticazione === 'function') {
        verificaAutenticazione();
    }

    // 2. Popola la sidebar con nome/ruolo/avatar dal localStorage
    const sbName = document.getElementById('sb-nome');
    const sbRole = document.getElementById('sb-ruolo');
    const sbAv   = document.getElementById('sb-avatar');

    const nome        = localStorage.getItem('nomeReale') || localStorage.getItem('username') || 'Utente';
    const cognome     = localStorage.getItem('cognomeReale') || '';
    const ruolo       = localStorage.getItem('ruolo') || '';
    const idSquadra   = localStorage.getItem('idSquadra') || '1';
    const idGiocatore = localStorage.getItem('idGiocatore'); // presente solo per GIOCATORE

    if (sbName) sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
    if (sbRole) sbRole.textContent = ruolo;
    if (sbAv && typeof renderAvatar === 'function') {
        renderAvatar(sbAv, (nome[0] || '').toUpperCase() + (cognome[0] || nome[1] || '').toUpperCase());
    }

    // Mostra "I miei badge" SOLO se il ruolo è GIOCATORE
    const navBadge = document.getElementById('nav-badge');
    if (navBadge) {
        if (ruolo.toUpperCase() === 'GIOCATORE') {
            navBadge.style.display = 'flex';
        } else {
            navBadge.style.display = 'none';
        }
    }

    // Chi non è un giocatore (allenatore/staff/dirigenza) non ha la card "Il tuo posizionamento"
    if (!idGiocatore || ruolo.toUpperCase() !== 'GIOCATORE') {
        const cardMia = document.getElementById('card-mia-posizione');
        if (cardMia) cardMia.style.display = 'none';
    }

    // 3. Carica la doppia classifica dal backend
    await caricaClassifica(idSquadra, idGiocatore);
});

/* ==========================================================================
   RECUPERO DATI DAL BACKEND
   ========================================================================== */
async function caricaClassifica(idSquadra, idGiocatore) {
    const listSett = document.getElementById('rank-list-settimanale');
    const listTot  = document.getElementById('rank-list-totale');

    const loadingHtml = `<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:0.85rem">Caricamento classifica…</div>`;
    if (listSett) listSett.innerHTML = loadingHtml;
    if (listTot)  listTot.innerHTML  = loadingHtml;

    try {
        const res = await fetch(`${API_BASE_URL}/quiz/classifica/${idSquadra}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Errore nel recupero della classifica');

        const dati = await res.json();
        renderDualClassifica(dati, idGiocatore);

    } catch (err) {
        console.error('Errore nel caricamento della classifica:', err);
        const errHtml = `<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:0.85rem">Impossibile caricare la classifica.</div>`;
        if (listSett) listSett.innerHTML = errHtml;
        if (listTot)  listTot.innerHTML  = errHtml;
    }
}

/* ==========================================================================  
   RENDERIZZAZIONE DOPPIA (SETTIMANALE + TOTALE)
   ========================================================================== */
function renderDualClassifica(dati, idGiocatore) {
    const listSett = document.getElementById('rank-list-settimanale');
    const listTot  = document.getElementById('rank-list-totale');
    if (!listSett || !listTot) return;

    if (!dati || dati.length === 0) {
        const emptyHtml = `<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:0.85rem">Nessun giocatore in classifica.</div>`;
        listSett.innerHTML = emptyHtml;
        listTot.innerHTML  = emptyHtml;
        return;
    }

    const mioId = idGiocatore ? Number(idGiocatore) : null;
    const medaglie = { 1: 'gold', 2: 'silver', 3: 'bronze' };

    // 1. Ordina e calcola posizioni per la Settimanale
    const sortedSett = [...dati].sort((a, b) => (b.puntiSettimanali ?? 0) - (a.puntiSettimanali ?? 0));
    sortedSett.forEach((item, idx) => item.posSett = idx + 1);

    // 2. Ordina e calcola posizioni per la Totale (supporta puntiTotali o fallback su punti)
    const sortedTot = [...dati].sort((a, b) => (b.puntiTotali ?? b.punti ?? 0) - (a.puntiTotali ?? a.punti ?? 0));
    sortedTot.forEach((item, idx) => item.posTot = idx + 1);

    // Render Lista Settimanale
    listSett.innerHTML = sortedSett.map(item => {
        const sonoIo = mioId !== null && Number(item.giocatoreId) === mioId;
        const pos = item.posSett;
        const classePos = medaglie[pos] || '';
        return `
        <div class="rank-item ${sonoIo ? 'me' : ''}">
            <div class="rank-pos ${classePos}">${pos}</div>
            <div class="rank-name">${item.nome} ${item.cognome}${sonoIo ? ' ★ (TU)' : ''}</div>
            <div class="rank-pts">${item.puntiSettimanali ?? 0} pt</div>
        </div>`;
    }).join('');

    // Render Lista Totale
    listTot.innerHTML = sortedTot.map(item => {
        const sonoIo = mioId !== null && Number(item.giocatoreId) === mioId;
        const pos = item.posTot;
        const classePos = medaglie[pos] || '';
        const ptsTot = item.puntiTotali ?? item.punti ?? 0;
        return `
        <div class="rank-item ${sonoIo ? 'me' : ''}">
            <div class="rank-pos ${classePos}">${pos}</div>
            <div class="rank-name">${item.nome} ${item.cognome}${sonoIo ? ' ★ (TU)' : ''}</div>
            <div class="rank-pts">${ptsTot} pt</div>
        </div>`;
    }).join('');

    // Aggiorna card rapida "Il tuo posizionamento" (visibile solo se utente è GIOCATORE e ha idGiocatore)
    if (mioId !== null) {
        const mioSett = sortedSett.find(i => Number(i.giocatoreId) === mioId);
        const mioTot  = sortedTot.find(i => Number(i.giocatoreId) === mioId);
        const mioRecord = dati.find(i => Number(i.giocatoreId) === mioId);

        const elPosSett = document.getElementById('mia-pos-sett');
        const elPtsSett = document.getElementById('miei-pts-sett');
        const elPosTot  = document.getElementById('mia-pos-tot');
        const elPtsTot  = document.getElementById('miei-pts-tot');
        const elRisp    = document.getElementById('mie-risposte');

        if (elPosSett) elPosSett.textContent = mioSett ? `#${mioSett.posSett}` : '—';
        if (elPtsSett) elPtsSett.textContent = mioSett ? (mioSett.puntiSettimanali ?? 0) : '0';
        if (elPosTot)  elPosTot.textContent  = mioTot  ? `#${mioTot.posTot}` : '—';
        if (elPtsTot)  elPtsTot.textContent  = mioTot  ? (mioTot.puntiTotali ?? mioTot.punti ?? 0) : '0';
        if (elRisp && mioRecord) elRisp.textContent = mioRecord.risposteCorrette ?? 0;
    }
}