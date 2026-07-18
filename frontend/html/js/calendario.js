/* ═══════════════════════════════════════════
   CONFIGURAZIONE
   ─────────────────────────────────────────
   API_BASE     → URL del backend Spring Boot
   CALENDARIO_ID → id_calendar nel DB (ogni squadra ha il suo; 
                   in alternativa si può ricavarlo dal JWT)
═══════════════════════════════════════════ */
const API_BASE      = 'http://localhost:8080';
const CALENDARIO_ID = 1;

/* ═══════════════════════════════════════════
   COSTANTI UI
═══════════════════════════════════════════ */
const MONTHS_IT = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                   'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DAYS_IT   = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const HOURS_WEEK = ['07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22'];

/* Mappa ENUM backend → stile */
const TIPO = {
  ALLENAMENTO: { label:'Allenamento', icon:'⚽', cls:'ev-ALLENAMENTO', stripe:'var(--green-l)', pill:'pill-green',  bg:'rgba(58,125,68,.25)'  },
  PARTITA:     { label:'Partita',     icon:'🏟', cls:'ev-PARTITA',     stripe:'var(--blue)',    pill:'pill-blue',   bg:'rgba(59,130,246,.22)' },
  RIUNIONE:    { label:'Riunione',    icon:'📋', cls:'ev-RIUNIONE',    stripe:'var(--amber)',   pill:'pill-amber',  bg:'rgba(234,179,8,.18)'  },
  ALTRO:       { label:'Altro',       icon:'🎯', cls:'ev-ALTRO',       stripe:'var(--purple)',  pill:'pill-purple', bg:'rgba(139,92,246,.18)' },
};
const tipoOf = t => TIPO[t] || TIPO.ALTRO;

/* ═══════════════════════════════════════════
   STATO APPLICAZIONE
═══════════════════════════════════════════ */
const TODAY = new Date();
let viewYear   = TODAY.getFullYear();
let viewMonth  = TODAY.getMonth();     // 0-based
let curView    = 'month';
let events     = [];                   // cache locale
let detailId   = null;                 // id evento nel modal dettaglio

/* ═══════════════════════════════════════════
   AUTH
═══════════════════════════════════════════ */
const getToken = () => localStorage.getItem('fm_token');

function authHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) h['Authorization'] = 'Bearer ' + t;
  return h;
}

function logout() {
  localStorage.removeItem('fm_token');
  window.location.href = '../login.html';
}

function initUserInfo() {
  const token = getToken();
  if (!token) return;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const name = (payload.sub || payload.username || 'Utente').replace('.', ' ');
    const role = payload.role || payload.ruolo || '';
    document.getElementById('sb-name').textContent     = name;
    document.getElementById('sb-role').textContent     = role;
    document.getElementById('sb-initials').textContent = name.split(' ').map(w => w[0]?.toUpperCase()||'').join('');
  } catch(_) {}
}

/* ═══════════════════════════════════════════
   API — unico punto di accesso al backend
═══════════════════════════════════════════ */
async function apiFetch(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) },
  });
  if (res.status === 401) { logout(); return null; }
  if (res.status === 204 || res.headers.get('content-length') === '0') return null;
  if (!res.ok) {
    let msg = `Errore HTTP ${res.status}`;
    try { const b = await res.json(); msg = b.message || b.error || msg; } catch(_) {}
    throw new Error(msg);
  }
  return res.json();
}

/* Carica TUTTI gli eventi del calendario dal backend */
async function fetchEvents() {
  showLoader(true);
  try {
    const data = await apiFetch(`/api/eventi/calendario/${CALENDARIO_ID}`);
    events = Array.isArray(data) ? data : [];
  } catch(e) {
    toast('Errore caricamento eventi: ' + e.message, 'err');
    events = [];
  } finally {
    showLoader(false);
  }
}

async function apiCreate(payload) {
  return apiFetch('/api/eventi', { method:'POST', body: JSON.stringify(payload) });
}
async function apiUpdate(id, payload) {
  return apiFetch(`/api/eventi/${id}`, { method:'PUT', body: JSON.stringify(payload) });
}
async function apiDelete(id) {
  return apiFetch(`/api/eventi/${id}`, { method:'DELETE' });
}

/* ═══════════════════════════════════════════
   LOADER
═══════════════════════════════════════════ */
function showLoader(on) {
  const ids = { month:'month-loader', week:'week-loader', list:'list-loader' };
  const el = document.getElementById(ids[curView]);
  if (el) el.classList.toggle('show', on);
}

/* ═══════════════════════════════════════════
   UTILS DATE
═══════════════════════════════════════════ */
/* Converte stringa ISO dal backend → Date */
const parseDate = s => s ? new Date(s) : null;

/* "2025-05-29T09:00:00" → "09:00" */
const fmtTime = s => {
  const d = parseDate(s);
  return d ? d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}) : '';
};

/* "2025-05-29T09:00:00" → "29 Mag" */
const fmtDateShort = s => {
  const d = parseDate(s);
  return d ? `${d.getDate()} ${MONTHS_IT[d.getMonth()].slice(0,3)}` : '';
};

/* Date → "2025-05-29T09:00" (per input[datetime-local]) */
function toLocalISO(d) {
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* "2025-05-29T09:00:00" → "2025-05-29T09:00" (formato input) */
const toInputValue = s => s ? s.slice(0,16) : '';

/* "2025-05-29T09:00" → "2025-05-29T09:00:00" (formato backend LocalDateTime) */
const toBackendDT = s => s ? s + ':00' : null;

/* Filtra eventi per giorno */
function eventsForDay(y, m, d) {
  return events
    .filter(e => { const s = parseDate(e.dataOraInizio); return s && s.getFullYear()===y && s.getMonth()===m && s.getDate()===d; })
    .sort((a,b) => parseDate(a.dataOraInizio) - parseDate(b.dataOraInizio));
}

/* Lunedì della settimana che contiene 'date' */
function weekStart(date) {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0,0,0,0);
  return d;
}

/* ═══════════════════════════════════════════
   NAVIGAZIONE
═══════════════════════════════════════════ */
function setView(v, btn) {
  curView = v;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['month','week','list'].forEach(n => {
    document.getElementById('view-' + n).style.display = n === v ? 'block' : 'none';
  });
  render();
}

function navigate(delta) {
  if (curView === 'week') {
    const ws = weekStart(new Date(viewYear, viewMonth, 14));
    ws.setDate(ws.getDate() + delta * 7);
    viewYear  = ws.getFullYear();
    viewMonth = ws.getMonth();
  } else {
    viewMonth += delta;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    if (viewMonth < 0)  { viewMonth = 11; viewYear--; }
  }
  render();
}

function goToday() {
  viewYear  = TODAY.getFullYear();
  viewMonth = TODAY.getMonth();
  render();
}

/* Render generale: ricarica dal backend poi disegna */
async function render() {
  await fetchEvents();
  if (curView === 'month') renderMonth();
  else if (curView === 'week') renderWeek();
  else renderList();
}

/* ═══════════════════════════════════════════
   VISTA MESE
═══════════════════════════════════════════ */
function renderMonth() {
  document.getElementById('nav-title').textContent = `${MONTHS_IT[viewMonth]} ${viewYear}`;
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  const first = new Date(viewYear, viewMonth, 1);
  let sdow = first.getDay() - 1; if (sdow < 0) sdow = 6;
  const dim  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const dprev = new Date(viewYear, viewMonth, 0).getDate();
  const total = Math.ceil((sdow + dim) / 7) * 7;

  for (let i = 0; i < total; i++) {
    let day, mo = viewMonth, yr = viewYear, other = false;
    if (i < sdow) {
      day = dprev - sdow + i + 1; mo = viewMonth - 1;
      if (mo < 0) { mo = 11; yr--; } other = true;
    } else if (i >= sdow + dim) {
      day = i - sdow - dim + 1; mo = viewMonth + 1;
      if (mo > 11) { mo = 0; yr++; } other = true;
    } else {
      day = i - sdow + 1;
    }

    const isToday   = !other && yr===TODAY.getFullYear() && mo===TODAY.getMonth() && day===TODAY.getDate();
    const isWeekend = (i % 7) >= 5;
    const dayEvs    = eventsForDay(yr, mo, day);

    const cell = document.createElement('div');
    cell.className = ['cal-cell', other&&'other-month', isToday&&'today', isWeekend&&'weekend'].filter(Boolean).join(' ');
    if (!other) cell.addEventListener('click', () => openAddModalOnDay(yr, mo, day));

    let html = `<div class="day-num">${day}</div>`;
    const MAX = 3;
    dayEvs.slice(0, MAX).forEach(e => {
      const t = tipoOf(e.tipo);
      html += `<div class="event-chip ${t.cls}" onclick="event.stopPropagation();openDetail(${e.id})" title="${e.titolo}">${t.icon} ${e.titolo}</div>`;
    });
    if (dayEvs.length > MAX) html += `<div class="more-chip" onclick="event.stopPropagation()">+${dayEvs.length - MAX} altri</div>`;
    cell.innerHTML = html;
    grid.appendChild(cell);
  }
}

/* ═══════════════════════════════════════════
   VISTA SETTIMANA
═══════════════════════════════════════════ */
function renderWeek() {
  const ws = weekStart(new Date(viewYear, viewMonth, 14));
  const we = new Date(ws.getTime() + 6 * 86400000);
  document.getElementById('nav-title').textContent =
    `${ws.getDate()} ${MONTHS_IT[ws.getMonth()].slice(0,3)} – ${we.getDate()} ${MONTHS_IT[we.getMonth()].slice(0,3)} ${ws.getFullYear()}`;

  /* Header giorni */
  const hdr = document.getElementById('week-header');
  hdr.innerHTML = '<div class="week-time-head"></div>';
  for (let i = 0; i < 7; i++) {
    const d = new Date(ws.getTime() + i * 86400000);
    const isToday = d.toDateString() === TODAY.toDateString();
    hdr.innerHTML += `<div class="week-day-head${isToday?' today-col':''}">
      <div class="dow">${DAYS_IT[d.getDay()]}</div>
      <div class="num">${d.getDate()}</div>
    </div>`;
  }

  /* Corpo */
  const body = document.getElementById('week-body');
  // Colonna ore
  const tc = document.getElementById('time-col');
  tc.innerHTML = '';
  HOURS_WEEK.forEach(h => {
    const el = document.createElement('div');
    el.className = 'hour-label';
    el.textContent = h + ':00';
    tc.appendChild(el);
  });
  // Rimuovi vecchie colonne
  body.querySelectorAll('.day-col-week').forEach(c => c.remove());

  for (let i = 0; i < 7; i++) {
    const d = new Date(ws.getTime() + i * 86400000);
    const col = document.createElement('div');
    col.className = 'day-col-week';
    // Righe ore (sfondo)
    HOURS_WEEK.forEach(() => {
      const hl = document.createElement('div');
      hl.className = 'hour-line-week';
      col.appendChild(hl);
    });
    // Click su cella settimana → nuovo evento quel giorno
    col.addEventListener('click', () => openAddModalOnDay(d.getFullYear(), d.getMonth(), d.getDate()));

    // Posiziona eventi
    eventsForDay(d.getFullYear(), d.getMonth(), d.getDate()).forEach(e => {
      const s = parseDate(e.dataOraInizio);
      const f = parseDate(e.dataOraFine);
      if (!s || !f) return;
      const startH = s.getHours() + s.getMinutes() / 60;
      const endH   = f.getHours() + f.getMinutes() / 60;
      const topPx  = Math.max(0, (startH - 7) * 54);
      const htPx   = Math.max(22, (endH - startH) * 54 - 2);
      const t = tipoOf(e.tipo);
      const chip = document.createElement('div');
      chip.className = `week-event ${t.cls}`;
      chip.style.cssText = `top:${topPx}px;height:${htPx}px;background:${t.bg};border-left:3px solid ${t.stripe}`;
      chip.innerHTML = `${t.icon} ${e.titolo}<br><span style="font-size:.62rem;opacity:.7">${fmtTime(e.dataOraInizio)}–${fmtTime(e.dataOraFine)}</span>`;
      chip.addEventListener('click', ev => { ev.stopPropagation(); openDetail(e.id); });
      col.appendChild(chip);
    });
    body.appendChild(col);
  }
}

/* ═══════════════════════════════════════════
   VISTA LISTA
═══════════════════════════════════════════ */
function renderList() {
  document.getElementById('nav-title').textContent = `${MONTHS_IT[viewMonth]} ${viewYear}`;
  const container = document.getElementById('list-container');

  const monthEvs = events
    .filter(e => {
      const d = parseDate(e.dataOraInizio);
      return d && d.getFullYear() === viewYear && d.getMonth() === viewMonth;
    })
    .sort((a,b) => parseDate(a.dataOraInizio) - parseDate(b.dataOraInizio));

  if (!monthEvs.length) {
    container.innerHTML = `<div class="empty-state"><div class="ico">📅</div><p>Nessun evento in <strong>${MONTHS_IT[viewMonth]}</strong>.<br/>Clicca <strong>+ Nuovo Evento</strong> per aggiungerne uno.</p></div>`;
    return;
  }

  container.innerHTML = '';
  let lastWeek = -1;
  monthEvs.forEach(e => {
    const d = parseDate(e.dataOraInizio);
    const wk = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
    if (wk !== lastWeek) {
      lastWeek = wk;
      const sep = document.createElement('div');
      sep.className = 'list-month-sep';
      sep.textContent = `Settimana ${wk} – ${MONTHS_IT[viewMonth]} ${viewYear}`;
      container.appendChild(sep);
    }

    const t    = tipoOf(e.tipo);
    const row  = document.createElement('div');
    row.className = 'list-event-row';
    row.innerHTML = `
      <div class="list-date-box">
        <div class="day">${d.getDate()}</div>
        <div class="mon">${MONTHS_IT[d.getMonth()].slice(0,3)}</div>
      </div>
      <div class="list-stripe" style="background:${t.stripe}"></div>
      <div class="list-info">
        <div class="list-title">${t.icon} ${e.titolo}</div>
        <div class="list-meta">
          <span>🕐 ${fmtTime(e.dataOraInizio)} – ${fmtTime(e.dataOraFine)}</span>
          ${e.luogo ? `<span>📍 ${e.luogo}</span>` : ''}
        </div>
      </div>
      <span class="pill ${t.pill}" style="flex-shrink:0">${t.label}</span>
      <div class="list-actions" onclick="event.stopPropagation()">
        <button class="btn-sm" onclick="openEditModal(${e.id})">✏️</button>
        <button class="btn-sm danger" onclick="confirmDelete(${e.id})">🗑</button>
      </div>`;
    row.addEventListener('click', () => openDetail(e.id));
    container.appendChild(row);
  });
}

/* ═══════════════════════════════════════════
   MODAL DETTAGLIO
═══════════════════════════════════════════ */
function openDetail(id) {
  const e = events.find(x => x.id === id);
  if (!e) return;
  detailId = id;
  const t = tipoOf(e.tipo);
  document.getElementById('detail-body').innerHTML = `
    <div class="detail-stripe" style="background:${t.stripe}"></div>
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem">
      <div>
        <span class="pill ${t.pill}" style="margin-bottom:.6rem;display:inline-block">${t.icon} ${t.label}</span>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.8rem;font-weight:800;text-transform:uppercase;line-height:1.15">${e.titolo}</div>
      </div>
      <button class="modal-close" onclick="closeModal('modal-detail')">✕</button>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><div class="lbl">Inizio</div><div class="val">📅 ${fmtDateShort(e.dataOraInizio)} alle ${fmtTime(e.dataOraInizio)}</div></div>
      <div class="detail-item"><div class="lbl">Fine</div><div class="val">⏱ ${fmtDateShort(e.dataOraFine)} alle ${fmtTime(e.dataOraFine)}</div></div>
      ${e.luogo ? `<div class="detail-item" style="grid-column:1/-1"><div class="lbl">Luogo</div><div class="val">📍 ${e.luogo}</div></div>` : ''}
      <div class="detail-item"><div class="lbl">ID</div><div class="val" style="color:var(--muted)">#${e.id}</div></div>
    </div>`;
  openModal('modal-detail');
}

function editFromDetail()   { closeModal('modal-detail'); openEditModal(detailId); }
function deleteFromDetail() { closeModal('modal-detail'); confirmDelete(detailId); }

/* ═══════════════════════════════════════════
   MODAL FORM — aggiungi / modifica
═══════════════════════════════════════════ */
function resetForm() {
  ['ev-titolo','ev-luogo'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('ev-id').value        = '';
  document.getElementById('ev-tipo').value      = 'ALLENAMENTO';
  document.getElementById('ev-inizio').value    = '';
  document.getElementById('ev-fine').value      = '';
  document.getElementById('form-err').classList.remove('show');
  document.getElementById('btn-delete').style.display = 'none';
  document.getElementById('btn-save').disabled        = false;
  document.getElementById('btn-save-text').textContent = 'Salva Evento';
  document.getElementById('form-title').textContent    = 'Nuovo Evento';
}

function openAddModal() {
  resetForm();
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9,0,0,0);
  document.getElementById('ev-inizio').value = toLocalISO(d);
  document.getElementById('ev-fine').value   = toLocalISO(new Date(d.getTime() + 7200000));
  openModal('modal-form');
}

function openAddModalOnDay(y, m, d) {
  resetForm();
  const dt = new Date(y, m, d, 9, 0);
  document.getElementById('ev-inizio').value = toLocalISO(dt);
  document.getElementById('ev-fine').value   = toLocalISO(new Date(dt.getTime() + 7200000));
  openModal('modal-form');
}

function openEditModal(id) {
  const e = events.find(x => x.id === id);
  if (!e) return;
  resetForm();
  document.getElementById('form-title').textContent    = 'Modifica Evento';
  document.getElementById('btn-save-text').textContent = 'Aggiorna';
  document.getElementById('btn-delete').style.display  = 'inline-flex';
  document.getElementById('ev-id').value               = id;
  document.getElementById('ev-titolo').value           = e.titolo      || '';
  document.getElementById('ev-tipo').value             = e.tipo        || 'ALTRO';
  document.getElementById('ev-inizio').value           = toInputValue(e.dataOraInizio);
  document.getElementById('ev-fine').value             = toInputValue(e.dataOraFine);
  document.getElementById('ev-luogo').value            = e.luogo       || '';
  openModal('modal-form');
}

async function saveEvento() {
  const errEl = document.getElementById('form-err');
  errEl.classList.remove('show');

  const titolo = document.getElementById('ev-titolo').value.trim();
  const tipo   = document.getElementById('ev-tipo').value;
  const inizio = document.getElementById('ev-inizio').value;
  const fine   = document.getElementById('ev-fine').value;
  const luogo  = document.getElementById('ev-luogo').value.trim();
  const editId = document.getElementById('ev-id').value;

  /* Validazione */
  if (!titolo)                        { showErr('Il titolo è obbligatorio.'); return; }
  if (!inizio)                        { showErr('Inserisci la data di inizio.'); return; }
  if (!fine)                          { showErr('Inserisci la data di fine.'); return; }
  if (new Date(inizio) >= new Date(fine)) { showErr('La fine deve essere successiva all\'inizio.'); return; }

  /*
   * Il backend accetta LocalDateTime serializzato come:
   *   "2025-05-29T09:00:00"
   * Il valore dall'input datetime-local è "2025-05-29T09:00"
   * quindi aggiungiamo ":00".
   */
  const payload = {
    titolo,
    tipo,
    dataOraInizio: toBackendDT(inizio),
    dataOraFine:   toBackendDT(fine),
    luogo:         luogo || null,
    calendarioId:  CALENDARIO_ID,
  };

  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  document.getElementById('btn-save-text').textContent = editId ? 'Aggiornamento…' : 'Salvataggio…';

  try {
    if (editId) {
      const upd = await apiUpdate(+editId, payload);
      if (upd) {
        const idx = events.findIndex(e => e.id === +editId);
        if (idx > -1) events[idx] = upd; else events.push(upd);
      }
      toast('Evento aggiornato!');
    } else {
      const created = await apiCreate(payload);
      if (created) events.push(created);
      toast('Evento creato!');
    }
    closeModal('modal-form');
    /* Ri-renderizza senza fare un'altra chiamata API (la cache è aggiornata) */
    if (curView === 'month')     renderMonth();
    else if (curView === 'week') renderWeek();
    else                         renderList();
  } catch(e) {
    showErr('Errore dal server: ' + e.message);
    btn.disabled = false;
    document.getElementById('btn-save-text').textContent = editId ? 'Aggiorna' : 'Salva Evento';
  }
}

function showErr(msg) {
  const el = document.getElementById('form-err');
  el.textContent = msg;
  el.classList.add('show');
}

/* Elimina dall'interno del modal form */
async function deleteEvento() {
  const id = +document.getElementById('ev-id').value;
  if (!id) return;
  closeModal('modal-form');
  await confirmDelete(id);
}

/* Chiede conferma e chiama l'API DELETE */
async function confirmDelete(id) {
  if (!confirm('Eliminare questo evento? L\'azione non può essere annullata.')) return;
  try {
    await apiDelete(id);
    events = events.filter(e => e.id !== id);
    toast('Evento eliminato.');
    if (curView === 'month')     renderMonth();
    else if (curView === 'week') renderWeek();
    else                         renderList();
  } catch(e) {
    toast('Errore eliminazione: ' + e.message, 'err');
  }
}

/* ═══════════════════════════════════════════
   MODAL UTILS
═══════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
let _toastTimer = null;
function toast(msg, type = 'ok') {
  const el   = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  document.getElementById('toast-text').textContent = msg;
  icon.textContent = type === 'err' ? '⚠️' : '✅';
  el.classList.toggle('err-toast', type === 'err');
  el.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

/* ═══════════════════════════════════════════
   SCORCIATOIE TASTIERA
═══════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
  /* Ctrl/Cmd + Enter → salva evento se il modal è aperto */
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (document.getElementById('modal-form').classList.contains('open')) saveEvento();
  }
});

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
(async () => {
  initUserInfo();
  await render();
})();