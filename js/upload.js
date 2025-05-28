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
    if (activeView === 'fotos') targetPath = '';
    if (activeView === 'dateien') targetPath = 'files';

    // Fortschrittsanzeige vorbereiten
    const progressBar = document.getElementById('uploadProgressBar');
    progressBar.max = files.length;
    progressBar.value = 0;
    progressBar.parentElement.style.display = 'block';

    let completed = 0;

    // Upload jeder Datei parallel, mit Fortschritt
    await Promise.all([...files].map(file => {
        return new Promise((resolve, reject) => {
            // Validierung
            if (activeView === 'fotos' && !allowedImages.test(file.name)) {
                UIkit.notification({ message: 'Nur Bilder erlaubt', status: 'warning' });
                return resolve();
            }

            if (activeView === 'dateien' && !allowedDocs.test(file.name)) {
                UIkit.notification({ message: 'Nur Dokumente erlaubt', status: 'warning' });
                return resolve();
            }

            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', targetPath);

            xhr.open('POST', `${API_BASE}/upload`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    console.log(`Uploading ${file.name}: ${Math.round(event.loaded / event.total * 100)}%`);
                }
            };

            xhr.onload = () => {
                completed++;
                progressBar.value = completed;
                if (xhr.status === 200) {
                    resolve();
                } else {
                    UIkit.notification({ message: `Fehler bei ${file.name}`, status: 'danger' });
                    resolve(); // nicht reject, damit Promise.all nicht abbricht
                }
            };

            xhr.onerror = () => {
                UIkit.notification({ message: `Netzwerkfehler bei ${file.name}`, status: 'danger' });
                resolve();
            };

            xhr.send(formData);
        });
    }));

// Upload abgeschlossen & Ansicht korrekt aktualisieren
    UIkit.notification({ message: 'Upload abgeschlossen', status: 'success' });
    UIkit.modal('#uploadModal').hide();
    fileInput.value = '';
    progressBar.parentElement.style.display = 'none';

// View merken
    sessionStorage.setItem('lastView', activeView);
    sessionStorage.setItem('lastPath', JSON.stringify(currentPath));

// Inhalte neu laden & im aktuellen Kontext bleiben
    await init();
    switchViewTo(activeView);
};