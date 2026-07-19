/* ─── CONFIG ─────────────────────────────────────────────────── */
const API             = 'http://localhost:8080';
const CALENDARIO_ID_DEFAULT = 1;   // cambia se usi più calendari

/* ─── UTILS AUTH ─────────────────────────────────────────────── */
function getToken() { return localStorage.getItem('token'); }

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  };
}

function calendarioId() {
  return parseInt(localStorage.getItem('idCalendario') || CALENDARIO_ID_DEFAULT, 10);
}

/* ─── UTILS DATE ─────────────────────────────────────────────── */
const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                   'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const MONTHS_SHORT = MONTHS_IT.map(m => m.slice(0,3));
const DAYS_IT      = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];

const parseDate    = s => s ? new Date(s) : null;
const pad          = n => String(n).padStart(2,'0');

function fmtTime(s) {
  const d = parseDate(s);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
}
function fmtDateShort(s) {
  const d = parseDate(s);
  return d ? `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` : '';
}
// Date → "2025-05-29T09:00" (per input[datetime-local])
function toInputVal(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
// "2025-05-29T09:00" → "2025-05-29T09:00:00" (backend LocalDateTime)
const toBackendDT = s => s ? s + ':00' : null;
// "2025-05-29T09:00:00" → "2025-05-29T09:00"
const toInputStr  = s => s ? s.slice(0,16) : '';

/* ─── STATO ──────────────────────────────────────────────────── */
const TODAY    = new Date();
let viewYear   = TODAY.getFullYear();
let viewMonth  = TODAY.getMonth();       // 0-based
let weekCursor = weekStartOf(new Date()); // âncora settimana (aggiornata da navigate)
let events     = [];                     // cache locale
let detailId   = null;                   // id aperto nel modal dettaglio
let curView    = 'month';

/* ─── MAPPA TIPO → STILE ─────────────────────────────────────── */
/*
 * I valori devono corrispondere ESATTAMENTE all'ENUM MySQL:
 *   enum('ALLENAMENTO','ALTRO','PARTITA','RIUNIONE')
 */
const TIPO = {
  ALLENAMENTO: { label:'Allenamento', icon:'⚽', pillClass:'pill-green',  stripe:'#4caf50', bg:'rgba(58,125,68,.25)'   },
  PARTITA:     { label:'Partita',     icon:'🏟', pillClass:'pill-blue',   stripe:'#3b82f6', bg:'rgba(59,130,246,.2)'   },
  RIUNIONE:    { label:'Riunione',    icon:'📋', pillClass:'pill-amber',  stripe:'#eab308', bg:'rgba(234,179,8,.15)'   },
  ALTRO:       { label:'Altro',       icon:'🎯', pillClass:'pill-purple', stripe:'#8b5cf6', bg:'rgba(139,92,246,.15)'  },
};
const tipoMeta = t => TIPO[t] || TIPO.ALTRO;

/* ─── API ────────────────────────────────────────────────────── */
async function apiFetch(path, opts = {}) {
  let res;
  try {
    res = await fetch(API + path, {
      ...opts,
      headers: { ...authHeaders(), ...(opts.headers || {}) }
    });
  } catch(_) {
    showBanner('Impossibile contattare il backend. Controlla che Spring Boot sia attivo su localhost:8080.', 'err');
    throw new Error('Backend non raggiungibile');
  }

  hideBanner();

  if (res.status === 401) {
    localStorage.clear();
    window.location.href = '/html/login.html';
    return null;
  }
  if (res.status === 204) return null;
  if (!res.ok) {
    let msg = `Errore HTTP ${res.status}`;
    try { const b = await res.json(); msg = b.message || b.error || msg; } catch(_) {}
    throw new Error(msg);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

/* GET  /api/eventi/calendario/{id}  → List<EventoDto> */
async function fetchEvents() {
  showLoader(true);
  try {
    const data = await apiFetch(`/api/eventi/calendario/${calendarioId()}`);
    events = Array.isArray(data) ? data : [];
  } catch(_) {
    events = [];
  } finally {
    showLoader(false);
  }
}

/* POST /api/eventi  → EventoDto creato */
async function apiCreate(payload) {
  return apiFetch('/api/eventi', { method:'POST', body: JSON.stringify(payload) });
}

/* PUT  /api/eventi/{id}  → EventoDto aggiornato */
async function apiUpdate(id, payload) {
  return apiFetch(`/api/eventi/${id}`, { method:'PUT', body: JSON.stringify(payload) });
}

/* DELETE /api/eventi/{id}  → 204 */
async function apiDelete(id) {
  return apiFetch(`/api/eventi/${id}`, { method:'DELETE' });
}

/* ─── LOADER ─────────────────────────────────────────────────── */
function showLoader(on) {
  const loaderIds = { month:'cal-loader', week:'week-loader', list:'list-loader' };
  const el = document.getElementById(loaderIds[curView]);
  if (el) el.style.display = on ? 'flex' : 'none';
}

/* ─── BANNER ERRORE ──────────────────────────────────────────── */
function showBanner(msg, type) {
  const b = document.getElementById('error-banner');
  if (!b) return;
  b.textContent = (type === 'err' ? '⚠️ ' : '✅ ') + msg;
  b.style.display = 'flex';
}
function hideBanner() {
  const b = document.getElementById('error-banner');
  if (b) b.style.display = 'none';
}

/* ─── TOAST ──────────────────────────────────────────────────── */
let _toastT = null;
function toast(msg, type) {
  const el   = document.getElementById('fm-toast');
  const icon = document.getElementById('fm-toast-icon');
  const text = document.getElementById('fm-toast-text');
  if (!el) return;
  if (icon) icon.textContent = type === 'err' ? '⚠️' : '✅';
  if (text) text.textContent = msg;
  el.classList.add('fm-toast-show');
  if (type === 'err') el.classList.add('fm-toast-err');
  else el.classList.remove('fm-toast-err');
  if (_toastT) clearTimeout(_toastT);
  _toastT = setTimeout(() => el.classList.remove('fm-toast-show'), 3500);
}

/* ─── XSS ESCAPE ─────────────────────────────────────────────── */
function esc(s) {
  return String(s||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── WEEK HELPER (definito prima di navigate) ───────────────── */
function weekStartOf(date) {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ─── NAVIGAZIONE ────────────────────────────────────────────── */
function setView(v) {
  curView = v;
  // Quando si entra nella vista settimana, ancora il cursore alla settimana
  // che contiene il giorno 1 del mese corrente (o oggi se è lo stesso mese)
  if (v === 'week') {
    const anchor = (viewYear === TODAY.getFullYear() && viewMonth === TODAY.getMonth())
      ? new Date()
      : new Date(viewYear, viewMonth, 1);
    weekCursor = weekStartOf(anchor);
    const mid  = new Date(weekCursor.getTime() + 3 * 86400000);
    viewYear   = mid.getFullYear();
    viewMonth  = mid.getMonth();
  }
  ['month','week','list'].forEach(n => {
    const el = document.getElementById('view-' + n);
    if (el) el.style.display = (n === v) ? 'block' : 'none';
  });
  document.querySelectorAll('.view-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === v);
  });
  render();
}

function navigate(delta) {
  if (curView === 'week') {
    // Sposta il cursore settimana di 7 giorni
    weekCursor.setDate(weekCursor.getDate() + delta * 7);
    // Sincronizza viewYear/viewMonth sul giorno centrale della settimana
    const mid = new Date(weekCursor.getTime() + 3 * 86400000);
    viewYear  = mid.getFullYear();
    viewMonth = mid.getMonth();
  } else {
    viewMonth += delta;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    if (viewMonth < 0)  { viewMonth = 11; viewYear--; }
  }
  render();
}

function goToday() {
  viewYear   = TODAY.getFullYear();
  viewMonth  = TODAY.getMonth();
  weekCursor = weekStartOf(new Date());
  render();
}

async function render() {
  await fetchEvents();
  updateKpi();
  if      (curView === 'month') renderMonth();
  else if (curView === 'week')  renderWeek();
  else                          renderList();
}

/* ─── KPI (aggiorna le card in testa) ───────────────────────── */
function updateKpi() {
  const mese = events.filter(e => {
    const d = parseDate(e.dataOraInizio);
    return d && d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });

  // Totale eventi mese
  const elTot = document.getElementById('kpi-eventi-mese');
  if (elTot) elTot.textContent = mese.length;

  // Partite e allenamenti
  const partite    = mese.filter(e => e.tipo === 'PARTITA').length;
  const allenamenti = mese.filter(e => e.tipo === 'ALLENAMENTO').length;
  const elSub = document.getElementById('kpi-eventi-sub');
  if (elSub) elSub.textContent = `${partite} partite • ${allenamenti} allenamenti`;

  // Prossimo evento
  const futuri = events
    .filter(e => parseDate(e.dataOraInizio) >= TODAY)
    .sort((a,b) => parseDate(a.dataOraInizio) - parseDate(b.dataOraInizio));

  const elNext    = document.getElementById('kpi-prossimo');
  const elNextSub = document.getElementById('kpi-prossimo-sub');
  if (futuri.length && elNext) {
    const p  = futuri[0];
    const pd = parseDate(p.dataOraInizio);
    elNext.textContent    = `${DAYS_IT[pd.getDay()]} ${pd.getDate()}`;
    if (elNextSub) elNextSub.textContent = `${p.titolo} – ${fmtTime(p.dataOraInizio)}`;
  } else if (elNext) {
    elNext.textContent = '—';
    if (elNextSub) elNextSub.textContent = 'Nessun evento futuro';
  }

  // Prossima partita
  const prossPartita = futuri.find(e => e.tipo === 'PARTITA');
  const elPart    = document.getElementById('kpi-partita');
  const elPartSub = document.getElementById('kpi-partita-sub');
  if (prossPartita && elPart) {
    const pd = parseDate(prossPartita.dataOraInizio);
    elPart.textContent    = `${pd.getDate()} ${MONTHS_SHORT[pd.getMonth()]}`;
    if (elPartSub) elPartSub.textContent = prossPartita.titolo;
  } else if (elPart) {
    elPart.textContent = '—';
    if (elPartSub) elPartSub.textContent = 'Nessuna partita';
  }
}

/* ─── VISTA MESE ─────────────────────────────────────────────── */
function eventsForDay(y, m, d) {
  return events
    .filter(e => {
      const s = parseDate(e.dataOraInizio);
      return s && s.getFullYear()===y && s.getMonth()===m && s.getDate()===d;
    })
    .sort((a,b) => parseDate(a.dataOraInizio) - parseDate(b.dataOraInizio));
}

function renderMonth() {
  const titleEl = document.getElementById('cal-month-title');
  if (titleEl) titleEl.textContent = `${MONTHS_IT[viewMonth]} ${viewYear}`;

  const grid = document.getElementById('cal-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const first  = new Date(viewYear, viewMonth, 1);
  let sdow     = first.getDay() - 1; if (sdow < 0) sdow = 6;
  const dim    = new Date(viewYear, viewMonth + 1, 0).getDate();
  const dprev  = new Date(viewYear, viewMonth, 0).getDate();
  const total  = Math.ceil((sdow + dim) / 7) * 7;

  for (let i = 0; i < total; i++) {
    let day, mo = viewMonth, yr = viewYear, other = false;
    if (i < sdow) {
      day = dprev - sdow + i + 1; mo = viewMonth - 1;
      if (mo < 0)  { mo = 11; yr--; }
      other = true;
    } else if (i >= sdow + dim) {
      day = i - sdow - dim + 1; mo = viewMonth + 1;
      if (mo > 11) { mo = 0; yr++; }
      other = true;
    } else {
      day = i - sdow + 1;
    }

    const isToday   = !other && yr===TODAY.getFullYear() && mo===TODAY.getMonth() && day===TODAY.getDate();
    const isWeekend = (i % 7) >= 5;
    const dayEvs    = eventsForDay(yr, mo, day);

    const cell = document.createElement('div');
    cell.className = ['cal-cell',
      other    && 'other-month',
      isToday  && 'today',
      isWeekend && 'weekend',
    ].filter(Boolean).join(' ');

    if (!other) cell.addEventListener('click', () => openAddModalOnDay(yr, mo, day));

    let html = `<div class="day-num">${day}</div>`;
    const MAX = 3;
    dayEvs.slice(0, MAX).forEach(e => {
      const t = tipoMeta(e.tipo);
      html += `<div class="event-chip ev-chip-${e.tipo}"
        onclick="event.stopPropagation();openDetail(${e.id})"
        title="${esc(e.titolo)}">${t.icon} ${esc(e.titolo)}</div>`;
    });
    if (dayEvs.length > MAX)
      html += `<div class="more-chip" onclick="event.stopPropagation()">+${dayEvs.length - MAX} altri</div>`;

    cell.innerHTML = html;
    grid.appendChild(cell);
  }
}

/* ─── VISTA SETTIMANA ────────────────────────────────────────── */
const HOURS_WEEK = ['07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22'];

/* weekStart è un alias di weekStartOf per compatibilità */
function weekStart(date) { return weekStartOf(date); }

function renderWeek() {
  // weekCursor è sempre il lunedì della settimana da visualizzare
  const ws = new Date(weekCursor);
  const we = new Date(ws.getTime() + 6 * 86400000);

  const titleEl = document.getElementById('cal-month-title');
  if (titleEl) titleEl.textContent =
    `${ws.getDate()} ${MONTHS_SHORT[ws.getMonth()]} – ${we.getDate()} ${MONTHS_SHORT[we.getMonth()]} ${ws.getFullYear()}`;

  const hdr = document.getElementById('week-header');
  if (!hdr) return;
  hdr.innerHTML = '<div class="week-time-head"></div>';
  for (let i = 0; i < 7; i++) {
    const d       = new Date(ws.getTime() + i * 86400000);
    const isToday = d.toDateString() === TODAY.toDateString();
    hdr.innerHTML += `<div class="week-day-head${isToday?' today-col':''}">
      <div class="wdh-dow">${DAYS_IT[d.getDay()]}</div>
      <div class="wdh-num">${d.getDate()}</div>
    </div>`;
  }

  const body = document.getElementById('week-body');
  if (!body) return;
  body.querySelectorAll('.day-col-week').forEach(c => c.remove());

  const tc = document.getElementById('week-time-col');
  if (tc) {
    tc.innerHTML = '';
    HOURS_WEEK.forEach(h => {
      const el = document.createElement('div');
      el.className = 'hour-label';
      el.textContent = h + ':00';
      tc.appendChild(el);
    });
  }

  for (let i = 0; i < 7; i++) {
    const d   = new Date(ws.getTime() + i * 86400000);
    const col = document.createElement('div');
    col.className = 'day-col-week';
    HOURS_WEEK.forEach(() => {
      const hl = document.createElement('div');
      hl.className = 'hour-line-week';
      col.appendChild(hl);
    });
    col.addEventListener('click', () => openAddModalOnDay(d.getFullYear(), d.getMonth(), d.getDate()));

    eventsForDay(d.getFullYear(), d.getMonth(), d.getDate()).forEach(e => {
      const s = parseDate(e.dataOraInizio);
      const f = parseDate(e.dataOraFine);
      if (!s || !f) return;
      const startH = s.getHours() + s.getMinutes() / 60;
      const endH   = f.getHours() + f.getMinutes() / 60;
      const topPx  = Math.max(0, (startH - 7) * 54);
      const htPx   = Math.max(22, (endH - startH) * 54 - 2);
      const t      = tipoMeta(e.tipo);
      const chip   = document.createElement('div');
      chip.className = 'week-ev-chip';
      chip.style.cssText = `top:${topPx}px;height:${htPx}px;background:${t.bg};border-left:3px solid ${t.stripe}`;
      chip.innerHTML = `${t.icon} ${esc(e.titolo)}<br><span style="font-size:.62rem;opacity:.7">${fmtTime(e.dataOraInizio)}–${fmtTime(e.dataOraFine)}</span>`;
      chip.addEventListener('click', ev => { ev.stopPropagation(); openDetail(e.id); });
      col.appendChild(chip);
    });
    body.appendChild(col);
  }
}

/* ─── VISTA LISTA ────────────────────────────────────────────── */
function renderList() {
  const titleEl = document.getElementById('cal-month-title');
  if (titleEl) titleEl.textContent = `${MONTHS_IT[viewMonth]} ${viewYear}`;

  const container = document.getElementById('list-container');
  if (!container) return;

  const monthEvs = events
    .filter(e => {
      const d = parseDate(e.dataOraInizio);
      return d && d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    })
    .sort((a,b) => parseDate(a.dataOraInizio) - parseDate(b.dataOraInizio));

  if (!monthEvs.length) {
    container.innerHTML = `<div class="empty-state">
      <div style="font-size:2.5rem;margin-bottom:.75rem;opacity:.3">📅</div>
      <p>Nessun evento in <strong>${MONTHS_IT[viewMonth]}</strong>.<br/>
      Usa <strong>+ Nuovo Evento</strong> per aggiungerne uno.</p>
    </div>`;
    return;
  }

  container.innerHTML = '';
  let lastWeek = -1;
  monthEvs.forEach(e => {
    const d  = parseDate(e.dataOraInizio);
    const wk = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
    if (wk !== lastWeek) {
      lastWeek = wk;
      const sep = document.createElement('div');
      sep.className   = 'list-week-sep';
      sep.textContent = `Settimana ${wk} – ${MONTHS_IT[viewMonth]}`;
      container.appendChild(sep);
    }
    const t   = tipoMeta(e.tipo);
    const row = document.createElement('div');
    row.className = 'list-event-row';
    row.innerHTML = `
      <div class="list-date-box">
        <div class="list-day">${d.getDate()}</div>
        <div class="list-mon">${MONTHS_SHORT[d.getMonth()]}</div>
      </div>
      <div class="list-stripe" style="background:${t.stripe}"></div>
      <div class="list-info">
        <div class="list-title">${t.icon} ${esc(e.titolo)}</div>
        <div class="list-meta">
          <span>🕐 ${fmtTime(e.dataOraInizio)} – ${fmtTime(e.dataOraFine)}</span>
          ${e.luogo ? `<span>📍 ${esc(e.luogo)}</span>` : ''}
        </div>
      </div>
      <span class="pill ${t.pillClass}">${t.label}</span>
      <div class="list-actions" onclick="event.stopPropagation()">
        <button class="btn-ghost btn-sm-cal" onclick="openEditModal(${e.id})">✏️</button>
        <button class="btn-ghost btn-sm-cal" onclick="confirmDelete(${e.id})" style="color:#f87171">🗑</button>
      </div>`;
    row.addEventListener('click', () => openDetail(e.id));
    container.appendChild(row);
  });
}

/* ─── MODAL DETTAGLIO ────────────────────────────────────────── */
function openDetail(id) {
  const e = events.find(x => x.id === id);
  if (!e) return;
  detailId = id;
  const t  = tipoMeta(e.tipo);

  const body = document.getElementById('detail-modal-body');
  if (body) {
    body.innerHTML = `
      <div style="height:4px;border-radius:2px;background:${t.stripe};margin-bottom:1rem"></div>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem">
        <div>
          <span class="pill ${t.pillClass}" style="margin-bottom:.6rem;display:inline-block">${t.icon} ${t.label}</span>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.9rem;font-weight:800;text-transform:uppercase;line-height:1.15">${esc(e.titolo)}</div>
        </div>
        <button class="btn-modal-close" onclick="closeModal('modalDettaglio')">✕</button>
      </div>
      <div class="detail-info-grid">
        <div><div class="detail-lbl">Inizio</div><div class="detail-val">📅 ${fmtDateShort(e.dataOraInizio)} alle ${fmtTime(e.dataOraInizio)}</div></div>
        <div><div class="detail-lbl">Fine</div><div class="detail-val">⏱ ${fmtDateShort(e.dataOraFine)} alle ${fmtTime(e.dataOraFine)}</div></div>
        ${e.luogo ? `<div style="grid-column:1/-1"><div class="detail-lbl">Luogo</div><div class="detail-val">📍 ${esc(e.luogo)}</div></div>` : ''}
      </div>`;
  }
  openModal('modalDettaglio');
}

function editFromDetail()   { closeModal('modalDettaglio'); openEditModal(detailId); }
function deleteFromDetail() { closeModal('modalDettaglio'); confirmDelete(detailId); }

/* ─── MODAL FORM (crea/modifica) ─────────────────────────────── */
function resetForm() {
  ['fm-ev-id','fm-ev-titolo','fm-ev-luogo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const tipo = document.getElementById('fm-ev-tipo');
  if (tipo) tipo.value = 'ALLENAMENTO';
  const inizio = document.getElementById('fm-ev-inizio');
  const fine   = document.getElementById('fm-ev-fine');
  if (inizio) inizio.value = '';
  if (fine)   fine.value   = '';

  const errEl = document.getElementById('fm-form-err');
  if (errEl) errEl.style.display = 'none';

  const btnDel = document.getElementById('fm-btn-delete');
  if (btnDel) btnDel.style.display = 'none';

  const btnSave = document.getElementById('fm-btn-save');
  if (btnSave) { btnSave.disabled = false; btnSave.textContent = 'Salva Evento'; }

  const titleEl = document.getElementById('fm-modal-title');
  if (titleEl) titleEl.textContent = 'Nuovo Evento';
}

// Apri modal per nuovo evento (da topbar)
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'flex'; el.classList.add('open'); }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'none'; el.classList.remove('open'); }
  // Se stiamo chiudendo il form, reset
  if (id === 'modalNuovoEvento') resetForm();
}

// Apri modal da topbar "Nuovo Evento"
function openNuovoEventoModal() {
  resetForm();
  // Default: domani 09:00–11:00
  const d = new Date(TODAY);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const ini = document.getElementById('fm-ev-inizio');
  const fin = document.getElementById('fm-ev-fine');
  if (ini) ini.value = toInputVal(d);
  if (fin) fin.value = toInputVal(new Date(d.getTime() + 7200000));
  openModal('modalNuovoEvento');
}

// Cliccando su un giorno del calendario
function openAddModalOnDay(y, m, d) {
  resetForm();
  const dt  = new Date(y, m, d, 9, 0);
  const ini = document.getElementById('fm-ev-inizio');
  const fin = document.getElementById('fm-ev-fine');
  if (ini) ini.value = toInputVal(dt);
  if (fin) fin.value = toInputVal(new Date(dt.getTime() + 7200000));
  openModal('modalNuovoEvento');
}

function openEditModal(id) {
  const e = events.find(x => x.id === id);
  if (!e) return;
  resetForm();

  const titleEl = document.getElementById('fm-modal-title');
  if (titleEl) titleEl.textContent = 'Modifica Evento';

  const btnSave = document.getElementById('fm-btn-save');
  if (btnSave) btnSave.textContent = 'Aggiorna';

  const btnDel = document.getElementById('fm-btn-delete');
  if (btnDel) btnDel.style.display = 'inline-block';

  const fields = {
    'fm-ev-id':     e.id,
    'fm-ev-titolo': e.titolo || '',
    'fm-ev-luogo':  e.luogo  || '',
  };
  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  });

  const tipo = document.getElementById('fm-ev-tipo');
  if (tipo) tipo.value = e.tipo || 'ALLENAMENTO';

  const ini = document.getElementById('fm-ev-inizio');
  const fin = document.getElementById('fm-ev-fine');
  if (ini) ini.value = toInputStr(e.dataOraInizio);
  if (fin) fin.value = toInputStr(e.dataOraFine);

  openModal('modalNuovoEvento');
}

/* Salva (crea o aggiorna) */
async function salvaEvento() {
  const errEl  = document.getElementById('fm-form-err');
  if (errEl) errEl.style.display = 'none';

  const titolo = (document.getElementById('fm-ev-titolo')?.value || '').trim();
  const tipo_  = document.getElementById('fm-ev-tipo')?.value || 'ALLENAMENTO';
  const inizio = document.getElementById('fm-ev-inizio')?.value || '';
  const fine   = document.getElementById('fm-ev-fine')?.value   || '';
  const luogo  = (document.getElementById('fm-ev-luogo')?.value || '').trim();
  const editId = document.getElementById('fm-ev-id')?.value || '';

  // Validazione
  if (!titolo) { showFormErr('Il titolo è obbligatorio.'); return; }
  if (!inizio) { showFormErr('Inserisci data e ora di inizio.'); return; }
  if (!fine)   { showFormErr('Inserisci data e ora di fine.'); return; }
  if (new Date(inizio) >= new Date(fine)) { showFormErr('La fine deve essere dopo l\'inizio.'); return; }

  /*
   * Payload → CreaEventoRequest del backend:
   *   titolo        : String
   *   tipo          : ENUM (ALLENAMENTO|PARTITA|RIUNIONE|ALTRO)
   *   dataOraInizio : LocalDateTime "2025-05-29T09:00:00"
   *   dataOraFine   : LocalDateTime "2025-05-29T11:00:00"
   *   luogo         : String nullable
   *   calendarioId  : Integer (FK → calendario.id_calendar)
   */
  const payload = {
    titolo,
    tipo:          tipo_,
    dataOraInizio: toBackendDT(inizio),
    dataOraFine:   toBackendDT(fine),
    luogo:         luogo || null,
    calendarioId:  calendarioId(),
  };

  const btnSave = document.getElementById('fm-btn-save');
  if (btnSave) { btnSave.disabled = true; btnSave.textContent = editId ? 'Aggiornamento…' : 'Salvataggio…'; }

  try {
    if (editId) {
      const upd = await apiUpdate(+editId, payload);
      if (upd) {
        const idx = events.findIndex(e => e.id === +editId);
        if (idx > -1) events[idx] = upd;
      }
      toast('Evento aggiornato nel database!');
    } else {
      const created = await apiCreate(payload);
      if (created) events.push(created);
      toast('Evento salvato nel database!');
    }
    closeModal('modalNuovoEvento');
    updateKpi();
    if      (curView === 'month') renderMonth();
    else if (curView === 'week')  renderWeek();
    else                          renderList();
  } catch(e) {
    showFormErr('Errore server: ' + e.message);
    if (btnSave) { btnSave.disabled = false; btnSave.textContent = editId ? 'Aggiorna' : 'Salva Evento'; }
  }
}

function showFormErr(msg) {
  const el = document.getElementById('fm-form-err');
  if (!el) return;
  el.textContent = '⚠️ ' + msg;
  el.style.display = 'block';
}

/* Elimina dal form (pulsante rosso "Elimina") */
async function eliminaDalForm() {
  const id = +(document.getElementById('fm-ev-id')?.value || 0);
  if (!id) return;
  closeModal('modalNuovoEvento');
  await confirmDelete(id);
}

async function confirmDelete(id) {
  if (!confirm('Eliminare questo evento dal database?\nL\'operazione non può essere annullata.')) return;
  try {
    await apiDelete(id);
    events = events.filter(e => e.id !== id);
    toast('Evento eliminato.');
    updateKpi();
    if      (curView === 'month') renderMonth();
    else if (curView === 'week')  renderWeek();
    else                          renderList();
  } catch(e) {
    toast('Errore eliminazione: ' + e.message, 'err');
  }
}

/* ─── TASTIERA ───────────────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') ['modalNuovoEvento','modalDettaglio'].forEach(id => closeModal(id));
  if ((e.ctrlKey||e.metaKey) && e.key==='Enter') {
    if (document.getElementById('modalNuovoEvento')?.classList.contains('open')) salvaEvento();
  }
});

/* ─── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Verifica autenticazione
  if (!getToken()) {
    window.location.href = '/html/login.html';
    return;
  }

  // Popola sidebar con nome/ruolo dal localStorage (salvati da login.js)
  const sbName = document.getElementById('sb-nome');
  const sbRole = document.getElementById('sb-ruolo');
  const sbAv   = document.getElementById('sb-avatar');
  const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Utente';
  const cognome = localStorage.getItem('cognomeReale') || '';
  const ruolo   = localStorage.getItem('ruolo')        || '';
  if (sbName) sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
  if (sbRole) sbRole.textContent = ruolo;
  if (sbAv)   sbAv.textContent   = (nome[0]||('')).toUpperCase() + (cognome[0]||nome[1]||'').toUpperCase();

  // Nasconde "Nuovo Evento" ai ruoli in sola lettura
  if (ruolo === 'GIOCATORE' || ruolo === 'DIRIGENZA') {
    const btn = document.getElementById('btn-nuovo-evento');
    if (btn) btn.style.display = 'none';
  }

  // Carica il calendario
  render();
});