// js/helpers.js

const API_BASE = 'https://cloud-backend-stxe.onrender.com';

function getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function handleLogout() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = 'index.html';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}
