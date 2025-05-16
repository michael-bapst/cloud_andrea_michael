let activeView = 'fotos';

function switchViewTo(view) {
    activeView = view;
    document.querySelectorAll('#viewTabs li').forEach(li =>
        li.classList.toggle('uk-active', li.dataset.view === view)
    );

    if (view === 'fotos') renderFotos();
    else if (view === 'alben') renderAlben();
    else if (view === 'dateien') renderDateien();
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
    const dateien = folders['Home']?.items?.filter(i => !isMediaFile(i.name)) || [];
    dateien.forEach(d => {
        const div = document.createElement('div');
        div.className = 'uk-card uk-card-default uk-card-body';
        div.innerHTML = `
      <div class="uk-text-truncate" title="${d.name}">${d.name}</div>
      <div class="uk-text-meta">${d.size} – ${d.date}</div>
    `;
        grid.appendChild(div);
    });
}
