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
    if (!res.ok) throw new Error('Löschen fehlgeschlagen');
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
    const name = folderToDelete;
    const token = getToken();
    const res = await fetch(`${API_BASE}/delete`, {
        method:'DELETE',
        headers:{
            'Content-Type':'application/json',
            Authorization:`Bearer ${token}`
        },
        body: JSON.stringify({ path: name })
    });
    if (!res.ok) throw new Error('Ordner-Löschen fehlgeschlagen');
    // UI updaten
    const parent = folders[name].parent;
    folders[parent].subfolders = folders[parent].subfolders.filter(n=>n!==name);
    delete folders[name];
    UIkit.modal('#deleteModal').hide();
    renderContent();
}

// Ordner umbenennen
async function handleRename(e) {
    e.preventDefault();
    const oldName = document.getElementById('renameOldName').value;
    const newName = document.getElementById('renameNewName').value.trim();
    if (!newName || newName === oldName) return;
    const token = getToken();
    const res = await fetch(`${API_BASE}/rename`, {
        method:'PUT',
        headers:{
            'Content-Type':'application/json',
            Authorization:`Bearer ${token}`
        },
        body: JSON.stringify({ oldPath: oldName, newPath: newName })
    });
    if (!res.ok) throw new Error('Umbenennen fehlgeschlagen');
    // UI updaten
    const f = folders[oldName];
    folders[newName] = { ...f, name:newName };
    const p = f.parent;
    folders[p].subfolders = folders[p].subfolders.map(n=>n===oldName?newName:n);
    delete folders[oldName];
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
    const current = currentPath.join('/')==='Home'?'':currentPath.join('/');
    const fullPath = current? `${current}/${name}` : name;
    const res = await fetch(`${API_BASE}/create-folder`, {
        method:'POST',
        headers:{
            'Content-Type':'application/json',
            Authorization:`Bearer ${token}`
        },
        body: JSON.stringify({ path: fullPath })
    });
    if (!res.ok) throw new Error('Ordner konnte nicht erstellt werden');
    // UI updaten
    folders[name] = {
        id:name.toLowerCase().replace(/\s+/g,'-'),
        name, parent: currentPath[currentPath.length-1],
        items:[], subfolders:[]
    };
    folders[currentPath[currentPath.length-1]].subfolders.push(name);
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
    if (!token) return window.location.href='index.html';

    // Struktur vom Backend holen
    const res = await fetch(`${API_BASE}/list-full`, {
        headers: { Authorization:`Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Ordnerstruktur konnte nicht geladen werden');
    const data = await res.json();

    // Reset
    folders = { 'Home': { id:'home', name:'Home', parent:null, items:[], subfolders:[] } };

    data.forEach(entry => {
        const key = entry.Key;
        if (!key||key==='') return;
        const parts = key.split('/');
        const name = parts[parts.length-1]||parts[parts.length-2];
        const parent = parts.length>2?parts[parts.length-2]:'Home';

        if (key.endsWith('/')) {
            // Folder
            if (!folders[parent]) folders[parent]={ id:parent,name:parent,parent:'Home',items:[],subfolders:[] };
            folders[name]={ id:name,name, parent, items:[], subfolders:[] };
            folders[parent].subfolders.push(name);
        } else {
            // File
            if (!folders[parent]) folders[parent]={ id:parent,name:parent,parent:'Home',items:[],subfolders:[] };
            folders[parent].items.push({
                id:Date.now()+Math.random(),
                name,
                key,
                size: formatFileSize(entry.Size||0),
                date: entry.LastModified?.split('T')[0]||''
            });
        }
    });

    // Event-Listener
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('gridViewBtn').addEventListener('click',()=>switchView('grid'));
    document.getElementById('listViewBtn').addEventListener('click',()=>switchView('list'));
    document.getElementById('newFolderForm').addEventListener('submit', handleNewFolder);
    document.getElementById('renameForm').addEventListener('submit', handleRename);
    document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
    document.getElementById('uploadForm').addEventListener('submit', handleUpload);

    document.getElementById('breadcrumb').addEventListener('click', e=>{
        if(e.target.tagName==='A'){
            e.preventDefault();
            const idx = Array.from(e.target.parentElement.parentElement.children)
                .indexOf(e.target.parentElement);
            navigateToPath(currentPath.slice(0,idx+1));
        }
    });

    const grid = document.getElementById('contentGrid');
    grid.addEventListener('dragover', e=>{ e.preventDefault(); grid.classList.add('uk-background-muted'); });
    grid.addEventListener('dragleave', ()=>grid.classList.remove('uk-background-muted'));
    grid.addEventListener('drop', async e=>{
        e.preventDefault();
        grid.classList.remove('uk-background-muted');
        await handleUpload({ preventDefault:()=>{}, target: document.getElementById('uploadForm') });
    });

    // Render starten
    renderContent();

    // ServiceWorker (optional)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
    }
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
