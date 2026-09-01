// ── CONFIGURAZIONE API ──
const API = 'http://localhost:8080';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Controllo login
    if (typeof verificaAutenticazione === 'function') verificaAutenticazione();

    // 2. Questa pagina ha senso solo per un GIOCATORE (i badge sono legati
    // alle sue risposte ai quiz): chi ha un ruolo diverso viene rimandato
    // alla propria dashboard
    const ruolo = localStorage.getItem('ruolo') || '';
    if (ruolo !== 'GIOCATORE') {
        window.location.href = dashboardUrlPerRuolo(ruolo);
        return;
    }

    // 3. Popola la sidebar con nome/ruolo/avatar dal localStorage
    const sbName = document.getElementById('sb-nome');
    const sbRole = document.getElementById('sb-ruolo');
    const sbAv   = document.getElementById('sb-avatar');

    const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Utente';
    const cognome = localStorage.getItem('cognomeReale') || '';

    if (sbName) sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
    if (sbRole) sbRole.textContent = ruolo;
    if (sbAv)   renderAvatar(sbAv, (nome[0]||'').toUpperCase() + (cognome[0]||nome[1]||'').toUpperCase());

    // 4. Carica i badge
    caricaBadge();
});

/*
 * Endpoint: GET /api/badge                 → elenco di TUTTI i badge esistenti
 *   (id, nomeBadge, sogliaPunti, icona) — GET aperto a qualsiasi utente autenticato.
 * Endpoint: GET /api/badge/giocatore/{id}  → badge già ottenuti dal giocatore
 *   corrente (giocatoreId, badgeId, nomeBadge, dataOttenimento).
 */
async function caricaBadge() {
    const loader = document.getElementById('badges-loading');
    const grid   = document.getElementById('badges-grid');
    const empty  = document.getElementById('badges-empty');
    const count  = document.getElementById('badges-count');
    if (!grid) return;

    const idGiocatore = localStorage.getItem('idGiocatore');
    const headers = getAuthHeaders();

    if (loader) loader.style.display = 'block';
    if (grid)   grid.style.display   = 'none';
    if (empty)  empty.style.display  = 'none';

    try {
        const [resTutti, resMiei] = await Promise.all([
            fetch(`${API}/api/badge`, { headers }),
            idGiocatore
                ? fetch(`${API}/api/badge/giocatore/${idGiocatore}`, { headers })
                : Promise.resolve(null)
        ]);

        if (resTutti.status === 401 || (resMiei && resMiei.status === 401)) { logout(); return; }

        if (!resTutti.ok) {
            console.error('Errore caricamento badge:', resTutti.status);
            if (loader) loader.textContent = 'Impossibile caricare i badge.';
            return;
        }

        const tutti = await resTutti.json();
        const miei  = (resMiei && resMiei.ok) ? await resMiei.json() : [];

        if (loader) loader.style.display = 'none';

        if (!tutti || tutti.length === 0) {
            if (empty) empty.style.display = 'block';
            if (count) count.textContent = '';
            return;
        }

        renderizzaBadge(tutti, miei, grid);
        if (grid)  grid.style.display = 'grid';
        if (count) count.textContent  = `${miei.length}/${tutti.length} sbloccati`;

    } catch (err) {
        console.error('Errore di rete badge:', err);
        if (loader) loader.textContent = 'Server non raggiungibile.';
    }
}

// Mappa id badge → { badge, ottenuto } usata dal modal di dettaglio
let badgeDataMap = new Map();

// Disegna la griglia completa
function renderizzaBadge(tutti, miei, container) {
    if (!container) return;
    container.innerHTML = '';
    badgeDataMap = new Map();

    const ottenutiMap = new Map((miei || []).map(m => [m.badgeId, m]));
    const ordinati = [...tutti].sort((a, b) => (a.sogliaPunti || 0) - (b.sogliaPunti || 0));

    ordinati.forEach(b => {
        const ottenuto = ottenutiMap.get(b.id);
        badgeDataMap.set(b.id, { badge: b, ottenuto });

        const tile = document.createElement('div');
        tile.className = `badge-tile ${ottenuto ? 'unlocked' : 'locked'}`;
        tile.setAttribute('role', 'button');
        tile.setAttribute('tabindex', '0');
        tile.addEventListener('click', () => apriDettaglioBadge(b.id));
        tile.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apriDettaglioBadge(b.id); }
        });

        const iconaHtml = creaIconaHtml(b.icona, b.nomeBadge);

        const infoTxt = ottenuto
            ? `Ottenuto il ${new Date(ottenuto.dataOttenimento).toLocaleDateString('it-IT')}`
            : `Richiede ${b.sogliaPunti} risposte corrette`;

        tile.innerHTML = `
            <div class="badge-tile-icon">${iconaHtml}</div>
            <div class="badge-tile-name">${esc(b.nomeBadge)}</div>
            <div class="badge-tile-info">${esc(infoTxt)}</div>`;
        container.appendChild(tile);
    });
}

// ─── MODAL DETTAGLIO BADGE ──────────────────────────────────────────────
function apriDettaglioBadge(badgeId) {
    const dati = badgeDataMap.get(badgeId);
    if (!dati) return;
    const { badge: b, ottenuto } = dati;

    const overlay   = document.getElementById('badge-modal-overlay');
    const modal     = document.getElementById('badge-modal');
    const icona     = document.getElementById('modal-badge-icon');
    const nome      = document.getElementById('modal-badge-nome');
    const status    = document.getElementById('modal-badge-status');
    const soglia    = document.getElementById('modal-badge-soglia');
    const dataRow   = document.getElementById('modal-badge-data-row');
    const dataVal   = document.getElementById('modal-badge-data');
    if (!overlay || !modal) return;

    modal.className = `badge-modal ${ottenuto ? 'unlocked' : 'locked'}`;
    icona.innerHTML = creaIconaHtml(b.icona, b.nomeBadge);
    nome.textContent   = b.nomeBadge;
    status.textContent = ottenuto ? '✔ Badge sbloccato' : '🔒 Badge non ancora sbloccato';
    soglia.textContent = `${b.sogliaPunti} risposte corrette al quiz del giorno`;

    if (ottenuto) {
        dataRow.style.display = 'flex';
        dataVal.textContent = new Date(ottenuto.dataOttenimento).toLocaleDateString('it-IT', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    } else {
        dataRow.style.display = 'none';
    }

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function chiudiDettaglioBadge(event) {
    if (event && event.target !== event.currentTarget) return;
    const overlay = document.getElementById('badge-modal-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') chiudiDettaglioBadge();
});

// ─── UTILITY PER L'ICONA ────────────────────────────────────────────────
function creaIconaHtml(iconaPath, nomeBadge) {
    if (!iconaPath || iconaPath.trim() === '') return '🎖';
    
    let src = iconaPath;
    // Se non è un URL assoluto o base64 e non comincia con '/', aggiunge la barra iniziale
    if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:') && !src.startsWith('/')) {
        src = '/' + src;
    }
    
    return `<img src="${src}" alt="${esc(nomeBadge)}" onerror="this.onerror=null; this.parentElement.innerHTML='🎖';">`;
}

function esc(s) {
    return String(s || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}