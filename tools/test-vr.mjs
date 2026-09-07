// Mode VR : les règles propres au casque sont-elles respectées ?
import fs from 'fs';
const html=fs.readFileSync('galerie.html','utf8');
const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
let ko=0;
const dire=(t,ok,d='')=>{ console.log((ok?'  OK    ':'  ECHEC ')+t.padEnd(50)+d); if(!ok) ko++; };

console.log('  RÈGLES IMPOSÉES PAR LE CASQUE');
dire('boucle pilotée par le moteur', /renderer\.setAnimationLoop\(loop\)/.test(js) &&
     !/function loop\(\)\{\s*requestAnimationFrame\(loop\)/.test(js),
     'setAnimationLoop, pas requestAnimationFrame');
dire('rendu direct en stéréo (pas d\'effets d\'écran)', /if\(renderer\.xr\.isPresenting\)\{ renderer\.render/.test(js));
dire('couche XR activée', /renderer\.xr\.enabled=true/.test(js));
dire('caméra portée par un groupe déplaçable', /VR\.groupe\.add\(camera\)/.test(js));
dire('la tête n\'est jamais déplacée de force', !/VR\.actif[\s\S]{0,200}camera\.position\.x=/.test(js));

console.log('\n  MANETTES ET DÉPLACEMENT');
dire('deux manettes avec rayon visible', /getController\(i\)/.test(js) && /VR\.rayons\.push/.test(js));
dire('gâchette : ouvrir une œuvre ou se téléporter', /selectstart/.test(js) && /function vrSelection/.test(js));
dire('déplacement au pouce', /src\.gamepad\.axes/.test(js));
dire('zone morte du pouce', /Math\.abs\(x\)<0\.15/.test(js));
dire('collisions respectées en VR', /collide\(np\);\s*VR\.groupe\.position/.test(js));

console.log('\n  ENTRÉE ET SORTIE');
dire('bouton masqué sans casque', /isSessionSupported/.test(js) && /btnVR'\)\.classList\.toggle\('hidden'/.test(js));
dire('interface d\'écran masquée en VR', /body\.en-vr \.hud/.test(html));
dire('atelier fermé à l\'entrée', /if\(ATELIER\.actif\) ouvrirAtelier\(false\)/.test(js));
dire('position rendue à la sortie', /camera\.position\.set\(0,1\.65,0\); VR\.groupe\.position\.set\(0,0,0\)/.test(js));
dire('échec expliqué', /Casque indisponible/.test(js));

console.log('\n'+(ko? '  '+ko+' point(s) à corriger':'  mode VR : conforme aux règles WebXR'));
process.exit(ko?1:0);
