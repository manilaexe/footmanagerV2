/* ==========================================================================
   1. CONFIGURAZIONE API E VARIABILI GLOBALI DI STATO
   ==========================================================================
   Definiamo gli endpoint per la comunicazione con il server (backend)
   e le variabili di stato che mantengono in memoria i dati condivisi nell'applicazione
   (lista giocatori, partite, ruoli e nome dell'utente loggato).
*/
const API_BASE_URL = 'http://localhost:8080/api'; // Definisce l'URL di base dell'API REST a cui inviare tutte le richieste HTTP per il backend
const token = localStorage.getItem('token');      // Recupera il token di autenticazione JWT dalla memoria locale del browser (localStorage), salvato durante il login

//ARRAY DINAMICI CHE VERRANNO POPOLATI DALLE CHIAMATE API
let PLAYERS = [];         // Array globale destinato a contenere l'elenco completo dei giocatori ricevuti dal server
/*NON CREDO SERVA, NON ABBIAMO UN DB CON I MATCH MA MAGARI CON UN API CHE SI COLLEGA A "GOOGLE E PRENDE I DFATI DELLE PARTITE POTREBBE ESSE USATO COME COLLEGAMENTO ESTERNO SENZA USARE PROGETTI DI ALTRI COMPAGNI*/
  let MATCHES = [];         // Array globale destinato a contenere la cronologia e l'andamento delle ultime partite
let ruoloUtente = '';     // Memorizza la stringa rappresentante il ruolo dell'utente (es. 'ALLENATORE' o 'GIOCATORE') per adattare l'interfaccia
let mioNomeStat = '';     // Memorizza il nome del giocatore corrente nel formato "N. Cognome" per identificarlo all'interno delle liste

/* ==========================================================================
   2. INIZIALIZZAZIONE DELLA PAGINA (EVENTO DOMContentLoaded)
   ==========================================================================
   Viene eseguito non appena il documento HTML è stato completamente scaricato e analizzato.
   Si occupa di:
   - Verificare le credenziali di accesso.
   - Popolare l'interfaccia utente di base (sidebar con nome, ruolo e avatar).
   - Verificare le autorizzazioni di ruolo (nascondendo sezioni se l'utente è un semplice giocatore).
   - Avviare il caricamento asincrono dei dati reali dal server tramite API.
*/
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Esegue la funzione di verifica per controllare se il token di login è presente e valido  
  verificaAutenticazione(); 

  // 2. Seleziona gli elementi DOM della sidebar da popolare con i dati dell'utente    
  const sbName = document.getElementById('sb-nome');    // Elemento per il nome e cognome
  const sbRole = document.getElementById('sb-ruolo');   // Elemento per la visualizzazione del ruolo
  const sbAv   = document.getElementById('sb-avatar');  // Elemento contenitore per l'avatar con le iniziali
  
  // Recupera il nome, cognome e ruolo dell'utente memorizzati nel localStorage, definendo valori di fallback se assenti
  const nome    = localStorage.getItem('nomeReale')    || localStorage.getItem('username') || 'Utente';
  const cognome = localStorage.getItem('cognomeReale') || '';
  const ruolo   = localStorage.getItem('ruolo')        || '';
    
  // Se l'elemento del nome esiste nella pagina, inserisce il nome completo o solo il nome
  if (sbName) sbName.textContent = cognome ? `${nome} ${cognome}` : nome;
  // Se esistono sia l'elemento ruolo che la stringa del ruolo, aggiorna il testo visibile
  if (sbRole && ruolo) {
    sbRole.textContent = ruolo;
  }
  // Se l'elemento avatar esiste, estrae le iniziali di Nome e Cognome e invoca la funzione di rendering dell'avatar
  if (sbAv) renderAvatar(sbAv, (nome[0]||('')).toUpperCase() + (cognome[0]||nome[1]||'').toUpperCase());

  // Assegna il ruolo dell'utente alla variabile globale
  ruoloUtente = ruolo;
  // Costruisce la stringa identificativa "N. Cognome" (es. "M. Rossi") utilizzata dal backend per le statistiche
  mioNomeStat = nome ? `${nome.charAt(0).toUpperCase()}. ${cognome}` : '';
  // Se l'utente loggato è un semplice 'GIOCATORE', nasconde tutte le sezioni riservate alla vista complessiva di squadra
  if (ruoloUtente === 'GIOCATORE') nascondiSezioniSquadra();

  // 3. Imposta l'interfaccia nello stato di caricamento iniziale (es. placeholders o testi temporanei)
  aggiornaInterfacciaCaricamento();

  // 4. Avvia contemporaneamente e in modo parallelo le due chiamate HTTP asincrone verso il backend
  await Promise.all([
    caricaDatiSquadra(),  // Richiede i dati e le statistiche globali della squadra
    caricaDatiGiocatori() // Richiede le statistiche individuali di tutti i giocatori
  ]);
});

/* ==========================================================================
   3. REPERIMENTO DATI DAL BACKEND (CHIAMATE HTTP API)
   ==========================================================================
   Contiene le funzioni asincrone che comunicano direttamente con il backend tramite API REST (`fetch`).
   Si occupano di scaricare i dati JSON, gestire eventuali errori di rete o autenticazione e scatenare il popolamento dei componenti visivi.
*/
// 1. Recupera dal server le statistiche generali di squadra e l'andamento degli ultimi match
async function caricaDatiSquadra() {
  try {
    // Effettua una richiesta HTTP GET all'endpoint /statistiche/squadra allegando il token Bearer nell'header
    const response = await fetch(`${API_BASE_URL}/statistiche/squadra`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    // Controlla se la risposta del server è andata a buon fine (status code 200-299); altrimenti lancia un errore
    if (!response.ok) throw new Error('Errore nel recupero dei dati squadra');
      
    // Converte il corpo della risposta HTTP da formato JSON in un oggetto JavaScript gestibile  
    const data = await response.json();
      
    // Popola i riquadri con i KPI principali di squadra in alto nella dashboard
    popolaKpiSquadra(data.kpi);
        
    // Disegna il grafico a linee dell'andamento dei gol fatti e subiti
    drawLineChart(data.andamentoGolFatti, data.andamentoGolSubiti);
        
    // Salva nell'array globale l'elenco dei match recenti oppure un array vuoto se non presenti
    MATCHES = data.ultimiMatch || [];
    
    // Genera la visualizzazione grafica dello stato di forma recente della squadra
    renderForma();
  } catch (error) {
    // Intercetta e gestisce eventuali eccezioni durante la richiesta o l'elaborazione dei dati
    console.error('Errore nel caricamento della squadra:', error);
  }
}

// 2. Recupera dal server le statistiche dettagliate relative a tutti i singoli giocatori
async function caricaDatiGiocatori() {
  try {
    // Effettua una richiesta HTTP GET all'endpoint /statistiche/giocatori includendo l'autorizzazione JWT
    const response = await fetch(`${API_BASE_URL}/statistiche/giocatori`, {
            headers: { 'Authorization': `Bearer ${token}` }
    });

    // Se la risposta non è valida o ritorna un codice di errore, blocca l'esecuzione e lancia un'eccezione
    if (!response.ok) throw new Error('Errore nel recupero dei giocatori');
        
    // Decodifica la risposta JSON salvando l'array ottenuto nella variabile globale PLAYERS
    PLAYERS = await response.json();
       
    // Se l'array di giocatori contiene almeno un elemento
    if (PLAYERS.length > 0) {
      buildSelector();    // Costruisce la lista/selettore per la scelta del giocatore attivo
      renderConfronto();  // Renderizza il pannello di confronto tra due giocatori
      renderTopScorers(); // Genera la classifica visiva dei migliori marcatori (Top Scorers)
            
      // Se sono già state caricate le partite di squadra, forza un ricalcolo aggiornato dei dati correlati
      if(MATCHES.length > 0) {
        caricaDatiSquadra(); 
      }
    } else {
      // Se il server restituisce un array vuoto, mostra un messaggio informativo nel selettore
      document.getElementById('player-selector').innerHTML = "<p>Nessun giocatore trovato.</p>";
    }
  } catch (error) {
    // Registra in console gli eventuali errori di connessione o di parsing del file JSON
    console.error('Errore nel caricamento dei giocatori:', error);
  }
}

/* ==========================================================================
   4. POPOLAMENTO ELEMENTI STATICI E KPI DI SQUADRA
   ==========================================================================
   Prende in ingresso i dati KPI aggregati e calcola le varie metriche di squadra
   (rendimento offensivo, difensivo, possesso palla, percentuali di precisione) aggiornando
   dinamicamente gli elementi di testo, le barre di progresso HTML e i grafici a cerchio SVG.
*/
function popolaKpiSquadra(kpi) {
  // Se l'oggetto KPI ricevuto è nullo o non definito, interrompe l'esecuzione
  if (!kpi) return;
    
  // Helper per impostare il testo di un elemento DOM dato il suo ID
  const impostaTesto = (id, valore) => {
    const el = document.getElementById(id);
    if (el) el.textContent = valore;
  };

  // Helper per calcolare la percentuale e aggiornare le barre di progresso CSS
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

  // Helper per aggiornare i grafici a cerchio (SVG Donuts)
  const aggiornaDonut = (idTesto, idCerchio, valorePercentuale) => {
    // Clamping tra 0% e 100%
    const pct = Math.min(Math.max(Number(valorePercentuale) || 0, 0), 100);
    
    // Aggiorna la label testuale al centro del cerchio
    impostaTesto(idTesto, `${pct.toFixed(0)}%`);

    // Aggiorna il tratto dell'SVG (stroke-dasharray)
    const cerchio = document.getElementById(idCerchio);
    if (cerchio) {
      cerchio.setAttribute('stroke-dasharray', `${pct.toFixed(1)} ${100 - pct.toFixed(1)}`);
    }
  };

  // Valori principali dal DB con fallback
  const partiteTotali = kpi.partiteGiocate ?? kpi.partite ?? 2; 
  const golFattiTotali = kpi.golFatti ?? 2;
  const golSubitiTotali = kpi.golSubiti ?? 4;

  // 1. Popola i box numerici dei KPI principali in alto
  impostaTesto('kpi-gol-fatti', golFattiTotali);
  impostaTesto('kpi-gol-subiti', golSubitiTotali);
  impostaTesto('kpi-partite', partiteTotali);
  impostaTesto('kpi-vittorie', kpi.vittorie ?? 0);
  impostaTesto('kpi-pareggi', kpi.pareggi ?? 0);
  impostaTesto('kpi-sconfitte', kpi.sconfitte ?? 0);

  // Somma statistiche avanzate dai giocatori (PLAYERS)
  const totaleTiriGiocatori = PLAYERS.reduce((sum, p) => sum + (Number(p.tiri) || 0), 0);
  const totaleAssistGiocatori = PLAYERS.reduce((sum, p) => sum + (Number(p.ass) || 0), 0);
  const totaleIntercetti = PLAYERS.reduce((sum, p) => sum + (Number(p.intercetti) || 0), 0);

  const giocatoriAttivi = PLAYERS.filter(p => (Number(p.pres) || 0) > 0);
  const contaAttivi = giocatoriAttivi.length || 1;

  // Medie generali per giocatore
  const mediaPassaggi = giocatoriAttivi.reduce((sum, p) => sum + (Number(p.pass) || 0), 0) / contaAttivi;
  const mediaDuelli = giocatoriAttivi.reduce((sum, p) => sum + (Number(p.duelli) || 0), 0) / contaAttivi;

  // Medie squadra per partita
  const golFattiMedio = golFattiTotali / partiteTotali;
  const golSubitiMedio = golSubitiTotali / partiteTotali;
  const tiriMedio = totaleTiriGiocatori / partiteTotali;
  const assistMedio = totaleAssistGiocatori / partiteTotali;

  // Conversione tiri/gol %
  const conversioneSquadra = totaleTiriGiocatori > 0 ? (golFattiTotali / totaleTiriGiocatori) * 100 : 0;

  // 2. Aggiorna "Rendimento Offensivo"
  aggiornaBarra('txt-off-gol', 'bar-off-gol', golFattiMedio, 4.0);
  aggiornaBarra('txt-off-tiri', 'bar-off-tiri', tiriMedio, 10.0);
  aggiornaBarra('txt-off-conversione', 'bar-off-conversione', conversioneSquadra, 100, true); 
  aggiornaBarra('txt-off-chance', 'bar-off-chance', kpi.bigChancePartita ?? 1.5, 6.0);
  aggiornaBarra('txt-off-assist', 'bar-off-assist', assistMedio, 4.0);

  // 3. Aggiorna "Rendimento Difensivo"
  aggiornaBarra('txt-def-gol', 'bar-def-gol', golSubitiMedio, 3.0);
  aggiornaBarra('txt-def-clean', 'bar-def-clean', kpi.cleanSheet ?? 0, partiteTotali); 
  aggiornaBarra('txt-def-tackle', 'bar-def-tackle', mediaDuelli / 4, 25.0);
  aggiornaBarra('txt-def-intercetti', 'bar-def-intercetti', totaleIntercetti / partiteTotali, 20.0);
  aggiornaBarra('txt-def-falli', 'bar-def-falli', kpi.falliSubitiPartita ?? 0, 25.0);

  // 4. CALCOLO E AGGIORNAMENTO DEI 6 CERCHI (DONUTS)

  // --- DUELLI ---
  const duelliVintiTot  = PLAYERS.reduce((s, p) => s + (Number(p.duelliRiusciti) || Number(p.duelli) || 0), 0);
  const duelliTotali    = PLAYERS.reduce((s, p) => s + (Number(p.duelliTentati)  || 0), 0);
  const pctDuelliVinti  = duelliTotali > 0 ? (duelliVintiTot / duelliTotali) * 100 : (kpi.pctDuelliVinti ?? 50);
  const pctDuelliPersi  = 100 - pctDuelliVinti;

  aggiornaDonut('kpi-duelli-vinti', 'circle-duelli-vinti', pctDuelliVinti);
  aggiornaDonut('kpi-duelli-persi', 'circle-duelli-persi', pctDuelliPersi);

  // --- PASSAGGI ---
  const passVintiTot  = PLAYERS.reduce((s, p) => s + (Number(p.passaggiRiusciti) || 0), 0);
  const passTotali    = PLAYERS.reduce((s, p) => s + (Number(p.passaggiTentati)  || 0), 0);
  const pctPassaggi   = passTotali > 0 ? (passVintiTot / passTotali) * 100 : (kpi.precisionePassaggi ?? mediaPassaggi ?? 50);

  aggiornaDonut('kpi-precisione', 'circle-precisione', pctPassaggi);

  // --- DRIBBLING ---
  const dribVintiTot  = PLAYERS.reduce((s, p) => s + (Number(p.dribblingRiusciti) || Number(p.drib) || 0), 0);
  const dribTotali    = PLAYERS.reduce((s, p) => s + (Number(p.dribblingTentati)  || 0), 0);
  const pctDribVinti  = dribTotali > 0 ? (dribVintiTot / dribTotali) * 100 : (kpi.pctDribblingVinti ?? 50);
  const pctDribPersi  = 100 - pctDribVinti;

  aggiornaDonut('kpi-drib-vinti', 'circle-drib-vinti', pctDribVinti);
  aggiornaDonut('kpi-drib-persi', 'circle-drib-persi', pctDribPersi);

  // --- POSSESSO ---
  const pctPossesso = kpi.possessoMedio ?? 50;
  aggiornaDonut('kpi-possesso', 'circle-possesso', pctPossesso);
}

/* ==========================================================================
   5. ADATTAMENTO DELL'INTERFACCIA E UTILITIES
   ==========================================================================
   Gestiscono lo stato visivo della pagina:
   - Notificano lo stato di caricamento dati.
   - Limitano la vista e nascondono componenti ad uso esclusivo dello staff quando accede un GIOCATORE.
   - Gestiscono il passaggio visivo tra i vari tab (Squadra, Individuale, Confronto, Forma).
*/
// Sostituisce il contenuto del selettore giocatori con una stringa di caricamento temporanea
function aggiornaInterfacciaCaricamento() {
    document.getElementById('player-selector').innerHTML = "Caricamento giocatori...";
}

// Oculta gli elementi di squadra quando l'utente loggato è un semplice GIOCATORE
function nascondiSezioniSquadra() {
  // Helper per nascondere un elemento per ID impostando il display CSS a 'none'
  const nascondi = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };

  // Nasconde i grafici e i riquadri delle statistiche complessive di squadra
  nascondi('card-line-chart');
  nascondi('grid-possesso-disciplina');
  nascondi('card-classifica-marcatori');

  // Nasconde la barra superiore contenente i KPI generali
  const kpiStrip = document.querySelector('.kpi-strip');
  if (kpiStrip) kpiStrip.style.display = 'none';

  // Definisce la struttura dei tab visibili e nasconde i pulsanti "Squadra" e "Confronto"
  const tabOrder = ['squadra', 'individuale', 'confronto', 'forma'];
  const tabButtons = document.querySelectorAll('.tab');
  ['squadra', 'confronto'].forEach(name => {
    const idx = tabOrder.indexOf(name);
    if (tabButtons[idx]) tabButtons[idx].style.display = 'none';  // Nasconde il pulsante del tab
  });

  // Personalizza l'intestazione H1 della pagina rendendola individuale
  const h1 = document.querySelector('.topbar h1');
  if (h1) h1.textContent = 'Le mie statistiche';

  // Forza la navigazione diretta ed esclusiva al tab delle statistiche individuali
  switchTab('individuale');
}

// Gestisce l'attivazione/disattivazione visiva dei Tab della pagina
function switchTab(name){
  // Cicla su tutti i pulsanti tab e applica la classe 'active' solo al tab selezionato
  document.querySelectorAll('.tab').forEach((t,i)=>{
    t.classList.toggle('active',['squadra','individuale','confronto','forma'][i]===name);
  });
  // Cicla su tutti i pannelli dei contenuti e rende visibile solo quello corrispondente al nome
  document.querySelectorAll('.tab-panel').forEach(p=>{
    p.classList.toggle('active',p.id==='tab-'+name);
  });
}

/* ==========================================================================
   6. GRAFICO A LINEE SVG (LINE CHART DINAMICO)
   ==========================================================================
   Disegna un grafico cartesiano vettoriale SVG per rappresentare lo storico dei gol fatti e subiti.
   Calcola e scala la coordinata X e la coordinata Y per ciascun punto, tracciando linee e griglie.
*/
function drawLineChart(gf = [], gs = []){
  // Se gli array dei gol sono vuoti, assegna un valore iniziale predefinito [0] per evitare errori
  if (gf.length === 0) gf = [0];
  if (gs.length === 0) gs = [0];
  
  // Recupera l'elemento SVG dal DOM
  const svg = document.getElementById('line-svg');
  if(!svg) return;  // Se il canvas SVG non esiste interrompe la funzione
  
  const W=700,H=200,pad=20,maxV=Math.max(...gf, ...gs, 5);  // Definisce le dimensioni del grafico: Larghezza (W), Altezza (H), Margine (pad) e Valore Massimo della scala (maxV)
  const xs=i=>pad+(W-2*pad)*(i/(gf.length-1 || 1));         // Trasforma un indice di array (0, 1, 2...) nella coordinata X sul piano cartesiano SVG
  const ys=v=>H-pad-(H-2*pad)*(v/maxV);                     // Trasforma un valore numerico nella coordinata Y invirtendo l'asse (in SVG l'origine 0 è in alto)
  
  // Funzione interna per generare la stringa 'd' del percorso <path> SVG e i pallini <circle> di evidenziazione
  const path=(arr,col)=>{
    // Mappa ciascun punto dell'array creando i comandi SVG 'M' (Move To per il primo punto) o 'L' (Line To)
    let d=arr.map((v,i)=>`${i===0?'M':'L'}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
    // Ritorna l'elemento <path> del tracciato unito ai vari <circle> sovrapposti per ogni singolo punto
    return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            ${arr.map((v,i)=>`<circle cx="${xs(i)}" cy="${ys(v)}" r="3" fill="${col}" opacity=".8"/>`).join('')}`;
  };

  // Costruisce le linee orizzontali di griglia e i relativi valori dell'asse Y
  let grid='';
  for(let g=0;g<=maxV;g++){
    const y=ys(g);
    grid+=`<line x1="${pad}" y1="${y}" x2="${W-pad}" y2="${y}" stroke="rgba(48,54,61,.6)" stroke-width="1"/>
           <text x="${pad-10}" y="${y+4}" text-anchor="end" font-size="14" fill="#8b949e">${g}</text>`;
  }

  // Inserisce nel container SVG sia la griglia di sfondo che le due linee (verde per gol fatti, rossa per subiti)
  svg.innerHTML=grid+path(gf,'#4caf50')+path(gs,'#f87171');
}

/* ==========================================================================
   7. GRAFICO RADAR (SPIDER CHART / STELLA)
   ==========================================================================
   Calcola le coordinate polari/trigonometriche per generare un grafico Spider Radar a 6 assi.
   Converte valori percentuali/statistici in posizioni X,Y su un piano circolare a 360 gradi.
*/
// Definisce le 6 categorie che rappresentano gli assi del grafico Radar
const RADAR_CATS=['Gol','Assist','Passaggi','Dribbling','Duelli','Intercetti'];
// Converte array di valori in coordinate cartesiane [x, y] ruotate nello spazio circolare
function radarPts(vals,max=100,r=100){
  return vals.map((v,i)=>{
    const angle=(2*Math.PI*i/vals.length)-Math.PI/2;  // Calcola l'angolo in radianti per ciascuna delle 6 categorie (offset di -90° per partire dall'alto)
    const d=(v/max)*r;                                // Calcola la distanza dal centro in proporzione al valore relativo al massimo
    return [d*Math.cos(angle),d*Math.sin(angle)];     // Utilizza funzioni trigonometriche cos() e sin() per convertire la coordinata polare in cartesiana [x, y]
  });
}

// Disegna e renderizza l'intero grafico Radar vettoriale per il giocatore selezionato
function drawRadar(idx){
  const p = PLAYERS[idx];   // Recupera il giocatore dall'array tramite indice
  const svg = document.getElementById('radar-svg');
  if(!svg || !p) return;  // Controlla la presenza sia dell'SVG che dell'oggetto giocatore
  
  // Distingue categorie, valori massimi e valori reali in base al ruolo (Portiere vs Giocatore di movimento)
  const isGK = Boolean(p.portiere);
  
  const cats = isGK 
    ? ['Parate', 'Clean Sheet', 'Passaggi', 'Uscite', 'Duelli', 'Intercetti']
    : RADAR_CATS; // ['Gol','Assist','Passaggi','Dribbling','Duelli','Intercetti']

  const maxVals = isGK 
    ? [80, 15, 100, 30, 100, 30] 
    : [20, 12, 100, 100, 100, 30];

  const vals = isGK 
    ? [p.parate, p.cleanSheet, p.pass, p.uscite, p.duelli, p.intercetti]
    : [p.gol, p.ass, p.pass, p.drib, p.duelli, p.intercetti];

  const N = cats.length, R = 100;

  let html = '';

  // 1. Disegna 5 poligoni concentrici grigi per la ragnatela di sfondo
  for(let ring = 1; ring <= 5; ring++){
    const pts = cats.map((_, i) => {
      const a = (2 * Math.PI * i / N) - Math.PI / 2;
      const r2 = (ring / 5) * R;
      return `${(r2 * Math.cos(a)).toFixed(1)},${(r2 * Math.sin(a)).toFixed(1)}`;
    });
    html += `<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(48,54,61,.7)" stroke-width="1"/>`;
  }

  // 2. Disegna le 6 linee degli assi radiali e posiziona le etichette specifiche
  cats.forEach((cat, i) => {
    const a = (2 * Math.PI * i / N) - Math.PI / 2;
    html += `<line x1="0" y1="0" x2="${(R * Math.cos(a)).toFixed(1)}" y2="${(R * Math.sin(a)).toFixed(1)}" stroke="rgba(48,54,61,.8)" stroke-width="1"/>`;
    const lx = (R * 1.2 * Math.cos(a)).toFixed(1);
    const ly = (R * 1.2 * Math.sin(a)).toFixed(1);
    html += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#8b949e">${cat}</text>`;
  });

  // 3. Normalizza i valori (0-100%) e calcola le coordinate poligonali
  const pts = radarPts(vals.map((v, i) => Math.min((v || 0) / maxVals[i] * 100, 100)), 100, R);
  const poly = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  // Aggiunge il poligono pieno con colore differente per i portieri (es. Arancione/Amber per GK, Verde per Movement)
  const color = isGK ? '#f59e0b' : '#4caf50';
  const fillColor = isGK ? 'rgba(245, 158, 11, 0.15)' : 'rgba(76, 175, 80, 0.15)';

  html += `<polygon points="${poly}" fill="${fillColor}" stroke="${color}" stroke-width="2"/>`;
  pts.forEach(([x, y]) => { html += `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`; });
  
  // Inserisce l'HTML generato dentro il tag SVG e aggiorna l'intestazione
  svg.innerHTML = html;
  document.getElementById('radar-name').textContent = `${p.nome} ${isGK ? '(POR)' : ''}`;
}

/* ==========================================================================
   8. STATISTICHE INDIVIDUALI E TOP SCORERS
   ==========================================================================
   Spiegazione generale:
   Renderizza le metriche prestazionali del singolo giocatore sotto forma di barre orizzontali di avanzamento
   e crea la classifica visiva dei principali marcatori ordinando i dati dei giocatori dal valore più alto al più basso.
*/
// Renderizza la scheda dettagliata a barre per le statistiche del singolo giocatore selezionato
function renderIndivBars(idx){
  const p = PLAYERS[idx]; // Seleziona il giocatore
  if(!p) return;

  // Struttura dati condizionale in base al ruolo
  const items = p.portiere ? [
    { l: 'Presenze', v: p.pres || 0, max: 25, c: 'fill-green' },
    { l: 'Parate effettuate', v: p.parate || 0, max: 80, c: 'fill-blue' },
    { l: 'Clean Sheet', v: p.cleanSheet || 0, max: 15, c: 'fill-green' },
    { l: 'Gol Subiti', v: p.golSubiti || 0, max: 30, c: 'fill-amber' },
    { l: 'Passaggi %', v: p.pass || 0, max: 100, c: 'fill-blue' },
    { l: 'Uscite uscite %', v: p.uscite || 0, max: 100, c: 'fill-green' },
    { l: 'Duelli Aerei %', v: p.duelli || 0, max: 100, c: 'fill-amber' }
  ] : [
    { l: 'Presenze', v: p.pres || 0, max: 25, c: 'fill-green' },
    { l: 'Gol', v: p.gol || 0, max: 20, c: 'fill-green' },
    { l: 'Assist', v: p.ass || 0, max: 12, c: 'fill-blue' },
    { l: 'Tiri totali', v: p.tiri || 0, max: 40, c: 'fill-amber' },
    { l: 'Passaggi %', v: p.pass || 0, max: 100, c: 'fill-blue' },
    { l: 'Dribbling %', v: p.drib || 0, max: 100, c: 'fill-green' },
    { l: 'Duelli vinti %', v: p.duelli || 0, max: 100, c: 'fill-amber' }
  ];

  // Inietta l'HTML mappando ogni voce nell'elemento contenitore 'indiv-bars'
  document.getElementById('indiv-bars').innerHTML = items.map(it => `
    <div class="bc-row">
      <div class="bc-label">
        <span class="name">${it.l}</span>
        <span>${it.v}${it.l.includes('%') ? '%' : ''}</span>
      </div>
      <div class="bc-track">
        <div class="bc-fill ${it.c}" style="width:${Math.min((it.v / it.max * 100), 100).toFixed(0)}%"></div>
      </div>
    </div>
  `).join('');
}

// Ordina e renderizza la classifica dei migliori 6 marcatori (Top Scorers)
function renderTopScorers(){
  // Crea una copia dell'array PLAYERS con lo spread operator [...PLAYERS], lo ordina in modo decrescente per gol e prende i primi 6
  const sorted=[...PLAYERS].sort((a,b)=>b.gol-a.gol).slice(0,6);
  if(sorted.length === 0) return;

  // Trova il numero di gol massimo per impostare la proporzione al 100% della barra
  const max=sorted[0].gol||1;
  // Palette di colori esadecimali personalizzati per evidenziare i primi posti (Oro, Argento, Bronzo, ecc.)
  const cols=['#facc15','#94a3b8','#b45309','#4caf50','#60a5fa','#a78bfa'];

  // Inserisce il blocco HTML popolato assegnando le medaglie 🥇 🥈 🥉 ai primi tre classificati
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

/* ==========================================================================
   9. SELETTORE DEL GIOCATORE (PLAYER SELECTOR)
   ==========================================================================
   Crea la bottoniera interattiva che consente di selezionare un giocatore.
   Se l'utente è un 'GIOCATORE', blocca la selezione automatica sul proprio profilo unico,
   altrimenti permette all'allenatore/staff di cambiare atleta e aggiornare i grafici al click.
*/
let selPlayer=0;  // Memorizza l'indice del giocatore attualmente selezionato (default 0)
function buildSelector(){
  // Se l'utente è un 'GIOCATORE', non deve poter consultare gli altri compagni
  if (ruoloUtente === 'GIOCATORE') {
    const sel = document.getElementById('player-selector');
    if (sel) sel.style.display = 'none';

    // Cerca l'indice del giocatore nell'array corrispondente al nome identificativo dell'utente loggato
    let idx = PLAYERS.findIndex(p => p.nome === mioNomeStat);
    if (idx === -1) idx = 0; // Fallback di sicurezza: seleziona il primo giocatore se non trova la corrispondenza
    
    selPlayer = idx;
    drawRadar(idx);       // Renderizza il Radar del proprio profilo
    renderIndivBars(idx); // Renderizza le barre del proprio profilo
    return;               // Interrompe l'esecuzione evitando di disegnare la bottoniera completa
  }

  // Se l'utente è uno Staff/Allenatore, genera i bottoni dinamici per ogni giocatore presente nell'array
  document.getElementById('player-selector').innerHTML=PLAYERS.map((p,i)=>`
    <button class="ps-btn ${i===0?'active':''}" onclick="selectPlayer(${i},this)">${p.nome}</button>
  `).join('');
  
  // Inizializza i dropdown per il tab di confronto tra giocatori
  popolaSelectConfronto();
  
  // Renderizza i grafici per il primo giocatore di default (indice 0)
  drawRadar(0); 
  renderIndivBars(0);
}

// Gestisce l'evento di cambio giocatore quando si clicca su uno dei bottoni del selettore
function selectPlayer(i,btn){
  selPlayer=i;  // Aggiorna l'indice del giocatore selezionato

  // Rimuove la classe CSS 'active' da tutti i pulsanti presenti nel selettore
  document.querySelectorAll('#player-selector .ps-btn').forEach(b=>b.classList.remove('active'));

  // Aggiunge la classe 'active' al solo pulsante appena cliccato
  btn.classList.add('active');

  // Disegna il grafico radar e aggiorna le barre delle statistiche per il nuovo giocatore
  drawRadar(i); 
  renderIndivBars(i);
}

/* ==========================================================================
   10. CONFRONTO DIRETTO TRA DUE GIOCATORI (TESTA A TESTA)
   ==========================================================================
   Consente la comparazione visiva affiancata tra due atleti.
   Determina dinamicamente le metriche da confrontare (distinguendo portieri da giocatori di movimento),
   assegnando il colore verde al dato migliore e il colore rosso al dato inferiore.
*/
// Popola le due liste a cascata (<select>) necessarie per la scelta dei due giocatori da confrontare
function popolaSelectConfronto() {
  const cmpA = document.getElementById('cmp-a');
  const cmpB = document.getElementById('cmp-b');
  if(!cmpA || !cmpB) return;

  // Crea le opzioni dell'HTML <option> per ogni giocatore disponibile
  const opzioni = PLAYERS.map((p, i) => `<option value="${i}">${p.nome}</option>`).join('');
  cmpA.innerHTML = opzioni;
  cmpB.innerHTML = opzioni;
    
  // Assegna il secondo giocatore (indice 1) come opzione predefinita nel secondo menu a tendina
  if(PLAYERS.length > 1) cmpB.value = 1;
}

// Definisce la configurazione standard dei campi da confrontare per i giocatori di movimento
const COMPARE_CATS=[
  {lbl:'Gol',key:'gol',max:20},
  {lbl:'Assist',key:'ass',max:12},
  {lbl:'Presenze',key:'pres',max:25},
  {lbl:'Tiri',key:'tiri',max:40},
  {lbl:'Passaggi %',key:'pass',max:100},
  {lbl:'Dribbling %',key:'drib',max:100},
];

// Genera la griglia visiva di confronto tra Giocatore A (Sinistra) e Giocatore B (Destra)
function renderConfronto(){
  if(PLAYERS.length === 0) return;

  // Legge l'indice numerico del primo e del secondo giocatore dai rispettivi menu a tendina
  const ia=+document.getElementById('cmp-a').value || 0;
  const ib=+document.getElementById('cmp-b').value || 0;

  // Recupera gli oggetti dei due giocatori
  const pa=PLAYERS[ia],pb=PLAYERS[ib];
  if(!pa || !pb) return;
  
  // Se entrambi i giocatori messi a confronto sono PORTIERI, imposta un set di metriche specifico per il loro ruolo
  const cats = (pa.portiere && pb.portiere) ? [
    {lbl:'Presenze',key:'pres',max:25},
    {lbl:'Parate',key:'parate',max:80},
    {lbl:'Clean sheet',key:'cleanSheet',max:15},
    {lbl:'Passaggi %',key:'pass',max:100},
    {lbl:'Duelli vinti %',key:'duelli',max:100},
  ] : COMPARE_CATS;

  const grid=document.getElementById('compare-grid');
  let leftH='',centerH='',rightH='';

  // Itera su tutte le categorie da confrontare
  cats.forEach(c=>{
    const va=pa[c.key] || 0, vb=pb[c.key] || 0;                             // Estrae i valori reali di ciascuno
    const pctA=Math.min(va/c.max*100,100),pctB=Math.min(vb/c.max*100,100);  // Calcola le percentuali per la barra
    const unitSuffix=c.lbl.includes('%')?'%':'';

    // Imposta i colori standard di testo (colore predefinito dell'interfaccia)
    let colA = 'var(--text,#e6edf3)', colB = 'var(--text,#e6edf3)';

    // Confronta i due valori e applica Verde (#4caf50) al migliore e Rosso (#f87171) al peggiore
    if (va > vb)      { colA = '#4caf50'; colB = '#f87171'; }
    else if (vb > va) { colB = '#4caf50'; colA = '#f87171'; }

    // Genera la colonna di sinistra (Giocatore A)
    leftH+=`<div class="compare-row">
      <div class="val" style="text-align:right;color:${colA};font-weight:700">${va}${unitSuffix}</div>
      <div class="bar-wrap"><div class="bar-inner" style="width:${pctA}%;background:${colA}"></div></div>
    </div>`;

    // Genera la colonna centrale con l'etichetta del nome della statistica
    centerH+=`<div class="cat-lbl">${c.lbl}</div>`;

    // Genera la colonna di destra (Giocatore B)
    rightH+=`<div class="compare-row">
      <div class="val" style="text-align:left;color:${colB};font-weight:700">${vb}${unitSuffix}</div>
      <div class="bar-wrap"><div class="bar-inner" style="width:${pctB}%;background:${colB}"></div></div>
    </div>`;
  });

  // Assembla e inietta la struttura HTML complessiva nel container della griglia di confronto
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
   =========================================================================
   Spiegazione generale:
   Si occupa di renderizzare la sequenza temporale dello stato di forma (pallini V/P/S)
   e la tabella dettagliata dei risultati delle ultime gare giocate dalla squadra.
*/
function renderForma(){
  // Mappa delle abbreviazioni dei risultati (w = Win/Vittoria, d = Draw/Pareggio, l = Loss/Sconfitta)
  const esito={w:'V',d:'P',l:'S'};

  // Seleziona gli elementi contenitori del DOM per i pallini dello stato di forma e la tabella dei dati
  const containerDots = document.getElementById('form-dots');
  const containerTable = document.getElementById('results-tbody');
  
  // Gestisce il caso in cui l'array delle partite ricevute dal server sia vuoto
  if(MATCHES.length === 0) {
      containerDots.innerHTML = "<p>Nessun match recente registrato.</p>";
      containerTable.innerHTML = "<tr><td colspan='6' style='text-align:center'>Nessun dato</td></tr>";
      return;
  }

  // Genera i pallini visibili dello stato di forma con classi CSS dinamiche e tooltip informativo
  containerDots.innerHTML=MATCHES.map(m=>`
    <div class="form-dot ${m.esito}" title="${m.avv} ${m.gf}-${m.gs}">${esito[m.esito] || 'P'}</div>
  `).join('');
  
  // Mappe di conversione per le etichette e le classi di stile pillole di testo dei risultati
  const pill={w:'pill-green',d:'pill-amber',l:'pill-red'};
  const label={w:'Vittoria',d:'Pareggio',l:'Sconfitta'};

  // Popola le righe della tabella (<tr>) con la data, l'avversario, il punteggio ed il badge esito
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