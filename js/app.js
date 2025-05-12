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

// DOM-Elemente
const logoutBtn = document.getElementById('logoutBtn');
const contentGrid = document.getElementById('contentGrid');
const breadcrumb = document.getElementById('breadcrumb');
const gridViewBtn = document.getElementById('gridViewBtn');
const listViewBtn = document.getElementById('listViewBtn');
const newFolderForm = document.getElementById('newFolderForm');
const uploadForm = document.getElementById('uploadForm'); // Upload-Formular sicher holen

// API (gehört gleich danach)
const API_BASE = 'https://cloud-backend-stxe.onrender.com';
function getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

// Event-Handler
logoutBtn.addEventListener('click', handleLogout);
gridViewBtn.addEventListener('click', () => switchView('grid'));
listViewBtn.addEventListener('click', () => switchView('list'));
newFolderForm.addEventListener('submit', handleNewFolder);

if (uploadForm) uploadForm.addEventListener('submit', handleUpload);

breadcrumb.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
        e.preventDefault();
        const index = Array.from(breadcrumb.children).indexOf(e.target.parentElement);
        navigateToPath(currentPath.slice(0, index + 1));
    }
});

// Darstellung
function renderContent() {
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

function updateBreadcrumb() {
    breadcrumb.innerHTML = currentPath.map((part, index) => {
        return index === currentPath.length - 1
            ? `<li><span>${part}</span></li>`
            : `<li><a href="#">${part}</a></li>`;
    }).join('');
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

// Karten
function createFolderCard(folder) {
    const div = document.createElement('div');
    div.className = 'media-item folder-item uk-width-1-1';

    const color = 'var(--primary-color)';
    const date = new Date().toLocaleDateString('de-DE');

    div.innerHTML = `
    <div class="uk-card uk-card-default uk-margin-small uk-padding-remove folder-card" style="aspect-ratio: 1 / 1;">
      <div class="folder-accent-bar" style="background-color: ${color}; height: 32px; border-radius: 4px 4px 0 0;"></div>
      <div class="uk-card-body uk-padding-small uk-flex uk-flex-column uk-flex-between" style="flex: 1;">
        <div class="folder-content uk-text-center">
          <div class="uk-margin-small" style="height:48px;"><span uk-icon="icon: folder; ratio: 2.2"></span></div>
          <div class="uk-heading-small uk-margin-remove">${folder.name}</div>
          <div class="uk-text-meta">${date}</div>
        </div>
        <div class="folder-buttons uk-flex uk-flex-column uk-flex-center uk-flex-middle" style="margin-top:auto; gap:6px;">
          <button class="uk-button uk-button-default uk-button-small" onclick="navigateToFolder('${folder.name}')">
            <span uk-icon="folder"></span><span class="uk-margin-small-left">Öffnen</span>
          </button>
          <button class="uk-button uk-button-default uk-button-small" onclick="editFolder('${folder.name}', event)">
            <span uk-icon="pencil"></span><span class="uk-margin-small-left">Bearbeiten</span>
          </button>
          <button class="uk-button uk-button-default uk-button-small" onclick="deleteFolder('${folder.name}', event)">
            <span uk-icon="trash"></span><span class="uk-margin-small-left">Löschen</span>
          </button>
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
        <button class="uk-button uk-button-default uk-button-small" onclick="event.stopPropagation(); downloadFile('${item.name}')">
          <span uk-icon="download"></span> Herunterladen
        </button>
      </div>
    </div>`;
    return div;
}

// Navigation & Aktionen
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
    gridViewBtn.classList.toggle('uk-button-primary', mode === 'grid');
    listViewBtn.classList.toggle('uk-button-primary', mode === 'list');
    renderContent();
}

let folderToDelete = null;

function editFolder(name, event) {
    event.stopPropagation();
    document.getElementById("renameOldName").value = name;
    document.getElementById("renameNewName").value = name;
    UIkit.modal("#renameModal").show();
}

document.getElementById("renameForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const oldName = document.getElementById("renameOldName").value;
    const newName = document.getElementById("renameNewName").value.trim();
    if (!newName || newName === oldName) return;

    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/rename`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ oldPath: oldName, newPath: newName }),
        });

        if (!res.ok) throw new Error("Umbenennen fehlgeschlagen");

        const folder = folders[oldName];
        folders[newName] = { ...folder, name: newName };
        delete folders[oldName];
        const parent = folder.parent;
        folders[parent].subfolders = folders[parent].subfolders.map((n) =>
            n === oldName ? newName : n
        );
        UIkit.modal("#renameModal").hide();
        renderContent();
    } catch (err) {
        UIkit.notification({ message: err.message, status: "danger" });
    }
});

function deleteFolder(name, event) {
    event.stopPropagation();
    folderToDelete = name;
    document.getElementById("deleteConfirmText").textContent = `Ordner "${name}" löschen?`;
    UIkit.modal("#deleteModal").show();
}

document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
    const name = folderToDelete;
    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/delete`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ path: name }),
        });

        if (!res.ok) throw new Error("Löschen fehlgeschlagen");

        const parent = folders[name].parent;
        folders[parent].subfolders = folders[parent].subfolders.filter((n) => n !== name);
        delete folders[name];
        UIkit.modal("#deleteModal").hide();
        renderContent();
    } catch (err) {
        UIkit.notification({ message: err.message, status: "danger" });
    }
});

// Formulare
async function handleNewFolder(e) {
    e.preventDefault();
    const input = e.target.querySelector('input[type="text"]');
    const name = input.value.trim();

    if (!name) {
        UIkit.notification({ message: 'Ordnername fehlt', status: 'danger', timeout: 3000 });
        return;
    }

    const current = currentPath.join('/'); // z. B. "Home/fotos"
    const fullPath = current === 'Home' ? name : `${current}/${name}`;

    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/create-folder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ path: fullPath })
        });

        if (!res.ok) throw new Error('Ordner konnte nicht erstellt werden');

        folders[name] = {
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name,
            parent: currentPath[currentPath.length - 1],
            items: [],
            subfolders: []
        };

        folders[currentPath[currentPath.length - 1]].subfolders.push(name);
        renderContent();
        UIkit.modal('#newFolderModal').hide();
        input.value = '';
    } catch (err) {
        UIkit.notification({ message: err.message, status: 'danger' });
    }
}

async function handleUpload(e) {
    e.preventDefault();

    const files = uploadForm.querySelector('input[name="file"]').files;
    if (!files.length) {
        UIkit.notification({ message: 'Keine Datei gewählt', status: 'danger' });
        return;
    }

    const formData = new FormData();
    formData.append("file", files[0]);

    const folderPath = currentPath.join('/') === 'Home' ? '' : currentPath.join('/');
    formData.append("folder", folderPath);

    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error("UPLOAD-FEHLER: " + (error.detail || "Unbekannt"));
        }

        UIkit.notification({ message: 'Datei erfolgreich hochgeladen', status: 'success' });
        UIkit.modal('#uploadModal').hide();
        e.target.reset();
        renderContent();

    } catch (err) {
        console.error("UPLOAD-FEHLER:", err);
        UIkit.notification({ message: err.message, status: 'danger' });
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
}

function handleLogout() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = 'index.html';
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
    const token = getToken();
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/list-full`, {
            headers: { 'Authorization': `Bearer ${token}` }
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
                    date: entry.LastModified ? entry.LastModified.split('T')[0] : '',
                    thumbnail: 'https://picsum.photos/200/200?random=' + Math.floor(Math.random() * 1000)
                });
            }
        });

        renderContent();
    } catch (err) {
        console.error(err);
        UIkit.notification({ message: err.message, status: 'danger' });
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }

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
            form.append('file', files[0]); // aktuell nur 1 Datei, willst du mehrere?
            form.append('folder', currentPath.join('/') === 'Home' ? '' : currentPath.join('/'));
            fetch(`${API_BASE}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` },
                body: form
            }).then(() => renderContent());
        }
    });

    function downloadFile(name) {
        const encodedName = encodeURIComponent(name);
        const url = `${API_BASE}/file/${encodedName}`;
        window.open(url, '_blank');
    }
});