const API_URL = 'http://localhost:8080/api/logs';

let currentPage = 0;
const pageSize = 15;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof verificaAutenticazione === 'function') {
        verificaAutenticazione(); 
    }
    
    caricaLogs();
    
    document.getElementById('btn-refresh')?.addEventListener('click', () => {
        currentPage = 0;
        caricaLogs();
    });

    document.getElementById('btn-prev')?.addEventListener('click', () => cambiaPagina(-1));
    document.getElementById('btn-next')?.addEventListener('click', () => cambiaPagina(1));
});

async function caricaLogs() {
    try {
        const headers = typeof getAuthHeaders === 'function' 
            ? getAuthHeaders() 
            : { 'Authorization': 'Bearer ' + localStorage.getItem('token') };

        // Puntiamo all'URL completo di Spring Boot (localhost:8080)
        const response = await fetch(`${API_URL}?page=${currentPage}&size=${pageSize}`, {
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`Errore HTTP: ${response.status}`);
        }

        const data = await response.json();
        totalPages = data.totalPages;
        
        disegnaTabella(data.content);
        aggiornaPaginazione(data);

    } catch (err) {
        console.error('Errore durante il caricamento dei log:', err);
        document.getElementById('logs-table-body').innerHTML = 
            '<tr><td colspan="6" style="color:red; text-align:center; padding: 2rem;">Impossibile caricare i log. Controlla la console per i dettagli.</td></tr>';
    }
}

function disegnaTabella(logs) {
    const tbody = document.getElementById('logs-table-body');
    tbody.innerHTML = '';

    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">Nessun log registrato.</td></tr>';
        return;
    }

    logs.forEach(log => {
        const dataFormattata = formattaData(log.timestamp);
        const cssLivello = `badge-log log-${log.livello}`;
        
        const row = `
            <tr>
                <td style="white-space: nowrap;">${dataFormattata}</td>
                <td><span class="${cssLivello}">${log.livello}</span></td>
                <td><span class="badge-modulo">${log.modulo}</span></td>
                <td>
                    <strong>${log.utente || 'SISTEMA'}</strong><br>
                    <small style="color: #888;">${log.ruolo || 'N/A'} - IP: ${log.ipAddress || 'Sconosciuto'}</small>
                </td>
                <td><strong>${log.azione}</strong></td>
                <td>${log.dettagli || ''}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function formattaData(ts) {
    if (!ts) return 'N/A';
    if (Array.isArray(ts)) {
        const [y, m, d, h, min] = ts;
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d)}/${pad(m)}/${y} ${pad(h)}:${pad(min)}`;
    }
    return new Date(ts).toLocaleString('it-IT');
}

function aggiornaPaginazione(data) {
    const pageInfo = document.getElementById('page-info');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');

    if (pageInfo) {
        pageInfo.innerText = `Pagina ${data.number + 1} di ${data.totalPages === 0 ? 1 : data.totalPages}`;
    }
    if (btnPrev) btnPrev.disabled = data.first;
    if (btnNext) btnNext.disabled = data.last;
}

function cambiaPagina(offset) {
    const nuovaPagina = currentPage + offset;
    if (nuovaPagina >= 0 && nuovaPagina < totalPages) {
        currentPage = nuovaPagina;
        caricaLogs();
    }
}