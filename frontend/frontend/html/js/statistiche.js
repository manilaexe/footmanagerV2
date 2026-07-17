
/* ── DATI ── */
const PLAYERS = [
  {nome:'L. Rossi',   pres:18,gol:12,ass:5, tiri:34,pass:78,drib:62,duelli:58,intercetti:12,amm:2,esp:0},
  {nome:'M. Bianchi', pres:20,gol:4, ass:8, tiri:18,pass:85,drib:70,duelli:64,intercetti:20,amm:3,esp:0},
  {nome:'A. Ferrari', pres:15,gol:9, ass:3, tiri:28,pass:72,drib:68,duelli:52,intercetti:10,amm:1,esp:0},
  {nome:'G. Esposito',pres:22,gol:0, ass:0, tiri:0, pass:88,drib:0, duelli:45,intercetti:8, amm:1,esp:0},
  {nome:'P. Romano',  pres:19,gol:2, ass:1, tiri:8, pass:80,drib:45,duelli:70,intercetti:25,amm:5,esp:1},
];

const MATCHES = [
  {data:'25 Mag',avv:'Fortitudo',  gf:2,gs:1,esito:'w'},
  {data:'18 Mag',avv:'Virtus',    gf:1,gs:1,esito:'d'},
  {data:'11 Mag',avv:'Progresso', gf:3,gs:0,esito:'w'},
  {data:'04 Mag',avv:'Imolese',   gf:2,gs:2,esito:'d'},
  {data:'27 Apr',avv:'Sasso',     gf:1,gs:2,esito:'l'},
  {data:'20 Apr',avv:'Centese',   gf:4,gs:1,esito:'w'},
  {data:'13 Apr',avv:'Argenta',   gf:2,gs:0,esito:'w'},
  {data:'06 Apr',avv:'Mezzolara', gf:0,gs:1,esito:'l'},
  {data:'30 Mar',avv:'Pieve',     gf:3,gs:1,esito:'w'},
  {data:'23 Mar',avv:'Sanpaimola',gf:1,gs:0,esito:'w'},
];

/* ── TABS ── */
function switchTab(name){
  document.querySelectorAll('.tab').forEach((t,i)=>{
    t.classList.toggle('active',['squadra','individuale','confronto','forma'][i]===name);
  });
  document.querySelectorAll('.tab-panel').forEach(p=>{
    p.classList.toggle('active',p.id==='tab-'+name);
  });
}

/* ── LINE CHART ── */
function drawLineChart(){
  const gf=[2,1,0,3,2,4,2,0,3,1,2,3,1,4,2,3,1,2];
  const gs=[1,0,2,0,2,1,0,1,1,0,1,2,0,1,1,0,2,1];
  const svg=document.getElementById('line-svg');
  const W=700,H=200,pad=20,maxV=5;
  const xs=i=>pad+(W-2*pad)*(i/(gf.length-1));
  const ys=v=>H-pad-(H-2*pad)*(v/maxV);
  const path=(arr,col)=>{
    let d=arr.map((v,i)=>`${i===0?'M':'L'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            ${arr.map((v,i)=>`<circle cx="${xs(i)}" cy="${ys(v)}" r="4" fill="${col}" opacity=".8"/>`).join('')}`;
  };
  // grid
  let grid='';
  for(let g=0;g<=maxV;g++){
    const y=ys(g);
    grid+=`<line x1="${pad}" y1="${y}" x2="${W-pad}" y2="${y}" stroke="rgba(48,54,61,.6)" stroke-width="1"/>
           <text x="${pad-4}" y="${y+4}" text-anchor="end" font-size="10" fill="#8b949e">${g}</text>`;
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
  const N=RADAR_CATS.length,R=100;
  const maxVals=[20,12,100,100,100,30];
  const vals=[p.gol,p.ass,p.pass,p.drib,p.duelli,p.intercetti];
  // grid
  let html='';
  for(let ring=1;ring<=5;ring++){
    const pts=RADAR_CATS.map((_,i)=>{const a=(2*Math.PI*i/N)-Math.PI/2;const r2=(ring/5)*R;return`${(r2*Math.cos(a)).toFixed(1)},${(r2*Math.sin(a)).toFixed(1)}`;});
    html+=`<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(48,54,61,.7)" stroke-width="1"/>`;
  }
  // axes + labels
  RADAR_CATS.forEach((cat,i)=>{
    const a=(2*Math.PI*i/N)-Math.PI/2;
    html+=`<line x1="0" y1="0" x2="${(R*Math.cos(a)).toFixed(1)}" y2="${(R*Math.sin(a)).toFixed(1)}" stroke="rgba(48,54,61,.8)" stroke-width="1"/>`;
    const lx=(R*1.2*Math.cos(a)).toFixed(1),ly=(R*1.2*Math.sin(a)).toFixed(1);
    html+=`<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#8b949e">${cat}</text>`;
  });
  // shape
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
  const max=sorted[0].gol||1;
  const cols=['#facc15','#94a3b8','#b45309','#4caf50','#60a5fa','#a78bfa'];
  document.getElementById('top-scorers').innerHTML=sorted.map((p,i)=>`
    <div class="hbar-row">
      <div class="hbar-name">${i===0?'🥇 ':i===1?'🥈 ':i===2?'🥉 ':''}${p.nome}</div>
      <div class="hbar-track">
        <div class="hbar-fill" style="width:${(p.gol/max*100).toFixed(0)}%;background:${cols[i]}20;border:1px solid ${cols[i]}40">
          <span style="color:${cols[i]}">${p.gol} gol</span>
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
  drawRadar(0); renderIndivBars(0);
}
function selectPlayer(i,btn){
  selPlayer=i;
  document.querySelectorAll('#player-selector .ps-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  drawRadar(i); renderIndivBars(i);
}

/* ── CONFRONTO ── */
const COMPARE_CATS=[
  {lbl:'Gol',key:'gol',max:20},
  {lbl:'Assist',key:'ass',max:12},
  {lbl:'Presenze',key:'pres',max:25},
  {lbl:'Tiri',key:'tiri',max:40},
  {lbl:'Passaggi %',key:'pass',max:100},
  {lbl:'Dribbling %',key:'drib',max:100},
];
function renderConfronto(){
  const ia=+document.getElementById('cmp-a').value;
  const ib=+document.getElementById('cmp-b').value;
  const pa=PLAYERS[ia],pb=PLAYERS[ib];
  const grid=document.getElementById('compare-grid');
  let leftH='',centerH='',rightH='';
  COMPARE_CATS.forEach(c=>{
    const va=pa[c.key],vb=pb[c.key];
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
  document.getElementById('form-dots').innerHTML=MATCHES.map(m=>`
    <div class="form-dot ${m.esito}" title="${m.avv} ${m.gf}-${m.gs}">${esito[m.esito]}</div>
  `).join('');
  const pill={w:'pill-green',d:'pill-amber',l:'pill-red'};
  const label={w:'Vittoria',d:'Pareggio',l:'Sconfitta'};
  document.getElementById('results-tbody').innerHTML=MATCHES.map(m=>`
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

/* ── INIT ── */
drawLineChart();
buildSelector();
renderConfronto();
renderForma();
renderTopScorers();