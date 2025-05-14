// js/media.js

// 🔓 Unterstützte Dateitypen für Vorschau
window.isMediaFile = function (name) {
    return /\.(jpe?g|png|gif|bmp|webp|mp4|webm)$/i.test(name);
};

// 📦 Presigned URL abrufen für Bildanzeige oder Download
async function getSignedFileUrl(key) {
    const token = getToken();

    // Sicherstellen, dass Key URL-kompatibel ist, aber Pfadtrennung bleibt erhalten
    const safeKey = encodeURIComponent(key).replace(/%2F/g, '/');
    const url = `${API_BASE}/file/${safeKey}`;

    console.log('[Presign] Request für:', key);
    console.log('[Presign] API-Aufruf:', url);

    const res = await fetch(url, {
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

    const container = document.createElement('div');
    container.className = 'media-cloud-item';
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    const imgId = `img-${Math.random().toString(36).slice(2)}`;
    const anchorId = `a-${Math.random().toString(36).slice(2)}`;

    container.innerHTML = `
        <a id="${anchorId}" href="#" data-caption="${item.name}" uk-lightbox>
            <img id="${imgId}" alt="${item.name}" style="
                width: 100%;
                max-height: 220px;
                object-fit: cover;
                border-radius: 6px;
                background-color: #f4f4f4;
                display: block;
            " />
        </a>
        <div class="media-actions" style="
            position: absolute;
            top: 8px;
            right: 8px;
            display: flex;
            gap: 8px;
            opacity: 0;
            transition: opacity 0.2s;
        ">
            <button class="uk-icon-button" uk-icon="download" title="Download" onclick="downloadFile('${item.key}')"></button>
            <button class="uk-icon-button" uk-icon="trash" title="Löschen" onclick="deleteFile('${item.key}', event)"></button>
        </div>
        <div style="margin-top: 6px;">
            <div class="uk-text-small uk-text-truncate" title="${item.name}">${item.name}</div>
            <div class="uk-text-meta">${item.size} • ${item.date}</div>
        </div>
    `;

    // Hover-Effekt
    container.addEventListener('mouseenter', () => {
        container.querySelector('.media-actions').style.opacity = 1;
    });
    container.addEventListener('mouseleave', () => {
        container.querySelector('.media-actions').style.opacity = 0;
    });

    // 🖼 Presigned Image laden
    getSignedFileUrl(item.key)
        .then(url => {
            const img = container.querySelector(`#${imgId}`);
            const anchor = container.querySelector(`#${anchorId}`);
            img.src = url;
            anchor.href = url;
        })
        .catch(err => {
            console.warn('❌ Vorschaubild konnte nicht geladen werden:', err.message);
        });

    return container;
}
