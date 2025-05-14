// ─────────────────────────────────────────────────────────────────────────────
//                            js/app.js (vollständig)
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = 'https://cloud-backend-stxe.onrender.com';

// ─────────────── Helpers ───────────────

// Auth-Token holen
function getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function handleLogout() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = 'index.html';
}

async function getSignedFileUrl(key) {
    const token = getToken();
    const safeKey = encodeURIComponent(key).replace(/%2F/g, '/');

    const res = await fetch(`${API_BASE}/file/${safeKey}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        redirect: 'manual',
        mode: 'cors',
        cache: 'no-store'
    });

    if (res.status === 302) {
        return res.headers.get('Location');
    }
    if (res.ok) {
        return res.url;
    }

    throw new Error(`Presign fehlgeschlagen (${res.status})`);
}

// Bytes in lesbares Format
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

// ─────────────── Globale Aktionen ───────────────

// Datei löschen
async function deleteFile(key, e) {
    e.stopPropagation();
    const token = getToken();
    const res = await fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: {
            'Content-Type':'application/json',
            Authorization:`Bearer ${token}`
        },
        body: JSON.stringify({ path: key })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        UIkit.notification({
            message: err?.error || 'Löschen fehlgeschlagen',
            status: 'danger'
        });
        return;
    }

    UIkit.notification({ message: 'Datei gelöscht', status: 'success' });
    renderContent();
}

// Datei herunterladen
async function downloadFile(key) {
    try {
        const url = await getSignedFileUrl(key);
        window.open(url, '_blank');
    } catch {
        UIkit.notification({ message:'Download fehlgeschlagen', status:'danger' });
    }
}

// ─────────────── Folder-CRUD ───────────────

let folderToDelete = null;

// Rename-Modal öffnen
function editFolder(path, event) {
    event.stopPropagation();
    const f = folders[path];
    if (!f) {
        UIkit.notification({ message: `Ordner "${path}" nicht gefunden`, status: 'danger' });
        return;
    }

    document.getElementById('renameOldName').value = f.name;
    document.getElementById('renameNewName').value = f.name;
    folderToDelete = path;
    UIkit.modal('#renameModal').show();
}

function navigateToFolder(path) {
    if (!folders[path]) {
        UIkit.notification({ message: `Ordner "${path}" nicht gefunden`, status: 'danger' });
        return;
    }
    currentPath = path.split('/');
    renderContent();
}

function deleteFolder(path, event) {
    event.stopPropagation();
    folderToDelete = path;

    const f = folders[path];
    if (!f) {
        console.warn('Ordner nicht gefunden:', path, Object.keys(folders));
        UIkit.notification({ message: `Ordner "${path}" nicht gefunden`, status: 'danger' });
        return;
    }

    document.getElementById('deleteConfirmText').textContent = `Ordner "${f.name}" wirklich löschen?`;
    UIkit.modal('#deleteModal').show();
}

// Ordner wirklich löschen
async function confirmDelete() {
    const fullPath = folderToDelete;
    const token = getToken();

    if (!folders[fullPath]) {
        UIkit.notification({
            message: 'Pfad konnte nicht ermittelt werden',
            status: 'danger'
        });
        return;
    }

    const res = await fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: fullPath })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        UIkit.notification({
            message: err?.error || 'Löschen fehlgeschlagen',
            status: 'danger'
        });
        return;
    }

    const parent = folders[fullPath]?.parent;
    if (parent && folders[parent]) {
        folders[parent].subfolders = folders[parent].subfolders.filter(n => n !== fullPath);
    }

    delete folders[fullPath];
    UIkit.modal('#deleteModal').hide();
    UIkit.notification({ message: 'Ordner gelöscht', status: 'success' });
    renderContent();
}

// Ordner umbenennen
async function handleRename(e) {
    e.preventDefault();
    const oldName = document.getElementById('renameOldName').value.trim();
    const newName = document.getElementById('renameNewName').value.trim();
    if (!newName || newName === oldName) return;

    const token = getToken();
    const currentFullPath = currentPath.length === 0 ? 'Home' : currentPath.join('/');
    let oldPath = null;

    // 🔍 Suche nach vollständigem Pfad statt nur Name
    for (const key in folders) {
        const f = folders[key];
        if (f.name === oldName && f.parent === currentFullPath) {
            oldPath = key;
            break;
        }
    }

    if (!oldPath) {
        UIkit.notification({ message: 'Pfad nicht gefunden', status: 'danger' });
        return;
    }

    const parts = oldPath.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');

    const res = await fetch(`${API_BASE}/rename`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldPath, newPath })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        UIkit.notification({ message: err?.error || 'Umbenennen fehlgeschlagen', status: 'danger' });
        return;
    }

    const f = folders[oldPath];
    folders[newPath] = { ...f, name: newName };
    const parent = f.parent;
    if (folders[parent]) {
        folders[parent].subfolders = folders[parent].subfolders.map(n => n === oldPath ? newPath : n);
    }
    delete folders[oldPath];

    UIkit.modal('#renameModal').hide();
    renderContent();
}

// Neuer Ordner
async function handleNewFolder(e) {
    e.preventDefault();

    const input = document.querySelector('#newFolderForm input[type="text"]');
    const name = input.value.trim();

    if (!name) {
        UIkit.notification({ message: 'Ordnername fehlt', status: 'danger' });
        return;
    }

    const token = getToken();
    const current = currentPath.join('/') === 'Home' ? '' : currentPath.join('/');
    const fullPath = current ? `${current}/${name}` : name;
    const parentPath = current || 'Home';

    if (folders[fullPath]) {
        UIkit.notification({ message: 'Ordner existiert bereits', status: 'warning' });
        return;
    }

    const res = await fetch(`${API_BASE}/create-folder`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: fullPath })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        UIkit.notification({
            message: err?.error || 'Ordner konnte nicht erstellt werden',
            status: 'danger'
        });
        return;
    }

    folders[fullPath] = {
        id: fullPath,
        name,
        parent: parentPath,
        items: [],
        subfolders: []
    };

    if (!folders[parentPath]) {
        folders[parentPath] = {
            id: parentPath,
            name: parentPath.split('/').pop(),
            items: [],
            subfolders: [],
            parent: parentPath.includes('/') ? parentPath.split('/').slice(0, -1).join('/') : 'Home'
        };
    }

    if (!folders[parentPath].subfolders.includes(fullPath)) {
        folders[parentPath].subfolders.push(fullPath);
    }

    UIkit.modal('#newFolderModal').hide();
    input.value = '';
    renderContent();
}

// Datei-Upload
async function handleUpload(e) {
    e.preventDefault();
    const fileInput = document.querySelector('#uploadForm input[name="file"]');
    const files = fileInput.files;
    if (!files.length) {
        UIkit.notification({ message: 'Keine Datei gewählt', status: 'danger' });
        return;
    }

    const token = getToken();
    const folderPath = currentPath.length === 0 ? '' : currentPath.join('/');

    for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        form.append('folder', folderPath);

        try {
            const res = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: form
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Upload fehlgeschlagen');
            }
        } catch (err) {
            UIkit.notification({ message: err.message || 'Upload-Fehler', status: 'danger' });
        }
    }

    UIkit.notification({ message: 'Upload abgeschlossen', status: 'success' });
    UIkit.modal('#uploadModal').hide();
    fileInput.value = '';
    renderContent();
}

// ─────────────── Data & Rendering ───────────────

let currentPath = [];
let viewMode = 'grid';

// In-Memory-Struktur
let folders = {
    'Home': { id:'home', name:'Home', parent:null, items:[], subfolders:[] }
};

// Init
document.addEventListener('DOMContentLoaded', init);

async function init() {
    const token = getToken();
    if (!token) return window.location.href = 'index.html';

    const res = await fetch(`${API_BASE}/list-full`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Ordnerstruktur konnte nicht geladen werden');
    const data = await res.json();

    folders = {
        'Home': { id: 'Home', name: 'Home', items: [], subfolders: [], parent: null }
    };

    data.forEach(entry => {
        const key = entry.Key;
        if (!key) return;

        const isFolder = key.endsWith('/');
        const parts = key.split('/').filter(Boolean);
        const name = parts.at(-1);
        const fullPath = parts.join('/');
        const parentPath = parts.slice(0, -1).join('/') || 'Home';

        // 🔁 Elternstruktur rekursiv aufbauen
        for (let i = 1; i <= parts.length; i++) {
            const segmentPath = parts.slice(0, i).join('/');
            const parent = parts.slice(0, i - 1).join('/') || 'Home';
            const segmentName = parts[i - 1];

            if (!folders[parent]) {
                folders[parent] = {
                    id: parent,
                    name: parent.split('/').pop(),
                    items: [],
                    subfolders: [],
                    parent: parent.includes('/') ? parent.split('/').slice(0, -1).join('/') : 'Home'
                };
            }

            if (!folders[segmentPath]) {
                folders[segmentPath] = {
                    id: segmentPath,
                    name: segmentName,
                    items: [],
                    subfolders: [],
                    parent
                };
            }

            if (!folders[parent].subfolders.includes(segmentPath) && segmentPath !== parent) {
                folders[parent].subfolders.push(segmentPath);
            }
        }

        // 📁 Ordner verarbeiten
        if (isFolder) return;

        // 📄 Datei in items[] ablegen
        if (!folders[parentPath]) {
            folders[parentPath] = {
                id: parentPath,
                name: parentPath.split('/').pop(),
                items: [],
                subfolders: [],
                parent: parentPath.includes('/') ? parentPath.split('/').slice(0, -1).join('/') : 'Home'
            };
        }

        folders[parentPath].items.push({
            id: Date.now() + Math.random(),
            name,
            key,
            size: formatFileSize(entry.Size || 0),
            date: entry.LastModified?.split('T')[0] || ''
        });
    });

    // 🔗 Event-Listener initialisieren
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('gridViewBtn').addEventListener('click', () => switchView('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => switchView('list'));
    document.getElementById('newFolderForm').addEventListener('submit', handleNewFolder);
    document.getElementById('renameForm').addEventListener('submit', handleRename);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);

    document.getElementById('breadcrumb').addEventListener('click', e => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const idx = Array.from(e.target.parentElement.parentElement.children)
                .indexOf(e.target.parentElement);
            navigateToPath(currentPath.slice(0, idx + 1));
        }
    });

    renderContent();
}

// Karten rendern
function renderContent() {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '';
    grid.className = viewMode === 'grid'
        ? 'uk-grid-small uk-child-width-1-1 uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l'
        : 'uk-grid-small uk-child-width-1-1 list-view';

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

    grid.appendChild(frag);
    updateBreadcrumb();
}

function createFolderCard(f) {
    const date = new Date().toLocaleDateString('de-DE');
    const safeId = encodeURIComponent(f.id);

    const div = document.createElement('div');
    div.className = 'media-item folder-item uk-width-1-1';
    div.innerHTML = `
    <div class="uk-card uk-card-default uk-margin-small uk-padding-remove folder-card">
      <div class="folder-accent-bar"></div>
      <div class="uk-card-body uk-padding-small">
        <div class="folder-content">
          <div class="uk-margin-small"><span uk-icon="icon: folder;ratio:2.2"></span></div>
          <div class="uk-heading-small uk-margin-remove">${f.name}</div>
          <div class="uk-text-meta">${date}</div>
        </div>
        <div class="folder-buttons">
          <button class="uk-button uk-button-default uk-button-small" onclick="navigateToFolder(decodeURIComponent('${safeId}'))">
            <span uk-icon="folder"></span> Öffnen
          </button>
          <button class="uk-button uk-button-default uk-button-small" onclick="editFolder(decodeURIComponent('${safeId}'), event)">
            <span uk-icon="pencil"></span> Bearbeiten
          </button>
          <button class="uk-button uk-button-default uk-button-small" onclick="deleteFolder(decodeURIComponent('${safeId}'), event)">
            <span uk-icon="trash"></span> Löschen
          </button>
        </div>
      </div>
    </div>`;
    return div;
}

function isMediaFile(name) {
    return /\.(jpe?g|png|gif|bmp|webp|mp4|webm)$/i.test(name);
}

function createMediaCard(item) {
    const div = document.createElement('div');
    div.className = 'media-item';
    const imgId = `img-${Math.random().toString(36).slice(2)}`;
    div.innerHTML = `
    <div class="uk-card uk-card-default uk-card-hover uk-overflow-hidden uk-border-rounded">
      <div class="uk-card-media-top" style="display: flex; align-items: center; justify-content: center; height: 180px; background: #fff">
        <img id="${imgId}" src="" alt="${item.name}" style="max-height: 100%; max-width: 100%; object-fit: contain;">
      </div>
      <div class="uk-card-body uk-padding-small">
        <div class="uk-text-truncate" title="${item.name}">
          <strong>${item.name}</strong>
        </div>
        <div class="uk-text-meta">${item.size} • ${item.date}</div>
        <div class="uk-margin-top uk-flex uk-flex-between">
          <button class="uk-button uk-button-default uk-button-small" onclick="downloadFile('${item.key}')">
            <span uk-icon="download"></span> Download
          </button>
          <button class="uk-button uk-button-default uk-button-small" onclick="deleteFile('${item.key}', event)">
            <span uk-icon="trash"></span> Löschen
          </button>
        </div>
      </div>
    </div>`;

    getSignedFileUrl(item.key)
        .then(url => {
            const img = div.querySelector(`#${imgId}`);
            img.src = url;
        })
        .catch(err => {
            console.error('Thumbnail-Error:', err);
            const img = div.querySelector(`#${imgId}`);
            img.src = 'icons/fallback-image.png';
        });

    if (!item || item.key.endsWith('/') || !isMediaFile(item.name)) {
        return document.createComment('Nicht-Medien-Datei oder Ordner wird nicht angezeigt');
    }

    return div;
}

// Breadcrumb & Navigation
function updateBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = currentPath.map((p,i)=>
        i===currentPath.length-1
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
    document.getElementById('gridViewBtn').classList.toggle('uk-button-primary', mode==='grid');
    document.getElementById('listViewBtn').classList.toggle('uk-button-primary', mode==='list');
    renderContent();
}