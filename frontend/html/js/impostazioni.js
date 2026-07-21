document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    // Logica per cambiare scheda (Tab)
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Rimuovi classe active da tutti i bottoni e pannelli
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Aggiungi classe active al bottone cliccato
            button.classList.add('active');

            // Mostra il pannello corrispondente
            const targetId = button.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Simulazione invio form
    const forms = document.querySelectorAll('.settings-form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault(); // Evita il ricaricamento della pagina
            
            // Qui potrai inserire la logica per salvare i dati nel tuo database (es. fetch API)
            const submitBtn = form.querySelector('.btn-save');
            const originalText = submitBtn.textContent;
            
            submitBtn.textContent = 'Salvataggio in corso...';
            submitBtn.style.backgroundColor = '#7f8c8d';

            setTimeout(() => {
                submitBtn.textContent = 'Salvato!';
                submitBtn.style.backgroundColor = '#27ae60';
                
                setTimeout(() => {
                    submitBtn.textContent = originalText;
                }, 2000);
            }, 1000);
        });
    });
});