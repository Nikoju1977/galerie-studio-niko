#!/usr/bin/env bash
# Chaîne de construction : test d'exécution obligatoire avant publication.
set -e
# On se place à la racine du dépôt, quel que soit l'endroit d'où l'on appelle.
RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RACINE"
# La source vit dans src/, les outils dans tools/ : on travaille dans un
# dossier temporaire pour ne pas polluer le dépôt.
if [ -f src/galerie.html ]; then
  cp src/galerie.html galerie.html
  cp tools/*.mjs tools/*.js . 2>/dev/null || true
fi
node -e 'const fs=require("fs");let js=fs.readFileSync("galerie.html","utf8").match(/<script type="module">([\s\S]*?)<\/script>/)[1];fs.writeFileSync("cdnsrc.js",js);fs.writeFileSync("src.js",js.replace(/three\/addons\//g,"three/examples/jsm/"));'
ALIAS="--alias:three=./three-stub.js --alias:three/examples/jsm/controls/OrbitControls.js=./addons-stub.js --alias:three/examples/jsm/environments/RoomEnvironment.js=./addons-stub.js --alias:three/examples/jsm/objects/Reflector.js=./addons-stub.js --alias:three/examples/jsm/postprocessing/EffectComposer.js=./addons-stub.js --alias:three/examples/jsm/postprocessing/RenderPass.js=./addons-stub.js --alias:three/examples/jsm/postprocessing/UnrealBloomPass.js=./addons-stub.js --alias:three/examples/jsm/postprocessing/OutputPass.js=./addons-stub.js --alias:three/examples/jsm/loaders/GLTFLoader.js=./addons-stub.js --alias:three/examples/jsm/loaders/FBXLoader.js=./addons-stub.js --alias:three/examples/jsm/loaders/OBJLoader.js=./addons-stub.js --alias:three/examples/jsm/loaders/ColladaLoader.js=./addons-stub.js --alias:three/examples/jsm/loaders/STLLoader.js=./addons-stub.js --alias:three/examples/jsm/loaders/MTLLoader.js=./addons-stub.js"
node_modules/.bin/esbuild src.js --bundle --format=esm --target=es2020 $ALIAS --outfile=smoke-bundle.js >/dev/null
node smoketest.mjs || { echo "!! test d'exécution ECHOUE — publication annulée"; exit 1; }
node verify.mjs || { echo "!! vérifications ECHOUENT — publication annulée"; exit 1; }
node ordre.js || { echo "!! usage avant déclaration — publication annulée"; exit 1; }
node structure.mjs || { echo "!! structure du document ECHOUE — publication annulée"; exit 1; }
node lisibilite.mjs || { echo "!! lisibilité non conforme — publication annulée"; exit 1; }
node test-supports.mjs || { echo "!! un support n'est pas utilisable — publication annulée"; exit 1; }
node debordement.mjs || { echo "!! un texte déborde — publication annulée"; exit 1; }
node audit.mjs || { echo "!! audit statique ECHOUE — publication annulée"; exit 1; }
node profond.mjs || { echo "!! analyse approfondie ECHOUE — publication annulée"; exit 1; }
node test-injection.mjs || { echo "!! filtre des messages ECHOUE — publication annulée"; exit 1; }
node revue.mjs || { echo "!! revue de code ECHOUE — publication annulée"; exit 1; }
node test-mistral.mjs || { echo "!! reprise Mistral ECHOUE — publication annulée"; exit 1; }
node modes.mjs || { echo "!! cohérence des modes ECHOUE — publication annulée"; exit 1; }
node test-deplacements.mjs || { echo "!! déplacements ECHOUENT — publication annulée"; exit 1; }
node test-peinture.mjs || { echo "!! chaîne de peinture ECHOUE — publication annulée"; exit 1; }
node test-son.mjs || { echo "!! chaîne du son ECHOUE — publication annulée"; exit 1; }
node test-projecteurs.mjs || { echo "!! projecteurs ECHOUENT — publication annulée"; exit 1; }
node test-vr.mjs || { echo "!! mode VR ECHOUE — publication annulée"; exit 1; }
node test-compatibilite.mjs || { echo "!! compatibilité ECHOUE — publication annulée"; exit 1; }
node test-environnements.mjs || { echo "!! environnements dégradés ECHOUENT — publication annulée"; exit 1; }
node test-sauvegarde.mjs || { echo "!! sauvegarde ECHOUE — publication annulée"; exit 1; }
node test-curateur.mjs || { echo "!! curateur/plan/partage ECHOUENT — publication annulée"; exit 1; }
node test-modeles.mjs || { echo "!! regroupement des modèles ECHOUE — publication annulée"; exit 1; }
node test-fluidite.js | grep -q ECHEC && { echo "!! qualité adaptative ECHOUE"; exit 1; } || true
node_modules/.bin/esbuild cdnsrc.js --bundle --minify --format=esm --external:three "--external:three/*" --target=es2019 --outfile=app.min.js >/dev/null 2>&1
node -e 'const fs=require("fs");let h=fs.readFileSync("galerie.html","utf8");let a=fs.readFileSync("app.min.js","utf8").replace(/<\/script>/g,"<\\/script>");h=h.replace(/<script type="module">[\s\S]*?<\/script>/,()=>"<script type=\"module\">\n"+a+"\n</script>");fs.writeFileSync("index.html",h);'
node_modules/.bin/esbuild src.js --bundle --format=iife --minify --target=es2019 --outfile=bundle.js >/dev/null 2>&1
node -e 'const fs=require("fs");let h=fs.readFileSync("galerie.html","utf8");let b=fs.readFileSync("bundle.js","utf8").replace(/<\/script>/g,"<\\/script>");h=h.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/,()=>"");h=h.replace(/<script type="module">[\s\S]*?<\/script>/,()=>"<script>\n"+b+"\n</script>");fs.writeFileSync("galerie-autonome.html",h);console.log("index:",(fs.statSync("index.html").size/1024|0)+" Ko | autonome:",(h.length/1024|0)+" Ko");'
node --check bundle.js
cp index.html /mnt/user-data/outputs/index.html
cp galerie-autonome.html /mnt/user-data/outputs/galerie-studio-niko.html
echo "construction OK"
