// Variabile globale per salvare i giocatori scaricati e filtrarli in locale senza rifare chiamate al DB
let tuttiGiocatori = [];
let filtroRuolo = 'tutti';
let filtroStato = 'tutti';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Esegue il controllo sulla validità del login
    verificaAutenticazione();

    // 2. Popola la sidebar con nome/ruolo dal localStorage (Stessa identica logica di calendario.js)
    const sbName = document.getElementById('sb-nome');
    const sbRole = document.getElementById('sb-ruolo');
    const sbAv   = document.getElementById('sb-avatar');
    
    const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Utente';
    const cognome = localStorage.getItem('cognomeReale') || '';
    const ruolo   = localStorage.getItem('ruolo')        || '';
    
    if (sbName) sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
    if (sbRole) sbRole.textContent = ruolo;
    if (sbAv)   sbAv.textContent   = (nome[0]||('')).toUpperCase() + (cognome[0]||nome[1]||'').toUpperCase();

    // Imposta la vista di base (Griglia) all'avvio della pagina
    setView('grid');

    // 3. Scarica la rosa dal backend
    caricaRosa(); 
});

/**
 * Funzione di Logout richiesta dal pulsante "Esci"
 */
function logout() {
    localStorage.clear();
    window.location.href = '/html/login.html';
}

// --- 1. RECUPERO DATI DAL BACKEND ---
async function caricaRosa() {
    try {
        // Recupera l'id della squadra memorizzato nel localStorage durante il login
        const idSquadra = localStorage.getItem('idSquadra'); 

        if (!idSquadra) {
            console.error("Nessun ID squadra trovato nel localStorage. Assicurati di averlo salvato al login.");
            return;
        }

        // Modifica l'endpoint aggiungendo /squadra/{idSquadra}
        const response = await fetch(`http://localhost:8080/api/giocatori/squadra/${idSquadra}`, {
            method: 'GET',
            headers: getAuthHeaders() // Funzione definita in utils.js
        });

        if (response.status === 401 || response.status === 403) {
            logout(); // Se il token è scaduto/non valido, slogga l'utente (utils.js)
            return;
        }

        if (!response.ok) throw new Error('Errore nel caricamento della rosa');

        tuttiGiocatori = await response.json();
        
        // LOG DI CONTROLLO: Così vedi esattamente in console del browser come sono scritti i campi!
        console.log("Giocatori scaricati:", tuttiGiocatori);

        // Aggiorna i contatori del sommario in cima alla pagina
        aggiornaSommario(tuttiGiocatori);

        // Renderizza i giocatori a schermo
        renderizzaGiocatori(tuttiGiocatori);

    } catch (error) {
        console.error('Errore durante il recupero dei giocatori:', error);
    }
}

// --- 2. AGGIORNAMENTO DINAMICO DEL SOMMARIO ---
function aggiornaSommario(giocatori) {
    const tot = giocatori.length;
    const att = giocatori.filter(g => g.posizione?.toLowerCase().includes('att')).length;
    const cen = giocatori.filter(g => g.posizione?.toLowerCase().includes('cen')).length;
    const dif = giocatori.filter(g => g.posizione?.toLowerCase().includes('dif')).length;
    const por = giocatori.filter(g => g.posizione?.toLowerCase().includes('por')).length;

    const summaryCards = document.querySelectorAll('.summary-card .val');
    if (summaryCards.length >= 5) {
        summaryCards[0].textContent = tot;
        summaryCards[1].textContent = att;
        summaryCards[2].textContent = cen;
        summaryCards[3].textContent = dif;
        summaryCards[4].textContent = por;
    }
}

// --- 3. RENDERIZZAZIONE (GRIGLIA & TABELLA) ---
function renderizzaGiocatori(giocatori) {
    const gridView = document.getElementById('view-grid');
    const listBody = document.getElementById('list-body');

    // Svuotiamo i contenitori prima di popolarli
    if (gridView) gridView.innerHTML = '';
    if (listBody) listBody.innerHTML = '';

    giocatori.forEach(g => {
        // Se l'immagine manca nel DB, usiamo un placeholder generico
        const playerImg = g.img ? g.img : '../css/placeholder-player.png'; 

        // Rileviamo dinamicamente l'ID corretto (g.idGiocatore o g.id)
        const idGiocatoreCorrente = g.idGiocatore || g.id;
        const puntiTotali = g.puntiTotali || g.punti_totali || 0;
        const puntiSettimanali = g.puntiSettimanali || g.punti_settimanali || 0;

        // 3a. Generazione HTML per la Griglia (Grid View)
        if (gridView) {
            const card = document.createElement('div');
            card.className = `player-card ${g.stato === 'injured' ? 'injured' : ''}`;
            card.innerHTML = `
                <div class="player-photo">
                    <img src="${playerImg}" alt="${g.nome} ${g.cognome}">
                    <span class="player-number">${g.numero || '-'}</span>
                </div>
                <div class="player-info">
                    <h3>${g.nome} ${g.cognome}</h3>
                    <p class="role">${g.posizione || 'N/D'}</p>
                    <div class="stats-preview">
                        <span>Punti Tot: <strong>${puntiTotali}</strong></span>
                        <span>Piede: <strong>${g.piede || 'N/D'}</strong></span>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn-ghost-sm" onclick="mostraDettaglio(${idGiocatoreCorrente})">Info</button>
                </div>
            `;
            gridView.appendChild(card);
        }

        // 3b. Generazione HTML per la Tabella (List View)
        if (listBody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${g.numero || '-'}</strong></td>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${playerImg}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
                        <span>${g.nome} ${g.cognome}</span>
                    </div>
                </td>
                <td>${g.posizione || '-'}</td>
                <td>${g.piede || '-'}</td>
                <td>${g.presenze || 0}</td>
                <td>${puntiTotali} pt</td>
                <td>${puntiSettimanali} pt</td>
                <td>
                    <span class="badge ${g.stato === 'injured' ? 'badge-danger' : 'badge-success'}">
                        ${g.stato === 'injured' ? '✘ Infort.' : '✔ Disponibile'}
                    </span>
                </td>
                <td>
                    <button class="btn-ghost" onclick="mostraDettaglio(${idGiocatoreCorrente})">👁️ Det.</button>
                </td>
            `;
            listBody.appendChild(tr);
        }
    });
}

// --- 4. GESTIONE FILTRI E RICERCA ---
function filterPlayers() {
    const searchVal = document.getElementById('search-input').value.toLowerCase();

    const giocatoriFiltrati = tuttiGiocatori.filter(g => {
        const matchRicerca = 
            g.nome?.toLowerCase().includes(searchVal) ||
            g.cognome?.toLowerCase().includes(searchVal) ||
            g.posizione?.toLowerCase().includes(searchVal) ||
            g.numero?.toString().includes(searchVal);

        let matchRuolo = true;
        if (filtroRuolo !== 'tutti') {
            // Controllo sicuro e flessibile per la stringa del ruolo
            matchRuolo = g.posizione?.toLowerCase().startsWith(filtroRuolo.toLowerCase());
        }

        let matchStato = true;
        if (filtroStato === 'available') {
            matchStato = g.stato !== 'injured';
        } else if (filtroStato === 'injured') {
            matchStato = g.stato === 'injured';
        }

        return matchRicerca && matchRuolo && matchStato;
    });

    renderizzaGiocatori(giocatoriFiltrati);
}

// Cambia il ruolo selezionato dai bottoni (Corretto l'aggiornamento visivo della classe active)
function setFilter(ruolo, btn) {
    filtroRuolo = ruolo;
    
    // Trova ed elimina la classe 'active' solo dai bottoni di questo specifico gruppo ruolo
    const fratelli = btn.parentElement.querySelectorAll('.filter-btn');
    fratelli.forEach(b => b.classList.remove('active'));
    
    btn.classList.add('active');
    filterPlayers();
}

// Cambia lo stato selezionato (Corretto l'aggiornamento visivo della classe active)
function setStatus(stato, btn) {
    filtroStato = stato;
    
    // Trova ed elimina la classe 'active' solo dai bottoni di questo specifico gruppo stato
    const fratelli = btn.parentElement.querySelectorAll('.filter-btn');
    fratelli.forEach(b => b.classList.remove('active'));
    
    btn.classList.add('active');
    filterPlayers();
}

// --- 5. CAMBIO VISTA (GRIGLIA VS LISTA) ---
function setView(viewType) {
    const gridDiv = document.getElementById('view-grid');
    const listDiv = document.getElementById('view-list');
    const btnGrid = document.getElementById('btn-grid');
    const btnList = document.getElementById('btn-list');

    if (viewType === 'grid') {
        if (gridDiv) gridDiv.style.display = 'grid';
        if (listDiv) listDiv.style.display = 'none';
        btnGrid?.classList.add('active');
        btnList?.classList.remove('active');
    } else {
        if (gridDiv) gridDiv.style.display = 'none';
        if (listDiv) listDiv.style.display = 'block';
        btnGrid?.classList.remove('active');
        btnList?.classList.add('active');
    }
}

// --- 6. MODALE DETTAGLI DEL SINGOLO GIOCATORE ---
function mostraDettaglio(idGiocatore) {
    // Cerchiamo sia sotto 'id' che sotto 'idGiocatore'
    const giocatore = tuttiGiocatori.find(g => (g.idGiocatore === idGiocatore || g.id === idGiocatore));
    if (!giocatore) return;

    const dataNascitaFormatted = giocatore.dataNascita || giocatore.data_nascita;
    const puntiTotali = giocatore.puntiTotali || giocatore.punti_totali || 0;
    const puntiSettimanali = giocatore.puntiSettimanali || giocatore.punti_settimanali || 0;

    const detailHero = document.getElementById('detail-hero');
    if (detailHero) {
        detailHero.innerHTML = `
            <div style="padding: 2rem; background: linear-gradient(135deg, var(--primary), var(--dark)); color: white; border-radius: var(--radius) var(--radius) 0 0;">
                <h2 style="font-family:'Barlow Condensed', sans-serif; font-size: 2.5rem; text-transform: uppercase;">#${giocatore.numero || '-'} ${giocatore.nome} ${giocatore.cognome}</h2>
                <p style="opacity: 0.9;">${giocatore.posizione || 'N/D'}</p>
            </div>
        `;
    }

    const detailBody = document.getElementById('detail-body');
    if (detailBody) {
        detailBody.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1.5rem;">
                <p><strong>Piede preferito:</strong> ${giocatore.piede || 'N/D'}</p>
                <p><strong>Altezza:</strong> ${giocatore.altezza ? giocatore.altezza + ' cm' : 'N/D'}</p>
                <p><strong>Peso:</strong> ${giocatore.peso ? giocatore.peso + ' kg' : 'N/D'}</p>
                <p><strong>Nazionalità:</strong> ${giocatore.nazionalita || 'N/D'}</p>
                <p><strong>Data di Nascita:</strong> ${dataNascitaFormatted ? new Date(dataNascitaFormatted).toLocaleDateString() : 'N/D'}</p>
                <p><strong>Punti Totali:</strong> ${puntiTotali}</p>
                <p><strong>Punti Settimanali:</strong> ${puntiSettimanali}</p>
            </div>
        `;
    }

    openModal('modal-detail');
}

function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}