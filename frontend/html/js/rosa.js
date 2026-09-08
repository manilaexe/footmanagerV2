// Variabile globale per salvare i giocatori scaricati e filtrarli in locale
let tuttiGiocatori = [];
let filtroRuolo = 'tutti';
let idGiocatoreDettaglioCorrente = null;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof verificaAutenticazione === 'function') {
        verificaAutenticazione();
    }

    const sbName = document.getElementById('sb-nome');
    const sbRole = document.getElementById('sb-ruolo');
    const sbAv   = document.getElementById('sb-avatar');
    
    const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Utente';
    const cognome = localStorage.getItem('cognomeReale') || '';
    const ruolo   = localStorage.getItem('ruolo')        || '';

    if (ruolo === 'GIOCATORE') {
        window.location.href = '/html/pages/dashboard-giocatore.html';
        return;
    }

    if (sbName) sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
    if (sbRole) sbRole.textContent = ruolo;
    if (sbAv)   renderAvatar(sbAv, (nome[0]||('')).toUpperCase() + (cognome[0]||nome[1]||'').toUpperCase());

    if (ruolo === 'DIRIGENZA') {
        document.querySelectorAll('.topbar-right .btn-primary').forEach(b => b.style.display = 'none');
        const btnMod = document.getElementById('btn-apri-modifica');
        if (btnMod) btnMod.style.display = 'none';
    }

    setView('grid');
    caricaRosa(); 
});

function logout() {
    localStorage.clear();
    window.location.href = '/html/login.html';
}

// --- 1. RECUPERO DATI DAL BACKEND (Logica originale ripristinata) ---
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

        const [resGiocatori, resStats] = await Promise.all([
            fetch(`http://localhost:8080/api/giocatori/squadra/${idSquadra}`, { headers }).catch(() => null),
            fetch('http://localhost:8080/api/statistiche/giocatori',           { headers }).catch(() => null)
        ]);

        if (resGiocatori?.status === 401 || resGiocatori?.status === 403) {
            logout();
            return;
        }

        if (!resGiocatori || !resGiocatori.ok) throw new Error('Errore nel caricamento della rosa');

        let giocatori = await resGiocatori.json();
        const stats   = (resStats?.ok) ? await resStats.json() : [];

        // Condizione di matching originale che funzionava per associare le statistiche
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
                    ...(s || {}), 
                    gol:          s?.gol       ?? s?.golTotali     ?? g.gol       ?? 0,
                    assist:       s?.ass       ?? s?.assist        ?? g.assist    ?? 0,
                    presenze:     s?.pres      ?? s?.presenze      ?? g.presenze  ?? 0,
                    puntiTotali:  s?.puntiTotali  ?? g.puntiTotali  ?? g.punti_totali  ?? 0,
                    puntiSettimanali: s?.puntiSettimanali ?? g.puntiSettimanali ?? g.punti_settimanali ?? 0
                };
            });
        }

        tuttiGiocatori = giocatori;
        aggiornaSommario(tuttiGiocatori);
        renderizzaGiocatori(tuttiGiocatori);

    } catch (error) {
        console.error('Errore durante il recupero dei giocatori:', error);
    }
}

// --- 2. SOMMARIO ---
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

// --- 3. RENDERIZZAZIONE SICURA (GRIGLIA & TABELLA) ---
function renderizzaGiocatori(giocatori) {
    const gridView = document.getElementById('view-grid');
    const listBody = document.getElementById('list-body');

    if (gridView) gridView.innerHTML = '';
    if (listBody) listBody.innerHTML = '';

    giocatori.forEach(g => {
        const idGiocatoreCorrente = g.idGiocatore || g.id;
        const ruoloStr = g.posizione || g.ruolo || 'N/D';

        let posClass = 'pos-cen';
        const posPura = ruoloStr.toLowerCase();
        if (posPura.includes('att')) posClass = 'pos-att';
        else if (posPura.includes('dif')) posClass = 'pos-dif';
        else if (posPura.includes('por')) posClass = 'pos-por';

        const imgElement = document.createElement('img');
        imgElement.alt = g.nome || 'Giocatore';
        imgElement.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%;';

        let imageSrc = '/html/css/placeholder-player.png';
        if (g.img) {
            let cleanImg = g.img.replace(/\\/g, '/').replace('luploads', 'uploads').replace(/^\/+/, '');
            if (cleanImg.startsWith('html/')) cleanImg = cleanImg.replace(/^html\//, '');
            if (!cleanImg.startsWith('uploads/')) cleanImg = 'uploads/' + cleanImg;
            imageSrc = `/html/${cleanImg}`;
        }
        imgElement.src = imageSrc;

        imgElement.onerror = function() {
            this.onerror = null;
            this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23222"/%3E%3Ctext x="50%25" y="55%25" dominant-baseline="middle" text-anchor="middle" font-size="35" fill="%23aaa"%3E⚽%3C/text%3E%3C/svg%3E';
        };

        if (gridView) {
            const card = document.createElement('div');
            card.className = 'player-card';
            card.setAttribute('onclick', `mostraDettaglio(${idGiocatoreCorrente})`);
            
            card.innerHTML = `
                <div class="player-card-top">
                    <div class="number">#${g.numero || '-'}</div>
                    <div class="player-pic" style="overflow: hidden; padding: 0;" id="pic-grid-${idGiocatoreCorrente}"></div>
                    <div class="name">${g.nome} ${g.cognome}</div>
                    <span class="pos-badge ${posClass}">${ruoloStr}</span>
                </div>
                <div class="player-card-body">
                    <div class="mini-stats">
                        <div class="mini-stat"><div class="v">${g.presenze || 0}</div><div class="l">Presenze</div></div>
                        <div class="mini-stat"><div class="v">${g.gol || 0}</div><div class="l">Gol</div></div>
                        <div class="mini-stat"><div class="v">${g.assist || 0}</div><div class="l">Assist</div></div>
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
            card.querySelector(`#pic-grid-${idGiocatoreCorrente}`).appendChild(imgElement.cloneNode(true));
        }

        if (listBody) {
            const tr = document.createElement('tr');
            tr.setAttribute('onclick', `mostraDettaglio(${idGiocatoreCorrente})`);

            tr.innerHTML = `
                <td><strong>#${g.numero || '-'}</strong></td>
                <td>
                    <div class="player-name-cell">
                        <div class="list-avatar" style="overflow: hidden; padding: 0;" id="pic-list-${idGiocatoreCorrente}"></div>
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
            tr.querySelector(`#pic-list-${idGiocatoreCorrente}`).appendChild(imgElement.cloneNode(true));
        }
    });
}

// --- 4. FILTRI E RICERCA ---
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

function setFilter(ruolo, btn) {
    filtroRuolo = ruolo;
    if (btn && btn.parentElement) {
        btn.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
    filterPlayers();
}

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

// --- 5. DETTAGLI E MODALI ---
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

// --- 6. MODIFICA STATISTICHE ---
function apriModalModifica() {
    const g = tuttiGiocatori.find(x => (x.idGiocatore === idGiocatoreDettaglioCorrente || x.id === idGiocatoreDettaglioCorrente));
    if (!g) return;

    document.getElementById('form-id-giocatore').value = idGiocatoreDettaglioCorrente;

    const ruoloStr = (g.posizione || g.ruolo || '').toLowerCase();
    const isPortiere = g.portiere === true || ruoloStr.includes('por');

    const secMovimento = document.getElementById('sezione-movimento');
    const secPortiere = document.getElementById('sezione-portiere');
    if (isPortiere) {
        if (secMovimento) secMovimento.style.display = 'none';
        if (secPortiere) secPortiere.style.display = 'block';
    } else {
        if (secMovimento) secMovimento.style.display = 'block';
        if (secPortiere) secPortiere.style.display = 'none';
    }

    // Popolamento diretto usando i nomi esatti del StatisticheDto (camelCase)
    document.getElementById('stat-presenze').value           = g.presenze ?? 0;
    document.getElementById('stat-presenzeTitolare').value   = g.presenzeTitolare ?? 0;
    document.getElementById('stat-minutiGiocati').value      = g.minutiGiocati ?? 0;
    document.getElementById('stat-ammonizioni').value        = g.ammonizioni ?? 0;
    document.getElementById('stat-espulsioni').value         = g.espulsioni ?? 0;
    document.getElementById('stat-assist').value             = g.assist ?? 0;
    document.getElementById('stat-falliCommessi').value      = g.falliCommessi ?? 0;
    document.getElementById('stat-falliSubiti').value        = g.falliSubiti ?? 0;
    document.getElementById('stat-passaggiTentati').value    = g.passaggiTentati ?? 0;
    document.getElementById('stat-passaggiRiusciti').value   = g.passaggiRiusciti ?? 0;
    document.getElementById('stat-passaggiChiave').value     = g.passaggiChiave ?? 0;
    document.getElementById('stat-palloniIntercettati').value = g.palloniIntercettati ?? 0;
    document.getElementById('stat-duelliVinti').value        = g.duelliVinti ?? 0;
    document.getElementById('stat-duelliPersi').value        = g.duelliPersi ?? 0;
    document.getElementById('stat-duelliAereiVinti').value   = g.duelliAereiVinti ?? 0;
    document.getElementById('stat-duelliAereiPersi').value   = g.duelliAereiPersi ?? 0;
    document.getElementById('stat-dribblingTentati').value   = g.dribblingTentati ?? 0;
    document.getElementById('stat-dribblingRiusciti').value  = g.dribblingRiusciti ?? 0;

    if (!isPortiere) {
        document.getElementById('stat-goalRigore').value       = g.goalRigore ?? 0;
        document.getElementById('stat-goalTesta').value        = g.goalTesta ?? 0;
        document.getElementById('stat-goalPunizione').value    = g.goalPunizione ?? 0;
        document.getElementById('stat-tiriTotali').value       = g.tiriTotali ?? 0;
        document.getElementById('stat-tiriInPorta').value      = g.tiriInPorta ?? 0;
        document.getElementById('stat-paliTraverse').value     = g.paliTraverse ?? 0;
        document.getElementById('stat-bigChanceCreate').value  = g.bigChanceCreate ?? 0;
        document.getElementById('stat-bigChanceMancate').value = g.bigChanceMancate ?? 0;
        document.getElementById('stat-crossTentati').value     = g.crossTentati ?? 0;
        document.getElementById('stat-crossRiusciti').value    = g.crossRiusciti ?? 0;
        document.getElementById('stat-tackle').value           = g.tackle ?? 0;
        document.getElementById('stat-palloniRubati').value    = g.palloniRubati ?? 0;
    } else {
        document.getElementById('stat-parate').value         = g.parate ?? 0;
        document.getElementById('stat-cleanSheet').value       = g.cleanSheet ?? 0;
        document.getElementById('stat-goalSubiti').value       = g.goalSubiti ?? 0;
        document.getElementById('stat-rigoriParati').value     = g.rigoriParati ?? 0;
        document.getElementById('stat-rigoriSubiti').value     = g.rigoriSubiti ?? 0;
    }

    const err = document.getElementById('form-errore');
    if (err) err.style.display = 'none';

    closeModal('modal-detail');

    const titolo = document.getElementById('form-titolo');
    if (titolo) titolo.textContent = `Modifica Statistiche: ${g.nome} ${g.cognome}`;

    openModal('modal-edit');
}


function getValNum(id) {
    const val = document.getElementById(id)?.value;
    return val ? parseInt(val, 10) : 0;
}

async function salvaStatistiche() {
    const idGiocatore = document.getElementById('form-id-giocatore').value;
    if (!idGiocatore) return;

    const g = tuttiGiocatori.find(x => (x.idGiocatore === parseInt(idGiocatore, 10) || x.id === parseInt(idGiocatore, 10)));
    if (!g) return;

    const ruoloStr = (g.posizione || g.ruolo || '').toLowerCase();
    const isPortiere = ruoloStr.includes('por') || g.portiere === true;

    const payload = {
        nome: g.nome,
        cognome: g.cognome,
        numero: g.numero,
        posizione: g.posizione || g.ruolo,
        piede: g.piede,
        nazionalita: g.nazionalita,
        altezza: g.altezza,
        peso: g.peso,
        squadraId: g.squadraId || parseInt(localStorage.getItem('idSquadra'), 10),

        presenze: getValNum('stat-presenze'),
        presenzeTitolare: getValNum('stat-presenzeTitolare'),
        minutiGiocati: getValNum('stat-minutiGiocati'),
        ammonizioni: getValNum('stat-ammonizioni'),
        espulsioni: getValNum('stat-espulsioni'),
        assist: getValNum('stat-assist'),
        falliCommessi: getValNum('stat-falliCommessi'),
        falliSubiti: getValNum('stat-falliSubiti'),
        passaggiTentati: getValNum('stat-passaggiTentati'),
        passaggiRiusciti: getValNum('stat-passaggiRiusciti'),
        passaggiChiave: getValNum('stat-passaggiChiave'),
        palloniIntercettati: getValNum('stat-palloniIntercettati'),
        duelliVinti: getValNum('stat-duelliVinti'),
        duelliPersi: getValNum('stat-duelliPersi'),
        duelliAereiVinti: getValNum('stat-duelliAereiVinti'),
        duelliAereiPersi: getValNum('stat-duelliAereiPersi'),
        dribblingTentati: getValNum('stat-dribblingTentati'),
        dribblingRiusciti: getValNum('stat-dribblingRiusciti')
    };

    if (!isPortiere) {
        payload.goalRigore = getValNum('stat-goalRigore');
        payload.goalTesta = getValNum('stat-goalTesta');
        payload.goalPunizione = getValNum('stat-goalPunizione');
        payload.tiriTotali = getValNum('stat-tiriTotali');
        payload.tiriInPorta = getValNum('stat-tiriInPorta');
        payload.paliTraverse = getValNum('stat-paliTraverse');
        payload.bigChanceCreate = getValNum('stat-bigChanceCreate');
        payload.bigChanceMancate = getValNum('stat-bigChanceMancate');
        payload.crossTentati = getValNum('stat-crossTentati');
        payload.crossRiusciti = getValNum('stat-crossRiusciti');
        payload.tackle = getValNum('stat-tackle');
        payload.palloniRubati = getValNum('stat-palloniRubati');
        payload.gol = payload.goalRigore + payload.goalTesta + payload.goalPunizione;
    } else {
        payload.parate = getValNum('stat-parate');
        payload.cleanSheet = getValNum('stat-cleanSheet');
        payload.goalSubiti = getValNum('stat-goalSubiti');
        payload.rigoriParati = getValNum('stat-rigoriParati');
        payload.rigoriSubiti = getValNum('stat-rigoriSubiti');
    }

    const headers = typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };

    const btn = document.getElementById('btn-salva-stats');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvataggio…'; }

    try {
        const url = `http://localhost:8080/api/giocatori/${idGiocatore}`;
        const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(payload) });

        if (res.status === 401 || res.status === 403) {
            const errEl = document.getElementById('form-errore');
            if (errEl) { errEl.textContent = '⚠️ Non hai i permessi.'; errEl.style.display = 'block'; }
            return;
        }
        if (!res.ok) {
            const errEl = document.getElementById('form-errore');
            if (errEl) { errEl.textContent = `⚠️ Errore dal server (${res.status}).`; errEl.style.display = 'block'; }
            return;
        }

        const giocatoreSalvato = await res.json();
        const idx = tuttiGiocatori.findIndex(item => (item.idGiocatore || item.id) === parseInt(idGiocatore, 10));
        if (idx > -1) {
            tuttiGiocatori[idx] = { ...tuttiGiocatori[idx], ...giocatoreSalvato };
        }

        aggiornaSommario(tuttiGiocatori);
        filterPlayers(); 
        closeModal('modal-edit');

    } catch (err) {
        console.error('Errore salvataggio:', err);
        const errEl = document.getElementById('form-errore');
        if (errEl) { errEl.textContent = '⚠️ Server non raggiungibile.'; errEl.style.display = 'block'; }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Salva Modifiche'; }
    }
}