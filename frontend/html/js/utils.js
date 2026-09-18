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
        window.location.href = '/html/login.html';
    }
}

// Rimuove i dati di sessione e rimanda l'utente al login
function logout() {
    localStorage.clear();
    window.location.href = '/html/login.html';
}

// Renderizza l'avatar in un contenitore circolare (.avatar / .profile-pic / sb-avatar):
// se l'utente ha una foto profilo salvata al login (solo i giocatori, per ora)
// la mostra, altrimenti mostra le iniziali come prima. Se il file immagine non
// si carica, torna automaticamente alle iniziali.
function renderAvatar(container, iniziali) {
    if (!container) return;
    const img = localStorage.getItem('imgProfilo');

    if (img) {
        container.innerHTML = `<img src="/html/${img}" alt="Foto profilo"
            style="width:100%;height:100%;border-radius:50%;object-fit:cover;"
            onerror="this.parentElement.textContent='${iniziali}'">`;
    } else {
        container.textContent = iniziali;
    }
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

// Adatta le voci della sidebar in base al ruolo, così la sidebar non "salta" più
// da una pagina all'altra: i giocatori non devono vedere "Rosa", ma devono
// ritrovare sempre "I miei badge" e "Classifica" anche quando sono su
// calendario/statistiche/messaggi.
// Adatta le voci della sidebar in base al ruolo, così la sidebar non "salta" più
// da una pagina all'altra. Modificato per uniformare la sidebar della Dirigenza.
function adattaSidebarPerRuolo() {
    const ruolo = localStorage.getItem('ruolo');
    const nav = document.querySelector('.sidebar .nav-section');
    if (!nav || !ruolo) return;

    const ruoloMaiuscolo = ruolo.toUpperCase();
    const currentPage = window.location.pathname.toLowerCase();

    // 1. VISTA DIRIGENZA: Riscrive la sidebar per essere identica in tutte le pagine
    if (ruoloMaiuscolo === 'DIRIGENZA' || ruoloMaiuscolo === 'PRESIDENTE') {
        nav.innerHTML = `
            <div class="nav-label">Panoramica</div>
            <a class="nav-item ${currentPage.includes('dirigenza.html') ? 'active' : ''}" id="nav-dashboard" href="/html/pages/dashboard-dirigenza.html"><span class="ico">🏠</span>Dashboard</a>
            <a class="nav-item ${currentPage.includes('rosa.html') ? 'active' : ''}" href="/html/rosa.html"><span class="ico">👥</span>Rosa</a>
            <a class="nav-item ${currentPage.includes('calendario.html') ? 'active' : ''}" href="/html/calendario.html"><span class="ico">📅</span>Calendario</a>
            <a class="nav-item ${currentPage.includes('statistiche.html') ? 'active' : ''}" href="/html/statistiche.html"><span class="ico">📊</span>Statistiche</a>
            <a class="nav-item ${currentPage.includes('classifica.html') ? 'active' : ''}" href="/html/classifica.html"><span class="ico">🏆</span>Classifica</a>
            <a class="nav-item ${currentPage.includes('performance') ? 'active' : ''}" href="/html/dirigenza-performance.html"><span class="ico">⚽</span>Performance squadra</a>
        `;
        return; // Ferma l'esecuzione della funzione qui per la Dirigenza
    }

    // 2. VISTA GIOCATORE: Mantiene le regole precedenti
    if (ruoloMaiuscolo === 'GIOCATORE') {
        // Nasconde "Rosa": i giocatori non devono poterla vedere
        const linkRosa = nav.querySelector('a[href$="rosa.html"]');
        if (linkRosa) linkRosa.remove();

        const testiPresenti = [...nav.querySelectorAll('a')].map(a => a.textContent);

        if (!testiPresenti.some(t => t.includes('I miei badge'))) {
            nav.insertAdjacentHTML('beforeend',
                `<a class="nav-item" href="/html/badge.html"><span class="ico">🎖️</span> I miei badge</a>`);
        }
        if (!testiPresenti.some(t => t.includes('Classifica'))) {
            nav.insertAdjacentHTML('beforeend',
                `<a class="nav-item" href="/html/classifica.html"><span class="ico">🏆</span> Classifica</a>`);
        }
    }
}

// Esegue entrambe le correzioni automaticamente appena la pagina è pronta
document.addEventListener('DOMContentLoaded', impostaLinkDashboard);
document.addEventListener('DOMContentLoaded', adattaSidebarPerRuolo);

// Aggiunge automaticamente la voce "Classifica" alla sidebar se manca nella pagina corrente
function assicuratiVoceClassifica() {
    const nav = document.querySelector('.sidebar .nav-section');
    if (!nav) return;

    const testiPresenti = [...nav.querySelectorAll('a')].map(a => a.textContent);
    if (!testiPresenti.some(t => t.includes('Classifica'))) {
        nav.insertAdjacentHTML('beforeend',
            `<a class="nav-item" href="/html/classifica.html"><span class="ico">🏆</span>Classifica</a>`);
    }
}

document.addEventListener('DOMContentLoaded', assicuratiVoceClassifica);

// Funzione per attivare la modalità sola lettura per la dirigenza
// Funzione per attivare la modalità sola lettura per la dirigenza
function impostaVistaDirigenza(ruoloUtente) {
    if (!ruoloUtente) return;

    // Convertiamo in maiuscolo per evitare problemi di scrittura (es. 'Dirigenza' vs 'DIRIGENZA')
    const ruoloMaiuscolo = ruoloUtente.toUpperCase();

    if (ruoloMaiuscolo === 'DIRIGENZA' || ruoloMaiuscolo === 'PRESIDENTE') { 
        
        // Aggiunge la classe al body (attiva tutto il CSS giallo e nasconde i bottoni)
        document.body.classList.add('view-dirigenza');
        
        // Cerca tutti i campi di input, select e textarea e li blocca
        const campiModulo = document.querySelectorAll('input, select, textarea');
        campiModulo.forEach(campo => {
            campo.disabled = true;
            campo.style.opacity = "0.7";
            campo.style.cursor = "not-allowed";
        });
    }
}

// Assicurati di chiamare la funzione quando la pagina ha finito di caricare.
document.addEventListener('DOMContentLoaded', () => {
    // Ora legge dinamicamente il VERO ruolo salvato nel browser durante il login
    const ruoloAttuale = localStorage.getItem('ruolo'); 
    
    impostaVistaDirigenza(ruoloAttuale);
});