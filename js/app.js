// ─────────────────────────────────────────────────────────────────────────────
//                            js/app.js (vollständig)
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = 'https://cloud-backend-stxe.onrender.com';

// ─────────────── Helpers ───────────────

// Auth-Token holen
function getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

// Logout & Weiterleitung
function handleLogout() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = 'index.html';
}

// Presigned URL holen (umgeht 401 bei <img>)
async function getSignedFileUrl(key) {
    const token = getToken();
    const res = await fetch(`${API_BASE}/file/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        redirect: 'manual'
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

// Vorschau öffnen
function previewMedia(name, url) {
    const ext = name.split('.').pop().toLowerCase();
    const isVideo = ['mp4','webm','ogg'].includes(ext);
    const modal = document.getElementById('previewModal');
    const container = modal.querySelector('.preview-container');
    container.innerHTML = isVideo
        ? `<video controls style="width:100%"><source src="${url}" type="video/${ext}"></video>`
        : `<img src="${url}" alt="${name}" style="width:100%">`;
    UIkit.modal(modal).show();
}

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
function editFolder(name, event) {
    event.stopPropagation();
    document.getElementById('renameOldName').value = name;
    document.getElementById('renameNewName').value = name;
    UIkit.modal('#renameModal').show();
}

// Delete-Modal öffnen
function deleteFolder(name, event) {
    event.stopPropagation();
    folderToDelete = name;
    document.getElementById('deleteConfirmText').textContent = `Ordner "${name}" wirklich löschen?`;
    UIkit.modal('#deleteModal').show();
}

// Ordner wirklich löschen
async function confirmDelete() {
    const raw = folderToDelete;
    const token = getToken();

    // Exakten Pfad aus aktuellem Kontext ermitteln
    const base = currentPath.join('/') === 'Home' ? 'Home' : currentPath.join('/');
    const fullPath = `${base}/${raw}`;

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
    const rawOld = document.getElementById('renameOldName').value;
    const newName = document.getElementById('renameNewName').value.trim();
    if (!newName || newName === rawOld) return;

    const token = getToken();

    // Volle Pfade aus der aktuellen Struktur auflösen
    const base = currentPath.join('/') === 'Home' ? 'Home' : currentPath.join('/');
    const fullOldPath = `${base}/${rawOld}`;
    const fullNewPath = `${base}/${newName}`;

    const res = await fetch(`${API_BASE}/rename`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldPath: fullOldPath, newPath: fullNewPath })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        UIkit.notification({
            message: err?.error || 'Umbenennen fehlgeschlagen',
            status: 'danger'
        });
        return;
    }

    // Lokale Struktur aktualisieren
    const f = folders[fullOldPath];
    folders[fullNewPath] = { ...f, name: newName };
    const p = f.parent;

    if (folders[p]) {
        folders[p].subfolders = folders[p].subfolders.map(n => n === fullOldPath ? fullNewPath : n);
    }

    delete folders[fullOldPath];
    UIkit.modal('#renameModal').hide();
    renderContent();
}

// Neuer Ordner
async function handleNewFolder(e) {
    e.preventDefault();
    const input = document.querySelector('#newFolderForm input[type="text"]');
    const name = input.value.trim();
    if (!name) {
        UIkit.notification({ message:'Ordnername fehlt', status:'danger' });
        return;
    }

    const token = getToken();
    const current = currentPath.join('/') === 'Home' ? '' : currentPath.join('/');
    const fullPath = current ? `${current}/${name}` : name;

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
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        parent: current || 'Home',
        items: [],
        subfolders: []
    };

    const parentPath = current || 'Home';
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
        UIkit.notification({ message:'Keine Datei gewählt', status:'danger' });
        return;
    }
    const form = new FormData();
    form.append('file', files[0]);
    const folderPath = currentPath.join('/')==='Home'?'':currentPath.join('/');
    form.append('folder', folderPath);
    const token = getToken();
    const res = await fetch(`${API_BASE}/upload`, {
        method:'POST',
        headers: { Authorization:`Bearer ${token}` },
        body: form
    });
    if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.detail || 'Upload fehlgeschlagen');
    }
    UIkit.notification({ message:'Upload erfolgreich', status:'success' });
    UIkit.modal('#uploadModal').hide();
    fileInput.value = '';
    renderContent();
}

// ─────────────── Data & Rendering ───────────────

let currentPath = ['Home'];
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
        'Home': { name: 'Home', items: [], subfolders: [], parent: null }
    };

    data.forEach(entry => {
        const key = entry.Key;
        if (!key) return;

        const isFolder = key.endsWith('/');
        const parts = key.split('/').filter(Boolean); // entfernt leere Einträge
        const name = parts.at(-1);
        const fullPath = parts.join('/');
        const parentPath = parts.slice(0, -1).join('/') || 'Home';

        // Elternknoten sicherstellen (rekursiv)
        for (let i = 1; i <= parts.length - 1; i++) {
            const path = parts.slice(0, i).join('/');
            const parent = i === 1 ? 'Home' : parts.slice(0, i - 1).join('/');

            if (!folders[path]) {
                folders[path] = { name: parts[i - 1], items: [], subfolders: [], parent };
                if (!folders[parent].subfolders.includes(path)) {
                    folders[parent].subfolders.push(path);
                }
            }
        }

        if (isFolder) {
            if (!folders[fullPath]) {
                folders[fullPath] = { name, items: [], subfolders: [], parent: parentPath };
            }
            if (!folders[parentPath].subfolders.includes(fullPath)) {
                folders[parentPath].subfolders.push(fullPath);
            }
        } else {
            folders[parentPath].items.push({
                id: Date.now() + Math.random(),
                name,
                key,
                size: formatFileSize(entry.Size || 0),
                date: entry.LastModified?.split('T')[0] || ''
            });
        }
    });

    // Event-Listener (unverändert)
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
    grid.className = viewMode==='grid'
        ? 'uk-grid-small uk-child-width-1-1 uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l'
        : 'uk-grid-small uk-child-width-1-1 list-view';

    const current = currentPath[currentPath.length-1];
    const data = folders[current];
    const frag = document.createDocumentFragment();

    if (currentPath.length>1) frag.appendChild(renderBackButton());
    data.subfolders.forEach(n=>frag.appendChild(createFolderCard(folders[n])));
    data.items.forEach(it=>frag.appendChild(createMediaCard(it)));

    grid.appendChild(frag);
    updateBreadcrumb();
    const backBtnContainer = document.querySelector('.uk-container .uk-button-group')?.parentElement;
    if (currentPath.length > 1) {
        const backBtn = renderBackButton();
        if (backBtnContainer && !backBtnContainer.querySelector('.back-btn')) {
            backBtn.classList.add('back-btn');
            backBtnContainer.insertBefore(backBtn, backBtnContainer.firstChild);
        }
    }
}

function createFolderCard(f) {
    const date = new Date().toLocaleDateString('de-DE');
    const div = document.createElement('div');
    div.className='media-item folder-item uk-width-1-1';
    div.innerHTML=`
    <div class="uk-card uk-card-default uk-margin-small uk-padding-remove folder-card">
      <div class="folder-accent-bar"></div>
      <div class="uk-card-body uk-padding-small">
        <div class="folder-content">
          <div class="uk-margin-small"><span uk-icon="icon: folder;ratio:2.2"></span></div>
          <div class="uk-heading-small uk-margin-remove">${f.name}</div>
          <div class="uk-text-meta">${date}</div>
        </div>
        <div class="folder-buttons">
          <button class="uk-button uk-button-default uk-button-small" onclick="navigateToFolder('${f.name}')">
            <span uk-icon="folder"></span> Öffnen
          </button>
          <button class="uk-button uk-button-default uk-button-small" onclick="editFolder('${f.name}',event)">
            <span uk-icon="pencil"></span> Bearbeiten
          </button>
          <button class="uk-button uk-button-default uk-button-small" onclick="deleteFolder('${f.name}',event)">
            <span uk-icon="trash"></span> Löschen
          </button>
        </div>
      </div>
    </div>`;
    return div;
}

function createMediaCard(item) {
    const div = document.createElement('div');
    div.className='media-item';
    div.innerHTML=`
    <div class="uk-card uk-card-default">
      <div class="uk-card-media-top">
        <img src="" alt="${item.name}" data-key="${item.key}">
      </div>
      <div class="uk-card-body">
        <h3 class="uk-card-title">${item.name}</h3>
        <p>${item.size} • ${item.date}</p>
        <button class="uk-button uk-button-default uk-button-small" onclick="event.stopPropagation(); previewMedia('${item.name}', this.closest('.uk-card').querySelector('img').src)">
          <span uk-icon="play-circle"></span> Vorschau
        </button>
        <button class="uk-button uk-button-default uk-button-small" onclick="event.stopPropagation(); downloadFile('${item.key}')">
          <span uk-icon="download"></span> Herunterladen
        </button>
        <button class="uk-button uk-button-danger uk-button-small" onclick="deleteFile('${item.key}', event)">
          <span uk-icon="trash"></span>
        </button>
      </div>
    </div>`;

    // async Vorschaubild setzen
    getSignedFileUrl(item.key)
        .then(url=>{
            const img = div.querySelector('img');
            img.src = url;
            // Preview-Button aktualisieren
            const pvBtn = div.querySelector('button[uk-icon="play-circle"]')?.parentElement;
            if(pvBtn) pvBtn.setAttribute('onclick', `event.stopPropagation(); previewMedia('${item.name}','${url}')`);
        })
        .catch(err=> console.error('Thumbnail-Error:',err));

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

function renderBackButton() {
    const btn = document.createElement('button');
    btn.className='uk-button uk-button-default uk-flex uk-flex-middle uk-margin-small-bottom';
    btn.innerHTML='<span uk-icon="arrow-left"></span><span class="uk-margin-small-left">Zurück</span>';
    btn.onclick = ()=> {
        currentPath.pop();
        renderContent();
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
    document.getElementById('gridViewBtn').classList.toggle('uk-button-primary', mode==='grid');
    document.getElementById('listViewBtn').classList.toggle('uk-button-primary', mode==='list');
    renderContent();
}
