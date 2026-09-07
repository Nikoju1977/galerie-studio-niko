// Le geste de peinture, de bout en bout : ouverture, visée, tracé, sauvegarde.
import fs from 'fs';
const js = fs.readFileSync('galerie.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1];
let ko=0;
const dire=(t,ok,det='')=>{ console.log((ok?'  OK    ':'  ECHEC ')+t.padEnd(46)+det); if(!ok) ko++; };

console.log('  CHAÎNE DU GESTE');
dire('les couches sont créées à l\'ouverture', /if\(ouvrir\) preparerCouches\(\)/.test(js));
dire('le geste vise une surface', /function pointPeinture/.test(js) && /intersectObjects\(paintables\.map/.test(js));
dire('la surface visée doit avoir des coordonnées', /if\(!h \|\| !h\.uv\) return null/.test(js));
dire('le pointeur est suivi jusqu\'au relâchement', /pointerdown/.test(js) && /pointermove/.test(js) && /pointerup/.test(js));

console.log('\n  PIÈGES CONNUS');
// 1. la couche doit exister AVANT que le geste ne la cherche
const iPrep=js.indexOf('function preparerCouches'), iPoint=js.indexOf('function pointPeinture');
dire('couches préparées avant toute visée', iPrep>0 && iPoint>0, 'preparerCouches L'+iPrep+', pointPeinture L'+iPoint);
// 2. le pointeur capturé : sans cela, sortir du doigt de l'écran laisse le trait actif
dire('capture du pointeur pendant le tracé', /setPointerCapture/.test(js),
     /setPointerCapture/.test(js)?'':'ABSENTE : le trait continue hors écran');
// 3. la distance maximale
const m=js.match(/if\(p\.d>(\d+)\) return/);
dire('portée de peinture limitée', !!m, m? m[1]+' m':'');
// 4. le seau ne doit pas se répéter au glissé
dire('le seau ne se répète pas au glissé', /ATELIER\.outil==='seau'\)\{ ATELIER\.pointeur=null/.test(js));
// 5. la peinture ne doit pas déclencher la sélection d'œuvre
dire('le geste ne sélectionne pas une œuvre', /if\(ATELIER\.actif\) return;\s+\/\/ l'atelier a la main/.test(js));
// 6. en mode marche à la souris, le verrouillage du pointeur empêche de peindre
dire('verrouillage souris relâché à l\'ouverture', /if\(pointerLocked\) document\.exitPointerLock/.test(js));
// 7. le clic pour verrouiller ne doit pas se réarmer pendant qu'on peint
dire('pas de reverrouillage pendant la peinture', /el\.addEventListener\('click',\(\)=>\{\s*if\(ATELIER\.actif\) return;/.test(js));

console.log('\n  SAUVEGARDE');
dire('enregistrement différé après le geste', /setTimeout\(sauverPeinture, 2500\)/.test(js));
dire('restauration au lancement', /restaurerPeinture\(\)/.test(js));
dire('les couches existent avant restauration', /preparerCouches\(\);\s*\/\/ des traces existent/.test(js));
console.log('\n'+(ko? '  '+ko+' point(s) à corriger':'  chaîne de peinture : complète'));
process.exit(ko?1:0);
