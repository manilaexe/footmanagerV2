const API = 'http://localhost:8080';

function authHeaders() {
    return typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') };
}

function switchTab(name) {
document.querySelectorAll('.tab').forEach((t,i) => {
    const names = ['utenti','squadre','quiz','badge'];
    t.classList.toggle('active', names[i] === name);
});
document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'tab-' + name);
});
}
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ==========================================
// INIZIALIZZAZIONE PAGINA
// ==========================================
let cacheUtenti  = [];
let cacheSquadre = [];
let cacheBadge   = [];

document.addEventListener('DOMContentLoaded', () => {
    if (typeof verificaAutenticazione === 'function') verificaAutenticazione();
    popolaSidebarStaff();
    caricaKpi();
    caricaDomandeQuiz();     // già presente più sotto in questo file
    caricaUtenti();
    caricaSquadre();
    caricaBadgeDisponibili();
});

function popolaSidebarStaff() {
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

// ── KPI in alto: GET /api/dashboard/it (già esistente, riepilogo del club) ─
async function caricaKpi() {
    try {
        const res = await fetch(`${API}/api/dashboard/it`, { headers: authHeaders() });
        if (!res.ok) return;
        const d = await res.json();
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('kpi-giocatori', d.numeroGiocatori);
        set('kpi-allenatori', d.numeroAllenatori);
        set('kpi-utenti', d.numeroUtenti);
        set('kpi-quiz', d.numeroQuiz);
        set('kpi-badge', d.numeroBadge);
    } catch (err) {
        console.error('Errore caricamento KPI:', err);
    }
}

function escapeHtmlStaff(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ==========================================
// TAB UTENTI — GET/POST/DELETE /api/utenti
// ==========================================
const RUOLO_PILL = {
    ALLENATORE: 'pill-blue', GIOCATORE: 'pill-amber', STAFF: 'pill-gray',
    DIRIGENZA: 'pill-gray', IT: 'pill-red'
};

async function caricaUtenti() {
    const tbody = document.getElementById('utenti-tbody');
    try {
        const res = await fetch(`${API}/api/utenti`, { headers: authHeaders() });
        if (res.status === 401 || res.status === 403) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--muted);">Non hai i permessi per vedere gli utenti.</td></tr>`;
            return;
        }
        if (!res.ok) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--muted);">Errore nel caricamento (${res.status}).</td></tr>`;
            return;
        }
        cacheUtenti = await res.json();
        renderizzaTabellaUtenti();
    } catch (err) {
        console.error('Errore caricamento utenti:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--muted);">Impossibile contattare il server.</td></tr>`;
    }
}

function renderizzaTabellaUtenti() {
    const tbody = document.getElementById('utenti-tbody');
    if (!tbody) return;

    const query = (document.getElementById('utenti-search')?.value || '').trim().toLowerCase();
    const lista = query
        ? cacheUtenti.filter(u => (u.username || '').toLowerCase().includes(query) || (u.ruolo || '').toLowerCase().includes(query))
        : cacheUtenti;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--muted);">Nessun utente trovato.</td></tr>`;
        return;
    }

    tbody.innerHTML = lista.map(u => `
        <tr>
            <td>${escapeHtmlStaff(u.username)}</td>
            <td><span class="pill ${RUOLO_PILL[u.ruolo] || 'pill-gray'}">${escapeHtmlStaff(u.ruolo)}</span></td>
            <td><div class="actions">
                <button class="btn-sm" onclick="apriModalModificaUtente(${u.id})">✏️ Modifica</button>
                <button class="btn-sm danger" onclick="eliminaUtente(${u.id})">🗑 Elimina</button>
            </div></td>
        </tr>`).join('');
}

function aggiornaVisibilitaSquadraUtente() {
    const ruolo = document.getElementById('utente-ruolo')?.value;
    const group = document.getElementById('utente-squadra-group');
    if (group) group.style.display = (ruolo === 'GIOCATORE' || ruolo === 'ALLENATORE') ? '' : 'none';
}

function apriModalNuovoUtente() {
    document.getElementById('modal-utente-titolo').textContent = 'Crea Nuovo Utente';
    document.getElementById('utente-id-editing').value = '';
    document.getElementById('utente-username').value = '';
    document.getElementById('utente-username').disabled = false;
    document.getElementById('utente-password').value = '';
    document.getElementById('utente-password-label').textContent = 'Password temporanea';
    document.getElementById('utente-nome').value = '';
    document.getElementById('utente-nome').disabled = false;
    document.getElementById('utente-cognome').value = '';
    document.getElementById('utente-cognome').disabled = false;
    document.getElementById('utente-ruolo').value = 'GIOCATORE';
    document.getElementById('utente-ruolo').disabled = false;
    popolaSelectSquadraUtente();
    aggiornaVisibilitaSquadraUtente();
    openModal('modal-utente');
}

function apriModalModificaUtente(id) {
    const u = cacheUtenti.find(x => x.id === id);
    if (!u) return;

    // Il backend permette di modificare solo username/password su un utente
    // esistente (cambiare ruolo/nome/squadra romperebbe i collegamenti già
    // fatti a giocatore/allenatore) — quindi qui blocchiamo quei campi.
    document.getElementById('modal-utente-titolo').textContent = `Modifica ${u.username}`;
    document.getElementById('utente-id-editing').value = u.id;
    document.getElementById('utente-username').value = u.username;
    document.getElementById('utente-username').disabled = false;
    document.getElementById('utente-password').value = '';
    document.getElementById('utente-password-label').textContent = 'Nuova password (lascia vuoto per non cambiarla)';
    document.getElementById('utente-nome').value = '';
    document.getElementById('utente-nome').disabled = true;
    document.getElementById('utente-cognome').value = '';
    document.getElementById('utente-cognome').disabled = true;
    document.getElementById('utente-ruolo').value = u.ruolo;
    document.getElementById('utente-ruolo').disabled = true;
    aggiornaVisibilitaSquadraUtente();
    openModal('modal-utente');
}

function popolaSelectSquadraUtente() {
    const sel = document.getElementById('utente-squadra');
    if (!sel) return;
    sel.innerHTML = cacheSquadre.map(s => `<option value="${s.id}">${escapeHtmlStaff(s.nome)}</option>`).join('');
}

async function salvaUtente() {
    const idEditing = document.getElementById('utente-id-editing').value;
    const isModifica = !!idEditing;

    const payload = {
        username: document.getElementById('utente-username').value.trim(),
        password: document.getElementById('utente-password').value,
        nomeRuolo: document.getElementById('utente-ruolo').value,
        nome: document.getElementById('utente-nome').value.trim(),
        cognome: document.getElementById('utente-cognome').value.trim(),
        squadraId: document.getElementById('utente-squadra').value ? parseInt(document.getElementById('utente-squadra').value, 10) : null
    };

    if (!payload.username) { alert('Lo username è obbligatorio.'); return; }
    if (!isModifica && !payload.password) { alert('La password è obbligatoria per un nuovo utente.'); return; }
    if (!isModifica && (payload.nomeRuolo === 'GIOCATORE' || payload.nomeRuolo === 'ALLENATORE') && !payload.squadraId) {
        alert('Seleziona una squadra per questo ruolo.');
        return;
    }

    const url = isModifica ? `${API}/api/utenti/${idEditing}` : `${API}/api/utenti`;
    const method = isModifica ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
        if (res.ok) {
            closeModal('modal-utente');
            await caricaUtenti();
            await caricaKpi();
            alert(isModifica ? '✔ Utente modificato.' : '✔ Utente creato.');
        } else {
            alert(`Errore salvataggio (${res.status}): ${await res.text()}`);
        }
    } catch (err) {
        console.error('Errore rete salvataggio utente:', err);
        alert('Impossibile raggiungere il server.');
    }
}

async function eliminaUtente(id) {
    const u = cacheUtenti.find(x => x.id === id);
    if (!confirm(`Eliminare definitivamente l'utente "${u ? u.username : id}"? L'eventuale profilo giocatore/allenatore collegato verrà eliminato a cascata.`)) return;

    try {
        const res = await fetch(`${API}/api/utenti/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (res.ok || res.status === 204) {
            await caricaUtenti();
            await caricaKpi();
        } else {
            alert(`Errore eliminazione (${res.status}): ${await res.text()}`);
        }
    } catch (err) {
        console.error('Errore rete eliminazione utente:', err);
        alert('Impossibile raggiungere il server.');
    }
}

// ==========================================
// TAB SQUADRE — GET/POST/PUT/DELETE /api/squadre
// ==========================================
async function caricaSquadre() {
    const tbody = document.getElementById('squadre-tbody');
    try {
        const res = await fetch(`${API}/api/squadre`, { headers: authHeaders() });
        if (!res.ok) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);">Errore nel caricamento (${res.status}).</td></tr>`;
            return;
        }
        cacheSquadre = await res.json();
        renderizzaTabellaSquadre();
        popolaSelectSquadraUtente();
    } catch (err) {
        console.error('Errore caricamento squadre:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);">Impossibile contattare il server.</td></tr>`;
    }
}

function renderizzaTabellaSquadre() {
    const tbody = document.getElementById('squadre-tbody');
    if (!tbody) return;

    if (cacheSquadre.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);">Nessuna squadra nel database.</td></tr>`;
        return;
    }

    tbody.innerHTML = cacheSquadre.map(s => `
        <tr>
            <td>${escapeHtmlStaff(s.nome)}</td>
            <td>${escapeHtmlStaff(s.categoria || '—')}</td>
            <td>${s.numeroGiocatori ?? 0}</td>
            <td><div class="actions">
                <button class="btn-sm" onclick="apriModalModificaSquadra(${s.id})">✏️</button>
                <button class="btn-sm danger" onclick="eliminaSquadra(${s.id})">🗑</button>
            </div></td>
        </tr>`).join('');
}

function apriModalNuovaSquadra() {
    document.getElementById('modal-squadra-titolo').textContent = 'Nuova Squadra';
    document.getElementById('squadra-id-editing').value = '';
    document.getElementById('squadra-nome').value = '';
    document.getElementById('squadra-categoria').value = '';
    openModal('modal-squadra');
}

function apriModalModificaSquadra(id) {
    const s = cacheSquadre.find(x => x.id === id);
    if (!s) return;
    document.getElementById('modal-squadra-titolo').textContent = 'Modifica Squadra';
    document.getElementById('squadra-id-editing').value = s.id;
    document.getElementById('squadra-nome').value = s.nome || '';
    document.getElementById('squadra-categoria').value = s.categoria || '';
    openModal('modal-squadra');
}

async function salvaSquadra() {
    const idEditing = document.getElementById('squadra-id-editing').value;
    const nome = document.getElementById('squadra-nome').value.trim();
    const categoria = document.getElementById('squadra-categoria').value.trim();

    if (!nome) { alert('Il nome della squadra è obbligatorio.'); return; }

    const isModifica = !!idEditing;
    const url = isModifica ? `${API}/api/squadre/${idEditing}` : `${API}/api/squadre`;
    const method = isModifica ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify({ nome, categoria }) });
        if (res.ok) {
            closeModal('modal-squadra');
            await caricaSquadre();
            alert(isModifica ? '✔ Squadra modificata.' : '✔ Squadra creata.');
        } else {
            alert(`Errore salvataggio (${res.status}): ${await res.text()}`);
        }
    } catch (err) {
        console.error('Errore rete salvataggio squadra:', err);
        alert('Impossibile raggiungere il server.');
    }
}

async function eliminaSquadra(id) {
    const s = cacheSquadre.find(x => x.id === id);
    if (!confirm(`Eliminare definitivamente "${s ? s.nome : id}"? Questa azione non è reversibile.`)) return;

    try {
        const res = await fetch(`${API}/api/squadre/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (res.ok || res.status === 204) {
            await caricaSquadre();
        } else {
            alert(`Errore eliminazione (${res.status}): ${await res.text()}`);
        }
    } catch (err) {
        console.error('Errore rete eliminazione squadra:', err);
        alert('Impossibile raggiungere il server.');
    }
}

// ==========================================
// TAB BADGE — GET/POST/PUT/DELETE /api/badge
// ==========================================
async function caricaBadgeDisponibili() {
    const tbody = document.getElementById('badge-tbody');
    try {
        const res = await fetch(`${API}/api/badge`, { headers: authHeaders() });
        if (!res.ok) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--muted);">Errore nel caricamento (${res.status}).</td></tr>`;
            return;
        }
        cacheBadge = await res.json();
        renderizzaTabellaBadge();
    } catch (err) {
        console.error('Errore caricamento badge:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--muted);">Impossibile contattare il server.</td></tr>`;
    }
}

function renderizzaTabellaBadge() {
    const tbody = document.getElementById('badge-tbody');
    if (!tbody) return;

    if (cacheBadge.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--muted);">Nessun badge nel database.</td></tr>`;
        return;
    }

    tbody.innerHTML = cacheBadge.map(b => `
        <tr>
            <td>${escapeHtmlStaff(b.nomeBadge)}</td>
            <td>${b.sogliaPunti ?? 0}</td>
            <td><div class="actions">
                <button class="btn-sm" onclick="apriModalModificaBadge(${b.id})">✏️</button>
                <button class="btn-sm danger" onclick="eliminaBadge(${b.id})">🗑</button>
            </div></td>
        </tr>`).join('');
}

function apriModalNuovoBadge() {
    document.getElementById('modal-badge-titolo').textContent = 'Nuovo Badge';
    document.getElementById('badge-id-editing').value = '';
    document.getElementById('badge-nome').value = '';
    document.getElementById('badge-soglia').value = 100;
    openModal('modal-badge');
}

function apriModalModificaBadge(id) {
    const b = cacheBadge.find(x => x.id === id);
    if (!b) return;
    document.getElementById('modal-badge-titolo').textContent = 'Modifica Badge';
    document.getElementById('badge-id-editing').value = b.id;
    document.getElementById('badge-nome').value = b.nomeBadge || '';
    document.getElementById('badge-soglia').value = b.sogliaPunti ?? 0;
    openModal('modal-badge');
}

async function salvaBadge() {
    const idEditing = document.getElementById('badge-id-editing').value;
    const nomeBadge = document.getElementById('badge-nome').value.trim();
    const sogliaPunti = parseInt(document.getElementById('badge-soglia').value, 10) || 0;

    if (!nomeBadge) { alert('Il nome del badge è obbligatorio.'); return; }

    const isModifica = !!idEditing;
    const url = isModifica ? `${API}/api/badge/${idEditing}` : `${API}/api/badge`;
    const method = isModifica ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify({ nomeBadge, sogliaPunti }) });
        if (res.ok) {
            closeModal('modal-badge');
            await caricaBadgeDisponibili();
            await caricaKpi();
            alert(isModifica ? '✔ Badge modificato.' : '✔ Badge creato.');
        } else {
            alert(`Errore salvataggio (${res.status}): ${await res.text()}`);
        }
    } catch (err) {
        console.error('Errore rete salvataggio badge:', err);
        alert('Impossibile raggiungere il server.');
    }
}

async function eliminaBadge(id) {
    const b = cacheBadge.find(x => x.id === id);
    if (!confirm(`Eliminare definitivamente il badge "${b ? b.nomeBadge : id}"?`)) return;

    try {
        const res = await fetch(`${API}/api/badge/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (res.ok || res.status === 204) {
            await caricaBadgeDisponibili();
            await caricaKpi();
        } else {
            alert(`Errore eliminazione (${res.status}): ${await res.text()}`);
        }
    } catch (err) {
        console.error('Errore rete eliminazione badge:', err);
        alert('Impossibile raggiungere il server.');
    }
}

// ==========================================
// GESTIONE QUIZ (pannello STAFF/IT) — CRUD reale su /api/quiz/admin
// ==========================================
// Cache locale dell'ultima lista caricata: evita di rifare una GET solo per
// precompilare il modal quando si clicca "Modifica" su una riga già visibile.
let quizAdminCache = [];

async function caricaDomandeQuiz() {
    const tbody = document.getElementById('quiz-tbody');
    const headers = typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') };

    try {
        const res = await fetch('http://localhost:8080/api/quiz/admin', { headers });

        if (res.status === 401 || res.status === 403) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);">Non hai i permessi per vedere le domande quiz.</td></tr>`;
            return;
        }
        if (!res.ok) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);">Errore nel caricamento (${res.status}).</td></tr>`;
            return;
        }

        quizAdminCache = await res.json();
        renderizzaTabellaQuiz();

    } catch (err) {
        console.error('Errore di rete caricamento quiz:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);">Impossibile contattare il server.</td></tr>`;
    }
}

function renderizzaTabellaQuiz() {
    const tbody = document.getElementById('quiz-tbody');
    if (!tbody) return;

    if (!quizAdminCache || quizAdminCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);">Nessuna domanda nel database. Creane una con "+ Nuova domanda".</td></tr>`;
        return;
    }

    tbody.innerHTML = quizAdminCache.map(q => {
        const testoCorretto = { A: q.opzioneA, B: q.opzioneB, C: q.opzioneC }[q.rispostaCorretta] || '—';
        return `
            <tr>
                <td>${q.id}</td>
                <td>${escapeHtml(q.domanda)}</td>
                <td>${escapeHtml(testoCorretto)} <small style="color:var(--muted);">(${q.rispostaCorretta})</small></td>
                <td>${q.puntiValore}</td>
                <td><div class="actions">
                    <button class="btn-sm" onclick="apriModalModificaDomanda(${q.id})">✏️</button>
                    <button class="btn-sm danger" onclick="eliminaDomandaQuiz(${q.id})">🗑</button>
                </div></td>
            </tr>`;
    }).join('');
}

// Evita che testo/domande con caratteri speciali rompano l'HTML della tabella
function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function apriModalNuovaDomanda() {
    document.getElementById('modal-quiz-titolo').textContent = 'Nuova Domanda Quiz';
    document.getElementById('quiz-id-editing').value = '';
    document.getElementById('quiz-domanda').value = '';
    document.getElementById('quiz-opzione-a').value = '';
    document.getElementById('quiz-opzione-b').value = '';
    document.getElementById('quiz-opzione-c').value = '';
    document.getElementById('quiz-punti').value = 10;
    const radioA = document.querySelector('input[name="quiz-corretta"][value="A"]');
    if (radioA) radioA.checked = true;
    openModal('modal-quiz');
}

function apriModalModificaDomanda(id) {
    const q = quizAdminCache.find(x => x.id === id);
    if (!q) return;

    document.getElementById('modal-quiz-titolo').textContent = 'Modifica Domanda Quiz';
    document.getElementById('quiz-id-editing').value = q.id;
    document.getElementById('quiz-domanda').value = q.domanda || '';
    document.getElementById('quiz-opzione-a').value = q.opzioneA || '';
    document.getElementById('quiz-opzione-b').value = q.opzioneB || '';
    document.getElementById('quiz-opzione-c').value = q.opzioneC || '';
    document.getElementById('quiz-punti').value = q.puntiValore ?? 10;

    const radio = document.querySelector(`input[name="quiz-corretta"][value="${q.rispostaCorretta}"]`);
    if (radio) radio.checked = true;

    openModal('modal-quiz');
}

async function salvaDomandaQuiz() {
    const idEditing = document.getElementById('quiz-id-editing').value;
    const domanda   = document.getElementById('quiz-domanda').value.trim();
    const opzioneA  = document.getElementById('quiz-opzione-a').value.trim();
    const opzioneB  = document.getElementById('quiz-opzione-b').value.trim();
    const opzioneC  = document.getElementById('quiz-opzione-c').value.trim();
    const punti     = parseInt(document.getElementById('quiz-punti').value, 10) || 0;
    const radioSel  = document.querySelector('input[name="quiz-corretta"]:checked');
    const rispostaCorretta = radioSel ? radioSel.value : 'A';

    if (!domanda || !opzioneA || !opzioneB || !opzioneC) {
        alert('Compila la domanda e tutte e 3 le opzioni prima di salvare.');
        return;
    }

    const payload = { domanda, opzioneA, opzioneB, opzioneC, rispostaCorretta, puntiValore: punti };
    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' };

    const isModifica = !!idEditing;
    const url    = isModifica ? `http://localhost:8080/api/quiz/admin/${idEditing}` : 'http://localhost:8080/api/quiz/admin';
    const method = isModifica ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });

        if (res.ok) {
            closeModal('modal-quiz');
            await caricaDomandeQuiz();
            alert(isModifica ? '✔ Domanda modificata.' : '✔ Domanda creata.');
        } else {
            const testo = await res.text();
            alert(`Errore salvataggio (${res.status}): ${testo}`);
        }
    } catch (err) {
        console.error('Errore di rete salvataggio quiz:', err);
        alert('Impossibile raggiungere il server.');
    }
}

async function eliminaDomandaQuiz(id) {
    if (!confirm('Eliminare definitivamente questa domanda? Se è già stata usata come "quiz del giorno" resterà comunque nello storico delle risposte dei giocatori.')) return;

    const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : { 'Content-Type': 'application/json' };

    try {
        const res = await fetch(`http://localhost:8080/api/quiz/admin/${id}`, { method: 'DELETE', headers });
        if (res.ok || res.status === 204) {
            await caricaDomandeQuiz();
        } else {
            const testo = await res.text();
            alert(`Errore eliminazione (${res.status}): ${testo}`);
        }
    } catch (err) {
        console.error('Errore di rete eliminazione quiz:', err);
        alert('Impossibile raggiungere il server.');
    }
}