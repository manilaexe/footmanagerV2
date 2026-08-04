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
// GESTIONE QUIZ (pannello STAFF/IT) — CRUD reale su /api/quiz/admin
// ==========================================
// Cache locale dell'ultima lista caricata: evita di rifare una GET solo per
// precompilare il modal quando si clicca "Modifica" su una riga già visibile.
let quizAdminCache = [];

document.addEventListener('DOMContentLoaded', () => {
    if (typeof verificaAutenticazione === 'function') verificaAutenticazione();
    caricaDomandeQuiz();
});

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