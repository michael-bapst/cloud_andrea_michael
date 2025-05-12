const API_BASE = 'https://cloud-backend-stxe.onrender.com';

// ─────────────── 基本 Helpers ───────────────

// Auth-Token holen
function getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

// Logout
function handleLogout() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = 'index.html';
}

// Presigned URL vom Backend holen (umgeht 401 bei <img>)
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

// Utility: Dateigröße formatieren
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes','KB','MB','GB'];
    const i = Math.floor(Math.log(bytes)/Math.log(1024));
    return parseFloat((bytes/Math.pow(1024,i)).toFixed(1)) + ' ' + sizes[i];
}

// ─────────────── Globale Aktionen ───────────────

// Vorschau-Modal öffnen
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
function deleteFile(key, e) {
    e.stopPropagation();
    const token = getToken();
    fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: {
            'Content-Type':'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: key })
    })
        .then(res => {
            if (!res.ok) throw new Error('Löschen fehlgeschlagen');
            renderContent();
        })
        .catch(err => UIkit.notification({ message: err.message, status:'danger' }));
}

// ─────────────── Ordner-Aktionen ───────────────

let folderToDelete = null;

function editFolder(name, event) {
    event.stopPropagation();
    document.getElementById('renameOldName').value = name;
    document.getElementById('renameNewName').value = name;
    UIkit.modal('#renameModal').show();
}

function deleteFolder(name, event) {
    event.stopPropagation();
    folderToDelete = name;
    document.getElementById('deleteConfirmText').textContent = `Ordner "${name}" wirklich löschen?`;
    UIkit.modal('#deleteModal').show();
}

function confirmDelete() {
    const name = folderToDelete;
    const token = getToken();
    fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: {
            'Content-Type':'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: name })
    })
        .then(res => {
            if (!res.ok) throw new Error('Ordner-Löschen fehlgeschlagen');
            // Nach intern löschen und rerendern
            const parent = folders[name].parent;
            folders[parent].subfolders = folders[parent].subfolders.filter(n => n!==name);
            delete folders[name];
            UIkit.modal('#deleteModal').hide();
            renderContent();
        })
        .catch(err => UIkit.notification({ message: err.message, status:'danger' }));
}

// Ordner umbenennen
async function handleRename(e) {
    e.preventDefault();
    const oldName = document.getElementById('renameOldName').value;
    const newName = document.getElementById('renameNewName').value.trim();
    if (!newName || newName === oldName) return;

    const token = getToken();
    try {
        const res = await fetch(`${API_BASE}/rename`, {
            method: 'PUT',
            headers: {
                'Content-Type':'application/json',
                Authorization:`Bearer ${token}`
            },
            body: JSON.stringify({ oldPath: oldName, newPath: newName })
        });
        if (!res.ok) throw new Error('Umbenennen fehlgeschlagen');
        // im UI anpassen
        const f = folders[oldName];
        folders[newName] = { ...f, name:newName };
        const p = f.parent;
        folders[p].subfolders = folders[p].subfolders.map(n=> n===oldName?newName:n);
        delete folders[oldName];
        UIkit.modal('#renameModal').hide();
        renderContent();
    } catch(err) {
        UIkit.notification({ message: err.message, status:'danger' });
    }
}

// Neuen Ordner erstellen
async function handleNewFolder(e) {
    e.preventDefault();
    const input = e.target.querySelector('input[type="text"]');
    const name = input.value.trim();
    if (!name) {
        UIkit.notification({ message:'Ordnername fehlt', status:'danger' });
        return;
    }
    const current = currentPath.join('/')==='Home'?'':currentPath.join('/');
    const fullPath = current? `${current}/${name}`: name;
    const token = getToken();

    try {
        const res = await fetch(`${API_BASE}/create-folder`, {
            method:'POST',
            headers:{
                'Content-Type':'application/json',
                Authorization:`Bearer ${token}`
            },
            body: JSON.stringify({ path: fullPath })
        });
        if (!res.ok) throw new Error('Ordner konnte nicht erstellt werden');
        // UI aktualisieren
        folders[name] = {
            id:name.toLowerCase().replace(/\s+/g,'-'),
            name, parent: currentPath[currentPath.length-1],
            items:[], subfolders:[]
        };
        folders[currentPath[currentPath.length-1]].subfolders.push(name);
        UIkit.modal('#newFolderModal').hide();
        input.value = '';
        renderContent();
    } catch(err) {
        UIkit.notification({ message: err.message, status:'danger' });
    }
}

// Datei-Upload
async function handleUpload(e) {
    e.preventDefault();
    const files = document.querySelector('input[name="file"]').files;
    if (!files.length) {
        UIkit.notification({ message:'Keine Datei gewählt', status:'danger' });
        return;
    }
    const form = new FormData();
    form.append('file', files[0]);
    const folderPath = currentPath.join('/')==='Home'?'':currentPath.join('/');
    form.append('folder', folderPath);

    try {
        const res = await fetch(`${API_BASE}/upload`, {
            method:'POST',
            headers:{ Authorization:`Bearer ${getToken()}` },
            body: form
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Upload fehlgeschlagen');
        }
        UIkit.notification({ message:'Upload erfolgreich', status:'success' });
        UIkit.modal('#uploadModal').hide();
        e.target.reset();
        renderContent();
    } catch(err) {
        UIkit.notification({ message: err.message, status:'danger' });
    }
}

// ─────────────── Datenstruktur & Rendering ───────────────

let currentPath = ['Home'];
let viewMode = 'grid';

// „folders“ hält Struktur in Memory
let folders = {
    'Home': { id:'home', name:'Home', parent:null, items:[], subfolders:[] }
};

// Initial laden & Events registrieren
document.addEventListener('DOMContentLoaded', async () => {
    const token = getToken();
    if (!token) window.location.href='index.html';

    // 1) Daten von S3 holen
    try {
        const res = await fetch(`${API_BASE}/list-full`, {
            headers: { Authorization:`Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Struktur konnte nicht geladen werden');
        const data = await res.json();

        // reinitialize
        folders = { 'Home': { id:'home', name:'Home', parent:null, items:[], subfolders:[] } };

        data.forEach(entry => {
            const key = entry.Key;
            if (!key || key === '/') return;
            const parts = key.split('/');
            const name = parts[parts.length-1] || parts[parts.length-2];
            const parent = parts.length>2 ? parts[parts.length-2] : 'Home';

            // Folder
            if (key.endsWith('/')) {
                if (!folders[parent]) {
                    folders[parent] = { id:parent, name:parent, parent:'Home', items:[], subfolders:[] };
                }
                folders[name] = { id:name, name, parent, items:[], subfolders:[] };
                folders[parent].subfolders.push(name);
            }
            // File
            else {
                if (!folders[parent]) {
                    folders[parent] = { id:parent, name:parent, parent:'Home', items:[], subfolders:[] };
                }
                folders[parent].items.push({
                    id: Date.now()+Math.random(),
                    name,
                    key,
                    size: formatFileSize(entry.Size||0),
                    date: entry.LastModified?.split('T')[0]||'',
                });
            }
        });

        // 2) Events
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
        document.getElementById('gridViewBtn').addEventListener('click', ()=>switchView('grid'));
        document.getElementById('listViewBtn').addEventListener('click', ()=>switchView('list'));
        document.getElementById('newFolderForm').addEventListener('submit', handleNewFolder);
        document.getElementById('uploadForm')?.addEventListener('submit', handleUpload);
        document.getElementById('renameForm').addEventListener('submit', handleRename);
        document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

        document.getElementById('breadcrumb').addEventListener('click', e => {
            if (e.target.tagName==='A') {
                e.preventDefault();
                const idx = Array.from(e.target.parentElement.parentElement.children)
                    .indexOf(e.target.parentElement);
                navigateToPath(currentPath.slice(0, idx+1));
            }
        });

        const grid = document.getElementById('contentGrid');
        grid.addEventListener('dragover', e=>{ e.preventDefault(); grid.classList.add('uk-background-muted'); });
        grid.addEventListener('dragleave', ()=>grid.classList.remove('uk-background-muted'));
        grid.addEventListener('drop', e=> {
            e.preventDefault();
            grid.classList.remove('uk-background-muted');
            handleUpload(e);
        });

        // 3) Rendern
        renderContent();
    }
    catch(err) {
        UIkit.notification({ message: err.message, status:'danger' });
    }

    // Service Worker (optional)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
    }
});

// Rendert die Karten
function renderContent() {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '';
    grid.className = viewMode==='grid'
        ? 'uk-grid-small uk-child-width-1-1 uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l'
        : 'uk-grid-small uk-child-width-1-1 list-view';

    const folder = folders[currentPath[currentPath.length-1]];
    const frag = document.createDocumentFragment();

    if (currentPath.length>1) frag.appendChild(renderBackButton());
    folder.subfolders.forEach(n=> frag.appendChild(createFolderCard(folders[n])));
    folder.items.forEach(it=> frag.appendChild(createMediaCard(it)));

    grid.appendChild(frag);
    updateBreadcrumb();
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
          <div class="uk-margin-small"><span uk-icon="icon: folder; ratio:2.2"></span></div>
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

    // Thumbnail + onclick nachladen
    getSignedFileUrl(item.key)
        .then(url => {
            const img = div.querySelector('img');
            img.src = url;
            // Preview-Button updaten:
            const pv = div.querySelector('button[uk-icon="play-circle"]')?.parentElement;
            if (pv) pv.setAttribute('onclick', `event.stopPropagation(); previewMedia('${item.name}','${url}')`);
        })
        .catch(err => console.error('Thumbnail-Error:', err));

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
    btn.onclick = ()=>{
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

// Datei herunterladen über presigned URL
async function downloadFile(key) {
    try {
        const url = await getSignedFileUrl(key);
        window.open(url, '_blank');
    } catch(err) {
        UIkit.notification({ message: 'Download fehlgeschlagen', status:'danger' });
    }
}