const API_BASE = 'https://cloud-backend-stxe.onrender.com';

function getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function handleLogout() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = 'index.html';
}

// ✅ Global verfügbar
function previewMedia(name, url) {
    const ext = name.split('.').pop().toLowerCase();
    const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);
    const modal = document.getElementById('previewModal');
    const container = modal.querySelector('.preview-container');
    container.innerHTML = isVideo
        ? `<video controls style="width:100%"><source src="${url}" type="video/${ext}"></video>`
        : `<img src="${url}" alt="${name}" style="width:100%">`;
    UIkit.modal(modal).show();
}

// ✅ Datei löschen
function deleteFile(key, e) {
    e.stopPropagation();
    const token = getToken();
    fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: key })
    })
        .then(res => {
            if (!res.ok) throw new Error('Löschen fehlgeschlagen');
            renderContent();
        })
        .catch(err => UIkit.notification({ message: err.message, status: 'danger' }));
}

let currentPath = ['Home'];
let viewMode = 'grid';

let folders = {
    'Home': {
        id: 'home',
        name: 'Home',
        parent: null,
        items: [],
        subfolders: []
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const token = getToken();
    if (!token) return (window.location.href = 'index.html');

    try {
        const res = await fetch(`${API_BASE}/list-full`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Ordnerstruktur konnte nicht geladen werden');
        const data = await res.json();

        folders = {
            'Home': {
                id: 'home',
                name: 'Home',
                parent: null,
                items: [],
                subfolders: []
            }
        };

        data.forEach(entry => {
            const key = entry.Key;
            if (!key || key === '/') return;

            const parts = key.split('/');
            const name = parts[parts.length - 1] || parts[parts.length - 2];
            const parent = parts.length > 2 ? parts[parts.length - 2] : 'Home';

            if (key.endsWith('/')) {
                folders[name] = {
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    name,
                    parent,
                    items: [],
                    subfolders: []
                };
                if (!folders[parent]) {
                    folders[parent] = { id: parent, name: parent, parent: 'Home', items: [], subfolders: [] };
                }
                folders[parent].subfolders.push(name);
            } else {
                if (!folders[parent]) {
                    folders[parent] = { id: parent, name: parent, parent: 'Home', items: [], subfolders: [] };
                }
                folders[parent].items.push({
                    id: Date.now() + Math.random(),
                    name,
                    type: 'file',
                    size: formatFileSize(entry.Size || 0),
                    date: entry.LastModified?.split('T')[0] || '',
                    key: entry.Key,
                    thumbnail: `${API_BASE}/file/${encodeURIComponent(entry.Key)}`
                });
            }
        });

        renderContent();
    } catch (err) {
        console.error(err);
        UIkit.notification({ message: err.message, status: 'danger' });
    }

    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('gridViewBtn').addEventListener('click', () => switchView('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => switchView('list'));
    document.getElementById('newFolderForm').addEventListener('submit', handleNewFolder);
    document.getElementById('uploadForm')?.addEventListener('submit', handleUpload);

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }

    document.getElementById('breadcrumb').addEventListener('click', e => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const index = Array.from(e.target.parentElement.parentElement.children).indexOf(e.target.parentElement);
            navigateToPath(currentPath.slice(0, index + 1));
        }
    });

    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

    const contentGrid = document.getElementById('contentGrid');
    contentGrid.addEventListener('dragover', e => {
        e.preventDefault();
        contentGrid.classList.add('uk-background-muted');
    });
    contentGrid.addEventListener('dragleave', () => {
        contentGrid.classList.remove('uk-background-muted');
    });
    contentGrid.addEventListener('drop', e => {
        e.preventDefault();
        contentGrid.classList.remove('uk-background-muted');
        const files = e.dataTransfer.files;
        if (files.length) {
            const form = new FormData();
            form.append('file', files[0]);
            form.append('folder', currentPath.join('/') === 'Home' ? '' : currentPath.join('/'));
            fetch(`${API_BASE}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
                body: form
            }).then(() => renderContent());
        }
    });
});

// Funktionen
function renderContent() {
    const contentGrid = document.getElementById('contentGrid');
    contentGrid.innerHTML = '';
    contentGrid.className = viewMode === 'grid'
        ? 'uk-grid-small uk-child-width-1-1 uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l'
        : 'uk-grid-small uk-child-width-1-1 list-view';

    const currentFolder = currentPath[currentPath.length - 1];
    const folder = folders[currentFolder];

    const fragment = document.createDocumentFragment();
    if (currentPath.length > 1) fragment.appendChild(renderBackButton());

    folder.subfolders.forEach(name => fragment.appendChild(createFolderCard(folders[name])));
    folder.items.forEach(item => fragment.appendChild(createMediaCard(item)));

    contentGrid.appendChild(fragment);
    updateBreadcrumb();
}

function createFolderCard(folder) {
    const div = document.createElement('div');
    div.className = 'media-item folder-item uk-width-1-1';
    const date = new Date().toLocaleDateString('de-DE');

    div.innerHTML = `
    <div class="uk-card uk-card-default uk-margin-small uk-padding-remove folder-card">
      <div class="folder-accent-bar"></div>
      <div class="uk-card-body uk-padding-small">
        <div class="folder-content">
          <div class="uk-margin-small"><span uk-icon="icon: folder; ratio: 2.2"></span></div>
          <div class="uk-heading-small uk-margin-remove">${folder.name}</div>
          <div class="uk-text-meta">${date}</div>
        </div>
        <div class="folder-buttons">
          <button class="uk-button uk-button-default uk-button-small" onclick="navigateToFolder('${folder.name}')"><span uk-icon="folder"></span> Öffnen</button>
          <button class="uk-button uk-button-default uk-button-small" onclick="editFolder('${folder.name}', event)"><span uk-icon="pencil"></span> Bearbeiten</button>
          <button class="uk-button uk-button-default uk-button-small" onclick="deleteFolder('${folder.name}', event)"><span uk-icon="trash"></span> Löschen</button>
        </div>
      </div>
    </div>`;
    return div;
}

function createMediaCard(item) {
    const div = document.createElement('div');
    div.className = 'media-item';
    div.innerHTML = `
    <div class="uk-card uk-card-default" onclick="previewMedia('${item.name}', '${item.thumbnail}')">
      <div class="uk-card-media-top"><img src="${item.thumbnail}" alt="${item.name}"></div>
      <div class="uk-card-body">
        <h3 class="uk-card-title">${item.name}</h3>
        <p>${item.size} • ${item.date}</p>
        <button class="uk-button uk-button-default uk-button-small" onclick="event.stopPropagation(); downloadFile('${item.name}')"><span uk-icon="download"></span> Herunterladen</button>
        <button class="uk-button uk-button-danger uk-button-small" onclick="deleteFile('${item.key}', event)"><span uk-icon="trash"></span></button>
      </div>
    </div>`;
    return div;
}

function updateBreadcrumb() {
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = currentPath.map((part, index) =>
        index === currentPath.length - 1
            ? `<li><span>${part}</span></li>`
            : `<li><a href="#">${part}</a></li>`
    ).join('');
}

function renderBackButton() {
    const btn = document.createElement('button');
    btn.className = 'uk-button uk-button-default uk-flex uk-flex-middle uk-margin-small-bottom';
    btn.innerHTML = '<span uk-icon="arrow-left"></span><span class="uk-margin-small-left">Zurück</span>';
    btn.onclick = () => {
        if (currentPath.length > 1) {
            currentPath.pop();
            renderContent();
        }
    };
    return btn;
}

function navigateToFolder(name) {
    currentPath.push(name);
    renderContent();
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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
}
