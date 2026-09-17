// ==========================================
// STATO GLOBALE
// ==========================================
let tuttiGiocatori = [];
let filtroRuolo = 'tutti';
let idGiocatoreDettaglioCorrente = null;

// Stato per l'ordinamento interattivo delle colonne nella vista lista
let currentRosaSortColumn = 'ruolo';
let currentRosaSortDirection = 'asc'; // 'asc' o 'desc'

document.addEventListener('DOMContentLoaded', () => {
    if (typeof verificaAutenticazione === 'function') {
        verificaAutenticazione();
    }

    const sbName = document.getElementById('sb-nome');
    const sbRole = document.getElementById('sb-ruolo');
    const sbAv   = document.getElementById('sb-avatar');
    
    const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Utente';
    const cognome = localStorage.getItem('cognomeReale') || '';
    const ruolo   = (localStorage.getItem('ruolo')       || '').toUpperCase();

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
    if (ruolo === 'DIRIGENZA') {
        document.querySelectorAll('.topbar-right .btn-primary').forEach(b => b.style.display = 'none');
        const btnMod = document.getElementById('btn-apri-modifica');
        if (btnMod) btnMod.style.display = 'none';

        // Nascondi voce messaggi dalla sidebar
        document.querySelectorAll('.sidebar a, .sidebar-menu a, nav a, .nav-item').forEach(el => {
            const text = (el.textContent || '').toLowerCase();
            const href = el.getAttribute('href') || '';
            if (text.includes('messagg') || href.includes('messaggi.html')) {
                const containerToHide = el.closest('li') || el.closest('.nav-item') || el;
                containerToHide.style.display = 'none';
            }
        });
    }

    setView('grid');
    caricaRosa(); 
});

function logout() {
    localStorage.clear();
    window.location.href = '/html/login.html';
}

// --- FUNZIONE PER FORMATTARE IL NOME (EVITA DUPLICAZIONI SE IL NOME CONTIENE GIÀ IL COGNOME) ---
function formattaNome(g) {
    if (!g) return 'Giocatore';
    const nome = (g.nome || '').trim();
    const cognome = (g.cognome || '').trim();
    
    if (!nome) return cognome;
    if (!cognome) return nome;
    
    if (nome.toLowerCase().includes(cognome.toLowerCase())) {
        return nome;
    }
    
    return `${nome} ${cognome}`;
}

// --- 1. RECUPERO DATI DAL BACKEND ---
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

        if (Array.isArray(stats) && stats.length > 0) {
            giocatori = giocatori.map(g => {
                const s = stats.find(st => 
                    st.id === g.id || 
                    st.giocatoreId === g.id || 
                    st.idGiocatore === g.id ||
                    st.nome === g.nome ||
                    (st.nome && st.nome.includes(g.cognome))
                );

                // PRIORITÀ A g (anagrafica pulita) per nome, cognome, dataNascita ecc.
                return {
                    ...(s || {}),
                    ...g, 
                    gol:                  s?.gol              ?? s?.golTotali     ?? g.gol              ?? 0,
                    assist:               s?.ass              ?? s?.assist        ?? g.assist           ?? 0,
                    presenze:             s?.pres             ?? s?.presenze      ?? g.presenze         ?? 0,
                    puntiTotali:          s?.puntiTotali      ?? g.puntiTotali    ?? g.punti_totali     ?? 0,
                    puntiSettimanali:     s?.puntiSettimanali ?? g.puntiSettimanali ?? g.punti_settimanali ?? 0
                };
            });
        }

        // Ordinamento multilivello iniziale: Ruolo -> Presenze (desc) -> Alfabetico
        const ordineRuoli = { 'por': 1, 'dif': 2, 'cen': 3, 'att': 4 };
        giocatori.sort((a, b) => {
            const ruoloA = (a.posizione || a.ruolo || '').toLowerCase();
            const ruoloB = (b.posizione || b.ruolo || '').toLowerCase();
            const pesoA = Object.keys(ordineRuoli).find(r => ruoloA.includes(r)) ? ordineRuoli[Object.keys(ordineRuoli).find(r => ruoloA.includes(r))] : 99;
            const pesoB = Object.keys(ordineRuoli).find(r => ruoloB.includes(r)) ? ordineRuoli[Object.keys(ordineRuoli).find(r => ruoloB.includes(r))] : 99;

            if (pesoA !== pesoB) return pesoA - pesoB;

            const presA = a.presenze || 0;
            const presB = b.presenze || 0;
            if (presA !== presB) return presB - presA;

            const nomeA = formattaNome(a).toLowerCase();
            const nomeB = formattaNome(b).toLowerCase();
            return nomeA.localeCompare(nomeB);
        });

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

    const ruoloUtente = (localStorage.getItem('ruolo') || '').toUpperCase();
    const canSendMsg = ruoloUtente !== 'DIRIGENZA';

    giocatori.forEach(g => {
        const idGiocatoreCorrente = g.idGiocatore || g.id;
        const ruoloStr = g.posizione || g.ruolo || 'N/D';
        const nomeCompleto = formattaNome(g);

        let posClass = 'pos-cen';
        const posPura = ruoloStr.toLowerCase();
        if (posPura.includes('att')) posClass = 'pos-att';
        else if (posPura.includes('dif')) posClass = 'pos-dif';
        else if (posPura.includes('por')) posClass = 'pos-por';

        const imgElement = document.createElement('img');
        imgElement.alt = nomeCompleto;
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

        const rawDataNascita = g.dataNascita || g.data_nascita;
        const dataNascitaFormatted = rawDataNascita ? new Date(rawDataNascita).toLocaleDateString('it-IT') : '-';

        if (gridView) {
            const card = document.createElement('div');
            card.className = 'player-card';
            card.style.cursor = 'pointer';
            card.setAttribute('onclick', `mostraDettaglio('${idGiocatoreCorrente}')`);
            
            card.innerHTML = `
                <div class="player-card-top">
                    <div class="number">#${g.numero || '-'}</div>
                    <div class="player-pic" style="overflow: hidden; padding: 0; width: 80px; height: 80px; margin: 0 auto;" id="pic-grid-${idGiocatoreCorrente}"></div>
                    <div class="name" style="margin-top: 8px; font-size: 1.2rem; font-weight: bold;">${nomeCompleto}</div>
                    <span class="pos-badge ${posClass}" style="display: inline-block; margin-top: 4px;">${ruoloStr}</span>
                </div>
                <div class="player-card-body" style="padding: 10px 15px;">
                    <div class="mini-stats" style="display: flex; justify-content: space-around; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; margin-bottom: 10px; font-size: 0.85rem;">
                        <div style="text-align: center;"><div style="font-weight: bold; color: var(--primary);">${g.presenze || 0}</div><div style="font-size: 0.7rem; color: #aaa;">Presenze</div></div>
                        <div style="text-align: center;"><div style="font-weight: bold; color: #4ade80;">${g.puntiSettimanali ?? g.punti_settimanali ?? 0}</div><div style="font-size: 0.7rem; color: #aaa;">Pt. Sett.</div></div>
                        <div style="text-align: center;"><div style="font-weight: bold; color: #facc15;">${g.puntiTotali ?? g.punti_totali ?? 0}</div><div style="font-size: 0.7rem; color: #aaa;">Pt. Totali</div></div>
                    </div>
                    
                    <div class="player-meta" style="font-size: 0.8rem; color: #ccc; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 12px; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 6px;">
                        <div><strong>Piede:</strong> ${g.piede || '-'}</div>
                        <div><strong>Altezza:</strong> ${g.altezza ? g.altezza + ' cm' : '-'}</div>
                        <div><strong>Peso:</strong> ${g.peso ? g.peso + ' kg' : '-'}</div>
                        <div><strong>Nascita:</strong> ${dataNascitaFormatted}</div>
                    </div>

                    <div class="card-actions" style="display: flex; gap: 8px;">
                        ${canSendMsg ? `<button class="btn-card primary" style="flex: 1; font-size: 0.8rem; padding: 6px;" onclick="event.stopPropagation(); window.location.href='/html/messaggi.html?giocatoreId=${idGiocatoreCorrente}'">Invia Messaggio</button>` : ''}
                        <button class="btn-card ghost" style="flex: 1; font-size: 0.8rem; padding: 6px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; cursor: pointer;" onclick="event.stopPropagation(); window.location.href='/html/statistiche.html?giocatoreId=${idGiocatoreCorrente}'">Vedi Statistiche</button>
                    </div>
                </div>
            `;
            gridView.appendChild(card);
            card.querySelector(`#pic-grid-${idGiocatoreCorrente}`).appendChild(imgElement.cloneNode(true));
        }

        if (listBody) {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.setAttribute('onclick', `mostraDettaglio('${idGiocatoreCorrente}')`);

            tr.innerHTML = `
                <td><strong>#${g.numero || '-'}</strong></td>
                <td>
                    <div class="player-name-cell">
                        <div class="list-avatar" style="overflow: hidden; padding: 0;" id="pic-list-${idGiocatoreCorrente}"></div>
                        <span>${nomeCompleto}</span>
                    </div>
                </td>
                <td><span class="pos-badge ${posClass}">${ruoloStr}</span></td>
                <td>${g.piede || '-'}</td>
                <td>${g.presenze || 0}</td>
                <td>${g.gol || 0}</td>
                <td>${g.assist || 0}</td>
                <td class="tbl-actions">
                    <button class="btn-sm" onclick="event.stopPropagation(); mostraDettaglio('${idGiocatoreCorrente}')">👁️ Det.</button>
                </td>
            `;
            listBody.appendChild(tr);
            tr.querySelector(`#pic-list-${idGiocatoreCorrente}`).appendChild(imgElement.cloneNode(true));
        }
    });
}

// --- 4. GESTIONE ORDINAMENTO LISTA ROSA ---
function sortRosaList(column) {
    if (currentRosaSortColumn === column) {
        currentRosaSortDirection = currentRosaSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentRosaSortColumn = column;
        currentRosaSortDirection = ['presenze', 'gol', 'assist'].includes(column) ? 'desc' : 'asc';
    }
    filterPlayers();
}

// --- 5. FILTRI E RICERCA ---
function filterPlayers() {
    const searchVal = (document.getElementById('search-input')?.value || '').toLowerCase();

    const giocatoriFiltrati = tuttiGiocatori.filter(g => {
        const ruolo = (g.posizione || g.ruolo || '').toLowerCase();
        const nomeCompleto = formattaNome(g).toLowerCase();
        const matchRicerca = 
            nomeCompleto.includes(searchVal) ||
            ruolo.includes(searchVal) ||
            g.numero?.toString().includes(searchVal);

        let matchRuolo = true;
        if (filtroRuolo !== 'tutti') {
            matchRuolo = ruolo.includes(filtroRuolo.toLowerCase());
        }

        return matchRicerca && matchRuolo;
    });

    if (currentRosaSortColumn === 'ruolo') {
        const ordineAsc  = { 'por': 1, 'dif': 2, 'cen': 3, 'att': 4 };
        const ordineDesc = { 'att': 1, 'cen': 2, 'dif': 3, 'por': 4 };
        const mapping    = currentRosaSortDirection === 'asc' ? ordineAsc : ordineDesc;

        giocatoriFiltrati.sort((a, b) => {
            const ruoloA = (a.posizione || a.ruolo || '').toLowerCase();
            const ruoloB = (b.posizione || b.ruolo || '').toLowerCase();
            const pesoA = Object.keys(mapping).find(r => ruoloA.includes(r)) ? mapping[Object.keys(mapping).find(r => ruoloA.includes(r))] : 99;
            const pesoB = Object.keys(mapping).find(r => ruoloB.includes(r)) ? mapping[Object.keys(mapping).find(r => ruoloB.includes(r))] : 99;

            if (pesoA !== pesoB) return pesoA - pesoB;

            const presA = a.presenze || 0;
            const presB = b.presenze || 0;
            if (presA !== presB) return presB - presA;

            const nomeA = formattaNome(a).toLowerCase();
            const nomeB = formattaNome(b).toLowerCase();
            return nomeA.localeCompare(nomeB);
        });
    } else if (currentRosaSortColumn === 'nome') {
        giocatoriFiltrati.sort((a, b) => {
            const nomeA = formattaNome(a).toLowerCase();
            const nomeB = formattaNome(b).toLowerCase();
            return currentRosaSortDirection === 'asc' ? nomeA.localeCompare(nomeB) : nomeB.localeCompare(nomeA);
        });
    } else if (currentRosaSortColumn === 'piede') {
        giocatoriFiltrati.sort((a, b) => {
            const piedeA = (a.piede || '').toLowerCase();
            const piedeB = (b.piede || '').toLowerCase();
            return currentRosaSortDirection === 'asc' ? piedeA.localeCompare(piedeB) : piedeB.localeCompare(piedeA);
        });
    } else if (['numero', 'presenze', 'gol', 'assist'].includes(currentRosaSortColumn)) {
        giocatoriFiltrati.sort((a, b) => {
            const valA = a[currentRosaSortColumn] || 0;
            const valB = b[currentRosaSortColumn] || 0;
            return currentRosaSortDirection === 'desc' ? valB - valA : valA - valB;
        });
    }

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

// --- 6. DETTAGLI E MODALI ---
function mostraDettaglio(idGiocatore) {
    const giocatore = tuttiGiocatori.find(g => String(g.idGiocatore || g.id) === String(idGiocatore));
    if (!giocatore) {
        console.warn("Giocatore non trovato per ID:", idGiocatore);
        return;
    }

    idGiocatoreDettaglioCorrente = giocatore.idGiocatore || giocatore.id;
    const rawDataNascita = giocatore.dataNascita || giocatore.data_nascita;
    const dataNascitaFormatted = rawDataNascita ? new Date(rawDataNascita).toLocaleDateString('it-IT') : '-';
    const nomeCompleto = formattaNome(giocatore);

    const ruoloStr = giocatore.posizione || giocatore.ruolo || 'N/D';
    let posClass = 'pos-cen';
    const posPura = ruoloStr.toLowerCase();
    if (posPura.includes('att')) posClass = 'pos-att';
    else if (posPura.includes('dif')) posClass = 'pos-dif';
    else if (posPura.includes('por')) posClass = 'pos-por';

    let imageSrc = '/html/css/placeholder-player.png';
    if (giocatore.img) {
        let cleanImg = giocatore.img.replace(/\\/g, '/').replace('luploads', 'uploads').replace(/^\/+/, '');
        if (cleanImg.startsWith('html/')) cleanImg = cleanImg.replace(/^html\//, '');
        if (!cleanImg.startsWith('uploads/')) cleanImg = 'uploads/' + cleanImg;
        imageSrc = `/html/${cleanImg}`;
    }

    const detailHero = document.getElementById('detail-hero');
    if (detailHero) {
        detailHero.innerHTML = `
            <div style="padding: 1.75rem 2rem; background: linear-gradient(135deg, var(--primary), var(--dark)); color: white; border-radius: var(--radius) var(--radius) 0 0; display: flex; align-items: center; gap: 1.5rem;">
                <div style="width: 150px; height: 150px; border-radius: 50%; overflow: hidden; background: #222; border: 3px solid rgba(255,255,255,0.3); flex-shrink: 0;">
                    <img src="${imageSrc}" alt="${nomeCompleto}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%23222/%3E%3Ctext x=%2250%25%22 y=%2255%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-size=%2235%22 fill=%23aaa%22%3E⚽%3C/text%3E%3C/svg%3E'">
                </div>
                <div>
                    <div style="font-size: 1.2rem; font-weight: bold; opacity: 0.9; font-family: 'Barlow Condensed', sans-serif;">#${giocatore.numero || '-'}</div>
                    <h2 style="font-family:'Barlow Condensed', sans-serif; font-size: 2.2rem; text-transform: uppercase; margin: 0; line-height: 1.1;">${nomeCompleto}</h2>
                    <div style="margin-top: 6px;"><span class="pos-badge ${posClass}" style="display: inline-block; padding: 4px 12px; font-size: 0.85rem; font-weight: bold;">${ruoloStr}</span></div>
                </div>
            </div>
        `;
    }

    const detailBody = document.getElementById('detail-body');
    if (detailBody) {
        const ruoloUtente = (localStorage.getItem('ruolo') || '').toUpperCase();
        const canSendMsg = ruoloUtente !== 'DIRIGENZA';
        const isStaff = ruoloUtente === 'STAFF';
        
        detailBody.innerHTML = `
            <div style="padding: 1.5rem;">
                <div style="display: flex; justify-content: space-around; background: rgba(0,0,0,0.25); padding: 12px; border-radius: 8px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="text-align: center;"><div style="font-size: 1.3rem; font-weight: bold; color: var(--primary);">${giocatore.presenze || 0}</div><div style="font-size: 0.75rem; color: #aaa; text-transform: uppercase;">Presenze</div></div>
                    <div style="text-align: center;"><div style="font-size: 1.3rem; font-weight: bold; color: #4ade80;">${giocatore.puntiSettimanali ?? giocatore.punti_settimanali ?? 0}</div><div style="font-size: 0.75rem; color: #aaa; text-transform: uppercase;">Pt. Sett.</div></div>
                    <div style="text-align: center;"><div style="font-size: 1.3rem; font-weight: bold; color: #facc15;">${giocatore.puntiTotali ?? giocatore.punti_totali ?? 0}</div><div style="font-size: 0.75rem; color: #aaa; text-transform: uppercase;">Pt. Totali</div></div>
                </div>

                <div style="font-size: 0.9rem; color: #ddd; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
                    <div><strong>Piede:</strong> ${giocatore.piede || '-'}</div>
                    <div id="box-altezza"><strong>Altezza:</strong> <span id="testo-altezza">${giocatore.altezza ? giocatore.altezza + ' cm' : '-'}</span></div>
                    <div id="box-peso"><strong>Peso:</strong> <span id="testo-peso">${giocatore.peso ? giocatore.peso + ' kg' : '-'}</span></div>
                    <div><strong>Nascita:</strong> ${dataNascitaFormatted}</div>
                </div>

                <!-- CONTENITORE PULSANTI AZIONE -->
                <div style="display: flex; gap: 10px; margin-bottom: ${isStaff ? '10px' : '0'};">
                    ${canSendMsg ? `<button class="btn-primary" style="flex: 1; padding: 10px; font-weight: bold;" onclick="window.location.href='/html/messaggi.html?giocatoreId=${idGiocatoreDettaglioCorrente}'">💬 Invia Messaggio</button>` : ''}
                    <button class="btn-ghost" style="flex: 1; padding: 10px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; cursor: pointer; font-weight: bold;" onclick="window.location.href='/html/statistiche.html?giocatoreId=${idGiocatoreDettaglioCorrente}'">📊 Vedi Statistiche</button>
                </div>

                <!-- SEZIONE INLINE DEDICATA ALLO STAFF PER MODIFICARE FISICO -->
                ${isStaff ? `
                    <div id="staff-edit-container">
                        <button id="btn-abilita-edit" class="btn-primary" style="width: 100%; padding: 10px; background: #eab308; color: #000; font-weight: bold; border: none; border-radius: 6px; cursor: pointer;" onclick="attivaModificaFisicaInline()">✏️ Modifica Altezza e Peso</button>
                    </div>
                ` : ''}
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

// --- 7. MODIFICA STATISTICHE (ALLENATORE / STANDARD) ---
function apriModalModifica() {
    const g = tuttiGiocatori.find(x => String(x.idGiocatore || x.id) === String(idGiocatoreDettaglioCorrente));
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
    if (titolo) titolo.textContent = `Modifica Statistiche: ${formattaNome(g)}`;

    openModal('modal-edit');
}

// --- 8. MODIFICA INLINE ALTEZZA E PESO (ESCLUSIVO PER LO STAFF) ---
function attivaModificaFisicaInline() {
    const ruoloUtente = (localStorage.getItem('ruolo') || '').toUpperCase();
    if (ruoloUtente !== 'STAFF') {
        alert('Accesso negato: solo lo staff può modificare questi parametri.');
        return;
    }

    const g = tuttiGiocatori.find(x => String(x.idGiocatore || x.id) === String(idGiocatoreDettaglioCorrente));
    if (!g) return;

    const boxAltezza = document.getElementById('box-altezza');
    const boxPeso = document.getElementById('box-peso');
    const containerEdit = document.getElementById('staff-edit-container');

    if (boxAltezza) {
        boxAltezza.innerHTML = `<strong>Altezza:</strong> <input type="number" id="input-inline-altezza" value="${g.altezza || ''}" placeholder="cm" style="width: 70px; background: #222; border: 1px solid #555; color: #fff; padding: 2px 5px; border-radius: 4px;" /> cm`;
    }
    if (boxPeso) {
        boxPeso.innerHTML = `<strong>Peso:</strong> <input type="number" id="input-inline-peso" value="${g.peso || ''}" placeholder="kg" style="width: 70px; background: #222; border: 1px solid #555; color: #fff; padding: 2px 5px; border-radius: 4px;" /> kg`;
    }

    if (containerEdit) {
        containerEdit.innerHTML = `
            <div style="display: flex; gap: 8px;">
                <button class="btn-primary" style="flex: 2; padding: 8px; background: #22c55e; color: #fff; font-weight: bold; border: none; border-radius: 6px; cursor: pointer;" onclick="salvaModificaFisicaInline()">💾 Salva Modifiche</button>
                <button class="btn-ghost" style="flex: 1; padding: 8px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; cursor: pointer;" onclick="mostraDettaglio('${idGiocatoreDettaglioCorrente}')">Annulla</button>
            </div>
        `;
    }
}

async function salvaModificaFisicaInline() {
    const ruoloUtente = (localStorage.getItem('ruolo') || '').toUpperCase();
    if (ruoloUtente !== 'STAFF') {
        alert('Accesso negato: solo lo staff può modificare questi parametri.');
        return;
    }

    const giocatore = tuttiGiocatori.find(g => String(g.idGiocatore || g.id) === String(idGiocatoreDettaglioCorrente));
    if (!giocatore) return;

    const valAltezza = document.getElementById('input-inline-altezza')?.value;
    const valPeso = document.getElementById('input-inline-peso')?.value;

    // PAYLOAD SICURO: Mantiene nome, cognome e dataNascita originali intatti ed evita stringhe finte
    const payload = {
        id: giocatore.id || idGiocatoreDettaglioCorrente,
        nome: giocatore.nome || '',
        cognome: giocatore.cognome || '',
        numero: giocatore.numero || 0,
        posizione: giocatore.posizione || giocatore.ruolo || '',
        piede: giocatore.piede || '',
        nazionalita: giocatore.nazionalita || '',
        dataNascita: giocatore.dataNascita || giocatore.data_nascita || null,
        squadraId: giocatore.squadraId || parseInt(localStorage.getItem('idSquadra'), 10),
        
        altezza: valAltezza && valAltezza.trim() !== "" ? parseInt(valAltezza, 10) : giocatore.altezza,
        peso: valPeso && valPeso.trim() !== "" ? parseInt(valPeso, 10) : giocatore.peso,

        // Mantieni i valori statistici correnti per non azzerarli lato server se richiesto dal DTO completo
        presenze: giocatore.presenze ?? 0,
        presenzeTitolare: giocatore.presenzeTitolare ?? 0,
        minutiGiocati: giocatore.minutiGiocati ?? 0,
        ammonizioni: giocatore.ammonizioni ?? 0,
        espulsioni: giocatore.espulsioni ?? 0,
        assist: giocatore.assist ?? 0,
        gol: giocatore.gol ?? 0,
        goalSubiti: giocatore.goalSubiti ?? 0
    };

    const headers = typeof getAuthHeaders === 'function'
        ? getAuthHeaders()
        : { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };

    try {
        const res = await fetch(`http://localhost:8080/api/giocatori/${idGiocatoreDettaglioCorrente}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
        });

        if (res.status === 401 || res.status === 403) {
            alert('⚠️ Non hai i permessi necessari.');
            return;
        }

        if (!res.ok) {
            const errorMsg = await res.text().catch(() => '');
            console.error(`Errore Backend (${res.status}):`, errorMsg);
            alert(`⚠️ Errore salvataggio (${res.status}): ${errorMsg}`);
            return;
        }

        const giocatoreAggiornato = await res.json();
        
        const idx = tuttiGiocatori.findIndex(item => String(item.idGiocatore || item.id) === String(idGiocatoreDettaglioCorrente));
        if (idx > -1) {
            tuttiGiocatori[idx] = { 
                ...tuttiGiocatori[idx], 
                ...giocatoreAggiornato,
                nome: giocatore.nome,
                cognome: giocatore.cognome,
                altezza: payload.altezza, 
                peso: payload.peso
            };
        }

        aggiornaSommario(tuttiGiocatori);
        filterPlayers();
        closeModal('modal-detail');

    } catch (err) {
        console.error('Errore di rete:', err);
        alert('⚠️ Server non raggiungibile.');
    }
}

function getValNum(id) {
    const val = document.getElementById(id)?.value;
    return val ? parseInt(val, 10) : 0;
}

async function salvaStatistiche() {
    const idGiocatore = document.getElementById('form-id-giocatore').value;
    if (!idGiocatore) return;

    const g = tuttiGiocatori.find(x => String(x.idGiocatore || x.id) === String(idGiocatore));
    if (!g) return;

    const ruoloStr = (g.posizione || g.ruolo || '').toLowerCase();
    const isPortiere = ruoloStr.includes('por') || g.portiere === true;

    const payload = {
        nome: g.nome || '',
        cognome: g.cognome || '',
        numero: g.numero || 0,
        posizione: g.posizione || g.ruolo || '',
        piede: g.piede || '',
        nazionalita: g.nazionalita || '',
        dataNascita: g.dataNascita || g.data_nascita || null,
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
        const idx = tuttiGiocatori.findIndex(item => String(item.idGiocatore || item.id) === String(idGiocatore));
        if (idx > -1) {
            tuttiGiocatori[idx] = { ...tuttiGiocatori[idx], ...giocatoreSalvato, nome: g.nome, cognome: g.cognome };
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