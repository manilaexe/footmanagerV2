// ─── 1. INIZIALIZZAZIONE DELLA PAGINA & SIDEBAR ───
document.addEventListener('DOMContentLoaded', () => {
    // 1. Controllo di sicurezza centralizzato (se presente in utils.js)
    if (typeof verificaAutenticazione === 'function') {
        verificaAutenticazione();
    } else {
        // Fallback locale se verificaAutenticazione non è caricata
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '../login.html';
            return;
        }
    }

    // 2. Popolamento e sincronizzazione immediata della Sidebar
    function popolaSidebarGiocatore() {
        const sbName = document.getElementById('sb-nome');
        const sbRole = document.getElementById('sb-ruolo');
        const sbAv   = document.getElementById('sb-avatar');

        const nome        = localStorage.getItem('nomeReale');
        const cognome     = localStorage.getItem('cognomeReale');
        const ruoloReal   = localStorage.getItem('ruolo') || 'Giocatore';
        const usernameReal = localStorage.getItem('username') || 'Utente';

        // Gestione del Ruolo (es. GIOCATORE -> Giocatore)
        if (sbRole && ruoloReal) {
            sbRole.textContent = ruoloReal;
        }

        // Gestione di Nome, Cognome o Fallback su Username
        if (sbName) {
            if (nome) {
                sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
                
                // Generazione Avatar dalle iniziali reali
                if (sbAv) {
                    const inNome = nome.charAt(0);
                    const inCognome = cognome ? cognome.charAt(0) : '';
                    sbAv.textContent = (inNome + inCognome).toUpperCase();
                }
            } else {
                // Fallback pulito se mancano i dati anagrafici reali
                sbName.textContent = usernameReal;
                if (sbAv) {
                    sbAv.textContent = usernameReal.substring(0, 2).toUpperCase();
                }
            }
        }
    }

    // Esegui subito il caricamento della grafica
    popolaSidebarGiocatore();
    // Micro-ritardo di sicurezza per prevenire sfarfallii del DOM asincrono
    setTimeout(popolaSidebarGiocatore, 50);
});

/**
 * Funzione globale di logout collegata al bottone Esci della sidebar
 */
function logout() {
    localStorage.clear();
    window.location.href = '../login.html';
}

// ─── 2. QUIZ TIMER & LOGICA DI GIOCO ───
let secondsLeft = 40;
let selectedOpt = null;
const timerFill = document.getElementById('timer-fill');
const timerVal  = document.getElementById('timer-val');
const btnConfirm = document.getElementById('btn-confirm');
const CORRECT = 'A'; // Demo: la risposta 'A' è quella corretta

const interval = setInterval(() => {
    secondsLeft--;
    if (timerVal) timerVal.textContent = secondsLeft;
    
    if (timerFill) {
        const pct = (secondsLeft / 40) * 100;
        timerFill.style.width = pct + '%';
        if (secondsLeft <= 10) timerFill.classList.add('danger');
    }
    
    if (secondsLeft <= 0) {
        clearInterval(interval);
        endQuiz(false);
    }
}, 1000);

function selectOpt(el, letter) {
    if (btnConfirm.dataset.done) return;
    document.querySelectorAll('.quiz-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    selectedOpt = letter;
    btnConfirm.disabled = false;
}

function confirmAnswer() {
    if (!selectedOpt || btnConfirm.dataset.done) return;
    clearInterval(interval);
    btnConfirm.dataset.done = '1';
    btnConfirm.disabled = true;
    
    const isCorrect = (selectedOpt === CORRECT);
    endQuiz(isCorrect);
}

async function endQuiz(correct) {
    document.querySelectorAll('.quiz-option').forEach(o => {
        const letter = o.querySelector('.option-letter').textContent;
        if (letter === CORRECT) o.classList.add('correct');
        else if (letter === selectedOpt && !correct) o.classList.add('wrong');
    });
    
    if (timerFill) timerFill.style.width = '0%';
    
    btnConfirm.textContent = correct ? '✔ Corretto! +10 pt' : '✘ Risposta errata';
    btnConfirm.style.background = correct ? '#4caf50' : '#ef4444';
    btnConfirm.disabled = false;
    btnConfirm.onclick = null;

    // ── AGGIORNAMENTO SU DB TRAMITE BACKEND ──
    try {
        const idGiocatore = localStorage.getItem('idGiocatore'); 
        
        // Verifica se getAuthHeaders() è definita globalmente in utils.js, altrimenti genera l'header locale
        const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {
            'Authorization': 'Bearer ' + localStorage.getItem('token'),
            'Content-Type': 'application/json'
        };

        const response = await fetch('http://localhost:8080/api/quiz/risposta', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                idGiocatore: idGiocatore,
                esito: correct, 
                tempoImpiegato: 40 - secondsLeft
            })
        });

        if (response.ok) {
            console.log('Risposta salvata con successo sul Database.');
            if (correct) {
                aggiornaPuntiSchermo(10);
            }
        } else {
            console.error('Errore nel salvataggio della risposta del quiz sul server.');
        }
    } catch (error) {
        console.error('Errore di rete durante il salvataggio del quiz:', error);
    }
}

function aggiornaPuntiSchermo(puntiInPiu) {
    const puntiTotEl = document.getElementById('punti-totali'); 
    if (puntiTotEl) {
        const puntiAttuali = parseInt(puntiTotEl.textContent) || 0;
        puntiTotEl.textContent = puntiAttuali + puntiInPiu;
    }
}

// ─── 3. MESSAGGI: SEGNA COME LETTO ───
async function openMsg(el, idMessaggio) {
    el.classList.remove('unread');
    const dot = el.querySelector('.unread-dot');
    if (dot) dot.remove();

    // ── NOTIFICA IL BACKEND DEL CAMBIO STATO ──
    try {
        const headers = typeof getAuthHeaders === 'function' ? getAuthHeaders() : {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        };

        const response = await fetch(`http://localhost:8080/api/messaggi/${idMessaggio}/letto`, {
            method: 'PATCH',
            headers: headers
        });

        if (response.ok) {
            console.log(`Messaggio ${idMessaggio} segnato come letto sul database.`);
        } else {
            console.error('Errore durante l\'aggiornamento dello stato del messaggio.');
        }
    } catch (error) {
        console.error('Errore di rete durante l\'aggiornamento del messaggio:', error);
    }
}