function renderSyncView() {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = `
    <div class="uk-card uk-card-default uk-card-body">
      <h3>🔄 Synchronisation</h3>
      <p>Vergleicht lokale Dateien mit der Cloud.</p>
      <button class="uk-button uk-button-primary" id="syncStartBtn">Jetzt synchronisieren</button>
      <div id="syncResult" class="uk-margin-top uk-text-small"></div>
    </div>
  `;

    document.getElementById('syncStartBtn').addEventListener('click', async () => {
        document.getElementById('syncResult').innerText = '⏳ Synchronisiere...';

        const localFiles = []; // Optional später: FileInput / IndexedDB etc.
        let serverFiles = [];

        try {
            const res = await fetch(`${API_BASE}/list-full`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            serverFiles = await res.json();
        } catch (err) {
            document.getElementById('syncResult').innerText = '❌ Fehler beim Abruf der Serverdaten';
            return;
        }

        const serverNames = serverFiles.map(f => f.Key);
        const newUploads = localFiles.filter(f => !serverNames.includes(f.name));

        document.getElementById('syncResult').innerText = newUploads.length === 0
            ? '✅ Alles ist synchron.'
            : `📤 ${newUploads.length} neue Datei(en) würden hochgeladen (Demo-Modus).`;
    });
}
