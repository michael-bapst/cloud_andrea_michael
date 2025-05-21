function renderSyncView() {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'uk-card uk-card-default uk-card-body';

    wrapper.innerHTML = `
      <h3 class="uk-heading-small uk-text-primary">🔄 Sync</h3>
      <p>Wähle einen lokalen Ordner, der als Sync-Alben gespeichert wird.</p>
      <div class="uk-margin">
        <input type="file" id="syncFolderInput" webkitdirectory multiple />
      </div>
      <button class="uk-button uk-button-primary uk-margin-top" id="syncUploadBtn">📤 Hochladen</button>
      <div id="syncResult" class="uk-margin-top uk-text-small"></div>
    `;

    grid.appendChild(wrapper);

    document.getElementById('syncUploadBtn').addEventListener('click', async () => {
        const input = document.getElementById('syncFolderInput');
        const files = input.files;

        if (!files.length) {
            UIkit.notification({ message: 'Kein Ordner ausgewählt', status: 'warning' });
            return;
        }

        const token = getToken();
        const folderName = files[0].webkitRelativePath.split('/')[0];

        for (const file of files) {
            const form = new FormData();
            form.append('file', file);
            form.append('folder', `sync/${folderName}`);

            await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: form
            });
        }

        UIkit.notification({ message: '✅ Ordner hochgeladen', status: 'success' });
        renderSyncOverview();
    });

    renderSyncOverview();
}

function renderSyncOverview() {
    const grid = document.getElementById('contentGrid');
    const container = document.createElement('div');

    container.className = 'uk-grid-small uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l';
    container.setAttribute('uk-grid', '');

    const syncFolders = Object.keys(folders)
        .filter(p => p.startsWith('sync/') && folders[p].parent === 'sync');

    const frag = document.createDocumentFragment();
    syncFolders.forEach(p => frag.appendChild(createFolderCard(folders[p])));
    container.appendChild(frag);
    grid.appendChild(container);
}
