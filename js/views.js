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
            renderContent(); // zeigt Alben
        } else {
            renderFotos();   // zeigt Bilder im Ordner
        }
    } else if (view === 'dateien') {
        renderDateien();
    }
}

function renderFotos() {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '';

    let path = currentPath.join('/');
    if (activeView === 'fotos') path = 'Home'; // Nur root-Bilder für Fotos

    const fotos = folders[path]?.items?.filter(i => isMediaFile(i.name)) || [];
    fotos.forEach(f => {
        const card = createMediaCard(f);
        card.classList.add('media-cloud-item', 'media-foto'); // Wichtig: Klasse für kleine Ansicht
        grid.appendChild(card);
    });
}

function renderDateien() {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '';
    const data = folders['files'] || { items: [] };
    const files = data.items.filter(i => !isMediaFile(i.name));
    files.forEach(d => {
        const div = document.createElement('div');
        div.className = 'uk-card uk-card-default uk-card-body';
        div.innerHTML = `
            <div class="uk-text-truncate" title="${d.name}">${d.name}</div>
            <div class="uk-text-meta">${d.size} – ${d.date}</div>
        `;
        grid.appendChild(div);
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
        // ✅ Nur Unterordner (Alben) anzeigen
        data.subfolders.forEach(n => frag.appendChild(createFolderCard(folders[n])));
    } else {

        const filteredItems = data.items.filter(i => isMediaFile(i.name));
        filteredItems.forEach(it => {
            const card = createMediaCard(it);
            card.classList.add('media-cloud-item', 'media-foto'); // Gleiche Darstellung wie in Fotos
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
