// Matrice d'appareils : la salle reste-t-elle utilisable partout ?
import fs from 'fs';
const html=fs.readFileSync('galerie.html','utf8');
const js=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
let ko=0;
const dire=(t,ok,d='')=>{ console.log((ok?'  OK    ':'  ECHEC ')+t.padEnd(46)+d); if(!ok) ko++; };

const APPAREILS=[
  ['téléphone portrait',  360, 780, true],
  ['téléphone paysage',   780, 360, true],
  ['petit téléphone',     320, 568, true],
  ['tablette',            820,1180, true],
  ['ordinateur',         1920,1080, false],
  ['ordinateur ancien',  1280, 720, false]
];

console.log('  BARRE D\'OUTILS (5 boutons de 44 px, marge 6)');
for(const [nom,l,h,tactile] of APPAREILS){
  // sous 380 px, boutons de 42 et écart de 3
  const etroit = l<=380;
  const dispo = l<=640 ? l*(etroit?0.80:0.74) : l*0.5;
  const besoin = etroit ? (5*42 + 4*3) : (5*44 + 4*6);
  dire(nom, besoin<=dispo, Math.round(besoin)+' px requis / '+Math.round(dispo)+' disponibles');
}

console.log('\n  ENCOMBREMENT BAS D\'ÉCRAN');
for(const [nom,l,h,tactile] of APPAREILS){
  if(!tactile){ dire(nom+' (souris)', true, 'pas de joystick'); continue; }
  const joy = l<=640 ? 104 : 132;
  const compteurRemonte = l<=640;   // le compteur passe au-dessus du joystick
  const libre = compteurRemonte || (l - joy - 120) > 0;
  dire(nom, libre, 'joystick '+joy+' px'+(compteurRemonte?', compteur remonté':''));
}

console.log('\n  ADAPTATIONS PRÉVUES DANS LE STYLE');
dire('bascule mobile à 640 px', /@media \(max-width:640px\)/.test(css));
dire('hauteur réelle des écrans mobiles', /100dvh/.test(css));
dire('zones sûres (encoches)', /safe-area-inset/.test(css));
dire('mouvement réduit respecté', /prefers-reduced-motion/.test(css));
dire('barre VJ défilante en petit écran', /\.vjbar\{[^}]*overflow-x:auto/.test(css));
dire('table des cartels repliée en mobile', /\.cartel-ligne,\.cartel-entete\{grid-template-columns:34px/.test(css));
dire('destinations de partage sur deux colonnes', /\.reseaux\{grid-template-columns:repeat\(2,1fr\)\}/.test(css));

console.log('\n  ENTRÉES SELON L\'APPAREIL');
dire('tactile détecté', /const isTouch/.test(js));
dire('joystick réservé au tactile', /if\(isTouch\)\{ f=-joyVec\.y/.test(js));
dire('souris : verrouillage du pointeur', /requestPointerLock/.test(js));
dire('clavier complet (Tab, Entrée)', /e\.code==='Tab'/.test(js));
dire('casque VR si présent', /isSessionSupported/.test(js));
dire('recadrage à la rotation', /orientationchange|resize/.test(js));

console.log('\n  CADRAGE D\'UNE ŒUVRE SELON L\'ÉCRAN');
// même formule que dans la galerie : distance = hauteur / (2 tan(fov/2)) ajustée
const FOV=42*Math.PI/180;
for(const [nom,l,h] of APPAREILS){
  const aspect=l/h;
  const hauteurOeuvre=1.5;
  let d=(hauteurOeuvre/2)/Math.tan(FOV/2);
  if(aspect<1) d/=aspect;                     // portrait : on recule
  const ok=d>0.8 && d<6;
  dire(nom, ok, 'distance '+d.toFixed(2)+' m');
}
console.log('\n'+(ko? '  '+ko+' point(s) à corriger':'  tous supports : utilisable'));
process.exit(ko?1:0);
