function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function saveEvento() {
  closeModal('modal-evento');
  alert('Evento salvato! (In produzione verrà inviato al backend)');
}

function sendMsg() {
  const dest = document.getElementById('msg-dest').value;
  const text = document.getElementById('msg-text').value.trim();
  if (!dest || !text) { alert('Seleziona un destinatario e scrivi un messaggio.'); return; }
  alert('Messaggio inviato a: ' + dest);
  document.getElementById('msg-text').value = '';
}

function openSection(sec) {
  console.log('Apertura sezione:', sec);
}

// ─── CARICAMENTO AUTOMATICO DEI DATI REALI DAL DB ───
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const ruoloReal = localStorage.getItem('ruolo');
    
    const nameElement = document.getElementById('user-name');
    const roleElement = document.getElementById('user-role');
    const avatarElement = document.getElementById('user-avatar');

    // 1. Formattiamo subito il testo del Ruolo (es. ALLENATORE -> Allenatore)
    if (roleElement && ruoloReal) {
        roleElement.textContent = ruoloReal.charAt(0).toUpperCase() + ruoloReal.slice(1).toLowerCase();
    }

    // Se manca il token di sessione rimandiamo al login
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    try {
        // 2. Chiamata al backend per ottenere l'anagrafica
        const response = await fetch('http://localhost:8080/api/utenti/me/allenatore', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const allenatore = await response.json(); 
            console.log("Dati ricevuti dal backend:", allenatore); // Controllo in console browser
            
            // 3. Mostriamo Nome e Cognome reali dell'allenatore
            if (nameElement && allenatore.nome && allenatore.cognome) {
                nameElement.textContent = `${allenatore.nome} ${allenatore.cognome}`;
                
                if (avatarElement) {
                    const iniziali = (allenatore.nome.charAt(0) + allenatore.cognome.charAt(0)).toUpperCase();
                    avatarElement.textContent = iniziali;
                }
            } else {
                // Se l'oggetto arriva ma i campi nome/cognome sono nulli o assenti
                usaFallbackUsername(nameElement, avatarElement);
            }
        } else {
            console.warn("L'endpoint /api/allenatori/me ha risposto con un errore. Uso il fallback.");
            usaFallbackUsername(nameElement, avatarElement);
        }
    } catch (error) {
        console.error("Errore di rete durante il caricamento del profilo allenatore:", error);
        usaFallbackUsername(nameElement, avatarElement);
    }
});

// Funzione di supporto in caso il DB non trovi l'allenatore
function usaFallbackUsername(nameElement, avatarElement) {
    const usernameReal = localStorage.getItem('username');
    if (nameElement && usernameReal) {
        nameElement.textContent = usernameReal;
        if (avatarElement) avatarElement.textContent = usernameReal.substring(0, 2).toUpperCase();
    }
}