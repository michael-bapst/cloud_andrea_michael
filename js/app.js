Dropzone.autoDiscover = false;

const myDropzone = new Dropzone("#file-dropzone", {
    autoProcessQueue: false
});

document.getElementById('upload-btn').addEventListener('click', function () {
    myDropzone.processQueue();
});

myDropzone.on("addedfile", function(file) {
    console.log("Datei hinzugefügt:", file.name);
});

myDropzone.on("complete", function(file) {
    uploadFile(file);
});
