let currentPage = 0;
const pageSize = 15;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
    verificaAutenticazione(); 
    caricaLogs();
    
    document.getElementById('btn-refresh').addEventListener('click', () => {
        currentPage = 0;
        caricaLogs();
    });
});

async function caricaLogs() {
    try {
        const response = await fetch(`/api/logs?page=${currentPage}&size=${pageSize}`, {
            headers: getAuthHeaders() 
        });

        if (!response.ok) throw new Error('Errore nel recupero dei log');

        const data = await response.json();
        totalPages = data.totalPages;
        
        disegnaTabella(data.content);
        aggiornaPaginazione(data);

    } catch (err) {
        console.error(err);
        document.getElementById('logs-table-body').innerHTML = 
            '<tr><td colspan="6" style="color:red; text-align:center; padding: 2rem;">Impossibile caricare i log.</td></tr>';
    }
}

function disegnaTabella(logs) {
    const tbody = document.getElementById('logs-table-body');
    tbody.innerHTML = '';

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 2rem;">Nessun log registrato.</td></tr>';
        return;
    }

    logs.forEach(log => {
        const dataFormattata = new Date(log.timestamp).toLocaleString('it-IT');
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

function aggiornaPaginazione(data) {
    document.getElementById('page-info').innerText = `Pagina ${data.number + 1} di ${data.totalPages === 0 ? 1 : data.totalPages}`;
    document.getElementById('btn-prev').disabled = data.first;
    document.getElementById('btn-next').disabled = data.last;
}

function cambiaPagina(offset) {
    const nuovaPagina = currentPage + offset;
    if (nuovaPagina >= 0 && nuovaPagina < totalPages) {
        currentPage = nuovaPagina;
        caricaLogs();
    }
}