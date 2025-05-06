function uploadFile(file) {
    const metadata = {
        name: file.name,
        mimeType: file.type
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
        body: form
    }).then(res => res.json()).then(file => {
        console.log("Datei hochgeladen:", file);
        listFiles();
    });
}

function listFiles() {
    gapi.client.drive.files.list({
        pageSize: 20,
        fields: "files(id, name, mimeType)"
    }).then(function(response) {
        const files = response.result.files;
        const fileList = document.getElementById('file-list');
        fileList.innerHTML = "";

        files.forEach(file => {
            const el = document.createElement('div');
            el.innerHTML = `
              <div class="uk-card uk-card-default uk-card-body">
                ${file.name}
                <button class="uk-button uk-button-danger uk-button-small" onclick="deleteFile('${file.id}')">Löschen</button>
              </div>`;
            fileList.appendChild(el);
        });
    });
}

function deleteFile(fileId) {
    gapi.client.drive.files.delete({
        fileId: fileId
    }).then(() => {
        console.log("Datei gelöscht:", fileId);
        listFiles();
    });
}