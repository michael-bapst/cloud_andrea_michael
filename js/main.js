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
    data.subfolders.forEach(n => frag.appendChild(createFolderCard(folders[n])));
    data.items.forEach(it => frag.appendChild(createMediaCard(it)));

    container.appendChild(frag);
    grid.appendChild(container);

    updateBreadcrumb();
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

function switchView(mode) {
    viewMode = mode;
    document.getElementById('gridViewBtn').classList.toggle('uk-button-primary', mode === 'grid');
    document.getElementById('listViewBtn').classList.toggle('uk-button-primary', mode === 'list');
    renderContent();
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('gridViewBtn').addEventListener('click', () => switchView('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => switchView('list'));
    document.getElementById('newFolderForm').addEventListener('submit', handleNewFolder);
    document.getElementById('renameForm').addEventListener('submit', handleRename);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    document.getElementById('uploadForm').addEventListener('submit', function (e) {
        if (typeof handleUpload === 'function') {
            handleUpload(e);
        } else {
            console.warn('handleUpload ist nicht verfügbar.');
        }
    });

    document.getElementById('breadcrumb').addEventListener('click', e => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const idx = Array.from(e.target.parentElement.parentElement.children)
                .indexOf(e.target.parentElement);
            navigateToPath(currentPath.slice(0, idx + 1));
        }
    });

    // ✅ NEU: Tabs (Fotos / Alben / Dateien)
    document.querySelectorAll('#viewTabs li').forEach(li => {
        li.addEventListener('click', () => {
            const view = li.dataset.view;
            switchViewTo(view);
        });
    });
});
