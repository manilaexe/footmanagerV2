function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function saveEvento() {
closeModal('modal-evento');
// qui chiameresti: POST /api/eventi
alert('Evento salvato! (In produzione verrà inviato al backend)');
}

function sendMsg() {
const dest = document.getElementById('msg-dest').value;
const text = document.getElementById('msg-text').value.trim();
if (!dest || !text) { alert('Seleziona un destinatario e scrivi un messaggio.'); return; }
// qui chiameresti: POST /api/messaggi
alert('Messaggio inviato a: ' + dest);
document.getElementById('msg-text').value = '';
}

function openSection(sec) {
// In produzione naviga alla pagina relativa
console.log('Apertura sezione:', sec);
}