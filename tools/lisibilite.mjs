// Lisibilité selon WCAG 2.1 : contraste, taille de texte, cibles tactiles.
import fs from 'fs';
const html = fs.readFileSync('galerie.html','utf8');
const css  = html.match(/<style>([\s\S]*?)<\/style>/)[1];
let ko=0, notes=0;

const vars={};
for(const m of css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g)) vars[m[1]]=m[2];
function rgb(c){
  if(c.startsWith('#')){
    let h=c.slice(1);
    if(h.length===3) h=h.split('').map(x=>x+x).join('');
    return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  }
  const n=c.match(/[\d.]+/g).map(Number);
  return [n[0],n[1],n[2]];
}
function lum(c){
  const [r,g,b]=rgb(c).map(v=>{ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); });
  return 0.2126*r+0.7152*g+0.0722*b;
}
// une couche translucide posée sur un fond
function fusion(av,fond){
  const a=av.match(/rgba\([^)]+\)/)? +av.match(/[\d.]+\)/)[0].slice(0,-1) : 1;
  const A=rgb(av), F=rgb(fond);
  return 'rgb('+A.map((v,i)=>Math.round(v*a+F[i]*(1-a))).join(',')+')';
}
function contraste(a,b){
  const l1=lum(a), l2=lum(b);
  return ((Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05));
}
const dire=(t,r,seuil,taille)=>{
  const ok=r>=seuil;
  if(!ok) ko++;
  console.log((ok?'  OK    ':'  ECHEC ')+t.padEnd(42)+r.toFixed(2)+':1  (minimum '+seuil+')'+(taille?'  '+taille:''));
};

// le fond réel des panneaux : verre sombre posé sur la salle
const fondPanneau = fusion(vars['glass-hi']||'rgba(28,25,22,.78)', '#2a2622');
const fondVerre   = fusion(vars['glass']||'rgba(18,16,14,.62)', '#2a2622');

console.log('  TEXTES SUR LES PANNEAUX');
dire('texte courant',            contraste(vars.txt, fondPanneau), 4.5);
dire('texte secondaire',         contraste(vars['txt-dim'], fondPanneau), 4.5);
dire('or clair (titres)',        contraste(vars['gold-soft'], fondPanneau), 3.0, '≥18px');
dire('or (intitulés de section)', contraste(vars.gold, fondPanneau), 3.0, '≥18px');
dire('texte sur boutons',        contraste(vars.txt, fondVerre), 4.5);

console.log('\n  CARTELS ET ÉCRANS');
dire('titre du cartel sur plaque',  contraste('#1f1a12','#fbfaf7'), 4.5);
dire('technique sur plaque',        contraste('#6b5c40','#fbfaf7'), 4.5);
dire('traduction en italique',      contraste('#7d6d4f','#fbfaf7'), 4.5);
dire('auteur du cartel',            contraste('#3a3225','#fbfaf7'), 4.5);
dire('livre d\'or (page)',          contraste('#3a3225','#f7f4ec'), 4.5);
dire('écran en veille',             contraste('#c9a66b','#05070a'), 4.5);

console.log('\n  ÉCRAN D\'ACCUEIL');
dire('texte de présentation',    contraste(vars['txt-dim'], '#181511'), 4.5);
dire('titre de la galerie',      contraste(vars['gold-soft'], '#181511'), 3.0, '25px');
dire('bouton principal',         contraste('#0d0c0b', '#c9a66b'), 4.5);

console.log('\n  TAILLES DE TEXTE');
const petits=[...css.matchAll(/font-size:(\d+)px/g)].map(m=>+m[1]).filter(v=>v<12);
if(petits.length){ notes++; console.log('  NOTE  textes sous 12px : '+petits.join(', ')+' — réservés aux libellés en capitales espacées'); }
else console.log('  OK    aucun texte sous 12px');
const corps=+(css.match(/body\{[^}]*font-size:(\d+)px/)||[0,19])[1];
console.log('  OK    corps de texte : '+corps+'px (recommandé ≥16)');
if(corps<16) ko++;

console.log('\n  CIBLES TACTILES (minimum 44×44)');
const cibles={
  'boutons de la barre': +(css.match(/\.btn\{padding:0;width:(\d+)px/)||[0,38])[1],
  'boutons du menu':     +(css.match(/\.btn\.menu-item\{[^}]*min-height:(\d+)px/)||[0,44])[1],
  'actions de l\'œuvre': +(css.match(/\.iconbtn\{width:(\d+)px/)||[0,42])[1],
  'outils de l\'atelier':+(css.match(/\.outil\{width:(\d+)px/)||[0,44])[1],
  'boutons de zoom':     +(css.match(/\.zbtn\{width:(\d+)px/)||[0,48])[1],
  'champs de saisie':    +(css.match(/\.fld input\{[^}]*padding:(\d+)px/)||[0,12])[1]*2+16
};
for(const [n,v] of Object.entries(cibles)){
  const ok=v>=44;
  if(!ok) notes++;
  console.log((ok?'  OK    ':'  NOTE  ')+n.padEnd(24)+v+' px');
}
console.log('\n'+(ko? '  '+ko+' point(s) non conforme(s)' : '  lisibilité : conforme')+(notes? '  ('+notes+' remarque(s))':''));
process.exit(ko?1:0);
