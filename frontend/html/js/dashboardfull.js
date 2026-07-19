// ==========================================
// STATO GLOBALE (Inizialmente vuoto, popolato dal DB)
// ==========================================
let currentPlayers = [];
let currentEvents = [];
let currentMessages = [];
let currentMatches = [];

// ==========================================
// INIZIALIZZAZIONE DELLA PAGINA
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Avvia la navigazione sulla prima sezione
    nav('dashboard');
    
    // Carica tutti i dati dal Backend
    loadAllData();

    // Event Listeners per i Form
    setupFormListeners();
});

// ==========================================
// CHIAMATE API AL BACKEND (Spring Boot)
// ==========================================
async function loadAllData() {
    try {
        const headers = getAuthHeaders(); // Recupera JWT e Content-Type
        
        // Esegui i fetch in parallelo per ottimizzare i tempi
        const [resPlayers, resEvents, resMessages, resMatches] = await Promise.all([
            fetch('/api/allenatore/giocatori', { headers }),
            fetch('/api/allenatore/eventi', { headers }),
            fetch('/api/allenatore/messaggi', { headers }),
            fetch('/api/allenatore/partite', { headers })
        ]);

        // Parsing dei dati JSON
        currentPlayers = await resPlayers.json();
        currentEvents = await resEvents.json();
        currentMessages = await resMessages.json();
        currentMatches = await resMatches.json();

        // Rendering delle varie sezioni con i dati reali
        renderDashboardSummary();
        renderRosa();
        calRender();
        renderEvTable();
        renderMessaggi();
        renderPartite();

    } catch (error) {
        console.error("Errore nel caricamento dei dati dal backend:", error);
        alert("Impossibile caricare i dati. Verifica la connessione o il login.");
    }
}

// Esempio di invio nuovo evento al DB
async function saveEvent(eventData) {
    try {
        const response = await fetch('/api/allenatore/eventi', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(eventData)
        });

        if (response.ok) {
            const nuovoEvento = await response.json();
            currentEvents.push(nuovoEvento);
            calRender();
            renderEvTable();
            closeModal('evtMdl');
        } else {
            alert("Errore durante il salvataggio dell'evento.");
        }
    } catch (error) {
        console.error("Errore di rete:", error);
    }
}

// Esempio di eliminazione evento dal DB
async function deleteEvent(id) {
    if (!confirm("Vuoi davvero eliminare questo evento?")) return;

    try {
        const response = await fetch(`/api/allenatore/eventi/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (response.ok) {
            currentEvents = currentEvents.filter(e => e.id !== id);
            calRender();
            renderEvTable();
        } else {
            alert("Errore durante l'eliminazione.");
        }
    } catch (error) {
        console.error("Errore di rete:", error);
    }
}

// Esempio di invio messaggio/comunicazione alla squadra
async function sendMsg(msgData) {
    try {
        const response = await fetch('/api/allenatore/messaggi', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(msgData)
        });

        if (response.ok) {
            const nuovoMsg = await response.json();
            currentMessages.unshift(nuovoMsg); // Mette in cima l'ultimo messaggio
            renderMessaggi();
            document.getElementById('msgFrm').reset();
        }
    } catch (error) {
        console.error("Errore nell'invio del messaggio:", error);
    }
}

// ==========================================
// GESTIONE NAVIGAZIONE & INTERFACCIA (UI)
// ==========================================
function nav(secId) {
    document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    
    const targetSection = document.getElementById(secId);
    if (targetSection) targetSection.classList.add('active');
    
    const activeLink = document.querySelector(`.sidebar a[onclick*="${secId}"]`);
    if (activeLink) activeLink.classList.add('active');
}

function openModal(mdlId) {
    const mdl = document.getElementById(mdlId);
    if (mdl) mdl.style.display = 'flex';
}

function closeModal(mdlId) {
    const mdl = document.getElementById(mdlId);
    if (mdl) mdl.style.display = 'none';
}

// ==========================================
// FUNZIONI DI ASCOLTO E ACQUISIZIONE FORM
// ==========================================
function setupFormListeners() {
    // Listener per il form dei messaggi
    const msgFrm = document.getElementById('msgFrm');
    if (msgFrm) {
        msgFrm.addEventListener('submit', (e) => {
            e.preventDefault();
            const msgData = {
                title: document.getElementById('msgTtl').value,
                body: document.getElementById('msgTxt').value,
                date: new Date().toLocaleDateString('it-IT')
            };
            sendMsg(msgData);
        });
    }

    // Listener per il form degli eventi
    const evtFrm = document.getElementById('evtFrm');
    if (evtFrm) {
        evtFrm.addEventListener('submit', (e) => {
            e.preventDefault();
            const eventData = {
                title: document.getElementById('evtTtl').value,
                type: document.getElementById('evtTyp').value,
                date: document.getElementById('evtDat').value,
                time: document.getElementById('evtTim').value,
                loc: document.getElementById('evtLoc').value
            };
            saveEvent(eventData);
        });
    }
}

// ==========================================
// FUNZIONI DI RENDERING HTML (Interfaccia grafica)
// ==========================================
function renderDashboardSummary() {
    // Aggiorna i contatori veloci nella home dell'allenatore
    const plCount = document.getElementById('totalPlayersCount');
    if (plCount) plCount.innerText = currentPlayers.length;
    
    const nextEv = document.getElementById('nextEventSummary');
    if (nextEv && currentEvents.length > 0) {
        // Mostra il primo evento disponibile cronologicamente
        nextEv.innerText = `${currentEvents[0].title} - ${currentEvents[0].date}`;
    }
}

function renderRosa() {
    const grid = document.getElementById('rosaGrid');
    if (!grid) return;
    grid.innerHTML = '';

    currentPlayers.forEach(p => {
        const c = document.createElement('div');
        c.className = 'player-card';
        c.innerHTML = `
            <h3>${p.name}</h3>
            <p>Ruolo: ${p.role}</p>
            <p>N. Maglia: ${p.number}</p>
            <button onclick="viewPlayerDetails(${p.id})">Vedi Statistiche</button>
        `;
        grid.appendChild(c);
    });
}

function viewPlayerDetails(id) {
    const p = currentPlayers.find(pl => pl.id === id);
    if (!p) return;

    document.getElementById('detNm').innerText = p.name;
    document.getElementById('detRl').innerText = p.role;
    
    // Disegna i grafici basati sulle statistiche del giocatore del DB
    if (p.stats) {
        drawLineChart(p.stats.growth || []);
        drawRadar(p.stats.skills || [50, 50, 50, 50, 50]);
    }
    
    openModal('detMdl');
}

function calRender() {
    const grid = document.getElementById('calGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Genera 30 giorni fittizi per il calendario visivo
    for (let i = 1; i <= 30; i++) {
        const d = document.createElement('div');
        d.className = 'cal-day';
        d.innerHTML = `<span class="day-num">${i}</span>`;
        
        // Cerca se ci sono eventi del DB in questo giorno del mese corrente (es. formato "2026-07-XX")
        const dayStr = i < 10 ? `0${i}` : `${i}`;
        const hasEvent = currentEvents.some(e => e.date.endsWith(`-${dayStr}`));
        
        if (hasEvent) {
            d.classList.add('has-event');
        }
        
        grid.appendChild(d);
    }
}

function renderEvTable() {
    const tbody = document.getElementById('evTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    currentEvents.forEach(e => {
        const r = document.createElement('tr');
        r.innerHTML = `
            <td>${e.date} ${e.time}</td>
            <td><span class="badge ${e.type}">${e.type.toUpperCase()}</span></td>
            <td>${e.title}</td>
            <td>${e.loc}</td>
            <td><button class="btn-del" onclick="deleteEvent(${e.id})">Elimina</button></td>
        `;
        tbody.appendChild(r);
    });
}

function renderMessaggi() {
    const list = document.getElementById('msgLst');
    if (!list) return;
    list.innerHTML = '';

    currentMessages.forEach(m => {
        const item = document.createElement('div');
        item.className = 'msg-item';
        item.innerHTML = `
            <h4>${m.title} <small>${m.date}</small></h4>
            <p>${m.body}</p>
        `;
        list.appendChild(item);
    });
}

function renderPartite() {
    const container = document.getElementById('partiteList');
    if (!container) return;
    container.innerHTML = '';

    currentMatches.forEach(m => {
        const div = document.createElement('div');
        div.className = 'match-card';
        div.innerHTML = `
            <div class="match-info">${m.date} - ${m.competition}</div>
            <div class="match-teams">
                <span><strong>La Mia Squadra</strong></span> 
                <span class="score">${m.scoreHome} - ${m.scoreAway}</span> 
                <span>${m.opponent}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

// ==========================================
// LOGICA GRAFICA (SVG)
// ==========================================
function drawLineChart(data) {
    const svg = document.getElementById('lineChart');
    if (!svg) return;
    if (data.length === 0) {
        svg.innerHTML = '<text x="10" y="20">Nessun dato di crescita</text>';
        return;
    }

    let pts = "";
    const stepX = 260 / (data.length - 1 || 1);
    data.forEach((val, idx) => {
        const x = 30 + (idx * stepX);
        const y = 120 - (val * 1); // Scala il valore sull'asse Y
        pts += `${x},${y} `;
    });

    svg.innerHTML = `
        <polyline points="${pts.trim()}" fill="none" stroke="#007bff" stroke-width="3"/>
        ${data.map((val, idx) => `<circle cx="${30 + (idx * stepX)}" cy="${120 - (val * 1)}" r="4" fill="#fff" stroke="#007bff" stroke-width="2"/>`).join('')}
    `;
}

function drawRadar(skills) {
    const svg = document.getElementById('radarChart');
    if (!svg) return;

    const center = 100;
    const maxR = 70;
    // Angoli fissi per le 5 abilità del radar (Velocità, Resistenza, Tecnica, Tattica, Forza)
    const angles = [-Math.PI/2, -Math.PI/2 + (2*Math.PI/5), -Math.PI/2 + (4*Math.PI/5), -Math.PI/2 + (6*Math.PI/5), -Math.PI/2 + (8*Math.PI/5)];
    
    let pts = "";
    skills.forEach((sk, i) => {
        const r = (sk / 100) * maxR;
        const x = center + r * Math.cos(angles[i]);
        const y = center + r * Math.sin(angles[i]);
        pts += `${x},${y} `;
    });

    svg.innerHTML = `
        <!-- Background Radar Poly (Max 100) -->
        <polygon points="${angles.map(a => `${center + maxR*Math.cos(a)},${center + maxR*Math.sin(a)}`).join(' ')}" fill="none" stroke="#e0e0e0" stroke-width="1"/>
        <!-- Player Stats Poly -->
        <polygon points="${pts.trim()}" fill="rgba(0, 123, 255, 0.2)" stroke="#007bff" stroke-width="2"/>
    `;
}