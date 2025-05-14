// js/media.js

// 🔓 Globale Funktion für main.js usw.
window.isMediaFile = function(name) {
    return /\.(jpe?g|png|gif|bmp|webp|mp4|webm)$/i.test(name);
};

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
    if (!item || !item.name || item.key.endsWith('/') || !isMediaFile(item.name)) {
        return document.createComment('Nicht-Medien-Datei oder Ordner wird nicht angezeigt');
    }

    const div = document.createElement('div');
    div.className = 'uk-flex uk-flex-column uk-margin-small';

    const imgId = `img-${Math.random().toString(36).slice(2)}`;

    div.innerHTML = `
        <div class="uk-inline">
            <img id="${imgId}" alt="${item.name}" style="max-width: 100%; border-radius: 8px; object-fit: contain; background: #fff;" />
            <div class="uk-position-top-right uk-overlay uk-overlay-default uk-padding-small">
                <button class="uk-icon-button" uk-icon="download" onclick="downloadFile('${item.key}')"></button>
                <button class="uk-icon-button" uk-icon="trash" onclick="deleteFile('${item.key}', event)"></button>
            </div>
        </div>
        <div class="uk-text-small uk-text-truncate uk-margin-small-top" title="${item.name}">
            ${item.name}
        </div>
        <div class="uk-text-meta">${item.size} • ${item.date}</div>
    `;

    getSignedFileUrl(item.key)
        .then(url => {
            const img = div.querySelector(`#${imgId}`);
            const link = div.querySelector(`#${imgId}`).closest('img');
            img.src = url;
        })
        .catch(err => {
            console.warn('❌ Vorschaubild konnte nicht geladen werden:', err.message);
        });

    return div;
}

