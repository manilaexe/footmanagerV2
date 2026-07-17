function switchTab(name) {
document.querySelectorAll('.tab').forEach((t,i) => {
    const names = ['utenti','squadre','quiz','badge'];
    t.classList.toggle('active', names[i] === name);
});
document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'tab-' + name);
});
}
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }