/* ==========================================================================
   1. CONFIGURAZIONE API E STATO GLOBALE DIRIGENZA (Read-Only)
   ========================================================================== */
const API_BASE_URL = 'http://localhost:8080/api';
const token = localStorage.getItem('token'); 

let PLAYERS = []; 
let EVENTS = []; 
let QUIZ_DATA = []; 
let TEAM_KPI = {}; 

let dirigenzaSortCol = 'gol';
let dirigenzaSortDir = 'desc'; // 'desc' = più alto, 'asc' = più basso

/* ==========================================================================
   2. INIZIALIZZAZIONE DELLA PAGINA
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof verificaAutenticazione === 'function') {
        verificaAutenticazione(); 
    }

    const sbName = document.getElementById('sb-nome'); 
    const sbRole = document.getElementById('sb-ruolo'); 
    const sbAv   = document.getElementById('sb-avatar'); 
    
    const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Dirigente';
    const cognome = localStorage.getItem('cognomeReale') || '';
    const ruolo   = localStorage.getItem('ruolo')        || 'Dirigenza';
    
    if (sbName) sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
    if (sbRole) sbRole.textContent = ruolo;
    if (sbAv && typeof renderAvatar === 'function') {
        renderAvatar(sbAv, (nome[0]||'').toUpperCase() + (cognome[0]||nome[1]||'').toUpperCase());
    }

    await caricaDatiDirigenza();
});

/* ==========================================================================
   3. REPERIMENTO E NORMALIZZAZIONE DATI (Stesso motore di statistiche.js)
   ========================================================================== */
async function caricaDatiDirigenza() {
    const idSquadra = localStorage.getItem('idSquadra') || '1';
    const headers = typeof getAuthHeaders === 'function' 
        ? getAuthHeaders() 
        : { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    try {
        const [resBaseGioc, resEvents, resQuiz, resStatsG, resStatsS] = await Promise.all([
            fetch(`${API_BASE_URL}/giocatori/squadra/${idSquadra}`, { headers }).catch(() => null),
            fetch(`${API_BASE_URL}/eventi/calendario/${idSquadra}`, { headers }).catch(() => null),
            fetch(`${API_BASE_URL}/quiz/classifica/${idSquadra}`,    { headers }).catch(() => null),
            fetch(`${API_BASE_URL}/statistiche/giocatori`,           { headers }).catch(() => null),
            fetch(`${API_BASE_URL}/statistiche/squadra`,             { headers }).catch(() => null)
        ]);

        let baseGiocatori = (resBaseGioc?.ok) ? await resBaseGioc.json() : [];
        EVENTS = (resEvents?.ok) ? await resEvents.json() : [];
        QUIZ_DATA = (resQuiz?.ok) ? await resQuiz.json() : [];
        const statsList = (resStatsG?.ok) ? await resStatsG.json() : [];
        const dataSquadra = (resStatsS?.ok) ? await resStatsS.json() : {};

        TEAM_KPI = dataSquadra.kpi || {};

        // Normalizzazione identica a statistiche.js
        PLAYERS = baseGiocatori.map(p => {
            const isGK = Boolean(p.portiere);
            const presenze = p.presenze ?? p.pres ?? 0;
            const assist = p.assist ?? p.ass ?? 0;

            const normalized = {
                ...p,
                portiere: isGK,
                nome: p.nomeCompleto || `${p.nome || ''} ${p.cognome || ''}`.trim() || 'Giocatore',
                presenze,
                assist
            };

            // Cerca match in /statistiche/giocatori se presenti
            const s = Array.isArray(statsList) ? statsList.find(st => 
                st.id === p.id || st.giocatoreId === p.id || st.idGiocatore === p.id || st.nome === p.nome
            ) : null;

            if (isGK) {
                normalized.parate = s?.parate ?? p.parate ?? 0;
                normalized.cleanSheet = s?.cleanSheet ?? p.cleanSheet ?? 0;
                normalized.goalSubiti = s?.goalSubiti ?? p.goalSubiti ?? 0;
                normalized.gol = 0;
                normalized.tiri = 0;
            } else {
                normalized.golTotali = s?.golTotali ?? s?.gol ?? p.golTotali ?? p.gol ?? 0;
                normalized.tiriTotali = s?.tiriTotali ?? s?.tiri ?? p.tiriTotali ?? 0;
                normalized.assist = s?.assist ?? s?.ass ?? assist;
                normalized.presenze = s?.presenze ?? presenze;
                normalized.gol = normalized.golTotali;
            }

            return normalized;
        });

        renderKPIDirigenza();
        renderTopMarcatoriDirigenza();
        renderProssimiEventiDirigenza();

    } catch (err) {
        console.error('Errore nel caricamento dati dirigenza:', err);
    }
}

/* ==========================================================================
   4. RENDERING 5 KPI IN ALTO
   ========================================================================== */
function renderKPIDirigenza() {
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    // 1. Giocatori in rosa
    setVal('kpi-giocatori', PLAYERS.length);

    // 2. Gol fatti (somma moventi o KPI squadra)
    const movPlayers = PLAYERS.filter(p => !p.portiere);
    const sumGolTeam = movPlayers.reduce((s, p) => s + Number(p.golTotali || p.gol || 0), 0);
    const effGolFatti = Math.max(TEAM_KPI.golFatti ?? 0, sumGolTeam);
    setVal('kpi-gol-fatti', effGolFatti);

    // 3. Gol subiti (somma portieri o KPI squadra - identico a statistiche.js)
    const gkPlayers = PLAYERS.filter(p => p.portiere);
    const sumGolSubitiGK = gkPlayers.reduce((s, p) => s + Number(p.goalSubiti || 0), 0);
    const effGolSubiti = Math.max(TEAM_KPI.golSubiti ?? 0, sumGolSubitiGK);
    setVal('kpi-gol-subiti', effGolSubiti);

    // 4. Prossimo match
    const ora = new Date();
    const matchEl = document.getElementById('kpi-prossimo-match');
    const matchSubEl = document.getElementById('kpi-prossimo-match-sub');
    
    const matchesFuturi = Array.isArray(EVENTS) 
        ? EVENTS.filter(e => new Date(e.dataOraInizio || e.dataInizio || 0) >= ora)
                  .sort((a, b) => new Date(a.dataOraInizio || a.dataInizio || 0) - new Date(b.dataOraInizio || b.dataInizio || 0))
        : [];

    if (matchesFuturi.length > 0) {
        const next = matchesFuturi[0];
        const d = new Date(next.dataOraInizio || next.dataInizio || 0);
        if (matchEl) matchEl.textContent = next.titolo || 'Match';
        if (matchSubEl) matchSubEl.textContent = `${isNaN(d) ? '' : d.toLocaleDateString('it-IT', {day:'numeric', month:'short'})} · ${next.luogo || 'Sede'}`;
    } else {
        if (matchEl) matchEl.textContent = 'Nessuno';
        if (matchSubEl) matchSubEl.textContent = 'Nessun evento';
    }

    // 5. % Partecipazione quiz
    const kpiQuiz = document.getElementById('kpi-quiz-partecipazione');
    if (kpiQuiz) {
        const totalRosa = PLAYERS.length || 1;
        const attivi = Array.isArray(QUIZ_DATA) ? QUIZ_DATA.filter(i => Number(i.puntiSettimanali || i.puntiTotali || 0) > 0).length : 0;
        const pct = Math.min(Math.round((attivi / totalRosa) * 100), 100);
        kpiQuiz.textContent = `${pct}%`;
    }
}

/* ==========================================================================
   5. TOP MARCATORI (Ordinabile Gol/Assist/Pres)
   ========================================================================== */
function sortDirigenzaMarcatori(column) {
    if (dirigenzaSortCol === column) {
        dirigenzaSortDir = dirigenzaSortDir === 'desc' ? 'asc' : 'desc';
    } else {
        dirigenzaSortCol = column;
        dirigenzaSortDir = 'desc';
    }
    renderTopMarcatoriDirigenza();
}
window.sortDirigenzaMarcatori = sortDirigenzaMarcatori;

function renderTopMarcatoriDirigenza() {
    const tbody = document.getElementById('tabella-top-marcatori');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!PLAYERS.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:var(--muted)">Nessun giocatore disponibile.</td></tr>`;
        return;
    }

    const medaglie = { 1: 'gold', 2: 'silver', 3: 'bronze' };
    const icone = { 1: '🥇', 2: '🥈', 3: '🥉' };

    // Ordina tutti o filtra i non portieri
    const sorted = [...PLAYERS].sort((a, b) => {
        const valA = Number(a[dirigenzaSortCol] ?? 0);
        const valB = Number(b[dirigenzaSortCol] ?? 0);
        return dirigenzaSortDir === 'desc' ? valB - valA : valA - valB;
    }).slice(0, 6);

    sorted.forEach((g, idx) => {
        const pos = idx + 1;
        const icon = icone[pos] || pos;
        const cls = medaglie[pos] || '';

        const hGol = dirigenzaSortCol === 'gol' ? 'color:var(--green-l);font-weight:800;' : 'color:var(--text);';
        const hAss = dirigenzaSortCol === 'assist' ? 'color:var(--green-l);font-weight:800;' : 'color:var(--muted);';
        const hPre = dirigenzaSortCol === 'presenze' ? 'color:var(--green-l);font-weight:800;' : 'color:var(--muted);';

        tbody.innerHTML += `
            <tr>
                <td style="text-align:center;"><span class="rank-pos ${cls}" style="font-family:'Barlow Condensed',sans-serif;font-weight:800;">${icon}</span></td>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">${g.nome}</div>
                </td>
                <td style="text-align:right;${hGol}">${g.gol ?? 0}</td>
                <td style="text-align:right;${hAss}">${g.assist ?? 0}</td>
                <td style="text-align:right;${hPre}">${g.presenze ?? 0}</td>
            </tr>`;
    });
}

/* ==========================================================================
   6. PROSSIMI EVENTI (Read-Only coerente con Allenatore)
   ========================================================================== */
function renderProssimiEventiDirigenza() {
    const container = document.getElementById('lista-prossimi-eventi');
    if (!container) return;
    container.innerHTML = '';

    const ora = new Date();
    const futuri = Array.isArray(EVENTS) 
        ? EVENTS.filter(e => new Date(e.dataOraInizio || e.dataInizio || 0) >= ora)
                  .sort((a, b) => new Date(a.dataOraInizio || a.dataInizio || 0) - new Date(b.dataOraInizio || b.dataInizio || 0))
                  .slice(0, 3)
        : [];

    if (!futuri.length) {
        container.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:0.85rem">Nessuna attività programmata.</div>`;
        return;
    }

    container.innerHTML = futuri.map(e => {
        const d = new Date(e.dataOraInizio || e.dataInizio || 0);
        const gg = isNaN(d) ? '–' : d.getDate();
        const mm = isNaN(d) ? '–' : d.toLocaleDateString('it-IT',{month:'short'}).replace('.','').toUpperCase();
        const timeStr = isNaN(d) ? '' : d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
        const tipo = (e.tipo || '').toLowerCase();

        // Coerenza colori Allenatore (partita = blu, riunione = amber, allenamento/altro = verde)
        let stripeClass = 'stripe-green';
        let pillClass = 'pill-green';
        let dateColor = 'var(--green-l)';

        if (tipo.includes('partita')) {
            stripeClass = 'stripe-blue';
            pillClass = 'pill-blue';
            dateColor = '#3b82f6';
        } else if (tipo.includes('riunione')) {
            stripeClass = 'stripe-amber';
            pillClass = 'pill-amber';
            dateColor = '#eab308';
        } else {
            stripeClass = 'stripe-green';
            pillClass = 'pill-green';
            dateColor = 'var(--green-l)';
        }

        return `
            <div class="event-item" style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--dark3);border-radius:8px;margin-bottom:8px;">
                <div style="text-align:center;min-width:38px;padding:6px 4px;">
                    <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:800;line-height:1;color:white">${gg}</div>
                    <div style="font-size:0.58rem;color:var(--muted);text-transform:uppercase;">${mm}</div>
                </div>
                <div class="event-stripe ${stripeClass}" style="width:3px;align-self:stretch;border-radius:2px;"></div>
                <div style="flex:1;">
                    <div style="font-weight:600;font-size:0.875rem;">${e.titolo || 'Evento'}</div>
                    <div style="font-size:0.75rem;color:var(--muted);margin-top:2px;">${timeStr} · ${e.luogo || 'Sede'}</div>
                </div>
                <span class="pill ${pillClass}">${e.tipo || 'EVENTO'}</span>
            </div>`;
    }).join('');
}

/* ==========================================================================
   7. UTILITY / LOGOUT
   ========================================================================== */
function logout() { localStorage.clear(); window.location.href = '/html/login.html'; }
window.logout = logout;