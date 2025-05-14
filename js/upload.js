// js/upload.js

window.handleUpload = async function (e) {
    e.preventDefault();

    const fileInput = document.querySelector('#uploadForm input[name="file"]');
    const files = fileInput.files;
    if (!files.length) {
        UIkit.notification({ message: 'Keine Datei gewählt', status: 'danger' });
        return;
    }

    const token = getToken();
    const folderPath = currentPath.length === 0 ? '' : currentPath.join('/');
    const safeFolderPath = folderPath.replace(/\/+$/, '');

    for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        form.append('folder', safeFolderPath);

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
