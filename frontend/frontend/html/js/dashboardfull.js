/* ── DATI ── */
const TODAY=new Date();
const MONTHS_IT=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const SECTION_TITLES={dashboard:'Dashboard',rosa:'Rosa della Squadra',calendario:'Calendario',statistiche:'Statistiche Avanzate',messaggi:'Messaggi',impostazioni:'Impostazioni'};
const TOPBAR_BTN={
  dashboard:'<button class="btn-primary" onclick="openAddEventModal()">+ Nuovo Evento</button>',
  rosa:'<button class="btn-ghost" onclick="exportCSV()">↓ CSV</button><button class="btn-primary" style="margin-left:6px" onclick="alert(\'Funzionalità collegata al backend\')">+ Aggiungi</button>',
  calendario:'<button class="btn-primary" onclick="openAddEventModal()">+ Nuovo Evento</button>',
  statistiche:'<select style="background:var(--dark3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:.85rem;padding:.45rem .9rem;outline:none"><option>Stagione 2024/25</option><option>Stagione 2023/24</option></select>',
  messaggi:'',impostazioni:''
};

const PLAYERS=[
  {id:1,init:'LR',nome:'Lorenzo Rossi',   num:9, pos:'ATT',piede:'Destro',  naz:'🇮🇹',alt:181,status:'available', pres:18,gol:12,ass:5, tiri:34,pass:78,drib:62,duelli:58,intercetti:12},
  {id:2,init:'MB',nome:'Marco Bianchi',   num:8, pos:'CEN',piede:'Sinistro',naz:'🇮🇹',alt:178,status:'available', pres:20,gol:4, ass:8, tiri:18,pass:85,drib:70,duelli:64,intercetti:20},
  {id:3,init:'AF',nome:'Andrea Ferrari',  num:11,pos:'ATT',piede:'Destro',  naz:'🇮🇹',alt:176,status:'injured',   pres:15,gol:9, ass:3, tiri:28,pass:72,drib:68,duelli:52,intercetti:10},
  {id:4,init:'GE',nome:'Giorgio Esposito',num:1, pos:'POR',piede:'Destro',  naz:'🇮🇹',alt:190,status:'available', pres:22,gol:0, ass:0, tiri:0, pass:88,drib:0, duelli:45,intercetti:8},
  {id:5,init:'PR',nome:'Paolo Romano',    num:5, pos:'DIF',piede:'Destro',  naz:'🇮🇹',alt:183,status:'suspended', pres:19,gol:2, ass:1, tiri:8, pass:80,drib:45,duelli:70,intercetti:25},
  {id:6,init:'FL',nome:'Filippo Luca',    num:7, pos:'ATT',piede:'Sinistro',naz:'🇮🇹',alt:174,status:'available', pres:17,gol:1, ass:4, tiri:20,pass:74,drib:75,duelli:50,intercetti:9},
  {id:7,init:'DM',nome:'Davide Mancini',  num:6, pos:'DIF',piede:'Destro',  naz:'🇮🇹',alt:185,status:'available', pres:21,gol:1, ass:2, tiri:6, pass:82,drib:40,duelli:68,intercetti:22},
  {id:8,init:'SM',nome:'Simone Martini',  num:4, pos:'CEN',piede:'Destro',  naz:'🇮🇹',alt:180,status:'available', pres:18,gol:3, ass:6, tiri:14,pass:87,drib:60,duelli:60,intercetti:18},
  {id:9,init:'KD',nome:'Kevin Dupont',    num:23,pos:'ATT',piede:'Destro',  naz:'🇫🇷',alt:183,status:'available', pres:14,gol:6, ass:2, tiri:24,pass:70,drib:65,duelli:55,intercetti:8},
  {id:10,init:'EM',nome:'Emre Mazzi',     num:10,pos:'CEN',piede:'Destro',  naz:'🇹🇷',alt:177,status:'available', pres:19,gol:5, ass:9, tiri:22,pass:89,drib:72,duelli:62,intercetti:16},
];
let EVENTS=[
  {id:1,titolo:'Allenamento',            tipo:'allenamento',inizio:'2025-05-26T09:00',fine:'2025-05-26T11:00',luogo:'Campo A',note:''},
  {id:2,titolo:'Allenamento tattico',    tipo:'allenamento',inizio:'2025-05-28T10:00',fine:'2025-05-28T12:00',luogo:'Campo B',note:'Focus 4-3-3'},
  {id:3,titolo:'Partita – vs Fortitudo', tipo:'partita',    inizio:'2025-05-31T15:30',fine:'2025-05-31T17:30',luogo:'Stadio Centrale',note:'In casa'},
  {id:4,titolo:'Riunione staff',         tipo:'riunione',   inizio:'2025-05-29T18:00',fine:'2025-05-29T19:30',luogo:'Sala riunioni',note:''},
  {id:5,titolo:'Allenamento',            tipo:'allenamento',inizio:'2025-06-02T09:00',fine:'2025-06-02T11:00',luogo:'Campo A',note:''},
  {id:6,titolo:'Partita – vs Virtus',    tipo:'partita',    inizio:'2025-06-08T16:00',fine:'2025-06-08T18:00',luogo:'Stadio Est',note:'Trasferta'},
  {id:7,titolo:'Visita medica rosa',     tipo:'extra',      inizio:'2025-06-11T08:00',fine:'2025-06-11T13:00',luogo:'Poliambulatorio',note:'Tutti'},
];
let evNextId=8;
let MESSAGES=[
  {id:1,dest:'Tutta la squadra',tipo:'direttiva',   testo:'Domani allenamento anticipato alle 8:45. Portate il materiale completo.',ora:'Oggi 08:30',letti:18,tot:23},
  {id:2,dest:'L. Rossi',        tipo:'aggiornamento',testo:'Ottima prestazione sabato. Continua così.',ora:'Ieri 16:00',letti:1,tot:1},
  {id:3,dest:'Difensori',       tipo:'direttiva',   testo:'Ripassate la disposizione tattica 4-3-3 per la prossima settimana.',ora:'23 Mag',letti:3,tot:5},
  {id:4,dest:'M. Bianchi',      tipo:'convocazione',testo:'Convocato per la partita di sabato. Presentati alle 14:00.',ora:'22 Mag',letti:1,tot:1},
];
let msgNextId=5;
const TIPO_META={
  allenamento:{label:'Allenamento',stripe:'var(--green-l)',chipClass:'ev-allenamento',icon:'⚽',pill:'pill-green'},
  partita:    {label:'Partita',    stripe:'var(--blue)',   chipClass:'ev-partita',    icon:'🏟',pill:'pill-blue'},
  riunione:   {label:'Riunione',   stripe:'var(--amber)',  chipClass:'ev-riunione',   icon:'📋',pill:'pill-amber'},
  extra:      {label:'Extra',      stripe:'var(--purple)', chipClass:'ev-extra',      icon:'🎯',pill:'pill-purple'},
};
const POS_STYLE={ATT:'pill-red',CEN:'pill-blue',DIF:'pill-amber',POR:'pill-purple'};
const POS_BG={ATT:'rgba(239,68,68,.2)',CEN:'rgba(59,130,246,.2)',DIF:'rgba(234,179,8,.2)',POR:'rgba(139,92,246,.2)'};
const STATUS_L={available:'Disponibile',injured:'Infortunato',suspended:'Squalificato'};
const STATUS_P={available:'pill-green',injured:'pill-red',suspended:'pill-amber'};

/* ── NAV ── */
function nav(name,el){
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if(el) el.classList.add('active');
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.getElementById('sec-'+name).classList.add('active');
  document.getElementById('page-title').textContent=SECTION_TITLES[name];
  document.getElementById('topbar-actions').innerHTML=TOPBAR_BTN[name]||'';
  if(name==='calendario'){calRender();renderEvTable();}
  if(name==='statistiche'){drawLineChart();buildStatSelector();renderConfronto();renderForma();renderTopScorers();}
  if(name==='rosa') renderRosa();
  if(name==='messaggi') renderMsgList();
}

/* ── MODAL ── */
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));

/* ── ROSA ── */
let rosaFilter='tutti',rosaStatus='tutti';
function setRosaFilter(v,btn){rosaFilter=v;btn.closest('.filter-group').querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderRosa();}
function setRosaStatus(v,btn){rosaStatus=v;btn.closest('.filter-group').querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderRosa();}
function renderRosa(){
  const q=(document.getElementById('rosa-search')||{}).value?.toLowerCase()||'';
  const list=PLAYERS.filter(p=>(rosaFilter==='tutti'||p.pos===rosaFilter)&&(rosaStatus==='tutti'||p.status===rosaStatus)&&(!q||p.nome.toLowerCase().includes(q)||p.pos.toLowerCase().includes(q)||String(p.num).includes(q)));
  document.getElementById('player-grid').innerHTML=list.map(p=>`
    <div class="player-card" onclick="openPlayerDetail(${p.id})">
      <div class="pc-top">
        <span class="pc-num">#${p.num}</span>
        <div class="pc-status ${p.status}"></div>
        <div class="pc-pic">${p.init}</div>
        <div class="pc-name">${p.nome.split(' ')[0]}<br/>${p.nome.split(' ')[1]||''}</div>
        <span class="pc-pos ${POS_STYLE[p.pos]}" style="background:${POS_BG[p.pos]}">${p.pos}</span>
      </div>
      <div class="pc-body">
        <div class="pc-mini">
          <div><div class="v">${p.pres}</div><div class="l">Pres</div></div>
          <div><div class="v">${p.gol}</div><div class="l">Gol</div></div>
          <div><div class="v">${p.ass}</div><div class="l">Ass</div></div>
        </div>
        <div class="pc-tags">
          <span class="meta-tag">${p.naz}</span>
          <span class="meta-tag">${p.piede}</span>
          <span class="meta-tag">${p.alt}cm</span>
          <span class="pill ${STATUS_P[p.status]}" style="font-size:.62rem">${STATUS_L[p.status]}</span>
        </div>
      </div>
    </div>`).join('');
}
function openPlayerDetail(id){
  const p=PLAYERS.find(x=>x.id===id);
  document.getElementById('modal-player-content').innerHTML=`
    <div style="background:linear-gradient(160deg,#0a2010,#1a3d20);padding:1.5rem 1.6rem;border-radius:16px 16px 0 0;display:flex;align-items:center;gap:1.5rem">
      <div style="width:80px;height:80px;border-radius:50%;background:var(--dark3);border:4px solid rgba(76,175,80,.4);display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:2rem;font-weight:800;flex-shrink:0">${p.init}</div>
      <div>
        <div style="font-size:.8rem;color:rgba(255,255,255,.35);margin-bottom:3px">N° ${p.num}</div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.8rem;font-weight:800;text-transform:uppercase;line-height:1">${p.nome}</div>
        <div style="display:flex;gap:8px;margin-top:8px"><span class="pill ${POS_STYLE[p.pos]}">${p.pos}</span><span class="pill ${STATUS_P[p.status]}">${STATUS_L[p.status]}</span></div>
      </div>
    </div>
    <div style="padding:1.25rem 1.6rem">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1.25rem">
        <div style="background:var(--dark3);border-radius:8px;padding:12px;text-align:center"><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.8rem;font-weight:800;color:var(--green-l)">${p.gol}</div><div style="font-size:.65rem;text-transform:uppercase;color:var(--muted);margin-top:2px">Gol</div></div>
        <div style="background:var(--dark3);border-radius:8px;padding:12px;text-align:center"><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.8rem;font-weight:800;color:#60a5fa">${p.ass}</div><div style="font-size:.65rem;text-transform:uppercase;color:var(--muted);margin-top:2px">Assist</div></div>
        <div style="background:var(--dark3);border-radius:8px;padding:12px;text-align:center"><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.8rem;font-weight:800">${p.pres}</div><div style="font-size:.65rem;text-transform:uppercase;color:var(--muted);margin-top:2px">Presenze</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;font-size:.82rem;margin-bottom:1rem">
        <div><span style="color:var(--muted)">Nazione</span><br/><strong>${p.naz}</strong></div>
        <div><span style="color:var(--muted)">Piede</span><br/><strong>${p.piede}</strong></div>
        <div><span style="color:var(--muted)">Altezza</span><br/><strong>${p.alt} cm</strong></div>
      </div>
      ${p.pos!=='POR'?`
      <div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:3px"><span style="color:var(--muted)">Passaggi riusciti</span><span>${p.pass}%</span></div><div style="background:var(--dark3);border-radius:4px;height:6px"><div style="height:6px;border-radius:4px;background:var(--green-l);width:${p.pass}%"></div></div></div>
      <div><div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:3px"><span style="color:var(--muted)">Dribbling riusciti</span><span>${p.drib}%</span></div><div style="background:var(--dark3);border-radius:4px;height:6px"><div style="height:6px;border-radius:4px;background:#60a5fa;width:${p.drib}%"></div></div></div>
      `:'<p style="font-size:.85rem;color:var(--muted)">Statistiche portiere in vista dedicata.</p>'}
    </div>`;
  openModal('modal-player');
}
function exportCSV(){
  const rows=[['Nome','Pos','#','Pres','Gol','Assist','Stato']];
  PLAYERS.forEach(p=>rows.push([p.nome,p.pos,p.num,p.pres,p.gol,p.ass,STATUS_L[p.status]]));
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(rows.map(r=>r.join(',')).join('\n'));a.download='rosa.csv';a.click();
}

/* ── CALENDARIO ── */
let calYear=TODAY.getFullYear(),calMonth=TODAY.getMonth();
function calEvForDay(y,m,d){return EVENTS.filter(e=>{const s=new Date(e.inizio);return s.getFullYear()===y&&s.getMonth()===m&&s.getDate()===d;}).sort((a,b)=>new Date(a.inizio)-new Date(b.inizio));}
function calRender(){
  document.getElementById('cal-month-title').textContent=`${MONTHS_IT[calMonth]} ${calYear}`;
  const grid=document.getElementById('cal-grid');grid.innerHTML='';
  const first=new Date(calYear,calMonth,1);
  let sdow=first.getDay()-1;if(sdow<0)sdow=6;
  const dim=new Date(calYear,calMonth+1,0).getDate();
  const dprev=new Date(calYear,calMonth,0).getDate();
  const total=Math.ceil((sdow+dim)/7)*7;
  for(let i=0;i<total;i++){
    let day,mo=calMonth,yr=calYear,other=false;
    if(i<sdow){day=dprev-sdow+i+1;mo=calMonth-1;if(mo<0){mo=11;yr--;}other=true;}
    else if(i>=sdow+dim){day=i-sdow-dim+1;mo=calMonth+1;if(mo>11){mo=0;yr++;}other=true;}
    else{day=i-sdow+1;}
    const isToday=!other&&yr===TODAY.getFullYear()&&mo===TODAY.getMonth()&&day===TODAY.getDate();
    const isWk=(i%7)>=5;
    const evs=calEvForDay(yr,mo,day);
    const cell=document.createElement('div');
    cell.className='cal-cell'+(other?' other-month':'')+(isToday?' today':'')+(isWk?' weekend':'');
    cell.onclick=()=>{if(!other)openAddEventModalOnDay(yr,mo,day);};
    let h=`<div class="day-num">${day}</div>`;
    evs.slice(0,2).forEach(e=>{const m2=TIPO_META[e.tipo];h+=`<div class="event-chip ${m2.chipClass}" onclick="event.stopPropagation();openEvEdit(${e.id})" title="${e.titolo}">${m2.icon} ${e.titolo}</div>`;});
    if(evs.length>2)h+=`<div class="more-chip">+${evs.length-2} altri</div>`;
    cell.innerHTML=h;grid.appendChild(cell);
  }
}
function calChangeMonth(d){calMonth+=d;if(calMonth>11){calMonth=0;calYear++;}if(calMonth<0){calMonth=11;calYear--;}calRender();renderEvTable();}
function calGoToday(){calYear=TODAY.getFullYear();calMonth=TODAY.getMonth();calRender();renderEvTable();}
function renderEvTable(){
  const sorted=[...EVENTS].filter(e=>{const d=new Date(e.inizio);return d.getFullYear()===calYear&&d.getMonth()===calMonth;}).sort((a,b)=>new Date(a.inizio)-new Date(b.inizio));
  document.getElementById('ev-list-tbl').innerHTML=sorted.map(e=>{
    const d=new Date(e.inizio),f=new Date(e.fine);
    return`<tr>
      <td>${d.getDate()} ${MONTHS_IT[d.getMonth()].slice(0,3)}</td>
      <td><strong>${e.titolo}</strong></td>
      <td><span class="pill ${TIPO_META[e.tipo].pill}">${TIPO_META[e.tipo].label}</span></td>
      <td style="color:var(--muted)">${d.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}–${f.toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}</td>
      <td style="color:var(--muted)">${e.luogo||'—'}</td>
      <td><div class="tbl-actions"><button class="btn-sm" onclick="openEvEdit(${e.id})">✏️</button><button class="btn-sm danger" onclick="deleteEvById(${e.id})">🗑</button></div></td>
    </tr>`;}).join('');
}
function toISO(d){const p=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;}
function openAddEventModal(){
  document.getElementById('ev-modal-title').textContent='Nuovo Evento';
  document.getElementById('ev-edit-id').value='';
  document.getElementById('ev-delete-btn').style.display='none';
  ['ev-titolo','ev-luogo','ev-note'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ev-tipo').value='allenamento';
  const n=new Date();n.setMinutes(0,0,0);
  document.getElementById('ev-inizio').value=toISO(n);
  document.getElementById('ev-fine').value=toISO(new Date(n.getTime()+7200000));
  openModal('modal-evento');
}
function openAddEventModalOnDay(y,m,d){
  openAddEventModal();
  const dt=new Date(y,m,d,9,0);
  document.getElementById('ev-inizio').value=toISO(dt);
  document.getElementById('ev-fine').value=toISO(new Date(dt.getTime()+7200000));
}
function openEvEdit(id){
  const e=EVENTS.find(x=>x.id===id);if(!e)return;
  document.getElementById('ev-modal-title').textContent='Modifica Evento';
  document.getElementById('ev-edit-id').value=id;
  document.getElementById('ev-delete-btn').style.display='inline-flex';
  document.getElementById('ev-titolo').value=e.titolo;
  document.getElementById('ev-tipo').value=e.tipo;
  document.getElementById('ev-inizio').value=e.inizio;
  document.getElementById('ev-fine').value=e.fine;
  document.getElementById('ev-luogo').value=e.luogo;
  document.getElementById('ev-note').value=e.note;
  openModal('modal-evento');
}
function saveEvent(){
  const titolo=document.getElementById('ev-titolo').value.trim();if(!titolo){alert('Inserisci un titolo.');return;}
  const obj={titolo,tipo:document.getElementById('ev-tipo').value,inizio:document.getElementById('ev-inizio').value,fine:document.getElementById('ev-fine').value,luogo:document.getElementById('ev-luogo').value.trim(),note:document.getElementById('ev-note').value.trim()};
  const eid=document.getElementById('ev-edit-id').value;
  if(eid){const i=EVENTS.findIndex(e=>e.id===+eid);if(i>-1)EVENTS[i]={...EVENTS[i],...obj};}
  else EVENTS.push({id:evNextId++,...obj});
  closeModal('modal-evento');calRender();renderEvTable();
}
function deleteEvent(){const id=+document.getElementById('ev-edit-id').value;if(id&&confirm('Eliminare?')){EVENTS=EVENTS.filter(e=>e.id!==id);closeModal('modal-evento');calRender();renderEvTable();}}
function deleteEvById(id){if(confirm('Eliminare?')){EVENTS=EVENTS.filter(e=>e.id!==id);calRender();renderEvTable();}}

/* ── STATISTICHE ── */
function statTab(name,btn){
  document.querySelectorAll('#sec-statistiche .tab').forEach((t,i)=>t.classList.toggle('active',['squadra','individuale','confronto','forma'][i]===name));
  document.querySelectorAll('#sec-statistiche .tab-panel').forEach(p=>p.classList.toggle('active',p.id==='stab-'+name));
  if(name==='individuale'){buildStatSelector();drawRadar(0);renderIndivBars(0);}
  if(name==='confronto')renderConfronto();
  if(name==='forma')renderForma();
}
function drawLineChart(){
  const gf=[2,1,0,3,2,4,2,0,3,1,2,3,1,4,2,3,1,2],gs=[1,0,2,0,2,1,0,1,1,0,1,2,0,1,1,0,2,1];
  const svg=document.getElementById('line-svg');if(!svg)return;
  const W=700,H=180,pad=20,mx=5;
  const xs=i=>pad+(W-2*pad)*(i/(gf.length-1));
  const ys=v=>H-pad-(H-2*pad)*(v/mx);
  let g='';for(let v=0;v<=mx;v++){const y=ys(v);g+=`<line x1="${pad}" y1="${y}" x2="${W-pad}" y2="${y}" stroke="rgba(48,54,61,.5)" stroke-width="1"/><text x="${pad-4}" y="${y+4}" text-anchor="end" font-size="10" fill="#8b949e">${v}</text>`;}
  const path=(arr,col)=>`<path d="${arr.map((v,i)=>`${i===0?'M':'L'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linejoin="round"/>`;
  const dots=(arr,col)=>arr.map((v,i)=>`<circle cx="${xs(i)}" cy="${ys(v)}" r="3.5" fill="${col}"/>`).join('');
  svg.innerHTML=g+path(gf,'#4caf50')+dots(gf,'#4caf50')+path(gs,'#f87171')+dots(gs,'#f87171');
}
function drawRadar(idx){
  const p=PLAYERS[idx],svg=document.getElementById('radar-svg');if(!svg)return;
  const CATS=['Gol','Assist','Passaggi','Dribbling','Duelli','Intercetti'],N=CATS.length,R=100,maxV=[20,12,100,100,100,30];
  const vals=[p.gol,p.ass,p.pass,p.drib,p.duelli,p.intercetti];
  let h='';
  for(let r=1;r<=5;r++){const pts=CATS.map((_,i)=>{const a=(2*Math.PI*i/N)-Math.PI/2,r2=(r/5)*R;return`${(r2*Math.cos(a)).toFixed(1)},${(r2*Math.sin(a)).toFixed(1)}`;});h+=`<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(48,54,61,.7)" stroke-width="1"/>`;}
  CATS.forEach((cat,i)=>{const a=(2*Math.PI*i/N)-Math.PI/2;h+=`<line x1="0" y1="0" x2="${(R*Math.cos(a)).toFixed(1)}" y2="${(R*Math.sin(a)).toFixed(1)}" stroke="rgba(48,54,61,.8)" stroke-width="1"/><text x="${(R*1.22*Math.cos(a)).toFixed(1)}" y="${(R*1.22*Math.sin(a)).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#8b949e">${cat}</text>`;});
  const pts=vals.map((v,i)=>{const a=(2*Math.PI*i/N)-Math.PI/2,d=Math.min(v/maxV[i]*R,R);return`${(d*Math.cos(a)).toFixed(1)},${(d*Math.sin(a)).toFixed(1)}`;});
  h+=`<polygon points="${pts.join(' ')}" fill="rgba(76,175,80,.15)" stroke="#4caf50" stroke-width="2"/>`;
  pts.forEach(pt=>{h+=`<circle cx="${pt.split(',')[0]}" cy="${pt.split(',')[1]}" r="4" fill="#4caf50"/>`;});
  svg.innerHTML=h;
  const el=document.getElementById('radar-player-name');if(el)el.textContent=p.nome;
}
function renderIndivBars(idx){
  const p=PLAYERS[idx];
  const kpi=document.getElementById('indiv-kpi');
  if(kpi)kpi.innerHTML=[{l:'Presenze',v:p.pres},{l:'Gol',v:p.gol},{l:'Assist',v:p.ass}].map(x=>`<div class="stat-cell"><div class="v">${x.v}</div><div class="l">${x.l}</div></div>`).join('');
  const bars=document.getElementById('indiv-bars');if(!bars)return;
  bars.innerHTML=[{l:'Passaggi %',v:p.pass,c:'fill-green'},{l:'Dribbling %',v:p.drib,c:'fill-blue'},{l:'Duelli vinti %',v:p.duelli,c:'fill-amber'},{l:'Tiri totali',v:p.tiri,mx:40,c:'fill-green'}]
    .map(it=>`<div class="bc-row"><div class="bc-label"><span class="name">${it.l}</span><span>${it.v}${it.l.includes('%')?'%':''}</span></div><div class="bc-track"><div class="bc-fill ${it.c}" style="width:${Math.min(it.v/(it.mx||100)*100,100).toFixed(0)}%"></div></div></div>`).join('');
}
let statSelPlayer=0;
function buildStatSelector(){
  const sel=document.getElementById('stat-player-sel');if(!sel)return;
  sel.innerHTML=PLAYERS.map((p,i)=>`<button class="ps-btn ${i===0?'active':''}" onclick="statSelectPlayer(${i},this)">${p.nome}</button>`).join('');
  drawRadar(0);renderIndivBars(0);
}
function statSelectPlayer(i,btn){statSelPlayer=i;document.querySelectorAll('#stat-player-sel .ps-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');drawRadar(i);renderIndivBars(i);}
const CMP_CATS=[{l:'Gol',k:'gol',mx:20},{l:'Assist',k:'ass',mx:12},{l:'Presenze',k:'pres',mx:25},{l:'Tiri',k:'tiri',mx:40},{l:'Passaggi %',k:'pass',mx:100},{l:'Dribbling %',k:'drib',mx:100}];
function renderConfronto(){
  const ia=+(document.getElementById('cmp-a')||{value:0}).value;
  const ib=+(document.getElementById('cmp-b')||{value:2}).value;
  const pa=PLAYERS[ia],pb=PLAYERS[ib];
  const grid=document.getElementById('compare-grid');if(!grid)return;
  const av=(p,col)=>`<div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#0e2a12,#1a3d20);border:3px solid ${col}40;display:flex;align-items:center;justify-content:center;font-family:'Barlow Condensed',sans-serif;font-size:1.1rem;font-weight:800;margin:0 auto 5px">${p.init}</div>`;
  let la='',ca='',ra='';
  CMP_CATS.forEach(c=>{
    const va=pa[c.k],vb=pb[c.k],pA=Math.min(va/c.mx*100,100),pB=Math.min(vb/c.mx*100,100),u=c.l.includes('%')?'%':'';
    la+=`<div style="margin-bottom:10px"><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:800;text-align:right">${va}${u}</div><div style="height:5px;background:var(--dark3);border-radius:3px;margin-top:3px"><div style="height:5px;border-radius:3px;background:var(--green-l);float:right;width:${pA}%"></div></div></div>`;
    ca+=`<div style="font-size:.68rem;text-transform:uppercase;color:var(--muted);text-align:center;padding:14px 0 0;line-height:1">${c.l}</div>`;
    ra+=`<div style="margin-bottom:10px"><div style="font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;font-weight:800">${vb}${u}</div><div style="height:5px;background:var(--dark3);border-radius:3px;margin-top:3px"><div style="height:5px;border-radius:3px;background:#60a5fa;width:${pB}%"></div></div></div>`;
  });
  grid.innerHTML=`
    <div><div style="text-align:center;margin-bottom:.75rem">${av(pa,'#4caf50')}<div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;color:var(--green-l);font-size:.9rem">${pa.nome}</div></div>${la}</div>
    <div style="padding-top:.5rem">${ca}</div>
    <div><div style="text-align:center;margin-bottom:.75rem">${av(pb,'#60a5fa')}<div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;color:#60a5fa;font-size:.9rem">${pb.nome}</div></div>${ra}</div>`;
}
function renderTopScorers(){
  const sorted=[...PLAYERS].sort((a,b)=>b.gol-a.gol).slice(0,6);
  const max=sorted[0].gol||1;
  const cols=['#facc15','#94a3b8','#b45309','#4caf50','#60a5fa','#a78bfa'];
  const el=document.getElementById('top-scorers');if(!el)return;
  el.innerHTML=sorted.map((p,i)=>`<div class="hbar-row"><div class="hbar-name">${['🥇 ','🥈 ','🥉 '][i]||''}${p.nome}</div><div class="hbar-track"><div class="hbar-fill" style="width:${(p.gol/max*100).toFixed(0)}%;background:${cols[i]}25;border:1px solid ${cols[i]}40"><span style="color:${cols[i]}">${p.gol} gol</span></div></div></div>`).join('');
}
const MATCHES=[
  {data:'25 Mag',avv:'Fortitudo',gf:2,gs:1,e:'w'},{data:'18 Mag',avv:'Virtus',gf:1,gs:1,e:'d'},
  {data:'11 Mag',avv:'Progresso',gf:3,gs:0,e:'w'},{data:'04 Mag',avv:'Imolese',gf:2,gs:2,e:'d'},
  {data:'27 Apr',avv:'Sasso',gf:1,gs:2,e:'l'},{data:'20 Apr',avv:'Centese',gf:4,gs:1,e:'w'},
  {data:'13 Apr',avv:'Argenta',gf:2,gs:0,e:'w'},{data:'06 Apr',avv:'Mezzolara',gf:0,gs:1,e:'l'},
  {data:'30 Mar',avv:'Pieve',gf:3,gs:1,e:'w'},{data:'23 Mar',avv:'Sanpaimola',gf:1,gs:0,e:'w'},
];
function renderForma(){
  const fd=document.getElementById('form-dots');if(!fd)return;
  fd.innerHTML=MATCHES.map(m=>`<div class="form-dot ${m.e}" title="${m.avv} ${m.gf}-${m.gs}">${m.e==='w'?'V':m.e==='d'?'P':'S'}</div>`).join('');
  const tb=document.getElementById('results-tbody');if(!tb)return;
  const PILL={w:'pill-green',d:'pill-amber',l:'pill-red'},LABEL={w:'Vittoria',d:'Pareggio',l:'Sconfitta'};
  tb.innerHTML=MATCHES.map(m=>`<tr><td>${m.data}</td><td>${m.avv}</td><td><strong>${m.gf} – ${m.gs}</strong></td><td><span class="pill ${PILL[m.e]}">${LABEL[m.e]}</span></td></tr>`).join('');
}

/* ── MESSAGGI ── */
function renderMsgList(filter=''){
  const el=document.getElementById('msg-sent-list');if(!el)return;
  const TIPO_L={direttiva:'📋 Direttiva',convocazione:'📣 Convocazione',aggiornamento:'ℹ️ Aggiornamento',altro:'💬 Altro'};
  const list=filter?MESSAGES.filter(m=>m.testo.toLowerCase().includes(filter)||m.dest.toLowerCase().includes(filter)):MESSAGES;
  el.innerHTML=list.map(m=>`<div class="msg-item" onclick="showMsgDetail(${m.id})">
    <div class="msg-head"><span class="msg-from">→ ${m.dest}</span><span class="msg-time">${m.ora}</span></div>
    <div class="msg-text">${m.testo}</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:5px">
      <span style="font-size:.68rem;color:var(--muted)">${TIPO_L[m.tipo]||''}</span>
      <span class="msg-status ${m.letti===m.tot?'letto':'inviato'}">${m.letti===m.tot?'✔✔ Letto da tutti':'✔ Letto '+m.letti+'/'+m.tot}</span>
    </div>
  </div>`).join('');
  const lbl=document.getElementById('msg-count-label');if(lbl)lbl.textContent=list.length+' messaggi';
}
function filterMsgs(v){renderMsgList(v.toLowerCase());}
function showMsgDetail(id){
  const m=MESSAGES.find(x=>x.id===id);if(!m)return;
  const TIPO_L={direttiva:'📋 Direttiva',convocazione:'📣 Convocazione',aggiornamento:'ℹ️ Aggiornamento',altro:'💬 Altro'};
  document.getElementById('msg-detail-body').innerHTML=`
    <div style="display:flex;gap:8px;margin-bottom:.75rem;flex-wrap:wrap">
      <span class="pill pill-gray">${TIPO_L[m.tipo]}</span>
      <span style="font-size:.78rem;color:var(--muted)">→ ${m.dest}</span>
      <span style="font-size:.78rem;color:var(--muted);margin-left:auto">${m.ora}</span>
    </div>
    <p style="font-size:.9rem;line-height:1.6;margin-bottom:.75rem">${m.testo}</p>
    <div style="background:var(--dark3);border-radius:8px;padding:.75rem;font-size:.8rem">
      <div style="color:var(--muted);margin-bottom:4px">Stato lettura</div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;background:var(--dark2);border-radius:4px;height:6px"><div style="height:6px;border-radius:4px;background:var(--green-l);width:${(m.letti/m.tot*100).toFixed(0)}%"></div></div>
        <span style="color:var(--green-l);font-weight:600">${m.letti}/${m.tot}</span>
      </div>
    </div>`;
  document.getElementById('msg-detail-card').style.display='block';
}
function sendMsg(){
  const dest=document.getElementById('msg-dest-full').value;
  const tipo=document.getElementById('msg-tipo').value;
  const testo=document.getElementById('msg-body-full').value.trim();
  if(!dest||!testo){alert('Seleziona destinatario e scrivi un messaggio.');return;}
  MESSAGES.unshift({id:msgNextId++,dest,tipo,testo,ora:'Ora',letti:0,tot:dest==='Tutta la squadra'?23:1});
  document.getElementById('msg-body-full').value='';
  renderMsgList();alert('Messaggio inviato a: '+dest);
}
function sendQuickMsg(){
  const dest=document.getElementById('dash-msg-dest').value;
  const testo=document.getElementById('dash-msg-text').value.trim();
  if(!dest||!testo){alert('Seleziona destinatario e scrivi un messaggio.');return;}
  MESSAGES.unshift({id:msgNextId++,dest,tipo:'altro',testo,ora:'Ora',letti:0,tot:dest==='Tutta la squadra'?23:1});
  document.getElementById('dash-msg-text').value='';
  alert('Messaggio inviato a: '+dest);
}

/* ── INIT ── */
document.getElementById('topbar-actions').innerHTML=TOPBAR_BTN['dashboard'];