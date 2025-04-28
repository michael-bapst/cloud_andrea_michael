// Dropzone: Automatische Entdeckung deaktivieren
Dropzone.autoDiscover = false;

// Manuelle Initialisierung von Dropzone
const myDropzone = new Dropzone("#file-dropzone", {
    url: "/dummy-url",  // Dummy-URL für lokale Tests
    autoProcessQueue: false
});

console.log("Dropzone erfolgreich initialisiert.");

// Google Identity Services: Anmelderückruf
function handleCredentialResponse(response) {
    console.log("Google Token erhalten:", response.credential);

    // Entschlüsseln des JWT-Tokens (optional, falls du Benutzerinfos brauchst)
    const jwtToken = parseJwt(response.credential);
    console.log("Benutzerinformationen:", jwtToken);

    // Zeige den Upload-Bereich nach erfolgreicher Anmeldung
    document.getElementById('upload-section').hidden = false;
}

// JWT-Token entschlüsseln (optional)
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// Event-Handler für den Datei-Upload
document.getElementById('upload-btn').addEventListener('click', function () {
    console.log("Datei-Upload gestartet...");

    // Verarbeite die Warteschlange
    myDropzone.processQueue();
});

// Dropzone Ereignis: Erfolgreicher Upload
myDropzone.on("complete", function (file) {
    console.log("Upload abgeschlossen:", file.name);

    // Füge die Datei zur Liste hinzu
    addFileToList(file.name);
});

// Funktion zum Hinzufügen hochgeladener Dateien zur Anzeige
function addFileToList(fileName) {
    const fileList = document.getElementById('file-list');
    const fileItem = document.createElement('div');
    fileItem.innerHTML = `<div class="uk-card uk-card-default uk-card-body">${fileName}</div>`;
    fileList.appendChild(fileItem);
}
