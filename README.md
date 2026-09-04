# Galerie — Studio Niko Design

Galerie d'art en 3D dans le navigateur. Un seul fichier HTML, sans backend obligatoire.
Accroche tes tableaux, projette tes films, pose tes sculptures, fais résonner ta musique.

**En ligne :** https://galerie-studio-niko-nikoju1977s-projects.vercel.app
**Mode d'emploi :** https://galerie-studio-niko-nikoju1977s-projects.vercel.app/guide.html

---

## Les fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Version servie en ligne — Three.js via CDN, code minifié |
| `galerie-autonome.html` | Tout embarqué — fonctionne hors-ligne, même en `file://` |
| `guide.html` | Fiche explicative destinée aux artistes |
| `src/galerie.html` | **La source** — module ESM lisible, c'est ce fichier qu'on modifie |
| `tools/` | Chaîne de construction et de vérification |
| `supabase/schema.sql` | Schéma de la publication en ligne |

Les deux premiers sont **produits** par `tools/build.sh` à partir de la source. Ne les édite pas
directement : la prochaine construction les écrase.

## La salle

- **48 × 32 m**, plafond à 7,40 m, coupole à caissons culminant à 11,90 m avec oculus
- **100 emplacements** d'accrochage, ligne médiane à 1,55 m (norme muséale), projecteurs à 30° d'incidence
- **3 vidéoprojections** murales, recul calculé sur un rapport de projection de 1,5
- **8 socles** de sculpture (.glb), **10 socles** sonores spatialisés, un téléviseur, un pupitre de livre d'or
- Éclairage réglable : 3 ambiances et 6 curseurs

## Ce qu'on peut y faire

**Déposer** images, vidéos, sons et modèles 3D — au bouton ou par glisser-déposer. Les images sont
réduites à 2048 px, l'emplacement libre le plus proche est choisi automatiquement.

**Composer** : déplacer une œuvre d'un mur à l'autre, renseigner titre, année, technique, dimensions
et **prix**, régler la lumière, construire une playlist.

**Cartels** aux normes : auteur, titre en italique, année, technique, dimensions, notice.
Traduits dans 9 langues (vocabulaire des techniques intégré, titre et notice via Mistral).

**Livre d'or** : un pupitre à l'entrée. Local tant que la galerie n'est pas publiée, partagé ensuite.

**Publier en ligne** : ta galerie obtient une adresse `?g=ton-nom` qui montre **tes œuvres** à
quiconque l'ouvre. Nécessite un code d'invitation.

**Mode exposition** : masque tous les outils d'édition — la salle se visite sans pouvoir être modifiée.

**9 langues** : français, anglais, allemand, espagnol, italien, portugais, néerlandais, polonais, tchèque.
La langue de l'appareil est détectée au premier lancement.

## Construire

```bash
./tools/build.sh
```

La chaîne **refuse de produire** si une vérification échoue :

| Étape | Ce qu'elle attrape |
|---|---|
| `smoketest.mjs` | Le module s'exécute-t-il ? Ouverture d'une œuvre, cadrage, orientation caméra, routage des dépôts, placement des projecteurs, coupole, langues |
| `verify.mjs` | 130 contrôles : structure, normes muséales, mobilier sans chevauchement, publication, sauvegarde, sécurité |
| `ordre.js` | Variable utilisée avant sa déclaration — panne silencieuse, `const` devenant `var` au regroupement |
| `audit.mjs` | Fonctions dupliquées ou manquantes, classes CSS absentes, boutons sans action, traces de mise au point |
| `test-mistral.mjs` | Reprise sur limite de débit (429), délai imposé par le serveur, clé invalide |

Chacun de ces tests est né d'un vrai bug rencontré. Ils existent pour qu'il ne revienne pas.

## Publication en ligne

Base et stockage sur Supabase. Le schéma est dans `supabase/schema.sql`.

- La clé intégrée est **publishable** : conçue pour être visible dans une page web, elle ne permet
  que la lecture des galeries et le dépôt de médias.
- Toute écriture passe par des fonctions serveur qui valident un **code d'invitation** (publication)
  ou un **jeton d'édition** (mise à jour). L'écriture directe est bloquée.
- Un média n'est accepté que dans le dossier d'une galerie existante — sans quoi le stockage serait
  ouvert à tous.
- Les codes d'invitation sont invisibles depuis le web.
- Vidéos et modèles 3D ne sont pas publiés : ils resteraient trop lourds pour l'offre gratuite.

## Conventions

Studio Niko Design — HTML single-file, **XHR uniquement** (jamais `fetch`), `safeStorage`
(IndexedDB avec repli mémoire), clés chiffrées AES-256-GCM/PBKDF2, polices Cinzel et
Cormorant Garamond, mobile `100dvh` + safe-area, validation obligatoire avant livraison.
