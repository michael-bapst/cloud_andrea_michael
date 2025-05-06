let accessToken = null;

function initializeGapiClient() {
    gapi.client.init({
        apiKey: '', // optional, falls benötigt
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
    }).then(() => {
        console.log("GAPI Client initialisiert");
    });
}

// Startet Login via Google Identity Services (aufgerufen vom Formular)
function startGoogleLogin() {
    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: '374719974849-0l9upegksos3t68gi5sn8q5oee93v189.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => {
            accessToken = tokenResponse.access_token;
            sessionStorage.setItem('access_token', accessToken);
            document.getElementById('upload-section').hidden = false;

            const loginForm = document.getElementById('login-form');
            if (loginForm) loginForm.remove();

            listFiles();
        }
    });

    tokenClient.requestAccessToken();
}

// Wird beim Laden der Seite ausgeführt
window.onload = function () {
    accessToken = sessionStorage.getItem('access_token');

    if (accessToken) {
        console.log("Bereits eingeloggt.");
        document.getElementById('upload-section').hidden = false;

        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.remove();

        gapi.load('client', initializeGapiClient);
        listFiles();
    } else {
        gapi.load('client', initializeGapiClient);
    }

    // Logout-Button aktivieren
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('access_token');
            location.reload();
        });
    }
}
