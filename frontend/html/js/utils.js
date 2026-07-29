// Recupera il token salvato nel browser e crea l'header di autorizzazione per Spring Boot
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Verifica se l'utente ha fatto il login. Se non c'è il token, lo rimanda alla pagina di login
function verificaAutenticazione() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../login.html'; // Regola il percorso se la pagina di login si trova altrove
    }
}

// Rimuove i dati di sessione e rimanda l'utente al login
function logout() {
    localStorage.clear();
    window.location.href = '../login.html';
}

// Corregge il link "Dashboard" della sidebar in base al ruolo salvato al login,
// così da pagine come calendario/rosa/statistiche/messaggi si torna sempre alla
// dashboard giusta (giocatore, allenatore, staff, dirigenza) e non sempre a quella allenatore.
function impostaLinkDashboard() {
    const link = document.getElementById('nav-dashboard');
    if (!link) return; // pagina senza voce "Dashboard" in sidebar

    const ruolo = localStorage.getItem('ruolo');
    switch (ruolo) {
        case 'ALLENATORE':
            link.href = '/html/pages/dashboard-allenatore.html';
            break;
        case 'GIOCATORE':
            link.href = '/html/pages/dashboard-giocatore.html';
            break;
        case 'STAFF':
            link.href = '/html/pages/dashboard-staff.html';
            break;
        case 'DIRIGENZA':
            link.href = '/html/pages/dashboard-dirigenza.html';
            break;
        default:
            link.href = '/html/pages/dashboardfull.html';
            break;
    }
}

// Esegue la correzione automaticamente appena la pagina è pronta
document.addEventListener('DOMContentLoaded', impostaLinkDashboard);