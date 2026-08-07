// Variabile globale per salvare i giocatori scaricati e filtrarli in locale senza rifare chiamate al DB
let tuttiGiocatori = [];
let filtroRuolo = 'tutti';
let idGiocatoreDettaglioCorrente = null;  // usato da apriModalModifica() per sapere chi modificare

document.addEventListener('DOMContentLoaded', () => {
    // 1. Esegue il controllo sulla validità del login
    if (typeof verificaAutenticazione === 'function') {
        verificaAutenticazione();
    }

    // 2. Popola la sidebar con nome/ruolo dal localStorage
    const sbName = document.getElementById('sb-nome');
    const sbRole = document.getElementById('sb-ruolo');
    const sbAv   = document.getElementById('sb-avatar');
    
    const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Utente';
    const cognome = localStorage.getItem('cognomeReale') || '';
    const ruolo   = localStorage.getItem('ruolo')        || '';

    // I giocatori non devono poter vedere la rosa: vengono rimandati alla loro dashboard
    if (ruolo === 'GIOCATORE') {
        window.location.href = '/html/pages/dashboard-giocatore.html';
        return;
    }

    if (sbName) sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
    if (sbRole) sbRole.textContent = ruolo;
    if (sbAv)   renderAvatar(sbAv, (nome[0]||('')).toUpperCase() + (cognome[0]||nome[1]||'').toUpperCase());

    // La DIRIGENZA vede la rosa in sola lettura: niente aggiunta/modifica giocatori
    // (il backend rifiuterebbe comunque POST/PUT, ma nascondiamo i pulsanti per UX pulita)
    if (ruolo === 'DIRIGENZA') {
        document.querySelectorAll('.topbar-right .btn-primary').forEach(b => b.style.display = 'none');
        const btnMod = document.getElementById('btn-apri-modifica');
        if (btnMod) btnMod.style.display = 'none';
    }

    // Imposta la vista di base (Griglia) all'avvio della pagina
    setView('grid');

    // 3. Scarica la rosa e le statistiche dal backend
    caricaRosa(); 
});

/**
 * Funzione di Logout richiesta dal pulsante "Esci"
 */
function logout() {
    localStorage.clear();
    window.location.href = '/html/login.html';
}

// --- 1. RECUPERO DATI DAL BACKEND (GIOCATORI + STATISTICHE) ---
async function caricaRosa() {
    try {
        const idSquadra = localStorage.getItem('idSquadra'); 
        const token     = localStorage.getItem('token');

        if (!idSquadra) {
            console.error("Nessun ID squadra trovato nel localStorage.");
            return;
        }

        const headers = typeof getAuthHeaders === 'function' 
            ? getAuthHeaders() 
            : { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Scarichiamo sia la rosa sia le statistiche in parallelo
        const [resGiocatori, resStats] = await Promise.all([
            fetch(`http://localhost:8080/api/giocatori/squadra/${idSquadra}`, { headers }).catch(() => null),
            fetch('http://localhost:8080/api/statistiche/giocatori',          { headers }).catch(() => null)
        ]);

        if (resGiocatori?.status === 401 || resGiocatori?.status === 403) {
            logout();
            return;
        }

        if (!resGiocatori || !resGiocatori.ok) throw new Error('Errore nel caricamento della rosa');

        let giocatori = await resGiocatori.json();
        const stats   = (resStats?.ok) ? await resStats.json() : [];

        // Unisci i dati delle statistiche a ciascun giocatore
        if (Array.isArray(stats) && stats.length > 0) {
            giocatori = giocatori.map(g => {
                const s = stats.find(st => 
                    st.id === g.id || 
                    st.giocatoreId === g.id || 
                    st.idGiocatore === g.id ||
                    st.nome === g.nome ||
                    (st.nome && st.nome.includes(g.cognome))
                );

                return {
                    ...g,
                    gol:      s?.gol   ?? s?.golTotali   ?? g.gol   ?? 0,
                    assist:   s?.ass   ?? s?.assist      ?? g.assist ?? 0,
                    presenze: s?.pres  ?? s?.presenze    ?? g.presenze ?? 0,
                    puntiTotali: s?.puntiTotali ?? g.puntiTotali ?? g.punti_totali ?? 0,
                    puntiSettimanali: s?.puntiSettimanali ?? g.puntiSettimanali ?? g.punti_settimanali ?? 0
                };
            });
        }

        tuttiGiocatori = giocatori;

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
    const att = giocatori.filter(g => (g.posizione || g.ruolo || '').toLowerCase().includes('att')).length;
    const cen = giocatori.filter(g => (g.posizione || g.ruolo || '').toLowerCase().includes('cen')).length;
    const dif = giocatori.filter(g => (g.posizione || g.ruolo || '').toLowerCase().includes('dif')).length;
    const por = giocatori.filter(g => (g.posizione || g.ruolo || '').toLowerCase().includes('por')).length;

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
        const playerImg = g.img ? g.img : '../css/placeholder-player.png'; 
        const idGiocatoreCorrente = g.idGiocatore || g.id;
        const ruoloStr = g.posizione || g.ruolo || 'N/D';

        // Determina il colore del badge del ruolo
        let posClass = 'pos-cen';
        const posPura = ruoloStr.toLowerCase();
        if (posPura.includes('att')) posClass = 'pos-att';
        else if (posPura.includes('dif')) posClass = 'pos-dif';
        else if (posPura.includes('por')) posClass = 'pos-por';

        // 3a. Generazione HTML per la Griglia (Grid View)
        if (gridView) {
            const card = document.createElement('div');
            card.className = 'player-card';
            card.setAttribute('onclick', `mostraDettaglio(${idGiocatoreCorrente})`);
            
            card.innerHTML = `
                <div class="player-card-top">
                    <div class="number">#${g.numero || '-'}</div>
                    
                    <div class="player-pic" style="overflow: hidden; padding: 0;">
                        <img src="${playerImg}" alt="${g.nome}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.src='../css/placeholder-player.png'">
                    </div>
                    
                    <div class="name">${g.nome} ${g.cognome}</div>
                    <span class="pos-badge ${posClass}">${ruoloStr}</span>
                </div>
                
                <div class="player-card-body">
                    <div class="mini-stats">
                        <div class="mini-stat">
                            <div class="v">${g.presenze || 0}</div>
                            <div class="l">Presenze</div>
                        </div>
                        <div class="mini-stat">
                            <div class="v">${g.gol || 0}</div>
                            <div class="l">Gol</div>
                        </div>
                        <div class="mini-stat">
                            <div class="v">${g.assist || 0}</div>
                            <div class="l">Assist</div>
                        </div>
                    </div>
                    
                    <div class="player-meta">
                        <span class="meta-tag">Piede: ${g.piede || '-'}</span>
                        <span class="meta-tag">H: ${g.altezza ? g.altezza + ' cm' : '-'}</span>
                    </div>
                    
                    <div class="card-actions">
                        <button class="btn-card primary">Visualizza Info</button>
                    </div>
                </div>
            `;
            gridView.appendChild(card);
        }

        // 3b. Generazione HTML per la Tabella (List View)
        if (listBody) {
            const tr = document.createElement('tr');
            tr.setAttribute('onclick', `mostraDettaglio(${idGiocatoreCorrente})`);

            tr.innerHTML = `
                <td><strong>#${g.numero || '-'}</strong></td>
                <td>
                    <div class="player-name-cell">
                        <div class="list-avatar" style="overflow: hidden; padding: 0;">
                            <img src="${playerImg}" alt="${g.nome}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.src='../css/placeholder-player.png'">
                        </div>
                        <span>${g.nome} ${g.cognome}</span>
                    </div>
                </td>
                <td><span class="pos-badge ${posClass}">${ruoloStr}</span></td>
                <td>${g.piede || '-'}</td>
                <td>${g.presenze || 0}</td>
                <td>${g.gol || 0}</td>
                <td>${g.assist || 0}</td>
                <td class="tbl-actions">
                    <button class="btn-sm">👁️ Det.</button>
                </td>
            `;
            listBody.appendChild(tr);
        }
    });
}

// --- 4. GESTIONE FILTRI E RICERCA ---
function filterPlayers() {
    const searchVal = (document.getElementById('search-input')?.value || '').toLowerCase();

    const giocatoriFiltrati = tuttiGiocatori.filter(g => {
        const ruolo = (g.posizione || g.ruolo || '').toLowerCase();
        
        const matchRicerca = 
            g.nome?.toLowerCase().includes(searchVal) ||
            g.cognome?.toLowerCase().includes(searchVal) ||
            ruolo.includes(searchVal) ||
            g.numero?.toString().includes(searchVal);

        let matchRuolo = true;
        if (filtroRuolo !== 'tutti') {
            matchRuolo = ruolo.includes(filtroRuolo.toLowerCase());
        }

        return matchRicerca && matchRuolo;
    });

    renderizzaGiocatori(giocatoriFiltrati);
}

// Cambia il ruolo selezionato dai bottoni
function setFilter(ruolo, btn) {
    filtroRuolo = ruolo;
    
    if (btn && btn.parentElement) {
        const fratelli = btn.parentElement.querySelectorAll('.filter-btn');
        fratelli.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    
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
    const giocatore = tuttiGiocatori.find(g => (g.idGiocatore === idGiocatore || g.id === idGiocatore));
    if (!giocatore) return;

    idGiocatoreDettaglioCorrente = giocatore.idGiocatore || giocatore.id;

    const dataNascitaFormatted = giocatore.dataNascita || giocatore.data_nascita;

    const detailHero = document.getElementById('detail-hero');
    if (detailHero) {
        detailHero.innerHTML = `
            <div style="padding: 2rem; background: linear-gradient(135deg, var(--primary), var(--dark)); color: white; border-radius: var(--radius) var(--radius) 0 0;">
                <h2 style="font-family:'Barlow Condensed', sans-serif; font-size: 2.5rem; text-transform: uppercase;">#${giocatore.numero || '-'} ${giocatore.nome} ${giocatore.cognome}</h2>
                <p style="opacity: 0.9;">${giocatore.posizione || giocatore.ruolo || 'N/D'}</p>
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
                <p><strong>Data di Nascita:</strong> ${dataNascitaFormatted ? new Date(dataNascitaFormatted).toLocaleDateString('it-IT') : 'N/D'}</p>
                <hr style="grid-column: span 2; border: 0; border-top: 1px solid #eee; margin: 0.5rem 0;">
                <p><strong>Presenze:</strong> ${giocatore.presenze || 0}</p>
                <p><strong>Gol Totali:</strong> ${giocatore.gol || 0}</p>
                <p><strong>Assist:</strong> ${giocatore.assist || 0}</p>
                <p><strong>Punti Totali:</strong> ${giocatore.puntiTotali || 0}</p>
            </div>
        `;
    }

    openModal('modal-detail');
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
}
// --- 7. MODAL AGGIUNGI / MODIFICA GIOCATORE ---
// Stesso modal, stesso form: form-id-giocatore vuoto = creazione (POST),
// valorizzato = modifica (PUT). Titolo e testo del pulsante cambiano di conseguenza.

function resetFormGiocatore() {
    document.getElementById('form-id-giocatore').value = '';
    ['form-nome','form-cognome','form-numero','form-nazionalita','form-altezza','form-peso']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const pos = document.getElementById('form-posizione');
    if (pos) pos.value = 'Attaccante';
    const piede = document.getElementById('form-piede');
    if (piede) piede.value = 'Destro';
    const err = document.getElementById('form-errore');
    if (err) err.style.display = 'none';
}

function apriModalAggiungi() {
    resetFormGiocatore();
    const titolo = document.getElementById('form-titolo');
    if (titolo) titolo.textContent = 'Aggiungi Giocatore';
    const btn = document.getElementById('btn-salva-giocatore');
    if (btn) btn.textContent = 'Salva Giocatore';
    openModal('modal-add');
}

// Chiamata dal pulsante "✏️ Modifica" nel modal dettaglio: precompila il
// form con i dati del giocatore attualmente aperto (idGiocatoreDettaglioCorrente,
// impostato da mostraDettaglio()).
function apriModalModifica() {
    const g = tuttiGiocatori.find(x => (x.idGiocatore === idGiocatoreDettaglioCorrente || x.id === idGiocatoreDettaglioCorrente));
    if (!g) return;

    resetFormGiocatore();

    document.getElementById('form-id-giocatore').value = idGiocatoreDettaglioCorrente;
    document.getElementById('form-nome').value        = g.nome || '';
    document.getElementById('form-cognome').value      = g.cognome || '';
    document.getElementById('form-numero').value       = g.numero || '';
    document.getElementById('form-nazionalita').value  = g.nazionalita || '';
    document.getElementById('form-altezza').value      = g.altezza || '';
    document.getElementById('form-peso').value         = g.peso || '';

    const posSelect = document.getElementById('form-posizione');
    if (posSelect) {
        const posValore = g.posizione || g.ruolo || 'Attaccante';
        // Se la posizione salvata non corrisponde esattamente a una delle opzioni
        // (es. "ATT" invece di "Attaccante"), la aggiunge al volo per non perderla.
        if (![...posSelect.options].some(o => o.value === posValore)) {
            const opt = document.createElement('option');
            opt.value = posValore; opt.textContent = posValore;
            posSelect.appendChild(opt);
        }
        posSelect.value = posValore;
    }

    const piedeSelect = document.getElementById('form-piede');
    if (piedeSelect) piedeSelect.value = g.piede || 'Destro';

    closeModal('modal-detail');

    const titolo = document.getElementById('form-titolo');
    if (titolo) titolo.textContent = `Modifica ${g.nome} ${g.cognome}`;
    const btn = document.getElementById('btn-salva-giocatore');
    if (btn) btn.textContent = 'Salva Modifiche';

    openModal('modal-add');
}

function mostraErroreForm(msg) {
    const err = document.getElementById('form-errore');
    if (!err) return;
    err.textContent = '⚠️ ' + msg;
    err.style.display = 'block';
}

// Crea (POST) o aggiorna (PUT) un giocatore a seconda che form-id-giocatore
// sia vuoto o valorizzato. Stesso payload in entrambi i casi: il backend
// (CreaGiocatoreRequest) accetta la stessa struttura per crea() e aggiorna().
async function salvaGiocatore() {
    const idModifica = document.getElementById('form-id-giocatore').value;
    const nome       = document.getElementById('form-nome').value.trim();
    const cognome    = document.getElementById('form-cognome').value.trim();
    const numero     = document.getElementById('form-numero').value;
    const posizione  = document.getElementById('form-posizione').value;
    const piede      = document.getElementById('form-piede').value;
    const nazionalita = document.getElementById('form-nazionalita').value.trim();
    const altezza    = document.getElementById('form-altezza').value;
    const peso       = document.getElementById('form-peso').value;

    if (!nome || !cognome) {
        mostraErroreForm('Nome e cognome sono obbligatori.');
        return;
    }

    const idSquadra = localStorage.getItem('idSquadra');
    const payload = {
        nome, cognome,
        numero: numero ? parseInt(numero, 10) : null,
        posizione, piede,
        nazionalita: nazionalita || null,
        altezza: altezza ? parseInt(altezza, 10) : null,
        peso: peso ? parseInt(peso, 10) : null,
        squadraId: idSquadra ? parseInt(idSquadra, 10) : null
    };

    const headers = typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };

    const btn = document.getElementById('btn-salva-giocatore');
    if (btn) { btn.disabled = true; btn.textContent = idModifica ? 'Salvataggio…' : 'Creazione…'; }

    try {
        const url    = idModifica ? `http://localhost:8080/api/giocatori/${idModifica}` : 'http://localhost:8080/api/giocatori';
        const method = idModifica ? 'PUT' : 'POST';

        const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });

        if (res.status === 401 || res.status === 403) {
            mostraErroreForm('Non hai i permessi per questa operazione.');
            return;
        }
        if (!res.ok) {
            mostraErroreForm(`Errore dal server (${res.status}). Riprova.`);
            return;
        }

        const giocatoreSalvato = await res.json();

        if (idModifica) {
            // Sostituisce il giocatore modificato nella cache locale
            const idx = tuttiGiocatori.findIndex(g => (g.idGiocatore || g.id) === parseInt(idModifica, 10));
            if (idx > -1) tuttiGiocatori[idx] = { ...tuttiGiocatori[idx], ...giocatoreSalvato };
        } else {
            tuttiGiocatori.push(giocatoreSalvato);
        }

        aggiornaSommario(tuttiGiocatori);
        filterPlayers();   // ri-renderizza rispettando eventuali filtri/ricerca attivi
        closeModal('modal-add');

    } catch (err) {
        console.error('Errore salvataggio giocatore:', err);
        mostraErroreForm('Server non raggiungibile.');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = idModifica ? 'Salva Modifiche' : 'Salva Giocatore'; }
    }
}