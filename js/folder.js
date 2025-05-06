document.addEventListener("DOMContentLoaded", () => {
    const folderName = new URLSearchParams(window.location.search).get("name");
    document.getElementById("folder-title").innerText = folderName;

    const folderId = sessionStorage.getItem(`folder:${folderName}`);
    if (!folderId) {
        alert("Ordner-ID nicht gefunden. Bitte über das Dashboard starten.");
        return;
    }

    Dropzone.autoDiscover = false;

    const myDropzone = new Dropzone("#file-dropzone", {
        autoProcessQueue: false
    });

    myDropzone.on("complete", function (file) {
        const metadata = {
            name: file.name,
            mimeType: file.type,
            parents: [folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);

        fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
            body: form
        }).then(res => res.json()).then(file => {
            const fileList = document.getElementById("file-list");
            const fileItem = document.createElement("div");
            fileItem.innerHTML = `<div class="uk-card uk-card-default uk-card-body">${file.name}</div>`;
            fileList.appendChild(fileItem);
        });
    });

    // Dateien im aktuellen Ordner laden
    gapi.client.drive.files.list({
        q: `'${folderId}' in parents`,
        pageSize: 50,
        fields: "files(id, name)"
    }).then(function(response) {
        const fileList = document.getElementById("file-list");
        fileList.innerHTML = "";
        response.result.files.forEach(file => {
            const el = document.createElement("div");
            el.innerHTML = `
              <div class="uk-card uk-card-default uk-card-body">
                ${file.name}
                <button class="uk-button uk-button-danger uk-button-small" onclick="deleteFile('${file.id}')">Löschen</button>
              </div>`;
            fileList.appendChild(el);
        });
    });
});
