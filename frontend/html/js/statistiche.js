/* ==========================================================================
   1. CONFIGURAZIONE API E VARIABILI GLOBALI DI STATO
   ========================================================================== */
const API_BASE_URL = 'http://localhost:8080/api';
const token = localStorage.getItem('token');      

let PLAYERS = [];         
let MATCHES = [];         
let CURRENT_KPI = {};     
let ruoloUtente = '';     
let mioNomeStat = '';     

/* ==========================================================================
   2. INIZIALIZZAZIONE DELLA PAGINA (EVENTO DOMContentLoaded)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof verificaAutenticazione === 'function') {
      verificaAutenticazione(); 
  }

  const sbName = document.getElementById('sb-nome');    
  const sbRole = document.getElementById('sb-ruolo');   
  const sbAv   = document.getElementById('sb-avatar');  
  
  const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Utente';
  const cognome = localStorage.getItem('cognomeReale') || '';
  const ruolo   = localStorage.getItem('ruolo')        || '';
    
  if (sbName) sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
  if (sbRole && ruolo) {
    sbRole.textContent = ruolo;
  }
  if (sbAv && typeof renderAvatar === 'function') {
      renderAvatar(sbAv, (nome[0]||('')).toUpperCase() + (cognome[0]||nome[1]||'').toUpperCase());
  }

  ruoloUtente = ruolo.toUpperCase();
  mioNomeStat = nome ? `${nome.charAt(0).toUpperCase()}. ${cognome}` : '';
  
  if (ruoloUtente === 'GIOCATORE') nascondiSezioniSquadra();

  aggiornaInterfacciaCaricamento();

  const ruoloCorrente = (localStorage.getItem('ruolo') || '').toUpperCase();
  if (ruoloCorrente === 'DIRIGENZA') {
      document.querySelectorAll('.sidebar a, .sidebar-menu a, nav a, .nav-item').forEach(el => {
          const text = el.textContent.toLowerCase();
          const href = el.getAttribute('href') || '';
          if (text.includes('messagg') || href.includes('messaggi.html')) {
              const containerToHide = el.closest('li') || el.closest('.nav-item') || el;
              containerToHide.style.display = 'none';
          }
      });
  }

  await Promise.all([
    caricaDatiSquadra(),  
    caricaDatiGiocatori() 
  ]);
});

/* ==========================================================================
   3. REPERIMENTO DATI DAL BACKEND (CHIAMATE HTTP API)
   ========================================================================== */
async function caricaDatiSquadra() {
  try {
    const response = await fetch(`${API_BASE_URL}/statistiche/squadra`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Errore nel recupero dei dati squadra');
      
    const data = await response.json();
    CURRENT_KPI = data.kpi || {};
    popolaKpiSquadra(CURRENT_KPI);
  } catch (error) {
    console.error('Errore nel caricamento della squadra:', error);
  }
}

async function caricaDatiGiocatori() {
  try {
    const response = await fetch(`${API_BASE_URL}/statistiche/giocatori`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Errore nel recupero dei giocatori');
    const data = await response.json();
        
    PLAYERS = data.map(p => {
        const isGK = Boolean(p.portiere);
        const presenze = p.presenze ?? p.pres ?? 0;
        const presenzeTitolare = p.presenzeTitolare ?? 0;
        const minutiGiocati = p.minutiGiocati ?? 0;
        const ammonizioni = p.ammonizioni ?? p.amm ?? 0;
        const espulsioni = p.espulsioni ?? p.esp ?? 0;
        const falliCommessi = p.falliCommessi ?? 0;
        const falliSubiti = p.falliSubiti ?? 0;
        const assist = p.assist ?? p.ass ?? 0;
        const duelliAereiVinti = p.duelliAereiVinti ?? 0;
        const duelliAereiPersi = p.duelliAereiPersi ?? 0;
        const duelliVinti = p.duelliVinti ?? 0;
        const duelliPersi = p.duelliPersi ?? 0;
        const passaggiTentati = p.passaggiTentati ?? 0;
        const passaggiRiusciti = p.passaggiRiusciti ?? 0;
        const passaggiChiave = p.passaggiChiave ?? 0;
        const dribblingTentati = p.dribblingTentati ?? p.driblingTentati ?? 0;
        const dribblingRiusciti = p.dribblingRiusciti ?? p.driblingRiusciti ?? 0;
        const palloniIntercettati = p.palloniIntercettati ?? p.intercetti ?? 0;

        const normalized = {
            ...p,
            portiere: isGK,
            nome: p.nomeCompleto || `${p.nome || ''} ${p.cognome || ''}`.trim() || 'Giocatore',
            presenze,
            presenzeTitolare,
            minutiGiocati,
            ammonizioni,
            espulsioni,
            falliCommessi,
            falliSubiti,
            assist,
            duelliAereiVinti,
            duelliAereiPersi,
            duelliVinti,
            duelliPersi,
            passaggiTentati,
            passaggiRiusciti,
            passaggiChiave,
            dribblingTentati,
            dribblingRiusciti,
            palloniIntercettati,
            pres: presenze,
            ass: assist,
            interc: palloniIntercettati,
            amm: ammonizioni,
            esp: espulsioni
        };

        if (isGK) {
            normalized.parate = p.parate ?? 0;
            normalized.cleanSheet = p.cleanSheet ?? 0;
            normalized.goalSubiti = p.goalSubiti ?? 0;
            normalized.rigoriParati = p.rigoriParati ?? 0;
            normalized.rigoriSubiti = p.rigoriSubiti ?? 0;
            normalized.gol = 0;
            normalized.tiri = 0;
        } else {
            normalized.goalRigore = p.goalRigore ?? p.golRigore ?? 0;
            normalized.goalTesta = p.goalTesta ?? p.golTesta ?? 0;
            normalized.goalPunizione = p.goalPunizione ?? p.golPunizione ?? 0;
            normalized.golTotali = p.golTotali ?? p.gol ?? 0;
            normalized.tiriTotali = p.tiriTotali ?? p.tiri ?? 0;
            normalized.tiriInPorta = p.tiriInPorta ?? 0;
            normalized.paliTraverse = p.paliTraverse ?? 0;
            normalized.bigChanceMancate = p.bigChanceMancate ?? 0;
            normalized.bigChanceCreate = p.bigChanceCreate ?? 0;
            normalized.crossTentati = p.crossTentati ?? 0;
            normalized.crossRiusciti = p.crossRiusciti ?? 0;
            normalized.tackle = p.tackle ?? p.tackel ?? 0;
            normalized.palloniRubati = p.palloniRubati ?? 0;
            normalized.gol = normalized.golTotali;
            normalized.tiri = normalized.tiriTotali;
        }
        return normalized;
    });
        
    if (PLAYERS.length > 0) {
      buildSelector();    
      renderConfronto();  
      renderTop5Squadra();
      popolaKpiSquadra(CURRENT_KPI);
    } else {
      document.getElementById('player-selector').innerHTML = "<p>Nessun giocatore trovato.</p>";
    }
  } catch (error) {
    console.error('Errore nel caricamento dei giocatori:', error);
  }
}

/* ==========================================================================
   4. POPOLAMENTO ELEMENTI STATICI E KPI DI SQUADRA (AGGIORNATO DB)
   ========================================================================== */
function popolaKpiSquadra(kpi = {}) {
  CURRENT_KPI = kpi;
  const impostaTesto = (id, valore) => {
    const el = document.getElementById(id);
    if (el) el.textContent = valore;
  };

  const aggiornaBarra = (idTesto, idBarra, valore, maxValore, isPercentuale = false) => {
    const val = Number(valore ?? 0);
    impostaTesto(idTesto, isPercentuale ? `${val.toFixed(0)}%` : val.toFixed(0));
    const barra = document.getElementById(idBarra);
    if (barra) {
      let percentuale = isPercentuale ? val : (val / maxValore) * 100;
      barra.style.width = `${Math.min(Math.max(percentuale, 0), 100)}%`;
    }
  };

  const aggiornaDonut = (idTesto, idCerchio, valorePercentuale) => {
    const pct = Math.min(Math.max(Number(valorePercentuale) || 0, 0), 100);
    impostaTesto(idTesto, `${pct.toFixed(0)}%`);
    const cerchio = document.getElementById(idCerchio);
    if (cerchio) {
      cerchio.setAttribute('stroke-dasharray', `${pct.toFixed(1)} ${100 - pct.toFixed(1)}`);
    }
  };

  const activeSquadraId = PLAYERS.length > 0 ? PLAYERS[0].squadraId : null;
  const teamPlayers = activeSquadraId !== undefined && activeSquadraId !== null 
    ? PLAYERS.filter(p => p.squadraId === activeSquadraId) 
    : PLAYERS;
  const movPlayers = teamPlayers.filter(p => !p.portiere);
  const gkPlayers  = teamPlayers.filter(p =>  p.portiere);

  // --- 1. KPI STRIP ESATTE ---
  const sumGolFatti  = movPlayers.reduce((s, p) => s + Number(p.golTotali || p.gol || 0), 0);
  const sumGolSubiti = gkPlayers.reduce((s, p) => s + Number(p.goalSubiti || 0), 0);
  const sumRigoriFatti = movPlayers.reduce((s, p) => s + Number(p.goalRigore || p.golRigore || 0), 0);
  
  impostaTesto('kpi-gol-fatti', sumGolFatti);
  impostaTesto('kpi-rigoriFatti', sumRigoriFatti);
  impostaTesto('kpi-gol-subiti', sumGolSubiti);

  const passRiusciti = teamPlayers.reduce((s, p) => s + Number(p.passaggiRiusciti || 0), 0);
  const passTentati  = teamPlayers.reduce((s, p) => s + Number(p.passaggiTentati || 0), 0);
  const pctPassaggi  = passTentati > 0 ? (passRiusciti / passTentati) * 100 : 0;
  impostaTesto('kpi-pct-passaggi', `${pctPassaggi.toFixed(0)}%`);

  const dribVintiTot = movPlayers.reduce((s, p) => s + Number(p.dribblingRiusciti || p.driblingRiusciti || 0), 0);
  const dribTentati  = movPlayers.reduce((s, p) => s + Number(p.dribblingTentati || p.driblingTentati || 0), 0);
  const pctDrib      = dribTentati > 0 ? (dribVintiTot / dribTentati) * 100 : 0;
  impostaTesto('kpi-pct-dribbling', `${pctDrib.toFixed(0)}%`);

  const dvVinti = teamPlayers.reduce((s, p) => s + Number(p.duelliVinti || 0) + Number(p.duelliAereiVinti || 0), 0);
  const dvPersi = teamPlayers.reduce((s, p) => s + Number(p.duelliPersi || 0) + Number(p.duelliAereiPersi || 0), 0);
  const dvTot   = dvVinti + dvPersi;
  const pctDuelli = dvTot > 0 ? (dvVinti / dvTot) * 100 : 0;
  impostaTesto('kpi-pct-duelli', `${pctDuelli.toFixed(0)}%`);

  const crossRiusciti = movPlayers.reduce((s, p) => s + Number(p.crossRiusciti || 0), 0);
  const crossTentati  = movPlayers.reduce((s, p) => s + Number(p.crossTentati || 0), 0);
  const pctCross      = crossTentati > 0 ? (crossRiusciti / crossTentati) * 100 : 0;
  impostaTesto('kpi-pct-cross', `${pctCross.toFixed(0)}%`);

  const sumRigoriParati = gkPlayers.reduce((s, p) => s + Number(p.rigoriParati || 0), 0);
  const sumParateTotali = gkPlayers.reduce((s, p) => s + Number(p.parate || 0), 0);
  impostaTesto('kpi-info-parate', `${sumRigoriParati} & ${sumParateTotali}`);

  // --- 2. BARRE RENDIMENTO OFFENSIVO / DIFENSIVO (Tab Squadra) ---const sumGolFatti       = movPlayers.reduce((s, p) => s + Number(p.golTotali || p.gol || 0), 0);
  const sumTiriInPorta    = movPlayers.reduce((s, p) => s + Number(p.tiriInPorta || 0), 0);
  const sumTiriTotali     = movPlayers.reduce((s, p) => s + Number(p.tiriTotali || p.tiri || 0), 0);
  const sumBigChanceCre   = movPlayers.reduce((s, p) => s + Number(p.bigChanceCreate || 0), 0);
  const sumGolTestaRigore = movPlayers.reduce((s, p) => s + Number(p.goalTesta || p.golTesta || 0) + Number(p.goalRigore || p.golRigore || 0), 0);
  const convRatioOff      = sumTiriTotali > 0 ? (sumGolFatti / sumTiriTotali) * 100 : 0;

  aggiornaBarra('txt-off-gol', 'bar-off-gol', sumGolFatti, 80);          
  aggiornaBarra('txt-off-tiri', 'bar-off-tiri', sumTiriInPorta, 150);       
  aggiornaBarra('txt-off-conversione', 'bar-off-conversione', convRatioOff, 100, true); 
  aggiornaBarra('txt-off-chance', 'bar-off-chance', sumBigChanceCre, 60);
  aggiornaBarra('txt-off-speciali', 'bar-off-speciali', sumGolTestaRigore, 30);

  const sumCleanSheet   = gkPlayers.reduce((s, p) => s + Number(p.cleanSheet || 0), 0);
  const sumTackleRubati = movPlayers.reduce((s, p) => s + Number(p.tackle || 0) + Number(p.palloniRubati || 0), 0);
  const sumIntercetti   = teamPlayers.reduce((s, p) => s + Number(p.palloniIntercettati || 0), 0);
  const sumRigSubitiGK  = gkPlayers.reduce((s, p) => s + Number(p.rigoriSubiti || 0), 0);
  const sumRigParatiGK  = gkPlayers.reduce((s, p) => s + Number(p.rigoriParati || 0), 0);

  aggiornaBarra('txt-def-gol', 'bar-def-gol', sumGolSubiti, 60);
  aggiornaBarra('txt-def-clean', 'bar-def-clean', sumCleanSheet, 20); 
  aggiornaBarra('txt-def-tackle', 'bar-def-tackle', sumTackleRubati, 300);
  aggiornaBarra('txt-def-intercetti', 'bar-def-intercetti', sumIntercetti, 250);
  aggiornaBarra('txt-def-rigori', 'bar-def-rigori', sumRigParatiGK, Math.max(1, sumRigSubitiGK));

  // --- 3. DONUT APPROFONDIMENTO (Spaccati di rendimento) ---
  const sumGolTotali     = movPlayers.reduce((s, p) => s + Number(p.golTotali || p.gol || 0), 0);
  const sumGolTesta      = movPlayers.reduce((s, p) => s + Number(p.goalTesta || p.golTesta || 0), 0);
  const sumGolRigore     = movPlayers.reduce((s, p) => s + Number(p.goalRigore || p.golRigore || 0), 0);
  
  aggiornaDonut('val-share-testa', 'circle-share-testa', sumGolTotali > 0 ? (sumGolTesta / sumGolTotali) * 100 : 0);
  aggiornaDonut('val-share-rigore', 'circle-share-rigore', sumGolTotali > 0 ? (sumGolRigore / sumGolTotali) * 100 : 0);

  const totAerei = teamPlayers.reduce((s, p) => s + Number(p.duelliAereiVinti || 0) + Number(p.duelliAereiPersi || 0), 0);
  const winAerei = teamPlayers.reduce((s, p) => s + Number(p.duelliAereiVinti || 0), 0);
  aggiornaDonut('val-duelli-aerei', 'circle-duelli-aerei', totAerei > 0 ? (winAerei / totAerei) * 100 : 0);

  const totTerra = teamPlayers.reduce((s, p) => s + Number(p.duelliVinti || 0) + Number(p.duelliPersi || 0), 0);
  const winTerra = teamPlayers.reduce((s, p) => s + Number(p.duelliVinti || 0), 0);
  aggiornaDonut('val-duelli-terra', 'circle-duelli-terra', totTerra > 0 ? (winTerra / totTerra) * 100 : 0);

  const maxPresenze = teamPlayers.reduce((max, p) => Math.max(max, Number(p.presenze || 0)), 1);
  aggiornaDonut('val-cleansheet-pct', 'circle-cleansheet-pct', maxPresenze > 0 ? Math.min((sumCleanSheet / maxPresenze) * 100, 100) : 0);

  const sumTiriTot   = movPlayers.reduce((s, p) => s + Number(p.tiriTotali || p.tiri || 0), 0);
  const sumTiriInPor = movPlayers.reduce((s, p) => s + Number(p.tiriInPorta || 0), 0);
  aggiornaDonut('val-tiri-specchio', 'circle-tiri-specchio', sumTiriTot > 0 ? (sumTiriInPor / sumTiriTot) * 100 : 0);

  renderTop5Squadra();
}

/* ==========================================================================
   5. ADATTAMENTO INTERFACCIA E UTILITIES
   ========================================================================== */
function aggiornaInterfacciaCaricamento() {
    const el = document.getElementById('player-selector');
    if (el) el.innerHTML = "Caricamento giocatori...";
}

function nascondiSezioniSquadra() {
  const nascondi = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };

  nascondi('card-line-chart');
  nascondi('grid-stat-donuts');
  nascondi('card-classifica-marcatori');

  const kpiStrip = document.querySelector('.kpi-strip');
  if (kpiStrip) kpiStrip.style.display = 'none';

  const tabOrder = ['squadra', 'individuale', 'confronto', 'forma'];
  const tabButtons = document.querySelectorAll('.tab');
  ['squadra', 'confronto'].forEach(name => {
    const idx = tabOrder.indexOf(name);
    if (tabButtons[idx]) tabButtons[idx].style.display = 'none';  
  });

  const h1 = document.querySelector('.topbar h1');
  if (h1) h1.textContent = 'Le mie statistiche';

  switchTab('individuale');
}

function switchTab(name){
  document.querySelectorAll('.tab').forEach((t,i)=>{
    t.classList.toggle('active',['squadra','individuale','confronto','forma'][i]===name);
  });
  document.querySelectorAll('.tab-panel').forEach(p=>{
    p.classList.toggle('active',p.id==='tab-'+name);
  });
}

/* ==========================================================================
   6. GRAFICO RADAR (SPIDER CHART)
   ========================================================================== */
const RADAR_CATS=['Gol','Assist','Passaggi','Dribbling','Duelli','Intercetti'];

function radarPts(vals,max=100,r=100){
  return vals.map((v,i)=>{
    const angle=(2*Math.PI*i/vals.length)-Math.PI/2;  
    const d=(v/max)*r;                                   
    return [d*Math.cos(angle),d*Math.sin(angle)];     
  });
}

function drawRadar(idx){
  const p = PLAYERS[idx];   
  const svg = document.getElementById('radar-svg');
  if(!svg || !p) return;  
  
  const isGK = Boolean(p.portiere);
  
  const cats = isGK 
    ? ['Parate', 'Clean Sheet', 'Passaggi', 'Duelli', 'Intercetti', 'Ammoniz.']
    : RADAR_CATS; 

  const maxVals = isGK 
    ? [80, 15, 1500, 50, 30, 10] 
    : [20, 12, 1500, 50, 50, 30];

  const vals = isGK 
    ? [p.parate, p.cleanSheet, p.passaggiRiusciti, p.duelliVinti, p.palloniIntercettati, p.ammonizioni]
    : [p.golTotali, p.assist, p.passaggiRiusciti, p.dribblingRiusciti, p.duelliVinti, p.palloniIntercettati];

  const N = cats.length, R = 100;
  let html = '';

  for(let ring = 1; ring <= 5; ring++){
    const pts = cats.map((_, i) => {
      const a = (2 * Math.PI * i / N) - Math.PI / 2;
      const r2 = (ring / 5) * R;
      return `${(r2 * Math.cos(a)).toFixed(1)},${(r2 * Math.sin(a)).toFixed(1)}`;
    });
    html += `<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(48,54,61,.7)" stroke-width="1"/>`;
  }

  cats.forEach((cat, i) => {
    const a = (2 * Math.PI * i / N) - Math.PI / 2;
    html += `<line x1="0" y1="0" x2="${(R * Math.cos(a)).toFixed(1)}" y2="${(R * Math.sin(a)).toFixed(1)}" stroke="rgba(48,54,61,.8)" stroke-width="1"/>`;
    const lx = (R * 1.2 * Math.cos(a)).toFixed(1);
    const ly = (R * 1.2 * Math.sin(a)).toFixed(1);
    html += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#8b949e">${cat}</text>`;
  });

  const pts = radarPts(vals.map((v, i) => Math.min((v || 0) / maxVals[i] * 100, 100)), 100, R);
  const poly = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  const color = isGK ? '#f59e0b' : '#4caf50';
  const fillColor = isGK ? 'rgba(245, 158, 11, 0.15)' : 'rgba(76, 175, 80, 0.15)';

  html += `<polygon points="${poly}" fill="${fillColor}" stroke="${color}" stroke-width="2"/>`;
  pts.forEach(([x, y]) => { html += `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`; });
  
  svg.innerHTML = html;
  const nameEl = document.getElementById('radar-name');
  if (nameEl) nameEl.textContent = `${p.nome} ${isGK ? '(POR)' : ''}`;
}

/* ==========================================================================
   7. STATISTICHE DETTAGLIATE & MODIFICA
   ========================================================================== */
function renderIndivBars(idx){
  const p = PLAYERS[idx]; 
  if(!p) return;

  const isGK = Boolean(p.portiere);
  
  const getSquadMax = (key, fallback) => {
    if (!PLAYERS || PLAYERS.length === 0) return fallback;
    const vals = PLAYERS.map(item => Number(item[key] || 0));
    const maxVal = Math.max(...vals, 0);
    return maxVal > 0 ? maxVal : fallback;
  };

  const buildItem = (label, val, key, fallbackMax, colorClass, ratioKey = null) => {
    const v = Number(val || 0);
    let pct = 0;
    if (ratioKey) {
      const baseVal = Number(p[ratioKey] || 0);
      pct = baseVal > 0 ? (v / baseVal) * 100 : 0;
    } else {
      const maxVal = getSquadMax(key, fallbackMax);
      pct = maxVal > 0 ? (v / maxVal) * 100 : 0;
    }
    return { 
      label, 
      val: v, 
      pct: Math.min(Math.max(pct, 0), 100).toFixed(0), 
      colorClass 
    };
  };

  let items = [
    buildItem('Presenze', p.presenze, 'presenze', 38, 'fill-green'),
    buildItem('Presenze Titolare', p.presenzeTitolare, 'presenzeTitolare', 38, 'fill-green'),
    buildItem('Minuti Giocati', p.minutiGiocati, 'minutiGiocati', 3420, 'fill-blue'),
    buildItem('Ammonizioni', p.ammonizioni, 'ammonizioni', 38, 'fill-amber'),
    buildItem('Espulsioni', p.espulsioni, 'espulsioni', 38, 'fill-amber'),
    buildItem('Falli Commessi', p.falliCommessi, 'falliCommessi', 115, 'fill-amber'),
    buildItem('Falli Subiti', p.falliSubiti, 'falliSubiti', 150, 'fill-blue'),
    buildItem('Assist', p.assist, 'assist', 40, 'fill-blue'),
    buildItem('Duelli Aerei Vinti', p.duelliAereiVinti, 'duelliAereiVinti', 150, 'fill-amber'),
    buildItem('Duelli Aerei Persi', p.duelliAereiPersi, 'duelliAereiPersi', 150, 'fill-amber'),
    buildItem('Duelli Vinti', p.duelliVinti, 'duelliVinti', 180, 'fill-amber'),
    buildItem('Duelli Persi', p.duelliPersi, 'duelliPersi', 180, 'fill-amber'),
    buildItem('Passaggi Tentati', p.passaggiTentati, 'passaggiTentati', 1500, 'fill-blue'),
    buildItem('Passaggi Riusciti', p.passaggiRiusciti, 'passaggiRiusciti', 1500, 'fill-blue', 'passaggiTentati'),
    buildItem('Passaggi Chiave', p.passaggiChiave, 'passaggiChiave', 40, 'fill-blue'),
    buildItem('Dribbling Tentati', p.dribblingTentati, 'dribblingTentati', 150, 'fill-green'),
    buildItem('Dribbling Riusciti', p.dribblingRiusciti, 'dribblingRiusciti', 150, 'fill-green', 'dribblingTentati'),
    buildItem('Palloni Intercettati', p.palloniIntercettati, 'palloniIntercettati', 150, 'fill-green')
  ];

  if (isGK) {
    const gkSpecifics = [
      buildItem('Parate', p.parate, 'parate', 250, 'fill-blue'),
      buildItem('Clean Sheet', p.cleanSheet, 'cleanSheet', 38, 'fill-green'),
      buildItem('Gol Subiti', p.goalSubiti, 'goalSubiti', 80, 'fill-amber'),
      buildItem('Rigori Parati', p.rigoriParati, 'rigoriParati', 40, 'fill-green'),
      buildItem('Rigori Subiti', p.rigoriSubiti, 'rigoriSubiti', 40, 'fill-amber')
    ];
    items = [...items, ...gkSpecifics];
  } else {
    const movSpecifics = [
      buildItem('Gol su Rigore', p.goalRigore, 'goalRigore', 40, 'fill-green'),
      buildItem('Gol di Testa', p.goalTesta, 'goalTesta', 40, 'fill-green'),
      buildItem('Gol su Punizione', p.goalPunizione, 'goalPunizione', 40, 'fill-green'),
      buildItem('Gol Totali', p.golTotali ?? p.gol, 'golTotali', 45, 'fill-green'),
      buildItem('Tiri Totali', p.tiriTotali, 'tiriTotali', 100, 'fill-amber'),
      buildItem('Tiri in Porta', p.tiriInPorta, 'tiriInPorta', 100, 'fill-amber'),
      buildItem('Pali / Traverse', p.paliTraverse, 'paliTraverse', 50, 'fill-amber'),
      buildItem('Big Chance Mancate', p.bigChanceMancate, 'bigChanceMancate', 50, 'fill-amber'),
      buildItem('Big Chance Create', p.bigChanceCreate, 'bigChanceCreate', 50, 'fill-blue'),
      buildItem('Cross Tentati', p.crossTentati, 'crossTentati', 100, 'fill-blue'),
      buildItem('Cross Riusciti', p.crossRiusciti, 'crossRiusciti', 100, 'fill-blue', 'crossTentati'),
      buildItem('Tackle', p.tackle, 'tackle', 100, 'fill-green'),
      buildItem('Palloni Rubati', p.palloniRubati, 'palloniRubati', 100, 'fill-green')
    ];
    items = [...items, ...movSpecifics];
  }

  const headerAction = document.getElementById('indiv-header-action');
  if (headerAction) {
    // Inibito per GIOCATORE e DIRIGENZA
    if (ruoloUtente !== 'GIOCATORE' && ruoloUtente !== 'DIRIGENZA') {
      headerAction.innerHTML = `
        <button onclick="apriModalModifica(${idx})" style="background: #238636; color: white; border: none; padding: 0.3rem 0.75rem; border-radius: 5px; cursor: pointer; font-weight: 600; font-family: inherit; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 4px;">
          ✏️ Modifica
        </button>
      `;
    } else {
      headerAction.innerHTML = '';
    }
  }

  const html = items.map(it => `
    <div class="bc-row">
      <div class="bc-label">
        <span class="name">${it.label}</span>
        <span>${it.val}</span>
      </div>
      <div class="bc-track">
        <div class="bc-fill ${it.colorClass}" style="width:${it.pct}%"></div>
      </div>
    </div>
  `).join('');

  const container = document.getElementById('indiv-bars');
  if (container) container.innerHTML = html;
}

function apriModalModifica(idx) {
  if (ruoloUtente === 'GIOCATORE' || ruoloUtente === 'DIRIGENZA') return;

  const p = PLAYERS[idx];
  if (!p) return;

  const playerId = p.id ?? p.giocatoreId;
  const oldModal = document.getElementById('edit-modal-overlay');
  if (oldModal) oldModal.remove();

  const isGK = Boolean(p.portiere);
  const fieldsCommon = [
    { label: 'Presenze', key: 'presenze' },
    { label: 'Presenze Titolare', key: 'presenzeTitolare' },
    { label: 'Minuti Giocati', key: 'minutiGiocati' },
    { label: 'Ammonizioni', key: 'ammonizioni' },
    { label: 'Espulsioni', key: 'espulsioni' },
    { label: 'Falli Commessi', key: 'falliCommessi' },
    { label: 'Falli Subiti', key: 'falliSubiti' },
    { label: 'Assist', key: 'assist' },
    { label: 'Duelli Aerei Vinti', key: 'duelliAereiVinti' },
    { label: 'Duelli Aerei Persi', key: 'duelliAereiPersi' },
    { label: 'Duelli Vinti', key: 'duelliVinti' },
    { label: 'Duelli Persi', key: 'duelliPersi' },
    { label: 'Passaggi Tentati', key: 'passaggiTentati' },
    { label: 'Passaggi Riusciti', key: 'passaggiRiusciti' },
    { label: 'Passaggi Chiave', key: 'passaggiChiave' },
    { label: 'Dribbling Tentati', key: 'dribblingTentati' },
    { label: 'Dribbling Riusciti', key: 'dribblingRiusciti' },
    { label: 'Palloni Intercettati', key: 'palloniIntercettati' }
  ];

  const fieldsSpecific = isGK ? [
    { label: 'Parate', key: 'parate' },
    { label: 'Clean Sheet', key: 'cleanSheet' },
    { label: 'Gol Subiti', key: 'goalSubiti' },
    { label: 'Rigori Parati', key: 'rigoriParati' },
    { label: 'Rigori Subiti', key: 'rigoriSubiti' }
  ] : [
    { label: 'Gol su Rigore', key: 'goalRigore' },
    { label: 'Gol di Testa', key: 'goalTesta' },
    { label: 'Gol su Punizione', key: 'goalPunizione' },
    { label: 'Gol Totali', key: 'golTotali' },
    { label: 'Tiri Totali', key: 'tiriTotali' },
    { label: 'Tiri in Porta', key: 'tiriInPorta' },
    { label: 'Pali / Traverse', key: 'paliTraverse' },
    { label: 'Big Chance Mancate', key: 'bigChanceMancate' },
    { label: 'Big Chance Create', key: 'bigChanceCreate' },
    { label: 'Cross Tentati', key: 'crossTentati' },
    { label: 'Cross Riusciti', key: 'crossRiusciti' },
    { label: 'Tackle', key: 'tackle' },
    { label: 'Palloni Rubati', key: 'palloniRubati' }
  ];

  const allFields = [...fieldsCommon, ...fieldsSpecific];

  let formHtml = allFields.map(f => `
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <label style="font-size: 0.85rem; color: #8b949e; font-weight: 600;">${f.label}</label>
      <input type="number" name="${f.key}" value="${p[f.key] ?? 0}" style="background: #0d1117; border: 1px solid #30363d; color: #e6edf3; padding: 6px 10px; border-radius: 6px; font-size: 0.95rem;" />
    </div>
  `).join('');

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'edit-modal-overlay';
  modalOverlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.75); display: flex; align-items: center; justify-content: center;
    z-index: 9999; backdrop-filter: blur(4px);
  `;

  modalOverlay.innerHTML = `
    <div style="background: #161b22; border: 1px solid #30363d; border-radius: 12px; width: 650px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 16px 32px rgba(0,0,0,0.6);">
      <div style="padding: 1.25rem; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; color: #e6edf3; font-family: 'Barlow Condensed', sans-serif; font-size: 1.4rem;">Modifica Statistiche: ${p.nome}</h3>
        <button onclick="document.getElementById('edit-modal-overlay').remove()" style="background: transparent; border: none; color: #8b949e; font-size: 1.5rem; cursor: pointer;">&times;</button>
      </div>
      <form id="edit-stats-form" style="padding: 1.25rem; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; flex: 1;">
        ${formHtml}
      </form>
      <div style="padding: 1.25rem; border-top: 1px solid #30363d; display: flex; justify-content: flex-end; gap: 10px;">
        <button type="button" onclick="document.getElementById('edit-modal-overlay').remove()" style="background: #21262d; color: #e6edf3; border: 1px solid #30363d; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600;">Annulla</button>
        <button type="button" onclick="salvaStatistiche(${playerId})" style="background: #238636; color: white; border: none; padding: 0.5rem 1.25rem; border-radius: 6px; cursor: pointer; font-weight: 600;">Salva Modifiche</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);
}

async function salvaStatistiche(playerId) {
  if (ruoloUtente === 'GIOCATORE' || ruoloUtente === 'DIRIGENZA') return;

  const form = document.getElementById('edit-stats-form');
  if (!form) return;

  const formData = new FormData(form);
  const payload = {};
  for (const [key, value] of formData.entries()) {
    payload[key] = Number(value) || 0;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/statistiche/giocatore/${playerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Errore del server (${response.status}): ${errorText}`);
    }

    alert('Statistiche aggiornate con successo!');
    const overlay = document.getElementById('edit-modal-overlay');
    if (overlay) overlay.remove();
    
    await Promise.all([
      caricaDatiSquadra(),
      caricaDatiGiocatori()
    ]);
  } catch (error) {
    console.error('Errore dettagliato:', error);
    alert('Errore nel salvataggio. Controlla la console (F12) per i dettagli.');
  }
}


function renderTop5Squadra() {
  const cols = ['#facc15','#94a3b8','#b45309','#4caf50','#4caf50'];

  // Top 5 Marcatori
  const cGol = document.getElementById('top5-gol-list');
  if (cGol) {
    const sorted = [...PLAYERS].filter(p => !p.portiere).sort((a,b) => (b.golTotali || 0) - (a.golTotali || 0)).slice(0,5);
    if (sorted.length === 0) {
      cGol.innerHTML = "<p>Nessun marcatore.</p>";
    } else {
      const max = sorted[0].golTotali || 1;
      cGol.innerHTML = sorted.map((p,i)=>`
        <div class="hbar-row">
          <div class="hbar-name">${i===0?'🥇 ':i===1?'🥈 ':i===2?'🥉 ':''}${p.nome}</div>
          <div class="hbar-track">
            <div class="hbar-fill" style="width:${Math.max((p.golTotali/max*100), 12).toFixed(0)}%;background:#60a5fa20;">
              <span style="color:${cols[i] || '#60a5fa'}">${p.golTotali} gol</span>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // Top 5 Assist Man
  const cAss = document.getElementById('top5-assist-list');
  if (cAss) {
    const sorted = [...PLAYERS].sort((a,b) => (b.assist || 0) - (a.assist || 0)).slice(0,5);
    if (sorted.length === 0) {
      cAss.innerHTML = "<p>Nessun assist man.</p>";
    } else {
      const max = sorted[0].assist || 1;
      cAss.innerHTML = sorted.map((p,i)=>`
        <div class="hbar-row">
          <div class="hbar-name">${i===0?'🥇 ':i===1?'🥈 ':i===2?'🥉 ':''}${p.nome}</div>
          <div class="hbar-track">
            <div class="hbar-fill" style="width:${Math.max((p.assist/max*100), 12).toFixed(0)}%;background:#60a5fa20;">
              <span style="color:${cols[i] || '#60a5fa'}"">${p.assist} assist</span>
            </div>
          </div>
        </div>
      `).join('');
    }
  }
}

/* ==========================================================================
   8. SELETTORE DEL GIOCATORE
   ========================================================================== */
let selPlayer=0;  
function buildSelector(){
  if (ruoloUtente === 'GIOCATORE') {
    const sel = document.getElementById('player-selector');
    if (sel) sel.style.display = 'none';

    let idx = PLAYERS.findIndex(p => p.nome.toLowerCase() === mioNomeStat.toLowerCase());
    if (idx === -1) idx = 0; 
    
    selPlayer = idx;
    drawRadar(idx);       
    renderIndivBars(idx); 
    return;               
  }

  const selector = document.getElementById('player-selector');
  if (selector) {
    selector.innerHTML = PLAYERS.map((p,i)=>`
      <button class="ps-btn ${i===0?'active':''}" onclick="selectPlayer(${i},this)">${p.nome}</button>
    `).join('');
  }
  
  popolaSelectConfronto();
  drawRadar(0); 
  renderIndivBars(0);
}

function selectPlayer(i,btn){
  selPlayer=i;  
  document.querySelectorAll('#player-selector .ps-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  drawRadar(i); 
  renderIndivBars(i);
}

/* ==========================================================================
   9. CONFRONTO DIRETTO TRA DUE GIOCATORI
   ========================================================================== */
function popolaSelectConfronto() {
  const cmpA = document.getElementById('cmp-a');
  const cmpB = document.getElementById('cmp-b');
  if(!cmpA || !cmpB) return;

  const opzioni = PLAYERS.map((p, i) => `<option value="${i}">${p.nome}</option>`).join('');
  cmpA.innerHTML = opzioni;
  cmpB.innerHTML = opzioni;
    
  if(PLAYERS.length > 1) cmpB.value = 1;
}

const COMPARE_CATS=[
  {lbl:'Gol',key:'golTotali',max:20},
  {lbl:'Assist',key:'assist',max:12},
  {lbl:'Presenze',key:'presenze',max:25},
  {lbl:'Tiri',key:'tiriTotali',max:40},
  {lbl:'Passaggi Riusciti',key:'passaggiRiusciti',max:1000},
  {lbl:'Dribbling Riusciti',key:'dribblingRiusciti',max:30},
];

function renderConfronto(){
  if(PLAYERS.length === 0) return;

  const cmpAEl = document.getElementById('cmp-a');
  const cmpBEl = document.getElementById('cmp-b');
  if (!cmpAEl || !cmpBEl) return;

  const ia = +cmpAEl.value || 0;
  const ib = +cmpBEl.value || 0;

  const pa = PLAYERS[ia], pb = PLAYERS[ib];
  if(!pa || !pb) return;
  
  const cats = (pa.portiere && pb.portiere) ? [
    {lbl:'Presenze',key:'presenze',max:25},
    {lbl:'Parate',key:'parate',max:80},
    {lbl:'Clean sheet',key:'cleanSheet',max:15},
    {lbl:'Passaggi Riusciti',key:'passaggiRiusciti',max:1000},
    {lbl:'Duelli Vinti',key:'duelliVinti',max:50},
  ] : COMPARE_CATS;

  const grid = document.getElementById('compare-grid');
  if (!grid) return;

  const getInitials = (n) => n.split(' ').map(w=>w[0]||'').join('');

  const rowsHtml = cats.map(c => {
    const va = pa[c.key] || 0, vb = pb[c.key] || 0;                             
    const pctA = Math.min((va / c.max) * 100, 100).toFixed(0);
    const pctB = Math.min((vb / c.max) * 100, 100).toFixed(0);  

    let colA = 'var(--text)', colB = 'var(--text)';
    if (va > vb)      { colA = '#4caf50'; colB = '#f87171'; }
    else if (vb > va) { colB = '#4caf50'; colA = '#f87171'; }

    return `
      <div class="compare-row-item">
        <div class="cp-side-data cp-left">
          <div class="bar-wrap"><div class="bar-inner" style="width:${pctA}%;background:${colA}"></div></div>
          <span class="val" style="color:${colA}">${va}</span>
        </div>
        <div class="cp-center-label">${c.lbl}</div>
        <div class="cp-side-data cp-right">
          <div class="bar-wrap"><div class="bar-inner" style="width:${pctB}%;background:${colB}"></div></div>
          <span class="val" style="color:${colB}">${vb}</span>
        </div>
      </div>
    `;
  }).join('');

  grid.innerHTML = `
    <div class="compare-container">
      <div class="compare-players-header">
        <div class="cp-player-info">
          <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#0e2a12,#1a3d20);border:2px solid rgba(76,175,80,.4);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:800;color:var(--green-l)">${getInitials(pa.nome)}</div>
          <strong style="font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;color:var(--green-l)">${pa.nome}</strong>
        </div>
        <div class="cp-vs">VS</div>
        <div class="cp-player-info cp-right-info">
          <strong style="font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;color:#60a5fa">${pb.nome}</strong>
          <div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#0a1a2e,#1a2d3d);border:2px solid rgba(96,165,250,.4);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1rem;font-weight:800;color:#60a5fa">${getInitials(pb.nome)}</div>
        </div>
      </div>
      <div class="compare-rows-list">
        ${rowsHtml}
      </div>
    </div>
  `;
}
