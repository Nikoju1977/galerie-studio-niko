// Curateur IA, plan de salle, carte artiste, liens de partage.
import fs from 'fs';
const html = fs.readFileSync('galerie.html','utf8');
const js = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
let ko=0;
const dire=(t,ok,det='')=>{ console.log((ok?'  OK    ':'  ECHEC ')+t.padEnd(50)+det); if(!ok) ko++; };

console.log('  CURATEUR IA — SÉCURITÉ DE LA CLÉ');
dire('clé chiffrée avant enregistrement', /AES-GCM/.test(js) && /PBKDF2/.test(js));
dire('sel et vecteur aléatoires', /getRandomValues/.test(js));
dire('clé jamais écrite en clair', !/safeStorage\.put\(\{[^}]*key:AI\.key/.test(js));
dire('clé exclue de la sauvegarde', /r\.id!=='__mistral__'/.test(js));
dire('oubli de la clé possible', /Oublier la clé/.test(html));

console.log('\n  CURATEUR IA — FONCTIONNEMENT');
dire('la galerie marche sans clé', /AI\.enabled/.test(js));
dire('cartel automatique à l\'import', /aiAuto/.test(js));
dire('régénération d\'un cartel', /id="fRegen"/.test(html));
dire('manifeste d\'exposition', /manifeste/i.test(js));
dire('réponse illisible gérée', /réponse illisible/.test(js));
dire('limite de débit gérée', /MISTRAL\.essaisMax/.test(js));
dire('file d\'attente pour ne pas saturer', /minInterval/.test(js));

console.log('\n  PLAN DE SALLE');
dire('plan dessiné depuis les emplacements réels', /planModal/.test(html) && /slots/.test(js));
dire('point cliquable par œuvre', /teleportToSlot\(/.test(js) && /addEventListener\('click'/.test(js));
dire('téléportation devant l\'œuvre', /teleport|planGo/i.test(js));
dire('orientation face au mur après téléportation', /player\.yaw = Math\.atan2\(-sl\.normal\.x, -sl\.normal\.z\)/.test(js));
dire('recul de 2,6 m devant l\'œuvre', /addScaledVector\(sl\.normal, 2\.6\)/.test(js));
dire('sortie du mode orbite à la téléportation', /if\(mode==='orbit'\)\{ mode='walk'/.test(js));
dire('liste des œuvres', /Mes œuvres/.test(html));

console.log('\n  CARTE ARTISTE ET PARTAGE');
dire('portrait redimensionné avant stockage', /256/.test(js) && /portrait/i.test(js));
dire('adresses de réseaux normalisées', /function socialURL/.test(js));
dire('@pseudo transformé en adresse complète', /replace\(\/\^@\//.test(js));
dire('adresse déjà complète laissée intacte', /if\(\/\^https\?:\\\/\\\/\/i\.test\(v\)\) return v/.test(js));
dire('lien de présentation compressé', /deflate-raw/.test(js));
dire('lien public prioritaire s\'il existe', /const lien = publie \|\| await buildShareLink/.test(js));
dire('le partage dit ce qu\'il contient', /ne porte que ta présentation/.test(js));
dire('profil visité appliqué sans écraser le local', /if\(!visite\) await populate/.test(js));

console.log('\n'+(ko? '  '+ko+' point(s) à vérifier':'  curateur, plan et partage : complets'));
process.exit(ko?1:0);
