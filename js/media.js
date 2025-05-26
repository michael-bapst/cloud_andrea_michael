// js/media.js

// 🔓 Unterstützte Dateitypen für Vorschau
window.isMediaFile = function (name) {
    return /\.(jpe?g|png|gif|bmp|webp|mp4|webm|pdf|docx?|xlsx?|txt)$/i.test(name);
};

// ✅ Signed URL vom Server holen
async function getSignedFileUrl(key) {
    const token = getToken();
    const apiUrl = `${API_BASE}/file-url?key=${encodeURIComponent(key)}`;

    const res = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`
        },
        mode: 'cors',
        cache: 'no-store'
    });

    if (!res.ok) {
        throw new Error(`Presign fehlgeschlagen (${res.status})`);
    }

    const data = await res.json();
    return data.url;
}

// 🗑 Datei löschen
async function deleteFile(key, e) {
    e.stopPropagation();
    const token = getToken();

    const res = await fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
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

// ⬇️ Datei herunterladen
async function downloadFile(key) {
    try {
        const url = await getSignedFileUrl(key);
        window.open(url, '_blank');
    } catch (err) {
        UIkit.notification({ message: 'Download fehlgeschlagen', status: 'danger' });
        console.warn('Download-Fehler:', err.message);
    }
}

// 📷 Medienkarte (NEUES Layout mit .media-photo-card)
function createMediaCard(item) {
    if (!item || !item.name || item.key.endsWith('/')) {
        return document.createComment('Nicht darstellbare Datei – wird übersprungen');
    }

    const container = document.createElement('div');
    container.className = 'media-photo-card';

    // Thumbnail
    const thumb = document.createElement('div');
    thumb.className = 'media-photo-thumbnail';

    const img = document.createElement('img');
    img.alt = item.name;
    img.src = 'icons/file-placeholder.svg'; // Platzhalter, wird ersetzt

    thumb.appendChild(img);

    // Titel & Subinfo
    const title = document.createElement('div');
    title.className = 'media-photo-title';
    title.textContent = item.name;

    const sub = document.createElement('div');
    sub.className = 'media-photo-sub';
    sub.textContent = `${item.size} • ${item.date}`;

    // Aktionen (Download / Löschen)
    const actions = document.createElement('div');
    actions.className = 'media-actions';
    actions.innerHTML = `
        <button class="uk-icon-button" uk-icon="download" title="Download" onclick="downloadFile('${item.key}')"></button>
        <button class="uk-icon-button" uk-icon="trash" title="Löschen" onclick="deleteFile('${item.key}', event)"></button>
    `;
    container.appendChild(actions);

    // Hover für Aktionen
    container.addEventListener('mouseenter', () => actions.style.opacity = 1);
    container.addEventListener('mouseleave', () => actions.style.opacity = 0);

    // URL holen und setzen
    getSignedFileUrl(item.key)
        .then(url => {
            img.src = url;
        })
        .catch(err => {
            console.warn('❌ Vorschaubild konnte nicht geladen werden:', err.message);
        });

    // Zusammenbauen
    container.appendChild(thumb);
    container.appendChild(title);
    container.appendChild(sub);

    return container;
}
