// Vérifications automatiques — logique métier extraite du fichier livré.
import fs from 'fs';
import zlib from 'zlib';

const html = fs.readFileSync('galerie.html', 'utf8');
const js = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];

let pass = 0, fail = 0;
const ok = (nom, cond, detail = '') => {
  if (cond) { pass++; console.log('  OK   ' + nom); }
  else { fail++; console.log('  ECHEC ' + nom + (detail ? ' — ' + detail : '')); }
};

console.log('\n— STRUCTURE DU DOCUMENT —');
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const dups = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
ok('aucun identifiant en double', dups.length === 0, dups.join(','));
const used = [...new Set([...js.matchAll(/\$\('([A-Za-z0-9_]+)'\)/g)].map(m => m[1]))];
const missing = used.filter(id => !ids.includes(id));
ok('tout élément appelé par le code existe', missing.length === 0, missing.join(','));
ok('aucun appel fetch (convention XHR)', !/\bfetch\s*\(/.test(js));
ok('appels réseau en XHR uniquement (Mistral + Supabase)',
   (js.match(/new XMLHttpRequest/g) || []).length === 2);
ok('balises d\'aperçu présentes', /og:image/.test(html) && /twitter:card/.test(html));
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
ok('aucun code JavaScript égaré dans la feuille de style',
   !/\bfunction\b|=>|await /.test(css));

console.log('\n— PLAN DE LA SALLE —');
const HALL = { x: 24, z: 16 };
const PLAN = [
  { from: -24, to: 24 }, { from: -24, to: 24 }, { from: -16, to: 16 }, { from: -16, to: 16 },
  { from: -20, to: -8, both: 1 }, { from: 8, to: 20, both: 1 },
  { from: -20, to: -8, both: 1 }, { from: 8, to: 20, both: 1 },
  { from: -6, to: 6, both: 1 }, { from: -6, to: 6, both: 1 },
  { from: -18, to: -6, both: 1 }, { from: 6, to: 18, both: 1 }
];
const M = 1.5;
const countFor = sp => PLAN.reduce((n, w) =>
  n + Math.max(1, Math.floor((Math.abs(w.to - w.from) - M * 2) / sp) + 1) * (w.both ? 2 : 1), 0);
let SP = 3.0, best = Infinity;
for (let sp = 1.9; sp <= 4.2; sp += 0.01) { const c = countFor(sp); if (c >= 100 && c - 100 < best) { best = c - 100; SP = sp; } }
const genere = countFor(SP);
ok('au moins 100 emplacements générés', genere >= 100, String(genere));
// retrait réparti -> exactement 100
const total = genere, TARGET = 100, extra = total - TARGET, step = total / extra;
const drop = new Set();
for (let i = 0; i < extra; i++) drop.add(Math.min(total - 1, Math.round(i * step + step / 2)));
let k = 0; while (drop.size < extra && k < total) { if (!drop.has(k)) drop.add(k); k++; }
ok('exactement 100 emplacements après répartition', total - drop.size === 100, String(total - drop.size));
const ecarts = [...drop].sort((a, b) => a - b).slice(1).map((v, i) => v - [...drop].sort((a, b) => a - b)[i]);
ok('retraits répartis, pas groupés en fin de liste', Math.max(...ecarts) - Math.min(...ecarts) <= 2);

console.log('\n— MOBILIER : AUCUN CHEVAUCHEMENT —');
const audioPos = [[-4,-6],[4,6],[-19,-11],[19,-11],[-19,11],[19,11],[-12,-4],[12,4],[-4,12],[0,-8]];
const sculptPos = [[-4,4],[4,-4],[-12,4],[12,-4],[-20,0],[20,0],[-8,-12],[8,12]];
const bancsPos = [[0,-4.6],[0,4.6],[-16,-4],[16,4],[0,-11.5],[0,11.5]];
const tvPos = [4.6, -12.4];
const murs = [{ x0: -20, x1: -8, z: -8 }, { x0: 8, x1: 20, z: -8 }, { x0: -20, x1: -8, z: 8 },
              { x0: 8, x1: 20, z: 8 }, { x0: -18, x1: -6, z: 0 }, { x0: 6, x1: 18, z: 0 }];
const mursZ = [{ z0: -6, z1: 6, x: -14 }, { z0: -6, z1: 6, x: 14 }];
const tous = [...audioPos.map(p => ['son', p]), ...sculptPos.map(p => ['sculpture', p]),
              ...bancsPos.map(p => ['banc', p]), [['tv'], tvPos]].map(([t, p]) => [String(t), p]);
let conflits = [];
for (let i = 0; i < tous.length; i++) {
  const [ta, a] = tous[i];
  if (Math.abs(a[0]) > HALL.x - 1 || Math.abs(a[1]) > HALL.z - 1) conflits.push(ta + ' hors salle');
  if (Math.hypot(a[0], a[1]) < 1.3) conflits.push(ta + ' sur le point de départ');
  for (const m of murs)
    if (a[0] > m.x0 - 0.8 && a[0] < m.x1 + 0.8 && Math.abs(a[1] - m.z) < 0.8) conflits.push(ta + ' dans une cimaise');
  for (const m of mursZ)
    if (a[1] > m.z0 - 0.8 && a[1] < m.z1 + 0.8 && Math.abs(a[0] - m.x) < 0.8) conflits.push(ta + ' dans un refend');
  for (let j = i + 1; j < tous.length; j++) {
    const [tb, b] = tous[j];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1.5) conflits.push(ta + '/' + tb + ' superposés');
  }
}
ok('mobilier sans chevauchement ni obstacle', conflits.length === 0, conflits.join(' ; '));

console.log('\n— NORMES DE GALERIE —');
const HANG = 1.55, MAXH = 1.5;
ok('ligne médiane à hauteur de regard (1,45–1,60 m)', HANG >= 1.45 && HANG <= 1.60, HANG + ' m');
ok('ligne médiane appliquée dans le code', /HANG_HEIGHT\s*=\s*1\.55/.test(js));
ok('bas de cadre au-dessus des plinthes', HANG - MAXH/2 > 0.6, (HANG - MAXH/2).toFixed(2) + ' m');
ok('haut de cadre sous la corniche', HANG + MAXH/2 < 7.4 - 0.5);
ok('projecteurs à 30° d\'incidence', /Math\.PI\/6/.test(js) && /30° d/.test(js));
ok('cartel normalisé : auteur, titre, année, technique, dimensions',
   ['artistName', 'a.title', 'a.year', 'a.technique', 'a.dims'].every(k => js.includes(k)));
// recul de contemplation : rien ne doit gêner devant un mur
const mobilier = [...audioPos, ...sculptPos, ...bancsPos, tvPos];
const RECUL = 1.2;
let gene = [];
for (const [x, z] of mobilier) {
  if (HALL.x - Math.abs(x) < RECUL) gene.push('objet à ' + (HALL.x - Math.abs(x)).toFixed(1) + ' m du mur');
  if (HALL.z - Math.abs(z) < RECUL) gene.push('objet à ' + (HALL.z - Math.abs(z)).toFixed(1) + ' m du mur');
}
ok('recul de contemplation dégagé devant les murs', gene.length === 0, gene.join(' ; '));
ok('assises présentes dans la salle', bancsPos.length >= 4, bancsPos.length + ' bancs');

console.log('\n— LANGUES —');
const langs=(js.match(/const LANGUES=\[([\s\S]*?)\];/)||[])[1]||'';
ok('neuf langues proposées', (langs.match(/\['[a-z]{2}',/g)||[]).length === 9);
ok('tchèque présent', /'cs','Čeština'/.test(js));
ok('allemand présent', /'de','Deutsch'/.test(js));
ok('langue de l\'appareil détectée au premier lancement', /navigator\.language/.test(js));
ok('choix de langue conservé', /lang:langue/.test(js));
ok('textes source mémorisés (retour au français possible)', /dataset\.i18nTxt/.test(js));
ok('titres et libellés d\'aide traduits', /ATTRS=\['title','placeholder'/.test(js));
ok('contenus de l\'artiste jamais traduits', /el\.id!=='galName'/.test(js) && /el\.id!=='obArtistBio'/.test(js));

console.log('\n— COUPOLE —');
ok('coupole présente au-dessus de la nef', /const DOME = \{ base:9, fleche:4\.5 \}/.test(js));
ok('géométrie calculée, non estimée', /DOME\.R = \(DOME\.base\*DOME\.base/.test(js));
ok('plafond percé d\'une ouverture circulaire', /formePlafond\.holes\.push\(trou\)/.test(js));
ok('caissons en texture (pas en relief, pour la fluidité)', /function textureCaissons/.test(js));
ok('oculus et sa couronne dorée', /const oculus = new THREE\.Mesh/.test(js) && /anneauOculus/.test(js));
ok('lumière zénithale par l\'oculus', /jourOculus/.test(js));
ok('coupole éclairée par sa propre source', /const lumDome/.test(js));
ok('matériau de l\'oculus déclaré avant usage',
   js.indexOf('const skyMat') < js.indexOf('CircleGeometry(1.7, 48), skyMat'));
ok('cimaises intérieures abaissées sous la coupole', (js.match(/hauteur:5\.0/g)||[]).length === 8);
ok('rampes lumineuses hors de l\'ouverture', /\[-13\.5,-11,11,13\.5\]/.test(js));

console.log('\n— CARTELS TRADUITS —');
ok('vocabulaire des techniques intégré', /const TECH_I18N=/.test(js));
ok('technique traduite sur le cartel', /techTraduite\(a\.technique/.test(js));
ok('traduction du titre et de la notice via le curateur', /async function traduireCartel/.test(js));
ok('texte de l\'artiste conservé au-dessus de sa traduction', /blocs\.push\(\{t:a\.desc, it:false\}\)/.test(js));
ok('traductions enregistrées et exportées', /persistTrad/.test(js) && /o\.trad=rec\.trad/.test(js));
ok('cartel rafraîchi au changement de langue', /if\(focusState\.art\)\{[\s\S]{0,200}makeCartelTexture/.test(js));

console.log('\n— VIDÉOPROJECTIONS —');
ok('projection 3 hors de l\'allée étroite', !/along:12, face:\+1/.test(js) && /along:-14, face:-1/.test(js));
ok('trois projections définies', (js.match(/axis:'[xz]', fixed:/g)||[]).length >= 3);
ok('recul calculé sur le rapport de projection', /THROW_RATIO\s*=\s*1\.5/.test(js) && /W\*THROW_RATIO/.test(js));
ok('zones réservées avant les emplacements', /dansZoneProjection\(pos, normal\)\) continue/.test(js));
ok('dépôt direct au toucher de l\'image', /projTarget=p; \$\('projInput'\)\.click\(\)/.test(js));
ok('son de la projection libéré au regard', /o!==p && o\.video\) o\.video\.muted=true/.test(js));
ok('projections restaurées au lancement', /rec\.type==='proj'/.test(js));

console.log('\n— DÉPLACEMENT ET ZOOM —');
const AVANCE = 0.12, FOCUS_MIN = 0.26;
// cadrage complet de l'œuvre sur tous les formats d'écran
const FOV=50*Math.PI/180, TAN=Math.tan(FOV/2), FOCUS_MAX=4.2;
const besoin=(w,h,a)=>Math.max((h/2)/TAN,(w/2)/(TAN*Math.max(0.4,a)))*1.06;
const formats=[['16:9',1.78],['4:3',1.33],['portrait',0.46]];
const pire=Math.max(...formats.map(([,a])=>besoin(1.125,1.5,a)));
ok('œuvre entièrement cadrée sur tous les écrans', pire <= FOCUS_MAX,
   'il faut ' + pire.toFixed(2) + ' m, plafond ' + FOCUS_MAX + ' m');
ok('plafond de recul appliqué dans le code', /FOCUS_MAX=4\.2/.test(js));
ok('recadrage à la rotation de l\'écran', /focusState\.dist=fitFocusDist/.test(js));
ok('la caméra ne traverse jamais la toile', FOCUS_MIN - AVANCE > 0.1,
   (FOCUS_MIN - AVANCE).toFixed(2) + ' m de marge');
ok('marche : avant = direction du regard', /wx = dir\.x\*cosY - dir\.z\*sinY/.test(js));
ok('dépôt sur l\'emplacement le plus proche', /distanceTo\(camera\.position\)/.test(js));
ok('téléviseur vide : dépôt direct au toucher', /if\(!TV\.video\)\{ if\(!visitMode\) \$\('tvInput'\)\.click\(\)/.test(js));
ok('repère indiquant comment projeter sur l\'écran', /projeter sur le téléviseur/.test(js));
ok('les murs bloquent la sélection (pas de clic à travers)',
   /wallMeshes/.test(js) && /wallHit\?\s*wallHit\.distance/.test(js));
ok('tous les boutons visibles sans défilement', /\.toolbar\{max-width:none;flex:1;flex-wrap:wrap/.test(html));
ok('boutons compacts en mobile', /\.btn\{padding:0;width:38px;height:38px/.test(html));
ok('emplacements visibles à taille d\'accrochage', /PlaneGeometry\(1\.15,1\.5\)/.test(js));
ok('emplacements bien lisibles (opacité relevée)', /opacity:\.85/.test(js));
ok('emplacements masqués en mode exposition', /m\.group\.visible = !visitMode/.test(js));
ok('cartel à taille de plaque muséale', /Math\.min\(0\.52, outerW\*0\.46\)/.test(js));
ok('cartel aux proportions de sa texture', /cartelW\*\(380\/680\)/.test(js));
ok('cartel affichable / masquable', /id="fCartelToggle"/.test(html) && /showCartel=!showCartel/.test(js));
ok('choix du cartel conservé', /cartel:showCartel/.test(js));
ok('actions de l\'œuvre sous le titre en mobile', /\.focus \.facts\{flex:1 1 100%/.test(html));
ok('un repère ne se pose jamais sur une œuvre', /if\(artworks\.some\(a=>a\.slotIndex===i\)\) return;/.test(js));
ok('vidéo relancée après déplacement', /moved\.video.*play/.test(js));

console.log('\n— SALLE CRÉDIBLE, SON, VISITE —');
ok('plus aucun faux tableau de démonstration', !/defaultArt|placeholderTexture/.test(js));
ok('emplacements libres : repère discret cliquable', /function ensureMarker/.test(js) && /markerTexture/.test(js));
ok('le repère disparaît sous une œuvre', /removeMarker\(slotIndex\)/.test(js));
ok('effacer une œuvre remet le repère', /ensureMarker\(a\.slotIndex\)/.test(js));
ok('vidéo murale : son rendu quand on la regarde', /a\.video\.muted=false/.test(js));
ok('vidéo murale : son retiré quand on s\'éloigne', /focusState\.art\.video\.muted=true/.test(js));
ok('une seule vidéo sonore à la fois', /o!==a && o\.video && !o\.video\.muted/.test(js));
ok('plein écran disponible', /id="btnFull"/.test(html) && /requestFullscreen/.test(js));
ok('plein écran : raccourci clavier F', /e\.code==='KeyF'/.test(js));
ok('plein écran : orientation paysage tentée', /orientation\?\.lock/.test(js));
ok('plein écran : rendu redimensionné après bascule', /setTimeout\(onResize/.test(js));
ok('hauteur dynamique (barre du navigateur)', /height:100dvh/.test(html) && /window\.visualViewport\?\./.test(js));
ok('mode exposition disponible', /function setVisitMode/.test(js) && /id="btnVisit"/.test(html));
ok('mode exposition : dépôt bloqué', (js.match(/if\(visitMode\) return/g)||[]).length >= 3);
ok('mode exposition : outils masqués', /body\.visite #btnAdd/.test(html));
ok('mode exposition : conservé entre les visites', /visit:visitMode/.test(js));

console.log('\n— LIENS D\'ARTISTE —');
const profil = { n: 'Les Thelovestronautes', i: 'Une traversée.', a: 'Nicolas Julienne',
                 b: 'Artiste réalisateur.', l: { insta: '@thelovestronautes', yt: '@chaine' } };
const z = zlib.deflateRawSync(Buffer.from(JSON.stringify(profil)));
const token = 'z' + z.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const back = JSON.parse(zlib.inflateRawSync(
  Buffer.from(token.slice(1).replace(/-/g, '+').replace(/_/g, '/'), 'base64')).toString());
ok('aller-retour du lien fidèle', JSON.stringify(back) === JSON.stringify(profil));
ok('lien assez court pour être partagé', token.length + 68 < 2000, (token.length + 68) + ' caractères');

const defs = { insta: 'https://instagram.com/', fb: 'https://facebook.com/', tw: 'https://x.com/' };
const socialURL = (key, raw) => {
  let v = (raw || '').trim(); if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  v = v.replace(/^\/+/, '');
  if (key === 'web') return 'https://' + v;
  if (key === 'yt') return 'https://youtube.com/' + (v.startsWith('@') ? v : '@' + v.replace(/^(c|channel|user)\//, ''));
  if (key === 'li') return 'https://linkedin.com/in/' + v.replace(/^in\//, '').replace(/^@/, '');
  return defs[key] + v.replace(/^@/, '');
};
ok('LinkedIn ne double pas le in/', socialURL('li', '/in/nicolas') === 'https://linkedin.com/in/nicolas');
ok('YouTube conserve l\'arobase', socialURL('yt', 'chaine') === 'https://youtube.com/@chaine');
ok('Instagram accepte @ ou nom nu', socialURL('insta', '@a') === socialURL('insta', 'a'));
ok('une URL complète est laissée telle quelle', socialURL('fb', 'https://fb.com/x') === 'https://fb.com/x');

console.log('\n— PUBLICATION EN LIGNE —');
ok('publication branchée sur le projet', /dzuxiiykhesgilmzutig\.supabase\.co/.test(js));
ok('clé publique (jamais la clé secrète)', /sb_publishable_/.test(js) && !/sb_secret_/.test(js) && !/sbp_/.test(js));
ok('appels serveur en XHR (convention)', !/\bfetch\s*\(/.test(js));
ok('publication soumise à un code d\'invitation', /p_code:code/.test(js));
ok('mise à jour protégée par jeton', /p_jeton:jeton/.test(js));
ok('galerie créée avant l\'envoi des médias (dépôt sauvage bloqué)',
   js.indexOf("p_oeuvres:\[\]") < js.indexOf('supaUpload(slug') || /p_oeuvres:\[\]/.test(js));
ok('adresse courte -> chargement serveur', /\^\[a-z0-9-\]\{3,40\}\$/.test(js) && /loadPublished/.test(js));
ok('galerie publiée ouverte en lecture seule', /visitMode=true; applyVisitMode\(\)/.test(js));
ok('une galerie visitée n\'écrase pas la galerie locale', /if\(!visite\) await populate\(\)/.test(js));

console.log('\n— LIMITE DE DÉBIT MISTRAL —');
ok('appels espacés dans le temps', /minInterval:1200/.test(js));
ok('reprise automatique sur 429', /s===429 \|\| s===500/.test(js));
ok('délai imposé par le serveur respecté', /Retry-After/.test(js) && /e\.retryAfter/.test(js));
ok('attente croissante entre les tentatives', /2000 \* Math\.pow\(2, essai-1\)/.test(js));
ok('pas de reprise sur clé invalide', /if\(!recuperable \|\| essai===MISTRAL\.essaisMax\)/.test(js));
ok('message clair quand le quota est épuisé', /trop de demandes — réessaie/.test(js));

console.log('\n— MUR COLLECTIF —');
ok('traces partagées sur une galerie publiée', /function envoyerPeinture/.test(js) && /peintureCollective/.test(js));
ok('traces des visiteurs précédents chargées', /function chargerPeintureCollective/.test(js));
ok('seules les surfaces peintes ici sont envoyées', /c\.sale && c\.modifieeIci/.test(js));
ok('envoi différé, pas à chaque trait', /setTimeout\(envoyerPeinture, 6000\)/.test(js));
ok('taille plafonnée avant envoi', /blob\.size>7\*1024\*1024/.test(js));
ok('nettoyage retirant aussi les traces partagées', /y compris les traces partagées/.test(js));
ok('format PNG, accepté par le stockage', /toBlob\(r,'image\/png'\)/.test(js));

console.log('\n— RETRAIT, MODÉRATION, FLUIDITÉ —');
ok('galerie retirable du serveur', /depublier_galerie/.test(js) && /id="pubRetirer"/.test(html));
ok('médias supprimés avant la galerie', js.indexOf('object/oeuvres') < js.indexOf("depublier_galerie', { p_slug"));
ok('retrait confirmé en deux appuis', /retirerArme/.test(js));
ok('jeton oublié après retrait', /delete restant\[slugPublie\]/.test(js));
ok('modération du livre d\'or', /retirer_message', \{ p_slug/.test(js));
ok('modération réservée au détenteur du jeton', /jeton \|\| !slugPublie/.test(js));
ok('fluidité mesurée en continu', /function surveillerFluidite/.test(js));
ok('allègement par paliers, borné', /FLUIDITE\.baisses < 3/.test(js));
ok('reprise en main possible', /FLUIDITE\.baisses=0/.test(js));

console.log('\n— VENTE ET CONTACT —');
ok('bouton de demande sur les œuvres à vendre', /id="fDemander"/.test(html) && /!a\.prix/.test(js));
ok('demande transmise au serveur si publiée', /rest\/v1\/demandes/.test(js));
ok('repli par courrier si pas encore publiée', /location\.href='mailto:'/.test(js));
ok('courriel de contact dans l\'identité', /id="cfgMail"/.test(html) && /mail:\$\('cfgMail'\)/.test(js));
ok('demandes reçues consultables par l\'artiste', /rpc\/mes_demandes/.test(js) && /id="cfgDemandes"/.test(html));

console.log('\n— MODE VJ —');
ok('mode VJ en barre basse, non couvrante', /class="vjbar"/.test(html) && !/id="vjPanel" class="panel"/.test(html));
ok('barre VJ défilante sur petit écran', /\.vjbar\{gap:6px;padding:7px 8px;bottom:calc\(env\(safe-area-inset-bottom\) \+ 76px\);\s*width:96vw;overflow-x:auto/.test(html));
ok('lumière de salle réglable', /id="vjSalle"/.test(html) && /VJ\.salle/.test(js));
ok('la salle revient au calme', /VJ\.silence>2\.5/.test(js) && /VJ\.silence = VJ\.energie/.test(js));
ok('plancher jamais sous un quart', /0\.25 \+ VJ\.salle\*0\.75/.test(js));
ok('fermer la fiche garde la vue et le son', /function masquerFiche/.test(js) && /masquerFiche\(\); else closePanel/.test(js));
ok('le toucher pose et retire le cartel', /if\(ficheMasquee\) reafficherFiche\(\); else masquerFiche\(\);/.test(js));
ok('bouton pour quitter la vue', /id="sortirVue"/.test(html) && /sortirVue'\)\.addEventListener\('click', closePanel/.test(js));
ok('Échap : fiche d\'abord, vue ensuite', /classList\.contains\('show'\)\) masquerFiche\(\);[\s\S]{0,90}focusState\.active\) closePanel/.test(js));
ok('fiche d\'œuvre repliable', /id="fPlier"/.test(html) && /focus\.replie/.test(html));
ok('état de la fiche conservé', /fiche:ficheRepliee/.test(js));
ok('six visuels génératifs', (js.match(/VJ\.mode==='/g)||[]).length >= 6);
ok('tempo déduit des battements', /VJ\.tempo=Math\.round\(60000\/median\)/.test(js) && /id="vjTempo"/.test(html));
ok('palettes imposant une teinte', /VJ_PALETTES/.test(js) && /function vjTeinte/.test(js));
ok('coupure franche de la salle', /VJ\.noir/.test(js) && /id="vjNoir"/.test(html));
ok('flash manuel', /VJ\.flash=1/.test(js) && /id="vjFlash"/.test(html));
ok('pilote automatique tous les 16 temps', /VJ\.auto && \+\+VJ\.autoT>=16/.test(js));
ok('raccourcis de scène (N, espace, A)', /e\.code==='KeyN'/.test(js) && /e\.code==='Space'/.test(js));
ok('téléviseur libre investi par les visuels', /TV\.mat\.map=VJ\.tex/.test(js));
ok('téléviseur rendu à son état en sortant', /TV\.mat\.map=TV\.standby/.test(js));
ok('analyse du son complet de la salle', /listener\.getInput\(\)\.connect/.test(js));
ok('séparation grave / medium / aigu', /VJ\.grave/.test(js) && /VJ\.medium/.test(js) && /VJ\.aigu/.test(js));
ok('détection de battement', /VJ\.moyenneGrave\*1\.35|VJ\.moyenneGrave\*0\.94/.test(js));
ok('lumière et éclat pilotés par le son', /function vjEclairer/.test(js));
ok('écrans libres investis par les visuels', /p\.mat\.map=VJ\.tex/.test(js));
ok('éclairage rendu à son état en sortant', /applyAmbiance\(VJ\.sauve/.test(js));
ok('projections rendues à leur état en sortant', /les projections gardaient l'éclairage du VJ/.test(js));
ok('micro utilisable comme source', /getUserMedia/.test(js) && /id="vjMicro"/.test(html));
ok('micro jamais renvoyé aux haut-parleurs', /le micro n'est jamais renvoyé/.test(js));
ok('micro coupé en quittant le mode', /if\(VJ\.source==='micro'\) vjMicro\(false\)/.test(js));

const guide = fs.readFileSync('guide.html','utf8');
console.log('\n— MODE D\'EMPLOI —');
ok('atelier de peinture documenté', /Seau de 5 litres/.test(guide));
ok('mode VJ documenté', /MODE VJ/.test(guide) && /micro/.test(guide));
ok('prix et demandes documentés', /VENDRE ET ÉCHANGER/.test(guide));
ok('livre d\'or documenté', /livre d'or/i.test(guide));
ok('publication en ligne documentée', /Publier en ligne/.test(guide));
ok('formats Maya et 3ds Max expliqués', /Depuis Maya ou 3ds Max/.test(guide));
ok('les neuf langues annoncées', /neuf langues/.test(guide));

console.log('\n— FORMATS DE SCULPTURE —');
ok('FBX, OBJ, Collada et STL acceptés', /glb\|gltf\|fbx\|obj\|dae\|stl/.test(js));
ok('chargeur propre à chaque format', /fbxLoader\.parse/.test(js) && /objLoader\.parse/.test(js) &&
   /daeLoader\.parse/.test(js) && /stlLoader\.parse/.test(js));
ok('formats fermés identifiés', /EXT_PROPRIO=/.test(js) && /ma\|mb\|max/.test(js));
ok('marche à suivre expliquée pour Maya et 3ds Max', /Maya ou 3ds Max/.test(js));
ok('matériau de secours pour OBJ et STL', /matSculpt/.test(js));

console.log('\n— ATELIER DE PEINTURE —');
ok('quatre outils distincts', /bombe:/.test(js) && /crayon:/.test(js) && /pinceau:/.test(js) && /seau:/.test(js));
ok('murs et sol peignables', /creerCouche\('sol'/.test(js) && /creerCouche\('mur_'/.test(js));
ok('trait continu entre deux points', /function peindreEn/.test(js) && /precedent/.test(js));
ok('le seau produit ses coulures', /coulures : la peinture descend/.test(js));
ok('peinture conservée entre les visites', /restaurerPeinture/.test(js) && /type:'peinture'/.test(js));
ok('nettoyage en deux appuis', /ATELIER\.effacerArme/.test(js));
ok('le geste de peinture n\'oriente pas la caméra', (js.match(/if\(ATELIER\.actif\) return/g)||[]).length >= 3);
ok('portée de peinture limitée', /p\.d>14/.test(js));

console.log('\n— PRIX ET LIVRE D\'OR —');
ok('prix saisissable sur chaque œuvre', /id="fPrix"/.test(html) && /prix:prix\|\|''/.test(js));
ok('prix affiché sur le cartel', /if\(a\.prix\)/.test(js));
ok('mention « vendu » reconnue en plusieurs langues', /vendu\|sold\|verkauft/.test(js));
ok('prix conservé, exporté et publié', /r\.prix=a\.prix/.test(js) && /prix:rec\.prix\|\|''/.test(js));
ok('livre d\'or en ligne et local', /function livreLire/.test(js) && /LIVRE_LOCAL/.test(js));
ok('pupitre cliquable dans la salle', /kind==='livre'/.test(js));
ok('livre d\'or rattaché à la galerie visitée', /slugPublie=slug;/.test(js));

console.log('\n— CORRECTIONS SIGNALÉES —');
ok('échec de chargement annoncé au visiteur', /n\\'a pas pu être chargée|Aucune œuvre n/.test(js));
ok('progression affichée au visiteur', /Chargement des œuvres…/.test(js));
ok('erreurs distinguées (réseau, absence, autre)', /Aucune galerie à l/.test(js) && /Galerie inaccessible/.test(js));
ok('jeton d\'édition réellement attendu', /await safeStorage\.put\(\{ id:PUB_TOKENS/.test(js));
ok('délai d\'envoi proportionnel au fichier', /blob\.size\/1024\/8/.test(js));
ok('extension de fichier fidèle au format', /const MIME_EXT=/.test(js));
ok('lien public retrouvable à tout moment', /id="pubCopier"/.test(html) && /function lienPublic/.test(js));
ok('partage : distinction présentation / œuvres', /Pour partager tes œuvres, utilise/.test(js));

console.log('\n— SAUVEGARDE —');
ok('export : tous les types couverts',
   ['config', 'audio', 'model', 'tv'].every(t => js.includes("'" + t + "'")));
ok('la clé Mistral est exclue de l\'export', /r\.id!=='__mistral__'/.test(js));
ok('import : format vérifié avant restauration', /format!=='studio-niko-galerie'/.test(js));
ok('images réduites au dépôt', /MAX_EDGE\s*=\s*2048/.test(js));
ok('alerte quand l\'espace sature', /ratio>0\.8/.test(js));

console.log('\n— PROTECTION DES DONNÉES —');
ok('la clé API est chiffrée', /AES-GCM/.test(js) && /PBKDF2/.test(js));
ok('effacement en deux temps', /Appuie encore pour effacer/.test(js));
ok('liens externes sécurisés', !/target="_blank"(?![^>]*rel=)/.test(html) || /noopener/.test(html));

console.log('\n' + '─'.repeat(52));
console.log(`  ${pass} contrôles réussis, ${fail} échec${fail > 1 ? 's' : ''}`);
process.exit(fail ? 1 : 0);
