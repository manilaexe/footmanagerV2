document.addEventListener("DOMContentLoaded", () => {
    // Segnale visivo che il JS sta funzionando
    const kpiGiocatori = document.getElementById("kpi-giocatori");
    if (kpiGiocatori) kpiGiocatori.textContent = "Caricamento...";

    // ECCO LA CORREZIONE: ora cerca "token" esattamente come lo salva login.js
    const token = localStorage.getItem("token");
    
    if (!token) {
        window.location.href = "../login.html";
        return;
    }

    caricaDatiDirigenza(token);
    
    // Gestione Logout
    const logoutBtn = document.querySelector(".btn-logout");
    if(logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            // CORRETTO ANCHE QUI: rimuove "token"
            localStorage.removeItem("token");
            window.location.href = "../login.html";
        });
    }
});

async function caricaDatiDirigenza(token) {
    try {
        const response = await fetch("http://localhost:8080/api/dashboard/dirigenza", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Errore Server: ${response.status}`);
        }

        const data = await response.json();
        popolaDashboard(data);

    } catch (error) {
        console.error("Errore nel recupero dati:", error);
        const kpiGiocatori = document.getElementById("kpi-giocatori");
        if (kpiGiocatori) {
            kpiGiocatori.textContent = "ERRORE RETE";
        }
    }
}

function popolaDashboard(data) {
    // 1. KPI Principali
    const kpiGiocatori = document.getElementById("kpi-giocatori");
    if (kpiGiocatori) kpiGiocatori.textContent = data.numeroGiocatori || 0;

    const kpiSq = data.performanceSquadra?.kpi;
    if (kpiSq) {
        const kpiGol = document.getElementById("kpi-gol");
        if (kpiGol) kpiGol.textContent = kpiSq.golFatti || 0;

        const kpiPartite = document.getElementById("kpi-partite");
        if (kpiPartite) kpiPartite.textContent = kpiSq.partiteGiocate || 0;
        
        // Trend storico
        const trendPartite = document.getElementById("trend-partite");
        if (trendPartite) {
            trendPartite.textContent = `${kpiSq.vittorie || 0}V · ${kpiSq.pareggi || 0}P · ${kpiSq.sconfitte || 0}S`;
        }

        // Indicatori Squadra 
        const indPossesso = document.getElementById("ind-possesso");
        const barPossesso = document.getElementById("bar-possesso");
        if (indPossesso && barPossesso) {
            const possesso = kpiSq.possessoMedio || 0;
            indPossesso.textContent = possesso + "%";
            barPossesso.style.width = possesso + "%";
        }

        const indPassaggi = document.getElementById("ind-passaggi");
        const barPassaggi = document.getElementById("bar-passaggi");
        if (indPassaggi && barPassaggi) {
            const passaggi = kpiSq.precisionePassaggi || 0;
            indPassaggi.textContent = passaggi + "%";
            barPassaggi.style.width = passaggi + "%";
        }
    }

    // Campo mancante nel backend, mettiamo fisso N/D
    const kpiQuiz = document.getElementById("kpi-quiz");
    if (kpiQuiz) kpiQuiz.textContent = "N/D";

    // 2. Tabella Classifica Interna
    const tbodyMarcatori = document.getElementById("tabella-marcatori");
    if (tbodyMarcatori) {
        tbodyMarcatori.innerHTML = "";
        if (data.classificaInterna && data.classificaInterna.length > 0) {
            data.classificaInterna.slice(0, 5).forEach((giocatore, index) => {
                let medaglia = index + 1;
                if (index === 0) medaglia = "🥇";
                if (index === 1) medaglia = "🥈";
                if (index === 2) medaglia = "🥉";

                tbodyMarcatori.innerHTML += `
                    <tr>
                        <td><span class="rank-medal">${medaglia}</span></td>
                        <td>${giocatore.nome} ${giocatore.cognome}</td>
                        <td><strong>${giocatore.puntiTotali} pt</strong> (Quiz)</td>
                        <td>-</td>
                        <td>-</td>
                    </tr>`;
            });
        } else {
            tbodyMarcatori.innerHTML = "<tr><td colspan='5'>Nessun dato disponibile</td></tr>";
        }
    }

    // 3. Attività Recenti
    const listaAttivita = document.getElementById("lista-attivita");
    if (listaAttivita) {
        listaAttivita.innerHTML = "";
        if (data.prossimiEventi && data.prossimiEventi.length > 0) {
            data.prossimiEventi.forEach(evento => {
                const dataInizio = new Date(evento.dataOraInizio);
                const dataFormattata = dataInizio.toLocaleString("it-IT", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                });
                
                let dotClass = "activity-dot"; 
                if (evento.tipo === "PARTITA") dotClass += " blue";
                if (evento.tipo === "RIUNIONE") dotClass += " amber";

                listaAttivita.innerHTML += `
                    <div class="activity-item">
                        <div class="${dotClass}"></div>
                        <div class="activity-info">
                            <div class="activity-title">${evento.titolo}</div>
                            <div class="activity-time">${dataFormattata} · ${evento.luogo || 'Luogo non specificato'}</div>
                        </div>
                    </div>`;
            });
        } else {
            listaAttivita.innerHTML = "<p style='padding: 10px; color: var(--muted)'>Nessuna attività programmata.</p>";
        }
    }
}