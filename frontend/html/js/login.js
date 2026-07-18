document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const usernameInput = document.getElementById('username').value;
            const passwordInput = document.getElementById('password').value;
            const alertBox = document.getElementById('alert-box');

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
                
                // ── SALVATAGGIO DATI (Modificato per catturare nome e cognome reali dal DB) ──
                localStorage.setItem('token', data.token);
                localStorage.setItem('ruolo', data.ruolo);
                localStorage.setItem('username', data.username);
                
                // Prendiamo 'nome' e 'cognome' generati dalla mappa di AuthController
                localStorage.setItem('nomeReale', data.nome || data.username);
                localStorage.setItem('cognomeReale', data.cognome || '');
                
                const idSquadraSalvato = data.idSquadra || (data.squadra && data.squadra.id) || '1';
                localStorage.setItem('idSquadra', idSquadraSalvato);
                
                if (data.idGiocatore) localStorage.setItem('idGiocatore', data.idGiocatore);
                if (data.idAllenatore) localStorage.setItem('idAllenatore', data.idAllenatore);

                // Reindirizzamento automatico
                reindirizzaUtente(data.ruolo);

            } catch (error) {
                if (alertBox) {
                    alertBox.textContent = error.message;
                    alertBox.style.display = 'block';
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

function demoLogin(user, pass) {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    if (usernameInput && passwordInput) {
        usernameInput.value = user;
        passwordInput.value = pass;
        document.getElementById('login-form').requestSubmit();
    }
}

function reindirizzaUtente(ruolo) {
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