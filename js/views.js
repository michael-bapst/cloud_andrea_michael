let activeView = 'fotos';

function switchViewTo(view) {
    activeView = view;

    // 🔄 Aktive Tab visuell markieren
    document.querySelectorAll('#viewTabs li').forEach(li =>
        li.classList.toggle('uk-active', li.dataset.view === view)
    );

    // 🔄 Überschrift setzen
    const heading = document.getElementById('viewHeading');
    if (heading) {
        if (view === 'fotos') heading.textContent = 'Fotos';
        else if (view === 'alben') heading.textContent = 'Alben';
        else if (view === 'dateien') heading.textContent = 'Dateien';
    }

    // 🔄 FAB-Buttons sichtbar machen
    document.getElementById('fabFotos').style.display = view === 'fotos' ? 'block' : 'none';
    document.getElementById('fabAlben').style.display = view === 'alben' ? 'block' : 'none';
    document.getElementById('fabDateien').style.display = view === 'dateien' ? 'block' : 'none';

    // 🔄 Ansichtsspezifische UI-Buttons
    const toggleGroup = document.getElementById('viewModeToggles');
    const folderBtn = document.getElementById('newFolderBtn');

    toggleGroup.style.display = (view === 'alben' || view === 'dateien') ? 'flex' : 'none';
    folderBtn.style.display = view === 'alben' ? 'inline-flex' : 'none';

    // 🔄 View wechseln
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
