#!/usr/bin/env bash
# Chaîne de construction : test d'exécution obligatoire avant publication.
set -e
cd /home/claude
node -e 'const fs=require("fs");let js=fs.readFileSync("galerie.html","utf8").match(/<script type="module">([\s\S]*?)<\/script>/)[1];fs.writeFileSync("cdnsrc.js",js);fs.writeFileSync("src.js",js.replace(/three\/addons\//g,"three/examples/jsm/"));'
ALIAS="--alias:three=./three-stub.js --alias:three/examples/jsm/controls/OrbitControls.js=./addons-stub.js --alias:three/examples/jsm/environments/RoomEnvironment.js=./addons-stub.js --alias:three/examples/jsm/objects/Reflector.js=./addons-stub.js --alias:three/examples/jsm/postprocessing/EffectComposer.js=./addons-stub.js --alias:three/examples/jsm/postprocessing/RenderPass.js=./addons-stub.js --alias:three/examples/jsm/postprocessing/UnrealBloomPass.js=./addons-stub.js --alias:three/examples/jsm/postprocessing/OutputPass.js=./addons-stub.js --alias:three/examples/jsm/loaders/GLTFLoader.js=./addons-stub.js --alias:three/examples/jsm/loaders/FBXLoader.js=./addons-stub.js --alias:three/examples/jsm/loaders/OBJLoader.js=./addons-stub.js --alias:three/examples/jsm/loaders/ColladaLoader.js=./addons-stub.js --alias:three/examples/jsm/loaders/STLLoader.js=./addons-stub.js"
node_modules/.bin/esbuild src.js --bundle --format=esm --target=es2020 $ALIAS --outfile=smoke-bundle.js >/dev/null
node smoketest.mjs || { echo "!! test d'exécution ECHOUE — publication annulée"; exit 1; }
node verify.mjs || { echo "!! vérifications ECHOUENT — publication annulée"; exit 1; }
node ordre.js || { echo "!! usage avant déclaration — publication annulée"; exit 1; }
node audit.mjs || { echo "!! audit statique ECHOUE — publication annulée"; exit 1; }
node test-mistral.mjs || { echo "!! reprise Mistral ECHOUE — publication annulée"; exit 1; }
node_modules/.bin/esbuild cdnsrc.js --bundle --minify --format=esm --external:three "--external:three/*" --target=es2019 --outfile=app.min.js >/dev/null 2>&1
node -e 'const fs=require("fs");let h=fs.readFileSync("galerie.html","utf8");let a=fs.readFileSync("app.min.js","utf8").replace(/<\/script>/g,"<\\/script>");h=h.replace(/<script type="module">[\s\S]*?<\/script>/,()=>"<script type=\"module\">\n"+a+"\n</script>");fs.writeFileSync("index.html",h);'
node_modules/.bin/esbuild src.js --bundle --format=iife --minify --target=es2019 --outfile=bundle.js >/dev/null 2>&1
node -e 'const fs=require("fs");let h=fs.readFileSync("galerie.html","utf8");let b=fs.readFileSync("bundle.js","utf8").replace(/<\/script>/g,"<\\/script>");h=h.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/,()=>"");h=h.replace(/<script type="module">[\s\S]*?<\/script>/,()=>"<script>\n"+b+"\n</script>");fs.writeFileSync("galerie-autonome.html",h);console.log("index:",(fs.statSync("index.html").size/1024|0)+" Ko | autonome:",(h.length/1024|0)+" Ko");'
node --check bundle.js
cp index.html /mnt/user-data/outputs/index.html
cp galerie-autonome.html /mnt/user-data/outputs/galerie-studio-niko.html
echo "construction OK"
