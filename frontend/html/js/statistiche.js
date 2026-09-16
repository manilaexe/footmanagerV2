/* ==========================================================================
   1. CONFIGURAZIONE API E VARIABILI GLOBALI DI STATO
   ========================================================================== */
const API_BASE_URL = 'http://localhost:8080/api';
const token = localStorage.getItem('token');      

let PLAYERS = [];         
let MATCHES = [];         
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

  ruoloUtente = ruolo;
  mioNomeStat = nome ? `${nome.charAt(0).toUpperCase()}. ${cognome}` : '';
  
  if (ruoloUtente === 'GIOCATORE') nascondiSezioniSquadra();

  aggiornaInterfacciaCaricamento();

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
      
    popolaKpiSquadra(data.kpi);
    drawLineChart(data.andamentoGolFatti, data.andamentoGolSubiti);
    MATCHES = data.ultimiMatch || [];
    renderForma();
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
      renderTopScorers(); 
            
      if(MATCHES.length > 0) {
        caricaDatiSquadra(); 
      }
    } else {
      document.getElementById('player-selector').innerHTML = "<p>Nessun giocatore trovato.</p>";
    }
  } catch (error) {
    console.error('Errore nel caricamento dei giocatori:', error);
  }
}

/* ==========================================================================
   4. POPOLAMENTO ELEMENTI STATICI E KPI DI SQUADRA
   ========================================================================== */
function popolaKpiSquadra(kpi) {
  if (!kpi) return;
    
  const impostaTesto = (id, valore) => {
    const el = document.getElementById(id);
    if (el) el.textContent = valore;
  };

  const aggiornaBarra = (idTesto, idBarra, valore, maxValore, isPercentuale = false) => {
    const val = valore ?? 0;
    impostaTesto(idTesto, isPercentuale ? `${Number(val).toFixed(0)}%` : Number(val).toFixed(1));
        
    const barra = document.getElementById(idBarra);
    if (barra) {
      let percentuale = isPercentuale ? val : (val / maxValore) * 100;
      if (percentuale > 100) percentuale = 100;
      if (percentuale < 0) percentuale = 0;
      barra.style.width = `${percentuale}%`;
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

  const partiteTotali = kpi.partiteGiocate ?? 2; 
  const golFattiTotali = kpi.golFatti ?? 2;
  const golSubitiTotali = kpi.golSubiti ?? 4;

  impostaTesto('kpi-gol-fatti', golFattiTotali);
  impostaTesto('kpi-gol-subiti', golSubitiTotali);
  impostaTesto('kpi-partite', partiteTotali);
  impostaTesto('kpi-vittorie', kpi.vittorie ?? 0);
  impostaTesto('kpi-pareggi', kpi.pareggi ?? 0);
  impostaTesto('kpi-sconfitte', kpi.sconfitte ?? 0);

  const totaleTiriGiocatori = PLAYERS.reduce((sum, p) => sum + (Number(p.tiriTotali) || 0), 0);
  const totaleAssistGiocatori = PLAYERS.reduce((sum, p) => sum + (Number(p.assist) || 0), 0);
  const totaleIntercetti = PLAYERS.reduce((sum, p) => sum + (Number(p.palloniIntercettati) || 0), 0);

  const golFattiMedio = golFattiTotali / partiteTotali;
  const golSubitiMedio = golSubitiTotali / partiteTotali;
  const tiriMedio = totaleTiriGiocatori / partiteTotali;
  const assistMedio = totaleAssistGiocatori / partiteTotali;

  const conversioneSquadra = totaleTiriGiocatori > 0 ? (golFattiTotali / totaleTiriGiocatori) * 100 : 0;

  aggiornaBarra('txt-off-gol', 'bar-off-gol', golFattiMedio, 4.0);
  aggiornaBarra('txt-off-tiri', 'bar-off-tiri', tiriMedio, 10.0);
  aggiornaBarra('txt-off-conversione', 'bar-off-conversione', conversioneSquadra, 100, true); 
  aggiornaBarra('txt-off-chance', 'bar-off-chance', 1.5, 6.0);
  aggiornaBarra('txt-off-assist', 'bar-off-assist', assistMedio, 4.0);

  aggiornaBarra('txt-def-gol', 'bar-def-gol', golSubitiMedio, 3.0);
  aggiornaBarra('txt-def-clean', 'bar-def-clean', kpi.cleanSheet ?? 0, partiteTotali); 
  aggiornaBarra('txt-def-tackle', 'bar-def-tackle', 10, 25.0);
  aggiornaBarra('txt-def-intercetti', 'bar-def-intercetti', totaleIntercetti / partiteTotali, 20.0);
  aggiornaBarra('txt-def-falli', 'bar-def-falli', 0, 25.0);

  const duelliVintiTot  = PLAYERS.reduce((s, p) => s + (Number(p.duelliVinti) || 0), 0);
  const duelliTotali    = PLAYERS.reduce((s, p) => s + (Number(p.duelliVinti || 0) + Number(p.duelliPersi || 0)), 0);
  const pctDuelliVinti  = duelliTotali > 0 ? (duelliVintiTot / duelliTotali) * 100 : (kpi.pctDuelliVinti ?? 50);
  const pctDuelliPersi  = Math.max(0, 100 - pctDuelliVinti);

  aggiornaDonut('kpi-duelli-vinti', 'circle-duelli-vinti', pctDuelliVinti);
  aggiornaDonut('kpi-duelli-persi', 'circle-duelli-persi', pctDuelliPersi);

  const passVintiTot = PLAYERS.reduce((s, p) => s + (Number(p.passaggiRiusciti) || 0), 0);
  const passTotali = PLAYERS.reduce((s, p) => s + (Number(p.passaggiTentati) || 0), 0);
  const pctPassaggi = passTotali > 0 ? (passVintiTot / passTotali) * 100 : (kpi.precisionePassaggi ?? 50);

  aggiornaDonut('kpi-precisione', 'circle-precisione', pctPassaggi);

  const dribVintiTot = PLAYERS.reduce((s, p) => s + (Number(p.dribblingRiusciti) || 0), 0);
  const dribTotali = PLAYERS.reduce((s, p) => s + (Number(p.dribblingTentati) || 0), 0);
  const pctDribVinti = dribTotali > 0 ? (dribVintiTot / dribTotali) * 100 : 50;
  const pctDribPersi = Math.max(0, 100 - pctDribVinti);

  aggiornaDonut('kpi-drib-vinti', 'circle-drib-vinti', pctDribVinti);
  aggiornaDonut('kpi-drib-persi', 'circle-drib-persi', pctDribPersi);

  const pctPossesso = kpi.possessoMedio ?? 50;
  aggiornaDonut('kpi-possesso', 'circle-possesso', pctPossesso);
}

/* ==========================================================================
   5. ADATTAMENTO DELL'INTERFACCIA E UTILITIES
   ========================================================================== */
function aggiornaInterfacciaCaricamento() {
    document.getElementById('player-selector').innerHTML = "Caricamento giocatori...";
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
   6. GRAFICO A LINEE SVG (LINE CHART DINAMICO)
   ========================================================================== */
function drawLineChart(gf = [], gs = []){
  if (gf.length === 0) gf = [0];
  if (gs.length === 0) gs = [0];
  
  const svg = document.getElementById('line-svg');
  if(!svg) return;  
  
  const W=700,H=200,pad=20,maxV=Math.max(...gf, ...gs, 5);  
  const xs=i=>pad+(W-2*pad)*(i/(gf.length-1 || 1));         
  const ys=v=>H-pad-(H-2*pad)*(v/maxV);                     
  
  const path=(arr,col)=>{
    let d=arr.map((v,i)=>`${i===0?'M':'L'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            ${arr.map((v,i)=>`<circle cx="${xs(i)}" cy="${ys(v)}" r="3" fill="${col}" opacity=".8"/>`).join('')}`;
  };

  let grid='';
  for(let g=0;g<=maxV;g++){
    const y=ys(g);
    grid+=`<line x1="${pad}" y1="${y}" x2="${W-pad}" y2="${y}" stroke="rgba(48,54,61,.6)" stroke-width="1"/>
           <text x="${pad-10}" y="${y+4}" text-anchor="end" font-size="14" fill="#8b949e">${g}</text>`;
  }

  svg.innerHTML=grid+path(gf,'#4caf50')+path(gs,'#f87171');
}

/* ==========================================================================
   7. GRAFICO RADAR (SPIDER CHART / STELLA)
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
  document.getElementById('radar-name').textContent = `${p.nome} ${isGK ? '(POR)' : ''}`;
}

/* ==========================================================================
   8. STATISTICHE DETTAGLIATE CON PULSANTE DI MODIFICA (ALLENATORE/STAFF)
   ========================================================================== */
function renderIndivBars(idx){
  const p = PLAYERS[idx]; 
  if(!p) return;

  const isGK = Boolean(p.portiere);
  let items = [];

  const commonItems = [
    { l: 'Presenze', v: p.presenze, max: 38, c: 'fill-green' },
    { l: 'Presenze Titolare', v: p.presenzeTitolare, max: 38, c: 'fill-green' },
    { l: 'Minuti Giocati', v: p.minutiGiocati, max: 3420, c: 'fill-blue' },
    { l: 'Ammonizioni', v: p.ammonizioni, max: 10, c: 'fill-amber' },
    { l: 'Espulsioni', v: p.espulsioni, max: 5, c: 'fill-amber' },
    { l: 'Falli Commessi', v: p.falliCommessi, max: 30, c: 'fill-amber' },
    { l: 'Falli Subiti', v: p.falliSubiti, max: 30, c: 'fill-blue' },
    { l: 'Assist', v: p.assist, max: 20, c: 'fill-blue' },
    { l: 'Duelli Aerei Vinti', v: p.duelliAereiVinti, max: 30, c: 'fill-amber' },
    { l: 'Duelli Aerei Persi', v: p.duelliAereiPersi, max: 30, c: 'fill-amber' },
    { l: 'Duelli Vinti', v: p.duelliVinti, max: 50, c: 'fill-amber' },
    { l: 'Duelli Persi', v: p.duelliPersi, max: 50, c: 'fill-amber' },
    { l: 'Passaggi Tentati', v: p.passaggiTentati, max: 1500, c: 'fill-blue' },
    { l: 'Passaggi Riusciti', v: p.passaggiRiusciti, max: 1500, c: 'fill-blue' },
    { l: 'Passaggi Chiave', v: p.passaggiChiave, max: 30, c: 'fill-blue' },
    { l: 'Dribbling Tentati', v: p.dribblingTentati, max: 50, c: 'fill-green' },
    { l: 'Dribbling Riusciti', v: p.dribblingRiusciti, max: 50, c: 'fill-green' },
    { l: 'Palloni Intercettati', v: p.palloniIntercettati, max: 50, c: 'fill-green' }
  ];

  if (isGK) {
    const gkSpecifics = [
      { l: 'Parate', v: p.parate, max: 150, c: 'fill-blue' },
      { l: 'Clean Sheet', v: p.cleanSheet, max: 25, c: 'fill-green' },
      { l: 'Gol Subiti', v: p.goalSubiti, max: 60, c: 'fill-amber' },
      { l: 'Rigori Parati', v: p.rigoriParati, max: 10, c: 'fill-green' },
      { l: 'Rigori Subiti', v: p.rigoriSubiti, max: 15, c: 'fill-amber' }
    ];
    items = [...commonItems, ...gkSpecifics];
  } else {
    const movSpecifics = [
      { l: 'Gol su Rigore', v: p.goalRigore, max: 10, c: 'fill-green' },
      { l: 'Gol di Testa', v: p.goalTesta, max: 10, c: 'fill-green' },
      { l: 'Gol su Punizione', v: p.goalPunizione, max: 10, c: 'fill-green' },
      { l: 'Tiri Totali', v: p.tiriTotali, max: 100, c: 'fill-amber' },
      { l: 'Tiri in Porta', v: p.tiriInPorta, max: 50, c: 'fill-amber' },
      { l: 'Pali / Traverse', v: p.paliTraverse, max: 10, c: 'fill-amber' },
      { l: 'Big Chance Mancate', v: p.bigChanceMancate, max: 20, c: 'fill-amber' },
      { l: 'Big Chance Create', v: p.bigChanceCreate, max: 25, c: 'fill-blue' },
      { l: 'Cross Tentati', v: p.crossTentati, max: 100, c: 'fill-blue' },
      { l: 'Cross Riusciti', v: p.crossRiusciti, max: 100, c: 'fill-blue' },
      { l: 'Tackle', v: p.tackle, max: 50, c: 'fill-green' },
      { l: 'Palloni Rubati', v: p.palloniRubati, max: 50, c: 'fill-green' }
    ];
    items = [...commonItems, ...movSpecifics];
  }

  let html = '';
  // Se l'utente NON è un giocatore (es. Allenatore, Staff, IT), mostra il pulsante di modifica
  if (ruoloUtente !== 'GIOCATORE') {
    html += `
      <div style="margin-bottom: 1.2rem; text-align: right;">
        <button onclick="apriModalModifica(${idx})" style="background: #238636; color: white; border: none; padding: 0.55rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          ✏️ Modifica Statistiche
        </button>
      </div>
    `;
  }

  html += items.map(it => {
    const val = typeof it.v === 'number' ? it.v : 0;
    const pct = Math.min((val / (it.max || 1) * 100), 100).toFixed(0);

    return `
      <div class="bc-row">
        <div class="bc-label">
          <span class="name">${it.l}</span>
          <span>${val}</span>
        </div>
        <div class="bc-track">
          <div class="bc-fill ${it.c}" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('indiv-bars').innerHTML = html;
}

// ── MODALE E SALVATAGGIO STATISTICHE PER ALLENATORE/STAFF ───────────────────
function apriModalModifica(idx) {
  const p = PLAYERS[idx];
  if (!p) return;

  // AGGIUNGI QUESTA RIGA PER RICAVARE L'ID IN SICUREZZA:
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
      // Legge il testo esatto dell'errore restituito dal server Java
      const errorText = await response.text();
      console.error("Risposta dal server:", errorText);
      throw new Error(`Errore del server (${response.status}): ${errorText}`);
    }

    alert('Statistiche aggiornate con successo!');
    document.getElementById('edit-modal-overlay').remove();
    
    await Promise.all([
      caricaDatiSquadra(),
      caricaDatiGiocatori()
    ]);
  } catch (error) {
    console.error('Errore dettagliato:', error);
    alert('Errore nel salvataggio. Controlla la console (F12) per i dettagli.');
  }
}

function renderTopScorers(){
  const sorted = [...PLAYERS].filter(p => !p.portiere).sort((a,b) => (b.golTotali || 0) - (a.golTotali || 0)).slice(0,6);
  if(sorted.length === 0) return;

  const max = sorted[0].golTotali || 1;
  const cols = ['#facc15','#94a3b8','#b45309','#4caf50','#60a5fa','#a78bfa'];

  document.getElementById('top-scorers').innerHTML = sorted.map((p,i)=>`
    <div class="hbar-row">
      <div class="hbar-name">${i===0?'🥇 ':i===1?'🥈 ':i===2?'🥉 ':''}${p.nome}</div>
      <div class="hbar-track">
        <div class="hbar-fill" style="width:${(p.golTotali/max*100).toFixed(0)}%;background:${cols[i] || '#60a5fa'}20;border:1px solid ${cols[i] || '#60a5fa'}40">
          <span style="color:${cols[i] || '#60a5fa'}">${p.golTotali} gol</span>
        </div>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   9. SELETTORE DEL GIOCATORE (PLAYER SELECTOR)
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

  document.getElementById('player-selector').innerHTML=PLAYERS.map((p,i)=>`
    <button class="ps-btn ${i===0?'active':''}" onclick="selectPlayer(${i},this)">${p.nome}</button>
  `).join('');
  
  popolaSelectConfronto();
  drawRadar(0); 
  renderIndivBars(0);
}

function selectPlayer(i,btn){
  selPlayer=i;  
  document.querySelectorAll('#player-selector .ps-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');

  drawRadar(i); 
  renderIndivBars(i);
}

/* ==========================================================================
   10. CONFRONTO DIRETTO TRA DUE GIOCATORI (TESTA A TESTA)
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

  const ia=+document.getElementById('cmp-a').value || 0;
  const ib=+document.getElementById('cmp-b').value || 0;

  const pa=PLAYERS[ia],pb=PLAYERS[ib];
  if(!pa || !pb) return;
  
  const cats = (pa.portiere && pb.portiere) ? [
    {lbl:'Presenze',key:'presenze',max:25},
    {lbl:'Parate',key:'parate',max:80},
    {lbl:'Clean sheet',key:'cleanSheet',max:15},
    {lbl:'Passaggi Riusciti',key:'passaggiRiusciti',max:1000},
    {lbl:'Duelli Vinti',key:'duelliVinti',max:50},
  ] : COMPARE_CATS;

  const grid=document.getElementById('compare-grid');
  if (!grid) return;

  let leftH='',centerH='',rightH='';

  cats.forEach(c=>{
    const va=pa[c.key] || 0, vb=pb[c.key] || 0;                             
    const pctA=Math.min(va/c.max*100,100),pctB=Math.min(vb/c.max*100,100);  

    let colA = 'var(--text,#e6edf3)', colB = 'var(--text,#e6edf3)';

    if (va > vb)      { colA = '#4caf50'; colB = '#f87171'; }
    else if (vb > va) { colB = '#4caf50'; colA = '#f87171'; }

    leftH+=`<div class="compare-row">
      <div class="val" style="text-align:right;color:${colA};font-weight:700">${va}</div>
      <div class="bar-wrap"><div class="bar-inner" style="width:${pctA}%;background:${colA}"></div></div>
    </div>`;

    centerH+=`<div class="cat-lbl">${c.lbl}</div>`;

    rightH+=`<div class="compare-row">
      <div class="val" style="text-align:left;color:${colB};font-weight:700">${vb}</div>
      <div class="bar-wrap"><div class="bar-inner" style="width:${pctB}%;background:${colB}"></div></div>
    </div>`;
  });

  grid.innerHTML=`
    <div class="compare-col compare-left">
      <div style="text-align:center;margin-bottom:1rem">
        <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#0e2a12,#1a3d20);border:3px solid rgba(76,175,80,.4);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:800;margin:0 auto 6px">${pa.nome.split(' ').map(w=>w[0]).join('')}</div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;color:var(--green-l)">${pa.nome}</div>
      </div>
      ${leftH}
    </div>
    <div class="compare-center">${centerH}</div>
    <div class="compare-col compare-right">
      <div style="text-align:center;margin-bottom:1rem">
        <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#0a1a2e,#1a2d3d);border:3px solid rgba(96,165,250,.4);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:800;margin:0 auto 6px">${pb.nome.split(' ').map(w=>w[0]).join('')}</div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;color:#60a5fa">${pb.nome}</div>
      </div>
      ${rightH}
    </div>
  `;
}

/* ==========================================================================
   11. STATO DI FORMA E STORICO ULTIME PARTITE
   ========================================================================== */
function renderForma(){
  const esito={w:'V',d:'P',l:'S'};

  const containerDots = document.getElementById('form-dots');
  const containerTable = document.getElementById('results-tbody');
  
  if(!containerDots || !containerTable) return;

  if(MATCHES.length === 0) {
      containerDots.innerHTML = "<p>Nessun match recente registrato.</p>";
      containerTable.innerHTML = "<tr><td colspan='6' style='text-align:center'>Nessun dato</td></tr>";
      return;
  }

  containerDots.innerHTML=MATCHES.map(m=>`
    <div class="form-dot ${m.esito}" title="${m.avv} ${m.gf}-${m.gs}">${esito[m.esito] || 'P'}</div>
  `).join('');
  
  const pill={w:'pill-green',d:'pill-amber',l:'pill-red'};
  const label={w:'Vittoria',d:'Pareggio',l:'Sconfitta'};

  containerTable.innerHTML=MATCHES.map(m=>`
    <tr>
      <td>${m.data}</td>
      <td>${m.avv}</td>
      <td><strong>${m.gf} – ${m.gs}</strong></td>
      <td style="color:var(--green-l)">${m.gf}</td>
      <td style="color:#f87171">${m.gs}</td>
      <td><span class="pill ${pill[m.esito]}">${label[m.esito]}</span></td>
    </tr>
  `).join('');
}