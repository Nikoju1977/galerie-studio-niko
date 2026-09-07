// Le filet de sécurité fonctionne-t-il dans les environnements dégradés ?
// On rejoue le script de secours dans un DOM simulé, sans WebGL, sans réseau.
import fs from 'fs';
import { JSDOM } from 'jsdom';
const html = fs.readFileSync('galerie.html','utf8');
const script = html.match(/<script>\n    \/\/ volontairement[\s\S]*?<\/script>/)[0].replace(/<\/?script>/g,'');
let ko=0;
const dire=(t,ok,d='')=>{ console.log((ok?'  OK    ':'  ECHEC ')+t.padEnd(48)+d); if(!ok) ko++; };

function scenario(nom, contexteWebGL, {erreur=null, attendre=false}={}){
  const dom=new JSDOM(html.replace(/<script type="module">[\s\S]*?<\/script>/,''),{runScripts:'outside-only'});
  const w=dom.window;
  w.HTMLCanvasElement.prototype.getContext=function(t){ return contexteWebGL? {} : null; };
  w.eval(script);
  if(erreur){
    const ev=new w.ErrorEvent('error',{message:erreur});
    w.dispatchEvent(ev);
  }
  const boite=w.document.getElementById('secours');
  const visible=boite && boite.style.display==='block';
  const raison=w.document.getElementById('secoursRaison').textContent;
  return {visible, raison};
}

console.log('  ENVIRONNEMENTS DÉGRADÉS');
let r=scenario('sans WebGL', false);
dire('machine sans rendu 3D : message affiché', r.visible, r.raison.slice(0,52));
r=scenario('normal', true);
dire('machine normale : aucun message intempestif', !r.visible);
r=scenario('réseau bloqué', true, {erreur:'Failed to fetch dynamically imported module'});
dire('ressources bloquées : message affiché', r.visible, r.raison.slice(0,46));
r=scenario('erreur quelconque', true, {erreur:'TypeError: x is not a function'});
dire('erreur sans rapport : pas de message', !r.visible);

console.log('\n  PROTECTIONS DANS LE CODE');
const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
dire('moteur de rendu : deuxième tentative allégée', /powerPreference:'low-power'/.test(js));
dire('échec final expliqué', /window\.__secours && window\.__secours\('Le rendu 3D est indisponible/.test(js));
dire('démarrage réussi signalé', /window\.__galerieDemarree=true/.test(js));
dire('délai de 20 s avant de conclure', /\}, 20000\)/.test(html));
dire('script de secours indépendant des modules', /volontairement en script classique/.test(html));
dire('mouvement réduit respecté', /prefers-reduced-motion/.test(html));

console.log('\n'+(ko? '  '+ko+' point(s) à corriger':'  environnements dégradés : jamais d\'écran noir'));
process.exit(ko?1:0);
