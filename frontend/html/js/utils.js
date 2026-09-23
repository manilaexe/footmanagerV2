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

// Rimuove i dati di sessione e rimanda l'utente al login[cite: 36]
function logout() {
    localStorage.clear();
    window.location.href = '/html/login.html';
}

// Renderizza l'avatar in un contenitore circolare[cite: 36]
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

// Corregge il link "Dashboard" della sidebar in base al ruolo[cite: 36]
function impostaLinkDashboard() {
    const link = document.getElementById('nav-dashboard');
    if (!link) return;

    const ruolo = localStorage.getItem('ruolo');
    switch (ruolo ? ruolo.toUpperCase() : '') {
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
            link.href='/html/pages/dashboard-dirigenza.html';
            break;
        case 'PRESIDENTE':
            link.href = '/html/pages/dashboard-dirigenza.html';
            break;
        default:
            link.href = '/html/pages/dashboardfull.html';
            break;
    }
}

// Adatta le voci della sidebar in base al ruolo in modo centralizzato[cite: 36]
function adattaSidebarPerRuolo() {
    const ruolo = localStorage.getItem('ruolo');
    const nav = document.querySelector('.sidebar .nav-section');
    if (!nav || !ruolo) return;

    const ruoloMaiuscolo = ruolo.toUpperCase();
    const currentPage = window.location.pathname.toLowerCase();

// 1. VISTA DIRIGENZA / PRESIDENTE
    if (ruoloMaiuscolo === 'DIRIGENZA' || ruoloMaiuscolo === 'PRESIDENTE') {
        nav.innerHTML = `
            <div class="nav-label">Panoramica</div>
            <a class="nav-item ${currentPage.includes('dashboard-dirigenza.html') ? 'active' : ''}" id="nav-dashboard" href="/html/pages/dashboard-dirigenza.html"><span class="ico">🏠</span>Dashboard</a>
            <a class="nav-item ${currentPage.includes('rosa.html') ? 'active' : ''}" href="/html/rosa.html"><span class="ico">👥</span>Rosa</a>
            <a class="nav-item ${currentPage.includes('calendario.html') ? 'active' : ''}" href="/html/calendario.html"><span class="ico">📅</span>Calendario</a>
            <a class="nav-item ${currentPage.includes('statistiche.html') ? 'active' : ''}" href="/html/statistiche.html"><span class="ico">📊</span>Statistiche</a>
            <a class="nav-item ${currentPage.includes('classifica.html') ? 'active' : ''}" href="/html/classifica.html"><span class="ico">🏆</span>Classifica</a>
            <a class="nav-item ${currentPage.includes('dirigenza-performance.html') ? 'active' : ''}" href="/html/dirigenza-performance.html"><span class="ico">⚽</span>Performance squadra</a>
        `;
        return; 
    }

    const testiPresenti = [...nav.querySelectorAll('a')].map(a => a.textContent);

    // 2. GESTIONE "ROSA": I giocatori non devono vederla[cite: 36]
    const linkRosa = nav.querySelector('a[href$="rosa.html"]');
    if (ruoloMaiuscolo === 'GIOCATORE' && linkRosa) {
        linkRosa.remove();
    }

    // 3. GESTIONE "I MIEI BADGE": Visibile SOLO ai GIOCATORI[cite: 36]
    const linkBadge = nav.querySelector('a[href$="badge.html"]');
    if (ruoloMaiuscolo === 'GIOCATORE') {
        if (!testiPresenti.some(t => t.includes('I miei badge'))) {
            nav.insertAdjacentHTML('beforeend',
                `<a class="nav-item ${currentPage.includes('badge.html') ? 'active' : ''}" href="/html/badge.html"><span class="ico">🎖️</span>I miei badge</a>`);
        }
    } else {
        // Se non è un giocatore, rimuovi la voce badge se presente per errore
        if (linkBadge) linkBadge.remove();
    }

    // 4. GESTIONE "CLASSIFICA": Visibile a tutti[cite: 36]
    if (!testiPresenti.some(t => t.includes('Classifica'))) {
        nav.insertAdjacentHTML('beforeend',
            `<a class="nav-item ${currentPage.includes('classifica.html') ? 'active' : ''}" href="/html/classifica.html"><span class="ico">🏆</span>Classifica</a>`);
    }

    // 5. GESTIONE "PERFORMANCE SQUADRA": Visibile SOLO a Allenatore e Staff (e Dirigenza gestita sopra)[cite: 36]
    const linkPerformance = nav.querySelector('a[href$="dirigenza-performance.html"]');
    if (ruoloMaiuscolo === 'ALLENATORE' || ruoloMaiuscolo === 'STAFF') {
        if (!testiPresenti.some(t => t.includes('Performance'))) {
            nav.insertAdjacentHTML('beforeend',
                `<a class="nav-item ${currentPage.includes('performance') ? 'active' : ''}" href="/html/dirigenza-performance.html"><span class="ico">⚽</span>Performance squadra</a>`);
        }
    } else if (ruoloMaiuscolo === 'GIOCATORE') {
        // I giocatori non devono vedere le performance
        if (linkPerformance) linkPerformance.remove();
    }
}

// Funzione per attivare la modalità sola lettura per la dirigenza[cite: 36]
function impostaVistaDirigenza(ruoloUtente) {
    if (!ruoloUtente) return;
    const ruoloMaiuscolo = ruoloUtente.toUpperCase();

    if (ruoloMaiuscolo === 'DIRIGENZA' || ruoloMaiuscolo === 'PRESIDENTE') { 
        document.body.classList.add('view-dirigenza');
        const campiModulo = document.querySelectorAll('input, select, textarea');
        campiModulo.forEach(campo => {
            campo.disabled = true;
            campo.style.opacity = "0.7";
            campo.style.cursor = "not-allowed";
        });
    }
}

// Esecuzione automatica al caricamento della pagina[cite: 36]
document.addEventListener('DOMContentLoaded', () => {
    impostaLinkDashboard();
    adattaSidebarPerRuolo();
    
    const ruoloAttuale = localStorage.getItem('ruolo'); 
    impostaVistaDirigenza(ruoloAttuale);
});