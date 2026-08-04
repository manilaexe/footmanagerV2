// ── CONFIGURAZIONE API ──
const API_BASE_URL = 'http://localhost:8080/api';
const token = localStorage.getItem('token');

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Controllo login
    if (typeof verificaAutenticazione === 'function') verificaAutenticazione();

    // 2. Popola la sidebar con nome/ruolo/avatar dal localStorage (stessa logica delle altre pagine)
    const sbName = document.getElementById('sb-nome');
    const sbRole = document.getElementById('sb-ruolo');
    const sbAv   = document.getElementById('sb-avatar');

    const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Utente';
    const cognome = localStorage.getItem('cognomeReale') || '';
    const ruolo   = localStorage.getItem('ruolo')        || '';
    const idSquadra   = localStorage.getItem('idSquadra')   || '1';
    const idGiocatore = localStorage.getItem('idGiocatore'); // presente solo per chi ha fatto login come GIOCATORE

    if (sbName) sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
    if (sbRole) sbRole.textContent = ruolo;
    if (sbAv)   renderAvatar(sbAv, (nome[0]||'').toUpperCase() + (cognome[0]||nome[1]||'').toUpperCase());

    // Chi non è un giocatore (allenatore/staff/dirigenza) non ha una "posizione personale"
    if (!idGiocatore) {
        const cardMia = document.getElementById('card-mia-posizione');
        if (cardMia) cardMia.style.display = 'none';
    }

    // 3. Carica la classifica reale dal backend
    await caricaClassifica(idSquadra, idGiocatore);
});

async function caricaClassifica(idSquadra, idGiocatore) {
    const lista = document.getElementById('rank-list');
    const sub   = document.getElementById('classifica-sub');

    try {
        const res = await fetch(`${API_BASE_URL}/quiz/classifica/${idSquadra}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Errore nel recupero della classifica');

        const dati = await res.json();
        renderClassifica(dati, idGiocatore);
        if (sub) sub.textContent = `${dati.length} giocatori`;

    } catch (err) {
        console.error('Errore nel caricamento della classifica:', err);
        if (lista) lista.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:0.85rem">Impossibile caricare la classifica al momento.</div>`;
        if (sub) sub.textContent = '—';
    }
}

function renderClassifica(dati, idGiocatore) {
    const lista = document.getElementById('rank-list');
    if (!lista) return;

    if (!dati || dati.length === 0) {
        lista.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:0.85rem">Nessun giocatore in classifica.</div>`;
        return;
    }

    const medaglie = { 1: 'gold', 2: 'silver', 3: 'bronze' };
    const mioId = idGiocatore ? Number(idGiocatore) : null;

    lista.innerHTML = dati.map(item => {
        const sonoIo = mioId !== null && item.giocatoreId === mioId;
        const classePos = medaglie[item.posizione] || '';
        return `
        <div class="rank-item ${sonoIo ? 'me' : ''}">
            <div class="rank-pos ${classePos}">${item.posizione}</div>
            <div class="rank-name">${item.nome} ${item.cognome}${sonoIo ? ' (tu)' : ''}</div>
            <div class="rank-pts">${item.puntiSettimanali ?? 0} pt</div>
        </div>`;
    }).join('');

    // Aggiorna la card "La mia posizione" se presente e se il giocatore è in lista
    if (mioId !== null) {
        const mio = dati.find(i => i.giocatoreId === mioId);
        const elPos  = document.getElementById('mia-posizione');
        const elPts  = document.getElementById('miei-punti');
        const elRisp = document.getElementById('mie-risposte');
        if (mio) {
            if (elPos)  elPos.textContent  = `#${mio.posizione}`;
            if (elPts)  elPts.textContent  = mio.puntiSettimanali ?? 0;
            if (elRisp) elRisp.textContent = mio.risposteCorrette ?? 0;
        }
    }
}