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