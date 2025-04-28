### Containerisierte ToDo-App – Deployment Dokumentation

Diese Dokumentation beschreibt die Bereitstellung der ToDo-App als containerisierte Anwendung mit Docker. Die App besteht aus zwei Versionen:

---

### **Beschreibung**
Version 1 der ToDo-App ist das **Backend** der Anwendung, das mit Redis als Datenbank arbeitet.  
Es ermöglicht das Speichern, Abrufen und Verwalten von ToDo-Tasks über eine API.

### **PrintScreen der Version 1 mit Todo Task**
Hier ist der Screenshot der laufenden **Version 1** der ToDo-App mit dem Eintrag „Michael Bapst“:

![Screenshot Version 1](./PrintScreens/Screenshot2.png)

---

### **PrintScreen der Images in GitLab (gibb)**
Hier ist der Screenshot der Images, die erfolgreich in die GitLab-Container-Registry hochgeladen wurden:

![Screenshot Images GitLab Version 1](./PrintScreens/Screenshot6.png)

---

### **Image pushen – Befehle**
Um das Image in die GitLab-Container-Registry hochzuladen, wurden folgende Befehle verwendet:

`docker tag to-do-appv1-todoapp git-registry.gibb.ch/mba148355/modul347-dienst-mit-container-anwenden/tag-2-kw-6/todo-app:v1`
`docker tag to-do-appv1-redis-master git-registry.gibb.ch/mba148355/modul347-dienst-mit-container-anwenden/tag-2-kw-6/redis-master:v1`
`docker tag to-do-appv1-redis-slave git-registry.gibb.ch/mba148355/modul347-dienst-mit-container-anwenden/tag-2-kw-6/redis-slave:v1`

`docker push git-registry.gibb.ch/mba148355/modul347-dienst-mit-container-anwenden/tag-2-kw-6/todo-app:v1`
`docker push git-registry.gibb.ch/mba148355/modul347-dienst-mit-container-anwenden/tag-2-kw-6/redis-master:v1`
`docker push git-registry.gibb.ch/mba148355/modul347-dienst-mit-container-anwenden/tag-2-kw-6/redis-slave:v1`

---

### **PrintScreen der Version 2 mit Todo Task**
Hier ist der Screenshot der laufenden Version 2 der ToDo-App mit dem Eintrag „Michael Bapst“:

![Screenshot Version 2](./PrintScreens/Screenshot4.png)

---

### **PrintScreen der Images in GitLab**
Hier ist der Screenshot der erfolgreich in die GitLab-Container-Registry hochgeladenen Images für Version 2 (Frontend):

![Screenshot Images GitLab Version 2](./PrintScreens/Screenshot7.png)

---

### **Image pushen – Befehle**
Um das neue Frontend-Image in GitLab zu pushen, wurden folgende Befehle verwendet:

`docker tag to-do-appv2 git-registry.gibb.ch/mba148355/modul347-dienst-mit-container-anwenden/tag-2-kw-6/todo-app-v2:v1`

`cker push git-registry.gibb.ch/mba148355/modul347-dienst-mit-container-anwenden/tag-2-kw-6/todo-app-v2:v1`

### Zusammenfassung der wichtigsten Docker-Befehle
- `docker run <image>`: Startet einen neuen Container basierend auf einem Image.
- `docker build -t <name> <pfad>`: Erstellt ein neues Image aus einer Dockerfile.
- `docker ps`: Listet alle laufenden Container auf.
- `docker stop <container-id>`: Stoppt einen laufenden Container.
- `docker rm <container-id>`: Entfernt einen gestoppten Container.
- `docker images`: Zeigt eine Liste aller verfügbaren Images auf dem System.
- `docker exec -it <container> /bin/bash`: Öffnet eine interaktive Shell in einem laufenden Container.