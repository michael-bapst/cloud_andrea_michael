document.addEventListener("DOMContentLoaded", () => {
    const folderList = document.getElementById("folder-list");
    let currentEditFolder = null;

    // Echtes Drive-Verzeichnis anlegen
    function createDriveFolder(folderName) {
        gapi.client.drive.files.create({
            resource: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
            },
            fields: 'id, name'
        }).then(response => {
            const folderId = response.result.id;
            sessionStorage.setItem(`folder:${folderName}`, folderId);
            console.log("Ordner erstellt:", folderName, folderId);
            window.location.href = "folder.html?name=" + encodeURIComponent(folderName);
        });
    }

    document.getElementById("create-folder-btn").addEventListener("click", () => {
        const folderName = document.getElementById("folder-name").value.trim();
        if (folderName !== "") {
            createDriveFolder(folderName);
            UIkit.modal("#create-folder-modal").hide();
        }
    });

    document.getElementById("save-folder-btn").addEventListener("click", () => {
        if (currentEditFolder) {
            const newName = document.getElementById("edit-folder-name").value.trim();
            if (newName !== "") {
                currentEditFolder.querySelector("h4").innerText = newName;
                UIkit.modal("#edit-folder-modal").hide();
            }
        }
    });
});
