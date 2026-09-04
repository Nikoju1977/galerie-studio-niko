// Les modes (VJ, atelier, exposition, focus, orbite) se neutralisent-ils
// correctement ? Un mode oublié en laisse un autre inutilisable.
import fs from 'fs';
const js = fs.readFileSync('galerie.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1];
let ko = 0;
const dire=(t,ok,det='')=>{ console.log((ok?'  OK    ':'  ECHEC ')+t+(det?' — '+det:'')); if(!ok) ko++; };

// 1. l'atelier doit désactiver regard, sélection et clic
dire('atelier : ne pivote pas la caméra', /if\(ATELIER\.actif\) return;[\s\S]{0,80}pointerLocked/.test(js) || (js.match(/if\(ATELIER\.actif\) return/g)||[]).length>=4,
     (js.match(/if\(ATELIER\.actif\) return/g)||[]).length+' garde-fous');
// 2. ouvrir l'atelier doit fermer la vue rapprochée
dire('atelier : ferme la vue rapprochée', /ouvrirAtelier[\s\S]{0,400}focusState\.active\) exitFocus/.test(js));
// 3. le VJ doit reprendre la main sur les écrans libres seulement
dire('VJ : n\'écrase pas une vidéo en cours', /if\(!p\.video\)\{ p\.mat\.map=VJ\.tex/.test(js));
// 4. Échap : chaque mode a sa sortie, dans l'ordre
const esc = js.slice(js.indexOf("if(e.code!=='Escape') return;"), js.indexOf("if(e.code!=='Escape') return;")+900);
for (const [nom, motif] of [['atelier','ATELIER.actif'],['VJ','VJ.actif'],['déplacement','moveSource'],
                            ['plan','planModal'],['livre d\'or','livreModal'],['identité','infoModal'],
                            ['mixage','mixerModal'],['vue rapprochée','closePanel']])
  dire('Échap ferme : '+nom, esc.includes(motif));
// 5. le mode exposition bloque bien toute écriture
const bloques=(js.match(/if\(visitMode\) return/g)||[]).length;
dire('exposition : dépôts bloqués', bloques>=3, bloques+' points');
// 6. peinture et VJ peuvent coexister sans se voler le geste
dire('atelier prioritaire sur la sélection', js.indexOf("if(ATELIER.actif) return;                 // l'atelier a la main") > 0);
console.log(ko? '\n  '+ko+' point(s) à corriger' : '\n  cohérence des modes : rien à signaler');
process.exit(ko?1:0);
