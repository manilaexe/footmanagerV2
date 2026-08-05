/* ==========================================================================
 * DASHBOARD FULL — pagina di riepilogo usata come destinazione di default
 * per i ruoli senza una dashboard dedicata (es. IT).
 *
 * A differenza della versione precedente, questa pagina NON duplica più la
 * logica di Rosa/Calendario/Statistiche/Messaggi: la sidebar rimanda alle
 * pagine reali già funzionanti (rosa.html, calendario.html, statistiche.html,
 * messaggi.html), coerentemente con come sono organizzate tutte le altre
 * dashboard del progetto. Qui restano solo i dati aggregati per le card di
 * riepilogo e il "messaggio rapido".
 * ========================================================================== */

const API = 'http://localhost:8080';
const CALENDARIO_ID_DEFAULT = 1;

function idSquadra()    { return localStorage.getItem('idSquadra') || '1'; }
function idCalendario() { return parseInt(localStorage.getItem('idCalendario') || CALENDARIO_ID_DEFAULT, 10); }

function authHeaders() {
    return typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') };
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const MESI_BREVI = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const TIPO_EVENTO = {
    ALLENAMENTO: { stripe: '#4caf50' },
    PARTITA:     { stripe: '#3b82f6' },
    RIUNIONE:    { stripe: '#eab308' },
    ALTRO:       { stripe: '#8b5cf6' }
};
const tipoMeta = t => TIPO_EVENTO[t] || TIPO_EVENTO.ALTRO;
function fmtOra(d) { return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }

function pillPosizione(pos) {
    const map = { 'Attaccante': 'pill-red', 'Centrocampista': 'pill-blue', 'Difensore': 'pill-amber', 'Portiere': 'pill-purple' };
    const sigla = { 'Attaccante': 'ATT', 'Centrocampista': 'CEN', 'Difensore': 'DIF', 'Portiere': 'POR' };
    return `<span class="pill ${map[pos] || 'pill-blue'}">${sigla[pos] || (pos || '—')}</span>`;
}

/* ─── STATO GLOBALE ────────────────────────────────────────────────────── */
let cacheGiocatori   = [];   // GiocatoreDto[] + gol/presenze aggiunti dal merge con /statistiche/giocatori
let cacheEventi      = [];   // EventoDto[]
let cacheMessaggi    = [];   // MessaggioDto[] (inviati dall'allenatore/staff autenticato)
let cacheStatSquadra = null; // SquadraStatsResponse

/* ==========================================================================
 * INIZIALIZZAZIONE
 * ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    if (typeof verificaAutenticazione === 'function') verificaAutenticazione();
    popolaSidebarFull();
    caricaTutto();
});

function popolaSidebarFull() {
    const nome    = localStorage.getItem('nomeReale')    || '';
    const cognome = localStorage.getItem('cognomeReale') || '';
    const ruolo   = localStorage.getItem('ruolo')        || '—';
    const username = localStorage.getItem('username')    || 'Utente';

    const sbNome = document.getElementById('sb-nome');
    const sbRuolo = document.getElementById('sb-ruolo');
    const sbAv = document.getElementById('sb-avatar');

    if (sbNome) sbNome.textContent = nome ? (cognome ? `${nome} ${cognome}` : nome) : username;
    if (sbRuolo) sbRuolo.textContent = ruolo;
    if (sbAv) {
        const iniziali = ((nome[0] || username[0] || '?').toUpperCase()) + (cognome[0] || nome[1] || '').toUpperCase();
        if (typeof renderAvatar === 'function') renderAvatar(sbAv, iniziali);
        else sbAv.textContent = iniziali;
    }
}

async function caricaTutto() {
    await Promise.all([
        caricaGiocatori(),
        caricaEventi(),
        caricaMessaggiInviati(),
        caricaStatisticheSquadra()
    ]);
    renderDashboardSummary();
}

/* ==========================================================================
 * CARICAMENTO DATI (stesse API usate da rosa.js / calendario.js / messaggi.js
 * / statistiche.js — qui servono solo per calcolare le card di riepilogo)
 * ========================================================================== */
async function caricaGiocatori() {
    try {
        const [resGioc, resStat] = await Promise.all([
            fetch(`${API}/api/giocatori/squadra/${idSquadra()}`, { headers: authHeaders() }).catch(() => null),
            fetch(`${API}/api/statistiche/giocatori`,            { headers: authHeaders() }).catch(() => null)
        ]);

        const giocatori = (resGioc && resGioc.ok) ? await resGioc.json() : [];
        const stats     = (resStat && resStat.ok) ? await resStat.json() : [];

        cacheGiocatori = giocatori.map(g => {
            const s = stats.find(st => st.nome === `${g.nome} ${g.cognome}`);
            return { ...g, presenze: s?.pres ?? 0, gol: s?.gol ?? 0 };
        });
    } catch (err) {
        console.error('Errore caricamento giocatori:', err);
    }
}

async function caricaEventi() {
    try {
        const res = await fetch(`${API}/api/eventi/calendario/${idCalendario()}`, { headers: authHeaders() });
        cacheEventi = res.ok ? await res.json() : [];
    } catch (err) {
        console.error('Errore caricamento eventi:', err);
    }
}

async function caricaMessaggiInviati() {
    try {
        const res = await fetch(`${API}/api/messaggi/inviati`, { headers: authHeaders() });
        cacheMessaggi = res.ok ? await res.json() : [];
    } catch (err) {
        console.error('Errore caricamento messaggi:', err);
    }
}

async function caricaStatisticheSquadra() {
    try {
        const res = await fetch(`${API}/api/statistiche/squadra`, { headers: authHeaders() });
        cacheStatSquadra = res.ok ? await res.json() : null;
    } catch (err) {
        console.error('Errore caricamento statistiche squadra:', err);
    }
}

/* ==========================================================================
 * RIEPILOGO DASHBOARD
 * ========================================================================== */
function renderDashboardSummary() {
    const kpiGioc = document.getElementById('dash-kpi-giocatori');
    const kpiGiocSub = document.getElementById('dash-kpi-giocatori-sub');
    if (kpiGioc) kpiGioc.textContent = cacheGiocatori.length;
    if (kpiGiocSub) kpiGiocSub.textContent = `${cacheGiocatori.length} giocatori in rosa`;

    const ora = new Date();
    const futuri = cacheEventi
        .filter(e => e.dataOraInizio && new Date(e.dataOraInizio) > ora)
        .sort((a, b) => new Date(a.dataOraInizio) - new Date(b.dataOraInizio));
    const kpiEv = document.getElementById('dash-kpi-evento');
    const kpiEvSub = document.getElementById('dash-kpi-evento-sub');
    if (futuri.length > 0) {
        const e = futuri[0];
        const d = new Date(e.dataOraInizio);
        if (kpiEv) kpiEv.textContent = d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' });
        if (kpiEvSub) kpiEvSub.textContent = `${e.titolo || ''} – ${e.luogo || 'luogo da definire'}`;
    } else {
        if (kpiEv) kpiEv.textContent = '—';
        if (kpiEvSub) kpiEvSub.textContent = 'Nessun evento in programma';
    }

    const nonLetti = cacheMessaggi.filter(m => (m.stato || '').toUpperCase() !== 'LETTO');
    const kpiMsg = document.getElementById('dash-kpi-msg');
    const kpiMsgSub = document.getElementById('dash-kpi-msg-sub');
    if (kpiMsg) kpiMsg.textContent = nonLetti.length;
    if (kpiMsgSub) kpiMsgSub.textContent = cacheMessaggi.length > 0 ? `su ${cacheMessaggi.length} inviati` : 'nessun messaggio inviato';

    const kpiGol = document.getElementById('dash-kpi-golmedio');
    const kpiGolSub = document.getElementById('dash-kpi-golmedio-sub');
    if (cacheStatSquadra && cacheStatSquadra.kpi && cacheStatSquadra.kpi.partiteGiocate > 0) {
        const media = cacheStatSquadra.kpi.golFatti / cacheStatSquadra.kpi.partiteGiocate;
        if (kpiGol) kpiGol.textContent = media.toFixed(1);
        if (kpiGolSub) kpiGolSub.textContent = `${cacheStatSquadra.kpi.golFatti} gol in ${cacheStatSquadra.kpi.partiteGiocate} partite`;
    } else {
        if (kpiGol) kpiGol.textContent = '—';
        if (kpiGolSub) kpiGolSub.textContent = 'Nessuna partita registrata';
    }

    // Rosa — preview (primi 5), il resto si trova su rosa.html
    const rosaTbody = document.getElementById('dash-rosa-tbody');
    if (rosaTbody) {
        rosaTbody.innerHTML = cacheGiocatori.length === 0
            ? `<tr><td colspan="5" style="text-align:center;color:var(--muted);">Nessun giocatore in rosa.</td></tr>`
            : cacheGiocatori.slice(0, 5).map(g => {
                const iniziali = (g.nome?.[0] || '') + (g.cognome?.[0] || '');
                return `<tr>
                    <td><div class="player-name-cell"><div class="tbl-avatar">${escapeHtml(iniziali)}</div>${escapeHtml(g.nome)} ${escapeHtml(g.cognome)}</div></td>
                    <td>${pillPosizione(g.posizione)}</td>
                    <td>${g.presenze ?? 0}</td>
                    <td><strong>${g.gol ?? 0}</strong></td>
                    <td><span class="pill pill-green">In rosa</span></td>
                </tr>`;
            }).join('');
    }

    // Prossimi eventi — preview (primi 4), il resto si trova su calendario.html
    const evList = document.getElementById('dash-eventi-list');
    if (evList) {
        evList.innerHTML = futuri.length === 0
            ? `<div style="text-align:center;color:var(--muted);padding:1rem;">Nessun evento in programma.</div>`
            : futuri.slice(0, 4).map(e => {
                const d = new Date(e.dataOraInizio);
                const meta = tipoMeta(e.tipo);
                return `<div class="event-item">
                    <div class="event-date"><div class="day">${String(d.getDate()).padStart(2,'0')}</div><div class="mon">${MESI_BREVI[d.getMonth()]}</div></div>
                    <div class="event-stripe" style="background:${meta.stripe}"></div>
                    <div class="event-info"><div class="title">${escapeHtml(e.titolo || '')}</div><div class="meta">${fmtOra(d)} – ${escapeHtml(e.luogo || 'Luogo da definire')}</div></div>
                </div>`;
            }).join('');
    }

    // Ultimi messaggi — preview (primi 3), il resto si trova su messaggi.html
    const msgList = document.getElementById('dash-msg-list');
    if (msgList) {
        msgList.innerHTML = cacheMessaggi.length === 0
            ? `<div style="text-align:center;color:var(--muted);padding:1rem;">Nessun messaggio inviato.</div>`
            : cacheMessaggi.slice(0, 3).map(renderMsgItemHtml).join('');
    }

    aggiornaBadgeMessaggi();
    popolaSelectDestinatari(document.getElementById('dash-msg-dest'));
}

function aggiornaBadgeMessaggi() {
    const badge = document.getElementById('msg-badge');
    if (!badge) return;
    const nonLetti = cacheMessaggi.filter(m => (m.stato || '').toUpperCase() !== 'LETTO').length;
    badge.textContent = nonLetti;
    badge.style.display = nonLetti > 0 ? '' : 'none';
}

function renderMsgItemHtml(m) {
    const letto = (m.stato || '').toUpperCase() === 'LETTO';
    const d = m.dataOra ? new Date(m.dataOra) : null;
    const quando = d ? d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) + ' ' + fmtOra(d) : '';
    return `<div class="msg-item">
        <div class="msg-head"><span class="msg-from">→ ${escapeHtml(m.nomeGiocatore || m.giocatoreNome || 'Giocatore')}</span><span class="msg-time">${quando}</span></div>
        <div class="msg-text">${escapeHtml(m.testo || '')}</div>
        <div class="msg-status ${letto ? 'letto' : 'inviato'}">${letto ? '✔✔ Letto' : '✔ Inviato'}</div>
    </div>`;
}

/* ==========================================================================
 * MESSAGGIO RAPIDO (l'unica azione di scrittura rimasta su questa pagina;
 * la gestione completa dei messaggi è su messaggi.html)
 * ========================================================================== */
const RUOLI_SQUADRA = [
    { valore: 'Portiere', etichetta: 'Tutti i portieri' },
    { valore: 'Difensore', etichetta: 'Tutti i difensori' },
    { valore: 'Centrocampista', etichetta: 'Tutti i centrocampisti' },
    { valore: 'Attaccante', etichetta: 'Tutti gli attaccanti' }
];

function popolaSelectDestinatari(sel) {
    if (!sel || cacheGiocatori.length === 0) return;
    let html = '<option value="">Destinatario…</option><optgroup label="Per ruolo">';
    RUOLI_SQUADRA.forEach(r => {
        const n = cacheGiocatori.filter(g => g.posizione === r.valore).length;
        if (n > 0) html += `<option value="ruolo:${r.valore}">${r.etichetta} (${n})</option>`;
    });
    html += '</optgroup><optgroup label="Singolo giocatore">';
    cacheGiocatori.forEach(g => {
        html += `<option value="giocatore:${g.id}">${escapeHtml(g.nome)} ${escapeHtml(g.cognome)}</option>`;
    });
    html += '</optgroup>';
    sel.innerHTML = html;
}

async function sendQuickMsg() {
    const selEl = document.getElementById('dash-msg-dest');
    const textEl = document.getElementById('dash-msg-text');
    const val = selEl?.value || '';
    const testo = (textEl?.value || '').trim();
    if (!val) { alert('Seleziona un destinatario.'); return; }
    if (!testo) { alert('Scrivi il testo del messaggio.'); return; }

    const [tipo, valore] = val.split(':');
    const isRuolo = tipo === 'ruolo';
    const url = isRuolo ? `${API}/api/messaggi/ruolo` : `${API}/api/messaggi`;
    const payload = isRuolo ? { ruolo: valore, testo } : { giocatoreId: parseInt(valore, 10), testo };

    try {
        const res = await fetch(url, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
        if (res.ok) {
            textEl.value = '';
            selEl.value = '';
            await caricaMessaggiInviati();
            renderDashboardSummary();
            alert(isRuolo ? '✔ Messaggio inviato al ruolo selezionato.' : '✔ Messaggio inviato.');
        } else {
            alert(`Errore invio (${res.status}): ${await res.text()}`);
        }
    } catch (err) {
        console.error('Errore rete invio messaggio:', err);
        alert('Impossibile raggiungere il server.');
    }
}