function createMediaCard(item) {
    // Nur echte Mediendateien anzeigen
    if (!item || item.key.endsWith('/') || !isMediaFile(item.name)) {
        return document.createComment('Nicht-Medien-Datei oder Ordner wird nicht angezeigt');
    }

    const div = document.createElement('div');
    div.className = 'media-item';
    const imgId = `img-${Math.random().toString(36).slice(2)}`;

    div.innerHTML = `
    <div class="uk-card uk-card-default uk-card-hover uk-overflow-hidden uk-border-rounded">
      <div class="uk-card-media-top uk-flex uk-flex-center uk-flex-middle" style="height: 180px; background: #fff">
        <a href="" data-caption="${item.name}" data-type="image" uk-lightbox>
          <img id="${imgId}" src="icons/loader.svg" loading="lazy" alt="${item.name}" style="max-height: 100%; max-width: 100%; object-fit: contain;">
        </a>
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
            const link = img.closest('a');
            img.src = url;
            link.href = url;
        })
        .catch(err => {
            console.error('Thumbnail-Fehler:', err);
            const img = div.querySelector(`#${imgId}`);
            img.src = 'icons/fallback-image.png';
        });

    return div;
}