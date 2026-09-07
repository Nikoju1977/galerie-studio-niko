# Guide d'exécution sous Linux

## Installation et lancement rapide

### Prérequis
- Python 3.x ou Node.js (optionnel)
- Un navigateur moderne (Firefox, Chromium, Chrome)

### Méthode 1 : Serveur Python (le plus simple)

```bash
# Naviguer dans le dossier du projet
cd galerie-studio-niko

# Lancer le serveur (port 8000)
python3 -m http.server 8000

# Ouvrir le navigateur
firefox http://localhost:8000
# ou
chromium http://localhost:8000
```

### Méthode 2 : Node.js http-server

```bash
# Installation globale (une seule fois)
npm install -g http-server

# Lancer depuis le répertoire du projet
cd galerie-studio-niko
http-server
```

### Méthode 3 : Docker (isolation complète)

```dockerfile
# Créer un fichier Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
CMD ["python3", "-m", "http.server", "8000"]
```

```bash
# Construire l'image
docker build -t galerie-niko .

# Lancer le conteneur
docker run -p 8000:8000 galerie-niko
```

## Troubleshooting Linux

### WebGL ne fonctionne pas
- Activez l'accélération graphique (menu du navigateur)
- Sur WSL2 : `export DISPLAY=:0`
- Vérifiez votre GPU : `glxinfo | grep "direct rendering"`

### Port 8000 déjà utilisé
```bash
# Utiliser un autre port
python3 -m http.server 9000
```

### Permissions de fichiers
```bash
# Assurer les droits de lecture
chmod -R 755 galerie-studio-niko
```

### Ressources externes bloquées
- Vérifiez votre connexion Internet
- Les polices Google Fonts doivent être accessibles
- En mode offline, téléchargez les polices localement (voir ci-dessous)

## Mode offline complet

### Télécharger les polices Google Fonts

```bash
# Créer un dossier fonts
mkdir fonts

# Télécharger Cinzel et Cormorant Garamond
# Via : https://fonts.google.com/
# Placer les fichiers dans /fonts

# Modifier le CSS dans index.html
# Remplacer :
# <link href="https://fonts.googleapis.com/css2?family=Cinzel...">

# Par :
# <style>
#   @font-face {
#     font-family: 'Cinzel';
#     src: url('fonts/Cinzel-Regular.ttf') format('truetype');
#   }
# </style>
```

## Scripts de démarrage pratiques

### Script bash (save as `run.sh`)

```bash
#!/bin/bash
PORT=${1:-8000}
echo "Démarrage de la galerie sur http://localhost:$PORT"
python3 -m http.server $PORT
```

```bash
chmod +x run.sh
./run.sh 8000
```

### Script pour Linux Desktop

Créer `galerie.desktop` :

```ini
[Desktop Entry]
Type=Application
Name=Studio Niko Galerie
Icon=applications-graphics
Exec=bash -c 'cd /path/to/galerie-studio-niko && python3 -m http.server 8000 && firefox http://localhost:8000'
Terminal=true
```

## Notes de performance

- **Linux desktop** : performance identique à macOS/Windows
- **WSL1** : peut être lent, préférez WSL2
- **Raspberry Pi** : utilisez Chromium léger
- **Pas de GPU** : utilisez le rendu logiciel du navigateur

## Commandes utiles

```bash
# Vérifier WebGL disponible
glxgears

# Tester connectivité Internet
ping fonts.googleapis.com

# Vérifier ports actifs
sudo lsof -i :8000

# Tuer un processus sur un port
lsof -ti:8000 | xargs kill -9
```

Bon développement ! 🎨
