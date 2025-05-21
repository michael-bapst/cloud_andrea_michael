const allowedImages = /\.(jpe?g|png|gif|bmp|webp)$/i;
const allowedDocs = /\.(pdf|zip|docx?|xlsx?|txt|json)$/i;

window.handleUpload = async function (e) {
    e.preventDefault();

    const fileInput = document.querySelector('#uploadForm input[name="file"]');
    const files = fileInput.files;
    if (!files.length) {
        UIkit.notification({ message: 'Keine Datei gewählt', status: 'danger' });
        return;
    }

    const token = getToken();
    let targetPath = currentPath.length === 0 ? '' : currentPath.join('/');
    if (activeView === 'fotos') targetPath = ''; // Nur Fotos im Root
    if (activeView === 'dateien') targetPath = 'files';

    for (const file of files) {
        if (activeView === 'fotos' && !allowedImages.test(file.name)) {
            UIkit.notification({ message: 'Nur Bilder im Bereich „Fotos“ erlaubt', status: 'warning' });
            continue;
        }

        if (activeView === 'dateien' && !allowedDocs.test(file.name)) {
            UIkit.notification({ message: 'Nur Dokumente im Bereich „Dateien“ erlaubt', status: 'warning' });
            continue;
        }

        const form = new FormData();
        form.append('file', file);
        form.append('folder', targetPath);

        try {
            const res = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: form
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || 'Upload fehlgeschlagen');
            }
        } catch (err) {
            UIkit.notification({ message: err.message || 'Upload-Fehler', status: 'danger' });
        }
    }

    UIkit.notification({ message: 'Upload abgeschlossen', status: 'success' });
    UIkit.modal('#uploadModal').hide();
    fileInput.value = '';
    renderContent();
};
