document.addEventListener('DOMContentLoaded', () => {
    // 1. Usiamo l'ID corretto dell'HTML: 'login-form'
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;
            // 2. Usiamo l'ID corretto del tuo box di errore: 'alert-box'
            const alertBox = document.getElementById('alert-box');

            // Nascondiamo l'alert a ogni nuovo tentativo di invio
            if (alertBox) {
                alertBox.style.display = 'none';
            }

            try {
                const response = await fetch('http://localhost:8080/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: usernameInput,
                        password: passwordInput
                    })
                });

                if (!response.ok) {
                    throw new Error('Credenziali non valide o errore del server');
                }

                const data = await response.json();
                
                // Salviamo il token JWT e le info dell'utente/ruolo
                localStorage.setItem('token', data.token);
                localStorage.setItem('ruolo', data.ruolo);
                localStorage.setItem('username', data.username);
                
                // Gestione idSquadra dinamico con fallback a '1' (Juventus) se non presente nella risposta
                const idSquadraSalvato = data.idSquadra || (data.squadra && data.squadra.id) || '1';
                localStorage.setItem('idSquadra', idSquadraSalvato);
                
                if (data.idGiocatore) localStorage.setItem('idGiocatore', data.idGiocatore);
                if (data.idAllenatore) localStorage.setItem('idAllenatore', data.idAllenatore);

                // Reindirizzamento in base al Ruolo
                reindirizzaUtente(data.ruolo);

            } catch (error) {
                if (alertBox) {
                    alertBox.textContent = error.message;
                    alertBox.style.display = 'block'; // Mostra il box rosso
                }
                console.error('Errore durante il login:', error);
            }
        });
    }

    // --- GESTIONE MOSTRA/NASCONDI PASSWORD ---
    const togglePwBtn = document.getElementById('toggle-pw');
    const passwordInput = document.getElementById('password');
    if (togglePwBtn && passwordInput) {
        togglePwBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePwBtn.textContent = type === 'password' ? '👁' : '🙈';
        });
    }
});

// Funzione di supporto per l'accesso rapido demo (se serve ancora nel tuo frontend)
function demoLogin(user, pass) {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (usernameInput && passwordInput) {
        usernameInput.value = user;
        passwordInput.value = pass;
        // Simula il submit del form
        document.getElementById('login-form').requestSubmit();
    }
}

function reindirizzaUtente(ruolo) {
    // Modifichiamo i percorsi per farli puntare a dove hai messo i tuoi file HTML
    switch (ruolo) {
        case 'ALLENATORE':
            window.location.href = '/html/pages/dashboard-allenatore.html';
            break;
        case 'GIOCATORE':
            window.location.href = '/html/pages/dashboard-giocatore.html';
            break;
        case 'STAFF':
            window.location.href = '/html/pages/dashboard-staff.html';
            break;
        case 'DIRIGENZA':
            window.location.href = '/html/pages/dashboard-dirigenza.html';
            break;
        default:
            window.location.href = '/html/pages/dashboardfull.html';
            break;
    }
}