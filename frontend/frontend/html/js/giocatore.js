// Assicurati che all'inizio del file venga controllata l'autenticazione
document.addEventListener('DOMContentLoaded', () => {
    verificaAutenticazione();
    // Qui puoi caricare eventuali dati iniziali della dashboard giocatore, se necessario.
});

// ── QUIZ TIMER ──
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
        const idGiocatore = localStorage.getItem('idGiocatore'); // Recuperato durante il login
        
        const response = await fetch('http://localhost:8080/api/quiz/risposta', {
            method: 'POST',
            headers: getAuthHeaders(), // Utilizza il token JWT da utils.js
            body: JSON.stringify({
                idGiocatore: idGiocatore,
                esito: correct, // true o false
                tempoImpiegato: 40 - secondsLeft // Calcola il tempo di risposta
            })
        });

        if (response.ok) {
            console.log('Risposta salvata con successo sul Database.');
            // Se la risposta è corretta, potresti voler aggiornare i punti visibili a schermo
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

// Funzione di utilità locale per incrementare i punti mostrati nella UI senza ricaricare la pagina
function aggiornaPuntiSchermo(puntiInPiu) {
    const puntiTotEl = document.getElementById('punti-totali'); // Assicurati di avere questo ID nell'HTML
    if (puntiTotEl) {
        const puntiAttuali = parseInt(puntiTotEl.textContent) || 0;
        puntiTotEl.textContent = puntiAttuali + puntiInPiu;
    }
}

// ── MESSAGGI: segna come letto ──
async function openMsg(el, idMessaggio) {
    el.classList.remove('unread');
    const dot = el.querySelector('.unread-dot');
    if (dot) dot.remove();

    // ── NOTIFICA IL BACKEND DEL CAMBIO STATO ──
    try {
        const response = await fetch(`http://localhost:8080/api/messaggi/${idMessaggio}/letto`, {
            method: 'PATCH',
            headers: getAuthHeaders() // Passa il Token di sicurezza
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