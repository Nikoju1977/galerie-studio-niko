# Galerie — Studio Niko Design

Galerie d'art 3D dans le navigateur. Fichier HTML unique, sans backend.
Dépose tes tableaux, vidéos et créations sonores sur les cimaises et les socles.

## Deux versions

| Fichier | Usage |
|---|---|
| `index.html` | Version web (Three.js via CDN, 70 Ko) — c'est celle qui est servie en ligne |
| `galerie-autonome.html` | Tout embarqué (607 Ko) — fonctionne hors-ligne, même en `file://` |

## Ce que ça fait

- **Architecture 3D réaliste** : nef et cimaises, sol marbre à réflexions réelles, cadres dorés, spots muséaux par œuvre, éclairage image-based (PBR), tone mapping ACES, bloom.
- **Dépôt d'œuvres** : bouton *Déposer* ou glisser-déposer. Images et vidéos sur les murs, fichiers audio sur des socles sonores.
- **Persistance** : tout est enregistré en IndexedDB et rechargé au lancement suivant. Effacement à double appui.
- **Éclairage réglable** : 3 ambiances (Jour / Galerie / Vernissage) et 6 réglages fins (exposition, chaleur, spots, ambiante, éclat, puits de lumière).
- **Playlist & mixage** : lecture séquentielle, aléatoire, répétition, volume par piste et volume général, superposition. Sons spatialisés — le volume monte quand on approche — et orbes qui pulsent au rythme.
- **Navigation** : marche (ZQSD / joystick tactile), mode orbite, zoom (molette / pincer / boutons), clic sur une œuvre pour s'en approcher au plus près.
- **Identité** : nom de la galerie et texte de présentation éditables sur l'écran d'entrée.
- **Curateur IA (optionnel)** : avec une clé Mistral, Pixtral rédige titre et cartel de chaque œuvre, et un manifeste d'exposition. La clé est chiffrée (AES-256-GCM / PBKDF2) sur l'appareil. Sans clé, tout le reste fonctionne normalement.

## Déploiement

Site statique, aucune étape de build. Sur Vercel : importer le dépôt, laisser la détection automatique.

## Conventions

Studio Niko Design — HTML single-file, XHR uniquement (pas de `fetch`), `safeStorage` (IndexedDB + repli mémoire), polices Cinzel / Cormorant Garamond, mobile `100dvh` + safe-area, validation avant livraison (`node --check`, zéro ID dupliqué, bijection `getElementById`).
