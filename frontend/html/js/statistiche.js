// ── CONFIGURAZIONE API ──
const API_BASE_URL = 'http://localhost:8080/api';
const token = localStorage.getItem('token'); // Recuperato al login

// Array dinamici che verranno popolati dalle chiamate API
let PLAYERS = [];
let MATCHES = [];

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Esegue il controllo sulla validità del login
    verificaAutenticazione();

    // 2. Popola la sidebar con nome/ruolo dal localStorage (Stessa identica logica di rosa.js)
    const sbName = document.getElementById('sb-nome');
    const sbRole = document.getElementById('sb-ruolo');
    const sbAv   = document.getElementById('sb-avatar');
    
    const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Utente';
    const cognome = localStorage.getItem('cognomeReale') || '';
    const ruolo   = localStorage.getItem('ruolo')        || '';
    
    if (sbName) sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
    
    // Formattiamo il testo del Ruolo in modo elegante (es. ALLENATORE -> Allenatore)
    if (sbRole && ruolo) {
        sbRole.textContent = ruolo;
    }
    
    if (sbAv) sbAv.textContent = (nome[0]||('')).toUpperCase() + (cognome[0]||nome[1]||'').toUpperCase();

    // 3. Mostra lo stato iniziale di caricamento o azzeramento dei grafici
    aggiornaInterfacciaCaricamento();

    // 4. Avvia il caricamento parallelo dei dati dal Backend
    await Promise.all([
        caricaDatiSquadra(),
        caricaDatiGiocatori()
    ]);
});

/* ── REPERIMENTO DATI DAL BACKEND ── */

// 1. Recupera le statistiche generali di squadra e le ultime partite
async function caricaDatiSquadra() {
    try {
        const response = await fetch(`${API_BASE_URL}/statistiche/squadra`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Errore nel recupero dei dati squadra');
        
        const data = await response.json();
        
        // Popola i KPI della squadra in alto
        popolaKpiSquadra(data.kpi);
        
        // Disegna il line chart dei gol con i dati reali del backend
        drawLineChart(data.andamentoGolFatti, data.andamentoGolSubiti);
        
        // Salva i match reali e renderizza la scheda Forma
        MATCHES = data.ultimiMatch || [];
        renderForma();
        
    } catch (error) {
        console.error('Errore nel caricamento della squadra:', error);
    }
}

// 2. Recupera le statistiche individuali di tutti i giocatori della rosa
async function caricaDatiGiocatori() {
    try {
        const response = await fetch(`${API_BASE_URL}/statistiche/giocatori`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Errore nel recupero dei giocatori');
        
        PLAYERS = await response.json();
        
        if (PLAYERS.length > 0) {
            buildSelector();
            renderConfronto();
            renderTopScorers();
            
            // 🌟 AGGIUNGI QUESTA RIGA: Forza il ricalcolo dei rendimenti ora che i giocatori ci sono!
            if(MATCHES.length > 0) {
                 // Recupera l'ultimo kpi caricato o riesegue il refresh
                 caricaDatiSquadra(); 
            }
        } else {
            document.getElementById('player-selector').innerHTML = "<p>Nessun giocatore trovato.</p>";
        }
    } catch (error) {
        console.error('Errore nel caricamento dei giocatori:', error);
    }
}

/* ── POPOLAMENTO ELEMENTI STATICI/KPI ── */
/* ── POPOLAMENTO ELEMENTI STATICI/KPI SQUADRA CON INTEGRAZIONE ROSE ── */
function popolaKpiSquadra(kpi) {
    if (!kpi) return;
    
    // Funzione interna di utilità per cambiare il testo se l'elemento esiste
    const impostaTesto = (id, valore) => {
        const el = document.getElementById(id);
        if (el) el.textContent = valore;
    };

    // Funzione interna per aggiornare sia il testo che la lunghezza percentuale della barra
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

    const partiteTotali = kpi.partiteGiocate ?? kpi.partite ?? 2; // Prende le partite dal DB (nel tuo caso 2)
    const golFattiTotali = kpi.golFatti ?? 2;
    const golSubitiTotali = kpi.golSubiti ?? 4;

    // 1. Box KPI in alto
    impostaTesto('kpi-gol-fatti', golFattiTotali);
    impostaTesto('kpi-gol-subiti', golSubitiTotali);
    impostaTesto('kpi-partite', partiteTotali);
    impostaTesto('kpi-vittorie', kpi.vittorie ?? 0);
    impostaTesto('kpi-pareggi', kpi.pareggi ?? 0);
    impostaTesto('kpi-sconfitte', kpi.sconfitte ?? 0);
    
    // 2. Box KPI in basso
    impostaTesto('kpi-possesso', (kpi.possessoMedio ?? 50) + '%');
    impostaTesto('kpi-precisione', (kpi.precisionePassaggi ?? 50) + '%');
    impostaTesto('kpi-ammonizioni', kpi.ammonizioniTotali ?? 0);
    impostaTesto('kpi-espulsioni', kpi.espulsioniTotali ?? 0);

    // 🌟 TRUCCO: Calcoliamo i totali aggregati partendo dall'array dei giocatori (PLAYERS)
    // Se PLAYERS è vuoto (chiamata asincrona non ancora finita), impostiamo dei valori di base sicuri
    const totaleTiriGiocatori = PLAYERS.reduce((sum, p) => sum + (Number(p.tiri) || 0), 0);
    const totaleAssistGiocatori = PLAYERS.reduce((sum, p) => sum + (Number(p.ass) || 0), 0);
    
    // Per le percentuali medie di squadra (Passaggi, Dribbling, Duelli), facciamo la media dei giocatori che hanno effettivamente giocato
    const giocatoriAttivi = PLAYERS.filter(p => (Number(p.pres) || 0) > 0);
    const contaAttivi = giocatoriAttivi.length || 1;

    const mediaPassaggi = giocatoriAttivi.reduce((sum, p) => sum + (Number(p.pass) || 0), 0) / contaAttivi;
    const mediaDribbling = giocatoriAttivi.reduce((sum, p) => sum + (Number(p.drib) || 0), 0) / contaAttivi;
    const mediaDuelli = giocatoriAttivi.reduce((sum, p) => sum + (Number(p.duelli) || 0), 0) / contaAttivi;
    const totaleIntercetti = PLAYERS.reduce((sum, p) => sum + (Number(p.intercetti) || 0), 0);

    // Calcoliamo le medie per partita reali della squadra
    const golFattiMedio = golFattiTotali / partiteTotali;
    const golSubitiMedio = golSubitiTotali / partiteTotali;
    const tiriMedio = totaleTiriGiocatori / partiteTotali;
    const assistMedio = totaleAssistGiocatori / partiteTotali;

    // Calcolo conversione tiri della squadra (Gol totali / Tiri totali * 100)
    const conversioneSquadra = totaleTiriGiocatori > 0 ? (golFattiTotali / totaleTiriGiocatori) * 100 : 0;

    // 3. COLLEGAMENTO DINAMICO RENDIMENTO OFFENSIVO
    aggiornaBarra('txt-off-gol', 'bar-off-gol', golFattiMedio, 4.0);
    aggiornaBarra('txt-off-tiri', 'bar-off-tiri', tiriMedio, 10.0);
    aggiornaBarra('txt-off-conversione', 'bar-off-conversione', conversioneSquadra, 100, true); 
    aggiornaBarra('txt-off-chance', 'bar-off-chance', kpi.bigChancePartita ?? 1.5, 6.0); // fallback o dato DB
    aggiornaBarra('txt-off-assist', 'bar-off-assist', assistMedio, 4.0);

    // 4. COLLEGAMENTO DINAMICO RENDIMENTO DIFENSIVO
    aggiornaBarra('txt-def-gol', 'bar-def-gol', golSubitiMedio, 3.0);
    aggiornaBarra('txt-def-clean', 'bar-def-clean', kpi.cleanSheet ?? 0, partiteTotali); 
    aggiornaBarra('txt-def-tackle', 'bar-def-tackle', mediaDuelli / 4, 25.0); // stima basata sui duelli vinti
    aggiornaBarra('txt-def-intercetti', 'bar-def-intercetti', totaleIntercetti / partiteTotali, 20.0);
    aggiornaBarra('txt-def-falli', 'bar-def-falli', kpi.falliSubitiPartita ?? 0, 25.0);

    // 5. CERCHI SVG
    const cerchioPossesso = document.getElementById('circle-possesso');
    if (cerchioPossesso) {
        const possesso = kpi.possessoMedio ?? 50;
        cerchioPossesso.setAttribute('stroke-dasharray', `${possesso} ${100 - possesso}`);
    }
    const cerchioPrecisione = document.getElementById('circle-precisione');
    if (cerchioPrecisione) {
        const precisione = kpi.precisionePassaggi ?? mediaPassaggi ?? 50;
        cerchioPrecisione.setAttribute('stroke-dasharray', `${precisione} ${100 - precisione}`);
    }
}

function aggiornaInterfacciaCaricamento() {
    document.getElementById('player-selector').innerHTML = "Caricamento giocatori...";
}

/* ── TABS (Invariato) ── */
function switchTab(name){
  document.querySelectorAll('.tab').forEach((t,i)=>{
    t.classList.toggle('active',['squadra','individuale','confronto','forma'][i]===name);
  });
  document.querySelectorAll('.tab-panel').forEach(p=>{
    p.classList.toggle('active',p.id==='tab-'+name);
  });
}

/* ── LINE CHART (Dinamico) ── */
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

/* ── RADAR ── */
const RADAR_CATS=['Gol','Assist','Passaggi','Dribbling','Duelli','Intercetti'];
function radarPts(vals,max=100,r=100){
  return vals.map((v,i)=>{
    const angle=(2*Math.PI*i/vals.length)-Math.PI/2;
    const d=(v/max)*r;
    return [d*Math.cos(angle),d*Math.sin(angle)];
  });
}

function drawRadar(idx){
  const p=PLAYERS[idx];
  const svg=document.getElementById('radar-svg');
  if(!svg || !p) return;
  
  const N=RADAR_CATS.length,R=100;
  const maxVals=[20,12,100,100,100,30];
  const vals=[p.gol,p.ass,p.pass,p.drib,p.duelli,p.intercetti];

  let html='';
  for(let ring=1;ring<=5;ring++){
    const pts=RADAR_CATS.map((_,i)=>{const a=(2*Math.PI*i/N)-Math.PI/2;const r2=(ring/5)*R;return`${(r2*Math.cos(a)).toFixed(1)},${(r2*Math.sin(a)).toFixed(1)}`;});
    html+=`<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(48,54,61,.7)" stroke-width="1"/>`;
  }

  RADAR_CATS.forEach((cat,i)=>{
    const a=(2*Math.PI*i/N)-Math.PI/2;
    html+=`<line x1="0" y1="0" x2="${(R*Math.cos(a)).toFixed(1)}" y2="${(R*Math.sin(a)).toFixed(1)}" stroke="rgba(48,54,61,.8)" stroke-width="1"/>`;
    const lx=(R*1.2*Math.cos(a)).toFixed(1),ly=(R*1.2*Math.sin(a)).toFixed(1);
    html+=`<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#8b949e">${cat}</text>`;
  });

  const pts=radarPts(vals.map((v,i)=>Math.min(v/maxVals[i]*100,100)),100,R);
  const poly=pts.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  html+=`<polygon points="${poly}" fill="rgba(76,175,80,.15)" stroke="#4caf50" stroke-width="2"/>`;
  pts.forEach(([x,y])=>{ html+=`<circle cx="${x}" cy="${y}" r="4" fill="#4caf50"/>`; });
  svg.innerHTML=html;
  document.getElementById('radar-name').textContent=p.nome;
}

/* ── INDIVIDUALE BARS ── */
function renderIndivBars(idx){
  const p=PLAYERS[idx];
  if(!p) return;
  const items=[
    {l:'Presenze',v:p.pres,max:25,c:'fill-green'},
    {l:'Gol',v:p.gol,max:20,c:'fill-green'},
    {l:'Assist',v:p.ass,max:12,c:'fill-blue'},
    {l:'Tiri totali',v:p.tiri,max:40,c:'fill-amber'},
    {l:'Passaggi %',v:p.pass,max:100,c:'fill-blue'},
    {l:'Dribbling %',v:p.drib,max:100,c:'fill-green'},
    {l:'Duelli vinti %',v:p.duelli,max:100,c:'fill-amber'},
  ];
  document.getElementById('indiv-bars').innerHTML=items.map(it=>`
    <div class="bc-row"><div class="bc-label"><span class="name">${it.l}</span><span>${it.v}${it.l.includes('%')?'%':''}</span></div>
    <div class="bc-track"><div class="bc-fill ${it.c}" style="width:${(it.v/it.max*100).toFixed(0)}%"></div></div></div>
  `).join('');
}

/* ── TOP SCORERS ── */
function renderTopScorers(){
  const sorted=[...PLAYERS].sort((a,b)=>b.gol-a.gol).slice(0,6);
  if(sorted.length === 0) return;
  const max=sorted[0].gol||1;
  const cols=['#facc15','#94a3b8','#b45309','#4caf50','#60a5fa','#a78bfa'];
  document.getElementById('top-scorers').innerHTML=sorted.map((p,i)=>`
    <div class="hbar-row">
      <div class="hbar-name">${i===0?'🥇 ':i===1?'🥈 ':i===2?'🥉 ':''}${p.nome}</div>
      <div class="hbar-track">
        <div class="hbar-fill" style="width:${(p.gol/max*100).toFixed(0)}%;background:${cols[i] || '#60a5fa'}20;border:1px solid ${cols[i] || '#60a5fa'}40">
          <span style="color:${cols[i] || '#60a5fa'}">${p.gol} gol</span>
        </div>
      </div>
    </div>
  `).join('');
}

/* ── PLAYER SELECTOR ── */
let selPlayer=0;
function buildSelector(){
  document.getElementById('player-selector').innerHTML=PLAYERS.map((p,i)=>`
    <button class="ps-btn ${i===0?'active':''}" onclick="selectPlayer(${i},this)">${p.nome}</button>
  `).join('');
  
  // Popola anche le select del Confronto in automatico coi giocatori reali del DB
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

/* ── CONFRONTO ── */
function popolaSelectConfronto() {
    const cmpA = document.getElementById('cmp-a');
    const cmpB = document.getElementById('cmp-b');
    if(!cmpA || !cmpB) return;

    const opzioni = PLAYERS.map((p, i) => `<option value="${i}">${p.nome}</option>`).join('');
    cmpA.innerHTML = opzioni;
    cmpB.innerHTML = opzioni;
    
    // Seleziona di default il secondo elemento per il secondo giocatore (se esiste)
    if(PLAYERS.length > 1) cmpB.value = 1;
}

const COMPARE_CATS=[
  {lbl:'Gol',key:'gol',max:20},
  {lbl:'Assist',key:'ass',max:12},
  {lbl:'Presenze',key:'pres',max:25},
  {lbl:'Tiri',key:'tiri',max:40},
  {lbl:'Passaggi %',key:'pass',max:100},
  {lbl:'Dribbling %',key:'drib',max:100},
];

function renderConfronto(){
  if(PLAYERS.length === 0) return;
  const ia=+document.getElementById('cmp-a').value || 0;
  const ib=+document.getElementById('cmp-b').value || 0;
  const pa=PLAYERS[ia],pb=PLAYERS[ib];
  if(!pa || !pb) return;
  
  const grid=document.getElementById('compare-grid');
  let leftH='',centerH='',rightH='';
  COMPARE_CATS.forEach(c=>{
    const va=pa[c.key] || 0, vb=pb[c.key] || 0;
    const pctA=Math.min(va/c.max*100,100),pctB=Math.min(vb/c.max*100,100);
    const unitSuffix=c.lbl.includes('%')?'%':'';
    leftH+=`<div class="compare-row">
      <div class="val" style="text-align:right">${va}${unitSuffix}</div>
      <div class="bar-wrap"><div class="bar-inner" style="width:${pctA}%;background:var(--green-l)"></div></div>
    </div>`;
    centerH+=`<div class="cat-lbl">${c.lbl}</div>`;
    rightH+=`<div class="compare-row">
      <div class="val" style="text-align:left">${vb}${unitSuffix}</div>
      <div class="bar-wrap"><div class="bar-inner" style="width:${pctB}%;background:#60a5fa"></div></div>
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

/* ── FORMA ── */
function renderForma(){
  const esito={w:'V',d:'P',l:'S'};
  const containerDots = document.getElementById('form-dots');
  const containerTable = document.getElementById('results-tbody');
  
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