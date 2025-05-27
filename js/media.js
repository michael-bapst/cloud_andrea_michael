// js/media.js

// 🔓 Unterstützte Dateitypen für Vorschau
window.isMediaFile = function (name) {
    return /\.(jpe?g|png|gif|bmp|webp|mp4|webm)$/i.test(name);
};

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

// 📷 Medienkarte (Vorschau im Grid)
function createMediaCard(item) {
    if (!item || !item.name || item.key.endsWith('/') || !isMediaFile(item.name)) {
        return document.createComment('Nicht-Medien-Datei oder Ordner wird nicht angezeigt');
    }

    const id = Math.random().toString(36).substring(2);
    const container = document.createElement('div');
    container.className = 'media-cloud-item uk-card uk-card-default uk-padding-small';

    container.innerHTML = `
    <a id="a-${id}" href="#" data-caption="${item.name}" uk-lightbox>
      <img id="img-${id}" alt="${item.name}" loading="lazy" />
    </a>
    <div class="uk-text-small uk-margin-small-top uk-text-truncate" title="${item.name}">${item.name}</div>
    <div class="uk-text-meta">${item.size} • ${item.date}</div>
  `;

    getSignedFileUrl(item.key)
        .then(url => {
            const img = container.querySelector(`#img-${id}`);
            const anchor = container.querySelector(`#a-${id}`);
            img.src = url;
            anchor.href = url;
        })
        .catch(() => console.warn('Bild konnte nicht geladen werden'));

    return container;
}
