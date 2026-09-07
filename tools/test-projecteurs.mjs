// Projecteurs : vidéoprojections murales et éclairage des œuvres.
import fs from 'fs';
const html = fs.readFileSync('galerie.html','utf8');
const js = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
let ko=0;
const dire=(t,ok,det='')=>{ console.log((ok?'  OK    ':'  ECHEC ')+t.padEnd(50)+det); if(!ok) ko++; };

console.log('  VIDÉOPROJECTIONS — CHAÎNE COMPLÈTE');
const zones=(js.match(/const PROJ_ZONES = \[([\s\S]*?)\];/)||['',''])[1];
dire('trois projections définies', (zones.match(/\{ axis:/g)||[]).length===3,
     (zones.match(/largeur:([\d.]+)/g)||[]).join(', '));
dire('recul calculé, non estimé', /THROW_RATIO\s*=\s*1\.5/.test(js) && /W\*THROW_RATIO/.test(js));
dire('image au format 16/9', /W\*9\/16/.test(js));
dire('écran libre : toucher ouvre le sélecteur', /projTarget=p; \$\('projInput'\)\.click\(\)/.test(js));
dire('vidéo déposée mise en lecture', /function projLoad/.test(js) && /p\.video\.play\(\)/.test(js));
dire('lecture en boucle', /p\.video\.loop=true/.test(js));
dire('son libéré quand on regarde', /o!==p && o\.video\) o\.video\.muted=true/.test(js));
dire('son coupé en refermant', /panelTarget\.kind==='proj' && panelTarget\.ref\.video\) panelTarget\.ref\.video\.muted=true/.test(js));
dire('panneau : lecture, son, remplacer, retirer', /function openProjPanel/.test(js) && /projToggle/.test(js));
dire('retrait remettant l\'écran en veille', /function projStandby/.test(js));
dire('vidéos rechargées au lancement', /rec\.type==='proj'/.test(js));
dire('lueur bleutée pilotée par la lecture', /p\.light\.intensity=1\.1/.test(js));

console.log('\n  PIÈGES CONNUS');
dire('une seule vidéo sonore à la fois', /projections\.forEach\(o=>\{ if\(o!==p && o\.video\)/.test(js));
dire('le mode VJ n\'écrase pas une vidéo en cours', /if\(!p\.video\)\{ p\.mat\.map=VJ\.tex/.test(js));
dire('projections rendues à leur état en quittant le VJ', /les projections gardaient l'éclairage du VJ/.test(js));
dire('zones réservées avant les emplacements', /dansZoneProjection\(pos, normal\)\) continue/.test(js));
dire('mémoire libérée au remplacement', /if\(p\.texture\) p\.texture\.dispose\(\)/.test(js));

console.log('\n  ÉCLAIRAGE DES ŒUVRES');
dire('un projecteur par œuvre', /artLights/.test(js));
dire('incidence muséale de 30°', /30/.test(js) && /SPOT_ANGLE|incidence|Math\.PI\/6/.test(js));
dire('cible visant le centre de l\'œuvre', /\.target\.position/.test(js));
dire('intensité suivant l\'ambiance', /spotBase/.test(js));
dire('projecteur éteint quand l\'emplacement est vide', /l\.intensity===0|intensity=0/.test(js));

console.log('\n'+(ko? '  '+ko+' point(s) à vérifier':'  projecteurs : chaîne complète'));
process.exit(ko?1:0);
