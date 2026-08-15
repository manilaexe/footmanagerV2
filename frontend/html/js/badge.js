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

    // 3. Popola la sidebar con nome/ruolo/avatar dal localStorage (stessa logica delle altre pagine)
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
 *   (id, nomeBadge, sogliaPunti, iconaBase64) — GET aperto a qualsiasi utente
 *   autenticato, usato qui per sapere anche quali badge esistono ma NON sono
 *   ancora stati sbloccati dal giocatore.
 * Endpoint: GET /api/badge/giocatore/{id}  → badge già ottenuti dal giocatore
 *   corrente (giocatoreId, badgeId, nomeBadge, dataOttenimento).
 *
 * L'assegnazione vera e propria è automatica lato backend
 * (QuizService.verificaBadge): ogni risposta corretta al quiz del giorno
 * fa scattare il controllo e, se la soglia di risposte corrette totali
 * viene raggiunta, il badge viene salvato per il giocatore. Qui ci
 * limitiamo a MOSTRARLI: uniamo l'elenco completo con quelli ottenuti,
 * evidenziando gli sbloccati e lasciando in grigio quelli ancora da
 * raggiungere (con la soglia richiesta).
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

// Mappa id badge → { badge, ottenuto } usata dal modal di dettaglio quando
// si clicca su una tile (evita di dover rifare le fetch al click).
let badgeDataMap = new Map();

// Disegna la griglia completa: un tile per ogni badge esistente, ordinati
// per soglia crescente, sbloccato/bloccato in base a ciò che il giocatore
// ha già ottenuto. Ogni tile è cliccabile e apre il modal di dettaglio.
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

        const iconaHtml = b.iconaBase64
            ? `<img src="data:image/png;base64,${b.iconaBase64}" alt="">`
            : '🎖';

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
// Al click su una tile mostra un ingrandimento con le info complete:
// icona, nome, stato (sbloccato/bloccato), soglia richiesta e, se già
// ottenuto, la data esatta di sblocco. Nessuna nuova chiamata al backend:
// usa i dati già scaricati da caricaBadge()/renderizzaBadge().
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
    icona.innerHTML = b.iconaBase64
        ? `<img src="data:image/png;base64,${b.iconaBase64}" alt="">`
        : '🎖';
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

// Chiude il modal: sia dal bottone ✕ sia cliccando fuori dalla card
// (event.target === overlay), ma non se il click parte da dentro la card.
function chiudiDettaglioBadge(event) {
    if (event && event.target !== event.currentTarget) return;
    const overlay = document.getElementById('badge-modal-overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
}

// Chiude anche con il tasto ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') chiudiDettaglioBadge();
});

// ─── UTILITY ────────────────────────────────────────────────────────────
function esc(s) {
    return String(s || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}