// js/media.js

function isMediaFile(name) {
    return /\.(jpe?g|png|gif|bmp|webp|mp4|webm)$/i.test(name);
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

    if (res.status === 302) return res.headers.get('Location');
    if (res.ok) return res.url;

    throw new Error(`Presign fehlgeschlagen (${res.status})`);
}

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

async function downloadFile(key) {
    try {
        const url = await getSignedFileUrl(key);
        window.open(url, '_blank');
    } catch {
        UIkit.notification({ message: 'Download fehlgeschlagen', status: 'danger' });
    }
}

function createMediaCard(item) {
    // Nur echte Dateien anzeigen
    if (!item || item.key.endsWith('/') || !isMediaFile(item.name)) {
        return document.createComment('Nicht-Medien-Datei oder Ordner wird nicht angezeigt');
    }

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
            console.error('Thumbnail-Fehler:', err);
            const img = div.querySelector(`#${imgId}`);
            img.src = 'icons/fallback-image.png';
        });

    return div;
}
