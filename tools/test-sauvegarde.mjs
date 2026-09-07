// Export et réimport d'une galerie : rien ne doit se perdre, rien ne doit fuiter.
import fs from 'fs';
const js = fs.readFileSync('galerie.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const ex = js.slice(js.indexOf('async function exportGallery'), js.indexOf('async function importGallery'));
const im = js.slice(js.indexOf('async function importGallery'), js.indexOf('async function importGallery')+2400);
let ko=0;
const dire=(t,ok,det='')=>{ console.log((ok?'  OK    ':'  ECHEC ')+t.padEnd(52)+det); if(!ok) ko++; };

console.log('  CE QUI NE DOIT PAS SORTIR DE L\'APPAREIL');
dire('clé Mistral exclue', /r\.id!=='__mistral__'/.test(ex));
dire('jetons d\'édition exclus', /r\.id!==PUB_TOKENS/.test(ex),
     /r\.id!==PUB_TOKENS/.test(ex)?'':'FUITE : un jeton permet de retirer la galerie en ligne');

console.log('\n  CHAMPS CONSERVÉS À L\'ALLER-RETOUR');
for(const c of ['slotIndex','pedestal','spot','desc','trad','year','technique','dims','prix','index','url','couches','messages','title'])
  dire(c, ex.includes('rec.'+c) && (im.includes('rec.'+c+'=') || c==='title'));

console.log('\n  IDENTITÉ ET FICHIERS');
for(const c of ['signature','name','intro','artist','bio','portrait','links'])
  dire('identité : '+c, ex.includes('rec.'+c) && im.includes('rec.'+c+'='));
dire('fichiers encodés puis rendus', /blobToB64/.test(ex) && /b64ToBlob/.test(im));
dire('nom d\'origine du fichier conservé', /name_file/.test(ex) && /name_file/.test(im));

console.log('\n  SÉCURITÉ DE LA RESTAURATION');
dire('format vérifié avant restauration', /data\.format!=='studio-niko-galerie'/.test(im));
dire('liste vérifiée', /Array\.isArray\(data\.items\)/.test(im));
dire('échec expliqué', /Restauration impossible/.test(im));

console.log('\n'+(ko? '  '+ko+' point(s) à corriger':'  sauvegarde : aller-retour complet'));
process.exit(ko?1:0);
