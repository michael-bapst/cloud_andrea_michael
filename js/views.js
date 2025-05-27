let activeView = 'fotos';
let viewMode = 'grid';

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#viewTabs li').forEach(li => {
        li.addEventListener('click', (e) => {
            e.preventDefault();
            const view = li.dataset.view;
            if (view) switchViewTo(view);
        });
    });

    document.getElementById('gridViewBtn')?.addEventListener('click', () => switchView('grid'));
    document.getElementById('listViewBtn')?.addEventListener('click', () => switchView('list'));
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    document.getElementById('uploadForm')?.addEventListener('submit', e => {
        if (typeof handleUpload === 'function') handleUpload(e);
    });

    document.getElementById('newFolderForm')?.addEventListener('submit', handleNewFolder);
    document.getElementById('renameForm')?.addEventListener('submit', handleRename);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);

    document.getElementById('breadcrumb')?.addEventListener('click', e => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const idx = Array.from(e.target.parentElement.parentElement.children)
                .indexOf(e.target.parentElement);
            navigateToPath(currentPath.slice(0, idx + 1));
        }
    });

    switchViewTo('fotos');
});

function switchViewTo(view) {
    if (view !== activeView) {
        if (view === 'fotos' || view === 'alben') {
            currentPath = [];
        } else if (view === 'dateien') {
            currentPath = ['files'];
        }
    }

    activeView = view;

    // Tabs aktiv markieren
    document.querySelectorAll('#viewTabs li').forEach(li =>
        li.classList.toggle('uk-active', li.dataset.view === view)
    );

    // Überschrift & Buttons
    const heading = document.getElementById('viewHeading');
    const toggleGroup = document.getElementById('viewModeToggles');
    const fabFotos = document.getElementById('fabFotos');
    const fabAlben = document.getElementById('fabAlben');
    const fabDateien = document.getElementById('fabDateien');

    const isInAlbumRoot = view === 'alben' && currentPath.length === 0;
    const isInAlbumFolder = view === 'alben' && currentPath.length > 0;

    if (heading) {
        heading.textContent =
            view === 'fotos' ? 'Fotos' :
                isInAlbumFolder ? `Alben / ${currentPath.at(-1)}` :
                    view === 'alben' ? 'Alben' :
                        view === 'dateien' ? 'Dateien' : '';
    }

    toggleGroup.style.display = (view === 'alben' || view === 'dateien') ? 'flex' : 'none';

    fabFotos.style.display = (view === 'fotos' || isInAlbumFolder) ? 'block' : 'none';
    fabAlben.style.display = isInAlbumRoot ? 'block' : 'none';
    fabDateien.style.display = view === 'dateien' ? 'block' : 'none';

    // Breadcrumb nur bei Album-Unterordner anzeigen
    document.getElementById('breadcrumb')?.style.setProperty('display',
        view === 'alben' && currentPath.length > 0 ? 'block' : 'none'
    );

    // Zurück-Button im Album-Unterordner
    const backBtnContainer = document.getElementById('backBtnContainer');
    backBtnContainer.innerHTML = '';
    if (view === 'alben' && currentPath.length > 0) {
        const backBtn = document.createElement('button');
        backBtn.className = 'uk-button uk-button-default uk-flex uk-flex-middle';
        backBtn.innerHTML = '<span uk-icon="arrow-left"></span><span class="uk-margin-small-left">Zurück zu Alben</span>';
        backBtn.onclick = () => {
            currentPath.pop();
            switchViewTo('alben');
        };
        backBtnContainer.appendChild(backBtn);
    }

    // Ansichten laden
    if (view === 'fotos') {
        renderFotos();
    } else if (view === 'alben') {
        if (currentPath.length === 0) {
            renderContent();
        } else {
            renderFotos();
        }
    } else if (view === 'dateien') {
        renderDateien();
    }
    else if (view === 'sync') {
        renderSyncView();
    }
}

function renderFotos() {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '';

    let path = currentPath.join('/');
    if (activeView === 'fotos') path = 'Home';

    const fotos = folders[path]?.items?.filter(i => isMediaFile(i.name)) || [];

    fotos.sort((a, b) => new Date(b.date) - new Date(a.date));

    fotos.forEach(f => {
        const card = createMediaCard(f);
        card.classList.add('media-cloud-item', 'media-foto');
        grid.appendChild(card);
    });
}


function renderDateien() {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '';

    const data = folders['files'] || { items: [] };
    const files = data.items.filter(i => !isMediaFile(i.name));

    files.sort((a, b) => new Date(b.date) - new Date(a.date));

    files.forEach(file => {
        const card = document.createElement('div');
        card.className = 'uk-card uk-card-default uk-card-body file-card';

        card.innerHTML = `
      <div class="uk-text-small uk-text-truncate" title="${file.name}">
        <span uk-icon="file-text"></span> ${file.name}
      </div>
      <div class="uk-text-meta">${file.size} • ${file.date}</div>
    `;

        card.onclick = () => downloadFile(file.key);
        grid.appendChild(card);
    });
}

function renderContent() {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'uk-grid-small uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l';
    container.setAttribute('uk-grid', '');

    const fullCurrentPath = currentPath.length === 0 ? 'Home' : currentPath.join('/');
    const data = folders[fullCurrentPath];

    if (!data) {
        UIkit.notification({ message: `Pfad "${fullCurrentPath}" nicht gefunden`, status: 'danger' });
        return;
    }

    const backBtnContainer = document.getElementById('backBtnContainer');
    backBtnContainer.innerHTML = '';

    if (currentPath.length > 0) {
        const backBtn = document.createElement('button');
        backBtn.className = 'uk-button uk-button-default uk-flex uk-flex-middle';
        backBtn.innerHTML = '<span uk-icon="arrow-left"></span><span class="uk-margin-small-left">Zurück</span>';
        backBtn.onclick = () => {
            currentPath.pop();
            renderContent();
        };
        backBtnContainer.appendChild(backBtn);
    }

    const frag = document.createDocumentFragment();

    if (currentPath.length === 0) {
        data.subfolders.sort((a, b) => {
            const dA = new Date(folders[a].items?.[0]?.date || '1970-01-01');
            const dB = new Date(folders[b].items?.[0]?.date || '1970-01-01');
            return dB - dA;
        });

        data.subfolders.forEach(n => frag.appendChild(createFolderCard(folders[n])));
    } else {
        const filteredItems = data.items.filter(i => isMediaFile(i.name));

        filteredItems.sort((a, b) => new Date(b.date) - new Date(a.date));

        filteredItems.forEach(it => {
            const card = createMediaCard(it);
            card.classList.add('media-cloud-item', 'media-foto');
            frag.appendChild(card);
        });
    }

    container.appendChild(frag);
    grid.appendChild(container);

    updateBreadcrumb();
}

function switchView(mode) {
    viewMode = mode;
    document.getElementById('gridViewBtn')?.classList.toggle('uk-button-primary', mode === 'grid');
    document.getElementById('listViewBtn')?.classList.toggle('uk-button-primary', mode === 'list');
    renderContent();
}

function updateBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    bc.innerHTML = currentPath.map((p, i) =>
        i === currentPath.length - 1
            ? `<li><span>${p}</span></li>`
            : `<li><a href="#">${p}</a></li>`
    ).join('');
}

function navigateToPath(path) {
    currentPath = path;
    switchViewTo('alben');
}

function renderSyncView() {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '';

    const heading = document.getElementById('viewHeading');
    if (heading) heading.textContent = 'Sync';

    const toggleGroup = document.getElementById('viewModeToggles');
    if (toggleGroup) toggleGroup.style.display = 'none';

    // Upload-Form als separater Card-Block außerhalb des Grid-Containers
    const uploadWrapper = document.createElement('div');
    uploadWrapper.className = 'uk-card uk-card-default uk-card-body sync-upload';
    uploadWrapper.innerHTML = `
    <div class="uk-margin-bottom">
      <label class="uk-form-label">Wähle einen lokalen Ordner (einmalig):</label>
      <div class="uk-form-controls">
        <input class="uk-input" type="file" id="syncFolderInput" webkitdirectory multiple />
      </div>
    </div>

    <button class="uk-button uk-button-primary uk-button-small" id="syncUploadBtn">
      <span uk-icon="upload"></span><span class="uk-margin-small-left">Hochladen</span>
    </button>

    <div id="syncResult" class="uk-margin-top uk-text-muted uk-text-small"></div>
  `;

    grid.appendChild(uploadWrapper);

    document.getElementById('syncUploadBtn').addEventListener('click', async () => {
        const input = document.getElementById('syncFolderInput');
        const files = input.files;
        if (!files.length) {
            UIkit.notification({ message: '❗ Kein Ordner ausgewählt', status: 'warning' });
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

        UIkit.notification({ message: '✅ Ordner synchronisiert', status: 'success' });
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

    syncFolders.sort((a, b) => {
        const dA = new Date(folders[a].items?.[0]?.date || '1970-01-01');
        const dB = new Date(folders[b].items?.[0]?.date || '1970-01-01');
        return dB - dA;
    });

    const frag = document.createDocumentFragment();
    syncFolders.forEach(p => frag.appendChild(createFolderCard(folders[p])));

    container.appendChild(frag);
    grid.appendChild(container);
}
