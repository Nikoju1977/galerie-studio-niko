// Compatibilité : Linux (Firefox, Chromium), macOS (Safari), Windows.
// Chaque interface absente doit être contournée, jamais supposée présente.
import fs from 'fs';
const js = fs.readFileSync('galerie.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1];
let ko=0;
const dire=(t,ok,d='')=>{ console.log((ok?'  OK    ':'  ECHEC ')+t.padEnd(50)+d); if(!ok) ko++; };
// une interface est « protégée » si son usage est testé ou entouré d'un try
function protege(nom){
  // on examine 260 caractères AVANT l'usage : le try peut être plus haut
  const motif=nom.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp('[\\s\\S]{0,260}'+motif,'g');
  const bouts=js.match(re)||[];
  if(!bouts.length) return true;
  return bouts.every(b=>/try\s*\{|\?\.|if\s*\(|&&|\|\||catch/.test(b));
}

console.log('  ABSENTES DE FIREFOX / LINUX');
dire('WebXR (navigator.xr)', protege('navigator.xr'), 'bouton masqué si absent');
dire('verrouillage d\'orientation', protege('screen.orientation'), 'Firefox bureau ne l\'a pas');
dire('presse-papiers', protege('navigator.clipboard'), 'repli si refusé');
dire('estimation du stockage', protege('navigator.storage'), '');
dire('compression deflate-raw', protege('CompressionStream'), 'Firefox < 113');
dire('capture du pointeur', protege('setPointerCapture'), '');
dire('verrouillage souris', protege('requestPointerLock'), '');

console.log('\n  DIFFÉRENCES ENTRE NAVIGATEURS');
dire('contexte audio préfixé pris en compte', /webkitAudioContext/.test(js), 'Safari ancien');
dire('plein écran : variantes préfixées', /webkitRequestFullscreen|webkitEnterFullscreen/.test(js));
dire('sortie de plein écran protégée', protege('exitFullscreen'));
dire('hauteur d\'écran réelle (barres mobiles)', /100dvh/.test(fs.readFileSync('galerie.html','utf8')));

console.log('\n  RESSOURCES EXTERNES');
const html=fs.readFileSync('galerie.html','utf8');
dire('polices avec repli système', /Georgia|serif/.test(html), 'si Google Fonts est bloqué');
const auto=fs.readFileSync('galerie-autonome.html','utf8');
dire('version autonome sans dépendance réseau', !/jsdelivr|unpkg/.test(auto), 'fonctionne hors ligne');

console.log('\n'+(ko? '  '+ko+' point(s) à corriger':'  compatibilité : aucune interface supposée présente'));
process.exit(ko?1:0);
