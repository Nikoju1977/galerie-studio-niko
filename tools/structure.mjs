// Structure du document : balises équilibrées et correctement imbriquées.
// Un div mal fermé ne provoque aucune erreur JavaScript — mais toute
// l'interface se décale. Rien ne surveillait ça jusqu'ici.
import fs from 'fs';
const html = fs.readFileSync('galerie.html','utf8');
const body = html.slice(html.indexOf('<body>'), html.indexOf('<script type="module">'));
const L = body.split('\n');
let ko = 0;
const dire=(t,ok,det='')=>{ console.log((ok?'  OK    ':'  ECHEC ')+t+(det?' — '+det:'')); if(!ok) ko++; };

// 1. équilibre et imbrication
const pile=[]; let trop=null;
L.forEach((l,i)=>{ for(const m of l.matchAll(/<div\b|<\/div>/g)){
  if(m[0].startsWith('</')){ if(!pile.length){ trop=trop||i+1; } else pile.pop(); }
  else pile.push(i+1);
}});
dire('divs correctement imbriqués', !trop && !pile.length,
     trop? 'fermeture en trop ligne '+trop : (pile.length? 'ouvertures non fermées : '+pile.join(', ') : ''));
const bo=(body.match(/<button\b/g)||[]).length, bf=(body.match(/<\/button>/g)||[]).length;
dire('boutons équilibrés', bo===bf, bo+' / '+bf);

// 2. les conteneurs attendus par le style existent bien dans le document
const attendus=['fDetail','fCartel','fDesc','menuOutils','vjPanel','atelier','focus','onboard'];
const absents=attendus.filter(id=>!new RegExp('id="'+id+'"').test(html));
dire('conteneurs attendus présents', !absents.length, absents.join(', '));

// 3. un panneau ne doit pas être enfermé dans un parent au plan inférieur :
//    un enfant ne peut jamais passer devant ce qui recouvre son parent
const plans={};
for(const m of html.matchAll(/\.([a-z-]+)\{[^}]*z-index:(\d+)/g)) plans[m[1]]=+m[2];
const hud=plans['hud']||0;
// on délimite le bandeau à sa VRAIE fermeture, pas au commentaire suivant
function contenu(depuis){
  let d=0, i=depuis;
  for(const m of body.slice(depuis).matchAll(/<div\b|<\/div>/g)){
    d += m[0].startsWith('</') ? -1 : 1;
    if(d===0) return body.slice(depuis, depuis+m.index+6);
  }
  return body.slice(depuis);
}
const dansHud = contenu(body.indexOf('<div class="hud hud-top"'));
const enfermes=Object.entries(plans)
  .filter(([c,z])=>z>hud && new RegExp('class="'+c).test(dansHud))
  .map(([c,z])=>c+' ('+z+' > '+hud+')');
dire('aucun panneau enfermé sous un plan inférieur', !enfermes.length, enfermes.join(', '));

// 4. encombrement du bas d'écran sur un téléphone
const joy=+(html.match(/\.joy\{[^}]*width:(\d+)px/)||[0,132])[1];
const joyMob=+((html.match(/\.joy\{width:(\d+)px;height:\d+px\}/)||[])[1] || (html.match(/@media[^{]*640px[\s\S]*?\.joy\{width:(\d+)px/)||[0,joy])[1]);
const compteurRemonte=/body\.touch \.hud-bottom\{justify-content:center;padding:0 16px calc\(env\(safe-area-inset-bottom\) \+ 132px\)\}/.test(html);
dire('compteur dégagé du joystick en mobile', compteurRemonte, 'joystick '+joyMob+' px');

console.log(ko? '\n  '+ko+' point(s) à corriger' : '\n  structure du document : rien à signaler');
process.exit(ko?1:0);
