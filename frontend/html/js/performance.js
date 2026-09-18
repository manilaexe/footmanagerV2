/* ==========================================================================
   Pagina "Performance squadra" – dati reali Serie A presi dall'API esterna.
   Il browser NON chiama GitHub: chiama il nostro backend Spring, che ha
   gia' scaricato e calcolato tutto.
   ========================================================================== */

const API_PERF = 'http://localhost:8080/api';

/* ── Avvio ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

  // 1. Senza token si torna al login
  if (!localStorage.getItem('token')) {
    window.location.href = '/html/login.html';
    return;
  }

  // 2. Sidebar: nome, ruolo, avatar (stesse funzioni usate dalle altre pagine)
  const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Utente';
  const cognome = localStorage.getItem('cognomeReale') || '';
  const ruolo   = localStorage.getItem('ruolo')        || '';

  const sbNome = document.getElementById('sb-nome');
  const sbRuolo = document.getElementById('sb-ruolo');
  const sbAvatar = document.getElementById('sb-avatar');
  if (sbNome)  sbNome.textContent  = cognome ? `${nome} ${cognome}` : nome;
  if (sbRuolo) sbRuolo.textContent = ruolo;
  if (sbAvatar && typeof renderAvatar === 'function') {
    renderAvatar(sbAvatar, (nome[0] || '').toUpperCase() + (cognome[0] || nome[1] || '').toUpperCase());
  }

  // 3. Carica i dati
  await caricaPerformance();
});

/* ── Fetch principale ─────────────────────────────────────────────────── */
async function caricaPerformance() {
  try {
    const res = await fetch(`${API_PERF}/esterno/performance-squadra`, {
      headers: typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token') }
    });

    if (res.status === 401) { localStorage.clear(); window.location.href = '/html/login.html'; return; }
    if (!res.ok) throw new Error('Il server ha risposto con HTTP ' + res.status);

    const d = await res.json();

    // Se la squadra configurata non compare nel dataset, avvisiamo invece di
    // mostrare una pagina piena di trattini senza spiegazione.
    if (!d.kpi || !d.kpi.giocate) {
      mostraErrore('Nessuna partita trovata per "' + (d.squadra || '?') + '" nella stagione ' +
                   (d.nomeStagione || '') + '. Controlla app.external.squadra-nome / squadra-alias ' +
                   'in application.properties, oppure la stagione potrebbe non essere ancora iniziata.');
    }

    const stag = document.getElementById('perf-stagione');
    if (stag) stag.textContent = d.nomeStagione || 'Serie A';

    const fonte = document.getElementById('perf-fonte');
    if (fonte) fonte.textContent = 'Fonte dati: ' + (d.fonte || 'openfootball/football.json');

    renderKpi(d.kpi);
    renderTrend(d.trendPunti || []);
    renderAggregati('tab-bigmatch', d.bigMatch || []);
    renderAggregati('tab-split',    d.splitCasaTrasferta || []);
    renderFormGuide(d.formGuide || []);
    renderTop6(d.verticeClassifica || []);

  } catch (err) {
    console.error(err);
    mostraErrore('Impossibile caricare i dati Serie A. Verifica che Spring Boot sia avviato ' +
                 'su localhost:8080 e che il PC abbia accesso a internet. (' + err.message + ')');
  }
}

function mostraErrore(msg) {
  const box = document.getElementById('perf-error');
  if (!box) return;
  box.textContent = '⚠️ ' + msg;
  box.style.display = 'block';
}

/* ── 1. KPI reali ─────────────────────────────────────────────────────── */
function renderKpi(k) {
  if (!k) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('kpi-pos',      k.posizione ? k.posizione + '°' : '—');
  set('kpi-pos-sub',  k.giocate ? `${k.giocate} giornate giocate` : 'in classifica');

  set('kpi-punti',    k.punti ?? '—');
  set('kpi-punti-sub', k.distaccoDaPrima === 0
      ? 'in testa alla classifica'
      : `-${k.distaccoDaPrima} dalla capolista`);

  set('kpi-ppm',      (k.ppm ?? 0).toFixed(2));
  set('kpi-ppm-sub',  `proiezione ${k.puntiProiettati ?? 0} pt a fine stagione`);

  const dr = k.differenzaReti ?? 0;
  set('kpi-dr',       (dr > 0 ? '+' : '') + dr);
  set('kpi-dr-sub',   `${k.golFatti ?? 0} fatti · ${k.golSubiti ?? 0} subiti`);
}

/* ── 2. Grafico trend cumulativo (Chart.js) ───────────────────────────── */
let chartTrend = null;

function renderTrend(trend) {
  const canvas = document.getElementById('chart-trend');
  if (!canvas || typeof Chart === 'undefined') return;

  if (chartTrend) chartTrend.destroy();   // evita sovrapposizioni al re-render

  chartTrend = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: trend.map(t => 'G' + t.giornata),
      datasets: [
        {
          label: 'Punti squadra',
          data: trend.map(t => t.puntiCumulati),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76,175,80,.15)',
          fill: true, tension: .25, borderWidth: 3, pointRadius: 3
        },
        {
          label: 'Passo Champions',
          data: trend.map(t => t.passoChampions),
          borderColor: '#3b82f6', borderDash: [6, 4],
          fill: false, tension: 0, borderWidth: 2, pointRadius: 0
        },
        {
          label: 'Passo Scudetto',
          data: trend.map(t => t.passoScudetto),
          borderColor: '#eab308', borderDash: [3, 3],
          fill: false, tension: 0, borderWidth: 2, pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#8b949e', boxWidth: 14 } },
        tooltip: {
          callbacks: {
            // Sul punto della nostra curva mostriamo anche avversario ed esito
            afterBody: (items) => {
              const i = items[0].dataIndex;
              const t = trend[i];
              if (!t) return '';
              const esito = t.esito === 'V' ? 'Vittoria' : t.esito === 'N' ? 'Pareggio' : 'Sconfitta';
              return `vs ${t.avversario} – ${esito}`;
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,.5)' } },
        y: { ticks: { color: '#8b949e' }, grid: { color: 'rgba(48,54,61,.5)' },
             title: { display: true, text: 'Punti cumulati', color: '#8b949e' } }
      }
    }
  });
}

/* ── 3/6. Tabelle aggregate (big match e casa/trasferta) ──────────────── */
function renderAggregati(idTabella, blocchi) {
  const tbody = document.querySelector('#' + idTabella + ' tbody');
  if (!tbody) return;

  if (!blocchi.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading">Nessun dato disponibile</td></tr>';
    return;
  }

  tbody.innerHTML = blocchi.map(b => `
    <tr>
      <td><strong>${esc(b.etichetta)}</strong></td>
      <td class="num">${b.giocate}</td>
      <td class="num" style="color:#4caf50">${b.vinte}</td>
      <td class="num" style="color:#eab308">${b.pareggiate}</td>
      <td class="num" style="color:#f87171">${b.perse}</td>
      <td class="num">${b.golFatti}</td>
      <td class="num">${b.golSubiti}</td>
      <td class="num"><strong>${(b.ppm ?? 0).toFixed(2)}</strong></td>
    </tr>`).join('');
}

/* ── 4. Form guide con tooltip ────────────────────────────────────────── */
function renderFormGuide(partite) {
  const strip = document.getElementById('form-strip');
  if (!strip) return;

  if (!partite.length) {
    strip.innerHTML = '<div class="loading">Nessuna partita giocata</div>';
    return;
  }

  strip.innerHTML = partite.map(p => {
    const dove = p.inCasa ? 'Casa' : 'Trasferta';
    const tip  = `${formattaData(p.data)} · ${dove}<br>vs ${esc(p.avversario)}<br><strong>${p.golNostri} - ${p.golAvversari}</strong>`;
    return `<div class="form-box ${p.esito}">${p.esito}<span class="tip">${tip}</span></div>`;
  }).join('');
}

function formattaData(iso) {
  if (!iso) return '';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

/* ── 5. Zoom vertice classifica ───────────────────────────────────────── */
function renderTop6(righe) {
  const tbody = document.querySelector('#tab-top6 tbody');
  if (!tbody) return;

  if (!righe.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading">Nessun dato disponibile</td></tr>';
    return;
  }

  tbody.innerHTML = righe.map(r => {
    const dr    = r.differenzaReti > 0 ? '+' + r.differenzaReti : r.differenzaReti;
    const da5   = r.distaccoDaQuinta;
    const cls5  = da5 >= 0 ? 'delta-pos' : 'delta-neg';
    return `
      <tr class="${r.nostraSquadra ? 'noi' : ''}">
        <td><span class="pos-chip ${r.posizione <= 4 ? 'champions' : ''}">${r.posizione}</span></td>
        <td>${esc(r.squadra)}</td>
        <td class="num">${r.giocate}</td>
        <td class="num"><strong>${r.punti}</strong></td>
        <td class="num">${dr}</td>
        <td class="num">${(r.ppm ?? 0).toFixed(2)}</td>
        <td class="num">${r.distaccoDaPrima === 0 ? '—' : '-' + r.distaccoDaPrima}</td>
        <td class="num ${cls5}">${da5 > 0 ? '+' + da5 : da5}</td>
      </tr>`;
  }).join('');
}

/* ── Escape anti-XSS (stessa logica di calendario.js) ─────────────────── */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
