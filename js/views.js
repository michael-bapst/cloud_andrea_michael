let activeView = 'fotos';
let viewMode = 'grid'; // optional, falls Listen-/Gridumschaltung

// Standardansicht initialisieren
document.addEventListener('DOMContentLoaded', () => {
    // Tabs (unten)
    document.querySelectorAll('#viewTabs li').forEach(li => {
        li.addEventListener('click', (e) => {
            e.preventDefault();
            const view = li.dataset.view;
            if (view) switchViewTo(view);
        });
    });

    // Ansichtsschalter (Grid/List)
    document.getElementById('gridViewBtn')?.addEventListener('click', () => switchView('grid'));
    document.getElementById('listViewBtn')?.addEventListener('click', () => switchView('list'));

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // Upload
    document.getElementById('uploadForm')?.addEventListener('submit', e => {
        if (typeof handleUpload === 'function') handleUpload(e);
    });

    // Ordneraktionen
    document.getElementById('newFolderForm')?.addEventListener('submit', handleNewFolder);
    document.getElementById('renameForm')?.addEventListener('submit', handleRename);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);

    // Breadcrumb Navigation
    document.getElementById('breadcrumb')?.addEventListener('click', e => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const idx = Array.from(e.target.parentElement.parentElement.children)
                .indexOf(e.target.parentElement);
            navigateToPath(currentPath.slice(0, idx + 1));
        }
    });

    // Startansicht
    switchViewTo('fotos');
});

function switchViewTo(view) {
    activeView = view;

    // Tabs markieren
    document.querySelectorAll('#viewTabs li').forEach(li =>
        li.classList.toggle('uk-active', li.dataset.view === view)
    );

    // Titel aktualisieren
    const heading = document.getElementById('viewHeading');
    if (heading) {
        heading.textContent =
            view === 'fotos' ? 'Fotos' :
                view === 'alben' ? 'Alben' :
                    view === 'dateien' ? 'Dateien' : '';
    }

    // FABs ein-/ausblenden
    document.getElementById('fabFotos')?.style.setProperty('display', view === 'fotos' ? 'block' : 'none');
    document.getElementById('fabAlben')?.style.setProperty('display', view === 'alben' ? 'block' : 'none');
    document.getElementById('fabDateien')?.style.setProperty('display', view === 'dateien' ? 'block' : 'none');

    // Ansichtsschalter sichtbar bei alben/dateien
    const toggleGroup = document.getElementById('viewModeToggles');
    if (toggleGroup) {
        toggleGroup.style.display = (view === 'alben' || view === 'dateien') ? 'flex' : 'none';
    }

    const folderBtn = document.getElementById('newFolderBtn');
    if (folderBtn) {
        folderBtn.style.display = 'none'; // sicherheitshalber verstecken
    }

    // Inhalte laden
    if (view === 'fotos') {
        currentPath = [];
        renderFotos();
    } else if (view === 'alben') {
        currentPath = [];
        renderContent();
    } else if (view === 'dateien') {
        currentPath = ['files'];
        renderDateien();
    }
}

// ===============================
// Einzelne Ansichten
// ===============================

function renderFotos() {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '';
    const fotos = folders['Home']?.items?.filter(i => isMediaFile(i.name)) || [];
    fotos.forEach(f => grid.appendChild(createMediaCard(f)));
}

function renderAlben() {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '';
    const alben = folders['Home']?.subfolders || [];
    alben.forEach(path => {
        const card = createFolderCard(folders[path]);
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

function switchView(mode) {
    viewMode = mode;
    document.getElementById('gridViewBtn')?.classList.toggle('uk-button-primary', mode === 'grid');
    document.getElementById('listViewBtn')?.classList.toggle('uk-button-primary', mode === 'list');
    renderContent();
}

function updateBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = currentPath.map((p, i) =>
        i === currentPath.length - 1
            ? `<li><span>${p}</span></li>`
            : `<li><a href="#">${p}</a></li>`
    ).join('');
}

function navigateToPath(path) {
    currentPath = path;
    renderContent();
}
