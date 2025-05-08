const DEMO_CREDENTIALS = { email: 'test@example.com', password: 'test1234' };
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
const uploadForm = document.querySelector('#uploadModal form');

// Event-Handler
logoutBtn.addEventListener('click', handleLogout);
gridViewBtn.addEventListener('click', () => switchView('grid'));
listViewBtn.addEventListener('click', () => switchView('list'));
newFolderForm.addEventListener('submit', handleNewFolder);
uploadForm.addEventListener('submit', handleUpload);
breadcrumb.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
        e.preventDefault();
        const index = Array.from(breadcrumb.children).indexOf(e.target.parentElement);
        navigateToPath(currentPath.slice(0, index + 1));
    }
});

// Farben für Ordner
function getPastelColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 90%)`;
}

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
    const color = getPastelColor(folder.name);
    const date = new Date().toLocaleDateString('de-DE');
    div.innerHTML = `
    <div class="uk-card uk-card-default uk-margin-small uk-padding-remove">
      <div class="folder-accent-bar" style="background-color: ${color}; height: 32px; border-radius: 4px 4px 0 0;"></div>
      <div class="uk-card-body uk-flex uk-flex-column uk-flex-middle uk-padding-small">
        <div class="uk-margin-small" style="height:48px;"><span uk-icon="icon: folder; ratio: 2.2"></span></div>
        <div class="uk-text-center">
          <div class="uk-heading-small uk-margin-remove">${folder.name}</div>
          <div class="uk-text-meta">${date}</div>
        </div>
        <div class="uk-margin-small-top uk-flex uk-flex-center uk-child-width-auto" uk-grid>
          <button class="uk-button uk-button-default uk-button-small" onclick="navigateToFolder('${folder.name}')">
            <span uk-icon="folder"></span><span class="uk-margin-small-left">Öffnen</span>
          </button>
          <button class="uk-button uk-button-default uk-button-small" onclick="editFolder('${folder.name}', event)">
            <span uk-icon="pencil"></span><span class="uk-margin-small-left">Bearbeiten</span>
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
    <div class="uk-card uk-card-default">
      <div class="uk-card-media-top"><img src="${item.thumbnail}" alt="${item.name}"></div>
      <div class="uk-card-body">
        <h3 class="uk-card-title">${item.name}</h3>
        <p>${item.size} • ${item.date}</p>
      </div>
      <div class="actions">
        <button class="uk-button uk-button-small uk-button-default" uk-icon="pencil" onclick="editItem(${item.id}, event)"></button>
        <button class="uk-button uk-button-small uk-button-danger" uk-icon="trash" onclick="deleteItem(${item.id}, event)"></button>
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

function editFolder(name, event) {
    event.stopPropagation();
    UIkit.notification({ message: `Ordner "${name}" bearbeiten`, status: 'primary', timeout: 3000 });
}

function deleteFolder(name, event) {
    event.stopPropagation();
    if (confirm(`Ordner "${name}" wirklich löschen?`)) {
        const parent = folders[name].parent;
        folders[parent].subfolders = folders[parent].subfolders.filter(n => n !== name);
        delete folders[name];
        renderContent();
    }
}

function editItem(id, event) {
    event.stopPropagation();
    UIkit.notification({ message: `Datei bearbeiten`, status: 'primary', timeout: 3000 });
}

function deleteItem(id, event) {
    event.stopPropagation();
    const current = currentPath[currentPath.length - 1];
    folders[current].items = folders[current].items.filter(item => item.id !== id);
    renderContent();
}

// Formulare
function handleNewFolder(e) {
    e.preventDefault();
    const name = e.target.querySelector('input[type="text"]').value.trim();
    const current = currentPath[currentPath.length - 1];

    if (!name || folders[current].subfolders.includes(name)) {
        UIkit.notification({ message: 'Ungültiger oder doppelter Ordnername', status: 'danger', timeout: 3000 });
        return;
    }

    folders[name] = { id: name.toLowerCase().replace(/\s+/g, '-'), name, parent: current, items: [], subfolders: [] };
    folders[current].subfolders.push(name);
    renderContent();
    UIkit.modal('#newFolderModal').hide();
    e.target.reset();
}

function handleUpload(e) {
    e.preventDefault();
    const files = e.target.querySelector('input[type="file"]').files;
    if (!files.length) return;

    const current = currentPath[currentPath.length - 1];
    const newItems = Array.from(files).map((file, i) => ({
        id: Date.now() + i,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        size: formatFileSize(file.size),
        date: new Date().toISOString().split('T')[0],
        thumbnail: file.type.startsWith('image/') ? URL.createObjectURL(file) : 'https://picsum.photos/200/200?random=' + (Date.now() + i)
    }));

    folders[current].items.push(...newItems);
    renderContent();
    UIkit.modal('#uploadModal').hide();
    e.target.reset();
}

// Hilfsfunktionen
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + sizes[i];
}

function handleLogout() {
    localStorage.removeItem('stayLoggedIn');
    window.location.href = 'index.html';
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    renderContent();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
});
