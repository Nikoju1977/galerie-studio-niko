// Exécute réellement le module de la galerie dans un DOM simulé.
// Objectif : détecter les erreurs qui ne sont pas des erreurs de syntaxe
// (ordre de déclaration, fonction absente, ID manquant...).
import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync('galerie.html', 'utf8');
const dom = new JSDOM(html, { pretendToBeVisual:true, url:'https://local.test/' });
const w = dom.window;

// APIs absentes de jsdom, stubées
w.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){} });
let rafDepth = 0;
w.requestAnimationFrame = (cb) => { if (rafDepth++ < 400) setTimeout(cb, 0); return rafDepth; };
// contexte 2D simulé : on enregistre réellement les pixels touchés
w.HTMLCanvasElement.prototype.getContext = function(){
  const cv = this;
  const px = { data: new Uint8ClampedArray(Math.max(4, (cv.width||1) * (cv.height||1) * 4)) };
  let touche = 0;
  const marquer = () => { for (let k = 0; k < 40 && touche < px.data.length; k++, touche += 4) px.data[touche + 3] = 255; };
  const nul = () => {};
  return {
    canvas: cv,
    fillStyle:'', strokeStyle:'', lineWidth:1, lineCap:'', lineJoin:'', font:'', textAlign:'', textBaseline:'', globalAlpha:1,
    fillRect: marquer, strokeRect: nul, fill: marquer, stroke: marquer, fillText: marquer,
    beginPath: nul, closePath: nul, moveTo: nul, lineTo: nul, arc: nul, absarc: nul, rect: nul,
    setLineDash: nul, drawImage: marquer, clearRect(){ px.data.fill(0); touche = 0; },
    putImageData: nul, getImageData: () => px, measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: nul }),
    createRadialGradient: () => ({ addColorStop: nul }),
    save: nul, restore: nul, translate: nul, rotate: nul, scale: nul
  };
};
w.HTMLCanvasElement.prototype.toDataURL = () => 'data:,';
// IndexedDB indisponible dans jsdom : on déclenche l'erreur pour que
// l'application bascule sur son stockage mémoire de secours.
w.indexedDB = { open: () => { const rq = {}; setTimeout(() => rq.onerror && rq.onerror(), 0); return rq; } };
w.AudioContext = w.webkitAudioContext = function(){ return { state:'running', decodeAudioData(){}, resume(){} }; };
// le renderer stubé n'est pas un vrai noeud DOM : on tolère
const _append = w.Node.prototype.appendChild;
w.Node.prototype.appendChild = function(n){ try{ return _append.call(this,n); }catch(e){ return n; } };
w.URL.createObjectURL = () => 'blob:x';
w.URL.revokeObjectURL = () => {};
Object.defineProperty(w.navigator, 'maxTouchPoints', { value:0 });

// performance de jsdom boucle sur lui-même : on fournit le nôtre
Object.defineProperty(globalThis, 'performance', { value:{ now: () => Date.now() }, configurable:true, writable:true });
for (const k of ['document','window','matchMedia','requestAnimationFrame',
                 'HTMLCanvasElement','Image','indexedDB','AudioContext','URL','FileReader',
                 'Blob','File','atob','btoa','addEventListener','screen']) {
  try { Object.defineProperty(globalThis, k, { value:w[k], configurable:true, writable:true }); } catch(e){}
}
globalThis.self = w;
for (const k of ['location','history','getComputedStyle','CompressionStream','DecompressionStream']) {
  try { Object.defineProperty(globalThis, k, { value:w[k], configurable:true, writable:true }); } catch(e){}
}
for (const k of ['innerWidth','innerHeight','devicePixelRatio']) {
  Object.defineProperty(globalThis, k, { value: w[k] || 1024, configurable:true, writable:true });
}
for (const [k,v] of [['crypto',{subtle:{},getRandomValues:a=>a}], ['navigator', w.navigator]]) {
  try { Object.defineProperty(globalThis, k, { value:v, configurable:true, writable:true }); } catch(e){}
}

let failed = null;
process.on('uncaughtException', e => { failed = e; });

try {
  await import('./smoke-bundle.js');
} catch (e) {
  failed = e;
}
await new Promise(r => setTimeout(r, 300));

// --- simulation d'un appui sur une œuvre ---
const g = globalThis.window.__galerie;
if (!failed && g) {
  await new Promise(r => setTimeout(r, 400));
  console.log('  œuvres accrochées :', g.artworks.length, '| repères d\'emplacement :', g.markers.length);
  if (g.markers.length !== 100) failed = new Error('repères attendus : 100, obtenus ' + g.markers.length);
  // on accroche une œuvre de test pour vérifier l'ouverture
  const tex = { dispose(){} };
  const a = g.setArtwork(0, { texture: tex, aspect: 0.75, type: 'image', title: 'Essai', id: 'test1' });
  console.log('  après accrochage : ' + g.artworks.length + ' œuvre, ' + g.markers.length + ' repères');
  if (g.markers.length !== 99) failed = new Error('le repère n\'a pas été retiré sous l\'œuvre');
  if (a) {
    try {
      const d = g.fitFocusDist(a);
      console.log('  distance de cadrage :', typeof d === 'number' && isFinite(d) ? d.toFixed(2) + ' m' : 'INVALIDE (' + d + ')');
      if (!(typeof d === 'number' && isFinite(d) && d > 0)) failed = new Error('distance de cadrage invalide: ' + d);
    } catch (e) { failed = new Error('fitFocusDist: ' + e.message); }
    try {
      g.focusArtwork(a);
      console.log('  ouverture de l\'œuvre : sans erreur');
      // on fait tourner l'animation de focus jusqu'au bout
      for (let i = 0; i < 120; i++) g.updateFocus(0.05);
      const w = g.focusState.world, n = g.focusState.normal, c = g.camera.position;
      const dist = Math.hypot(c.x - w.x, c.y - w.y, c.z - w.z);
      const cote = (c.x - w.x) * n.x + (c.z - w.z) * n.z;   // >0 = bon côté du mur
      console.log('  position finale caméra : distance ' + dist.toFixed(2) + ' m, côté ' + (cote > 0 ? 'correct' : 'DERRIÈRE LE MUR'));
      console.log('  écart avec la distance visée : ' + Math.abs(dist - g.focusState.dist).toFixed(3) + ' m');
      // orientation : la caméra doit regarder l'œuvre, pas l'inverse
      const q = g.camera.quaternion;
      const fw = { x: 0, y: 0, z: -1 };
      const qx=q.x||0, qy=q.y||0, qz=q.z||0, qw=(q.w===undefined?1:q.w);
      const ix =  qw*fw.x + qy*fw.z - qz*fw.y;
      const iy =  qw*fw.y + qz*fw.x - qx*fw.z;
      const iz =  qw*fw.z + qx*fw.y - qy*fw.x;
      const iw = -qx*fw.x - qy*fw.y - qz*fw.z;
      const dir = {
        x: ix*qw + iw*-qx + iy*-qz - iz*-qy,
        y: iy*qw + iw*-qy + iz*-qx - ix*-qz,
        z: iz*qw + iw*-qz + ix*-qy - iy*-qx
      };
      const vers = { x: w.x - c.x, y: w.y - c.y, z: w.z - c.z };
      const nv = Math.hypot(vers.x, vers.y, vers.z) || 1;
      const cos = (dir.x*vers.x + dir.y*vers.y + dir.z*vers.z) / nv;
      const angle = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
      console.log('  orientation de la caméra : ' + angle.toFixed(1) + '° d\'écart avec l\'œuvre');
      if (angle > 15) failed = new Error('la caméra ne regarde pas l\'œuvre : ' + angle.toFixed(0) + '° d\'écart');
      if (cote <= 0) failed = new Error('la caméra passe derrière le mur');
      else if (Math.abs(dist - g.focusState.dist) > 0.05) failed = new Error('la caméra ne rejoint pas l\'œuvre : ' + dist.toFixed(2) + ' m au lieu de ' + g.focusState.dist.toFixed(2));
    }
    catch (e) { failed = new Error('focusArtwork: ' + e.message); }
  } else { failed = new Error('aucune œuvre construite'); }
}

// --- vérification des chemins de dépôt : où atterrit chaque fichier ? ---
if (!failed && g) {
  const F = (nom, type) => ({ name: nom, type });
  const routes = [
    ['photo.jpg',  'image/jpeg', 'image'],
    ['photo.HEIC', 'image/heic', 'heic'],
    ['film.mp4',   'video/mp4',  'video'],
    ['film.mov',   '',           'video'],   // type vide : sélecteur Android
    ['piste.mp3',  'audio/mpeg', 'audio'],
    ['piste.wav',  '',           'audio'],
    ['statue.glb', '',           'model'],
    ['statue.fbx', '',           'model'],
    ['statue.obj', '',           'model'],
    ['statue.dae', '',           'model'],
    ['statue.stl', '',           'model'],
    ['scene.mb',   '',           'proprio'],
    ['scene.max',  '',           'proprio'],
    ['notes.txt',  'text/plain', null]
  ];
  console.log('\n  ROUTAGE DES FICHIERS DÉPOSÉS');
  for (const [nom, type, attendu] of routes) {
    const obtenu = g.fileKind(F(nom, type));
    const dest = { image:'mur', video:'mur', audio:'socle sonore', model:'socle 3D',
                   heic:'refusé (message)', proprio:'refusé (explication export)', null:'refusé (message)' }[obtenu];
    const bon = obtenu === attendu;
    console.log('   ' + (bon ? 'OK  ' : 'ECHEC ') + nom.padEnd(12) + '-> ' + String(dest));
    if (!bon) failed = new Error('routage ' + nom + ' : ' + obtenu + ' au lieu de ' + attendu);
  }

  console.log('\n  DESTINATIONS DISPONIBLES');
  console.log('   emplacements muraux libres : ' + (g.findNextFreeSlot() !== null ? 'oui' : 'non'));
  console.log('   socles sonores libres      : ' + (g.findNextFreePedestal() !== null ? 'oui' : 'non'));
  console.log('   socles 3D                  : ' + g.plinths.length);
  console.log('   téléviseur présent         : ' + (g.TV && g.TV.screen ? 'oui' : 'NON'));
  console.log('   projections murales        : ' + g.projections.length);

  // les projecteurs sont-ils correctement placés ?
  console.log('\n  PLACEMENT DES PROJECTEURS');
  const HALLX = 24, HALLZ = 16, HALLH = 7.4;
  for (const p of g.projections) {
    const recul = p.W * 1.5;
    const px = p.pos.x + p.normal.x * recul, pz = p.pos.z + p.normal.z * recul;
    const dedans = Math.abs(px) < HALLX - 0.5 && Math.abs(pz) < HALLZ - 0.5;
    const hautOk = p.pos.y + p.H / 2 < HALLH - 0.4 && p.pos.y - p.H / 2 > 0.3;
    console.log('   Projection ' + (p.i + 1) + ' : image ' + p.W.toFixed(1) + '×' + p.H.toFixed(1) +
      ' m, recul ' + recul.toFixed(1) + ' m — projecteur ' + (dedans ? 'dans la salle' : 'HORS SALLE') +
      ', image ' + (hautOk ? 'entre sol et plafond' : 'HORS CADRE'));
    // le faisceau ne doit croiser aucune cimaise
    const cloisons = [
      {ax:'x', fixe:-8, de:-20, a:-8}, {ax:'x', fixe:-8, de:8, a:20},
      {ax:'x', fixe: 8, de:-20, a:-8}, {ax:'x', fixe: 8, de:8, a:20},
      {ax:'x', fixe: 0, de:-18, a:-6}, {ax:'x', fixe: 0, de:6, a:18},
      {ax:'z', fixe:-14, de:-6, a:6},  {ax:'z', fixe: 14, de:-6, a:6}
    ];
    let obstacle = null, marge = Infinity;
    for (const c of cloisons) {
      if (c.ax === 'x' && Math.abs(p.normal.z) > 0.5) {
        const zmin = Math.min(p.pos.z, pz), zmax = Math.max(p.pos.z, pz);
        if (c.fixe > zmin && c.fixe < zmax && p.pos.x > c.de - 0.5 && p.pos.x < c.a + 0.5) obstacle = c;
      }
      if (c.ax === 'z' && Math.abs(p.normal.x) > 0.5) {
        const xmin = Math.min(p.pos.x, px), xmax = Math.max(p.pos.x, px);
        if (c.fixe > xmin && c.fixe < xmax && p.pos.z > c.de - 0.5 && p.pos.z < c.a + 0.5) obstacle = c;
      }
      // dégagement derrière le projecteur
      if (c.ax === 'z' && Math.abs(p.normal.x) > 0.5 && p.pos.z > c.de - 0.5 && p.pos.z < c.a + 0.5) {
        const d2 = (c.fixe - px) * Math.sign(p.normal.x);
        if (d2 > 0) marge = Math.min(marge, d2);
      }
      if (c.ax === 'x' && Math.abs(p.normal.z) > 0.5 && p.pos.x > c.de - 0.5 && p.pos.x < c.a + 0.5) {
        const d = (c.fixe - pz) * Math.sign(p.normal.z);
        if (d > 0) marge = Math.min(marge, d);
      }
    }
    console.log('     faisceau ' + (obstacle ? 'COUPÉ par une cimaise' : 'dégagé') +
                (marge < Infinity ? ', recul disponible au-delà du projecteur : ' + marge.toFixed(1) + ' m' : ''));
    if (obstacle) failed = new Error('le faisceau ' + (p.i + 1) + ' traverse une cimaise');
    if (marge < 0.9) failed = new Error('projecteur ' + (p.i + 1) + ' trop près d\'une cimaise (' + marge.toFixed(1) + ' m)');
    if (!dedans) failed = new Error('projecteur ' + (p.i + 1) + ' hors de la salle');
    if (!hautOk) failed = new Error('image ' + (p.i + 1) + ' hors du mur');
  }
  // aucun cadre ne doit se trouver dans une image projetée
  let dansImage = 0;
  for (const s2 of g.slots) for (const p of g.projections) {
    const memeMur = Math.abs(s2.pos.x - p.pos.x) < 0.7 || Math.abs(s2.pos.z - p.pos.z) < 0.7;
    const d = Math.hypot(s2.pos.x - p.pos.x, s2.pos.z - p.pos.z);
    if (memeMur && d < p.W / 2) dansImage++;
  }
  console.log('   emplacements empiétant sur une image : ' + dansImage);
  if (dansImage) failed = new Error(dansImage + ' emplacement(s) dans une zone de projection');

  // le bouton « Remplacer » doit ouvrir le bon sélecteur selon la cible
  const clics = [];
  const HTMLInput = globalThis.window.HTMLInputElement;
  HTMLInput.prototype.click = function () { clics.push(this.id); };
  console.log('\n  BOUTON REMPLACER : SÉLECTEUR OUVERT');
  g.openTvPanel();
  globalThis.document.getElementById('fReplace').dispatchEvent(new globalThis.window.Event('click'));
  const tvOk = clics.includes('tvInput');
  console.log('   ' + (tvOk ? 'OK  ' : 'ECHEC ') + 'depuis le téléviseur -> ' + (clics[clics.length-1] || 'aucun'));
  if (!tvOk) failed = new Error('le téléviseur n\'ouvre pas le sélecteur vidéo');

  clics.length = 0;
  g.openEmptyPlinthPanel(0);
  const scOk = clics.includes('modelInput');
  console.log('   ' + (scOk ? 'OK  ' : 'ECHEC ') + 'depuis un socle 3D   -> ' + (clics[clics.length-1] || 'aucun'));
  if (!scOk) failed = new Error('le socle 3D n\'ouvre pas le sélecteur de modèle');
}

// --- traduction de l'interface ---
if (!failed && g) {
  console.log('\n  LANGUES');
  const doc = globalThis.document;
  const btnAdd = doc.querySelector('#btnAdd .lbl-txt');
  const h2Son  = doc.querySelector('#mixerModal h2');
  console.log('   langue détectée au démarrage : ' + g.getLangue());
  g.changerLangue('fr', true);                       // on repart du texte source
  const refFr  = { add: btnAdd.textContent, son: h2Son.textContent };
  console.log('   fr : « ' + refFr.add + ' » / « ' + refFr.son + ' »');
  for (const [code, nom] of g.LANGUES) {
    if (code === 'fr') continue;
    g.changerLangue(code, true);
    const a = btnAdd.textContent, b = h2Son.textContent;
    const traduit = a !== refFr.add && b !== refFr.son;
    console.log('   ' + code + ' : « ' + a + ' » / « ' + b + ' » ' + (traduit ? '' : '  <-- NON TRADUIT'));
    if (!traduit) failed = new Error('interface non traduite en ' + code);
  }
  // retour au français
  g.changerLangue('fr', true);
  const retourOk = btnAdd.textContent === refFr.add && h2Son.textContent === refFr.son;
  console.log('   retour au français : ' + (retourOk ? 'intact' : 'ECHEC'));
  if (!retourOk) failed = new Error('le retour au français ne restaure pas les textes');
  // vocabulaire des cartels
  // la coupole n'écrase-t-elle rien ?
  console.log('\n  COUPOLE');
  const D = g.DOME;
  console.log('   base ' + D.base + ' m, flèche ' + D.fleche + ' m, sommet à ' + D.sommet.toFixed(2) + ' m');
  const naissance = D.cy + D.R * Math.cos(D.theta);
  console.log('   naissance au plafond : ' + naissance.toFixed(2) + ' m (plafond 7.40)');
  if (Math.abs(naissance - 7.4) > 0.02) failed = new Error('la coupole ne rejoint pas le plafond');
  // aucun mur intérieur ne doit percer la coupole
  const cloisons = [[-20,-8,-8],[8,20,-8],[-20,-8,8],[8,20,8],[-18,-6,0],[6,18,0]];
  const HAUT_CIMAISE = 5.0;
  let percees = 0;
  for (const [x0, x1, z] of cloisons)
    for (let x = x0; x <= x1; x += 1)
      if (Math.hypot(x, z) < D.base && HAUT_CIMAISE > 7.4) percees++;
  console.log('   cimaises intérieures : ' + HAUT_CIMAISE + ' m, plafond 7.40 m — ' +
              (HAUT_CIMAISE < 7.4 ? 'passent sous la coupole' : 'TRAVERSENT l\'ouverture'));
  if (percees) failed = new Error('une cimaise traverse l\'ouverture de la coupole');
  // les rampes lumineuses restent hors de l'ouverture
  const rampes = [-13.5, -11, 11, 13.5];
  const dedans = rampes.filter(z => Math.abs(z) < D.base);
  console.log('   rampes dans l\'ouverture : ' + (dedans.length || 'aucune'));
  if (dedans.length) failed = new Error('une rampe lumineuse traverse la coupole');

  // atelier de peinture
  // mode VJ
  console.log('\n  MODE VJ');
  console.log('   modes disponibles : ' + g.VJ_MODES.map(m => m[1]).join(', '));
  if (g.VJ_MODES.length !== 4) failed = new Error('modes VJ incomplets');
  g.vjPreparer();                                   // prépare la toile et l'analyseur
  g.VJ.donnees = new Uint8Array(256).map((_, i) => Math.max(0, 220 - i));
  g.VJ.analyseur = { getByteFrequencyData(){} };     // signal simulé : graves forts
  console.log('   toile de rendu : ' + (g.VJ.canvas ? g.VJ.canvas.width + '×' + g.VJ.canvas.height : 'ABSENTE'));
  g.vjAnalyser();
  console.log('   analyse : grave ' + g.VJ.grave.toFixed(2) + ' · medium ' + g.VJ.medium.toFixed(2) +
              ' · aigu ' + g.VJ.aigu.toFixed(2));
  if (!(g.VJ.grave > g.VJ.aigu)) failed = new Error('bandes de fréquences mal séparées');
  for (const [id, nom] of g.VJ_MODES) {
    g.VJ.mode = id;
    try { g.vjDessiner(); console.log('   OK  ' + nom); }
    catch (e) { console.log('   ECHEC ' + nom + ' : ' + e.message);
      console.log(String(e.stack).split('\n').slice(1,5).join('\n'));
      failed = new Error('visuel ' + id); }
  }
  // état de repos AVANT toute intervention du VJ
  const avant = g.projections.map(p => ({ i:p.light.intensity, o:p.beam.material.opacity }));
  try { g.vjEclairer(); console.log('   OK  pilotage de la lumière'); }
  catch (e) { console.log('   ECHEC lumière : ' + e.message); failed = new Error('lumière VJ'); }
  g.VJ.actif = true; g.vjEclairer();
  const pendant = g.projections.map(p => p.light.intensity);
  g.vjBasculer(false);
  const apres = g.projections.map(p => p.light.intensity);
  const change = pendant.some((v, i) => v !== avant[i].i);
  const rendu  = apres.every((v, i) => v === 0 || v === avant[i].i);
  console.log('   projections modifiées pendant le VJ : ' + (change ? 'oui' : 'non') +
              ' — rendues à leur état en sortant : ' + (rendu ? 'oui' : 'NON'));
  if (!rendu) failed = new Error('le mode VJ laisse les projections allumées');

  console.log('\n  ATELIER DE PEINTURE');
  console.log('   surfaces peignables : ' + g.paintables.length + ' (murs + sol)');
  if (g.paintables.length < 10) failed = new Error('trop peu de surfaces peignables');
  const sol = g.paintables.find(p => p.id === 'sol');
  console.log('   sol présent : ' + (sol ? 'oui, ' + sol.w + '×' + sol.h + ' px' : 'NON'));
  if (!sol) failed = new Error('le sol n\'est pas peignable');
  const trop = g.paintables.filter(p => p.w > 1600 || p.h > 1600);
  console.log('   couches trop lourdes : ' + (trop.length || 'aucune'));
  if (trop.length) failed = new Error('couche de peinture au-delà de la limite');
  const memoire = g.paintables.reduce((a, p) => a + p.w * p.h * 4, 0) / 1048576;
  console.log('   mémoire des couches : ' + memoire.toFixed(0) + ' Mo');
  if (memoire > 260) failed = new Error('les couches de peinture consomment trop (' + memoire.toFixed(0) + ' Mo)');
  // chaque outil trace-t-il vraiment ?
  for (const nom of ['bombe', 'crayon', 'pinceau', 'seau']) {
    const c = g.paintables[0];
    c.ctx.clearRect(0, 0, c.w, c.h);
    g.ATELIER.outil = nom; g.ATELIER.couleur = '#ff0000'; g.ATELIER.taille = 1;
    g.peindreEn(c, 0.5, 0.5, { x: c.w * 0.4, y: c.h * 0.5 });
    const px = c.ctx.getImageData(0, 0, c.w, c.h).data;
    let peints = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] > 0) peints++;
    console.log('   ' + (peints > 0 ? 'OK  ' : 'ECHEC ') + nom.padEnd(9) + peints + ' pixels marqués');
    if (!peints) failed = new Error("l'outil " + nom + ' ne trace rien');
  }
  g.effacerPeinture();

  console.log('\n  CARTELS');
  const essais=[['huile sur toile','en'],['huile sur toile','cs'],['photographie numérique','de'],
                ['technique mixte','pl'],['bronze','it'],['Technique inventée','en']];
  for(const [t,code] of essais){
    g.changerLangue(code, true);
    console.log('   ' + code + ' : « ' + t + ' » -> « ' + g.techTraduite(t) + ' »');
  }
  g.changerLangue('fr', true);
  const inchange = g.techTraduite('huile sur toile') === 'huile sur toile';
  console.log('   fr : texte source inchangé — ' + (inchange ? 'oui' : 'NON'));
  if (!inchange) failed = new Error('le français ne doit pas être traduit');
  const couv = Object.keys(g.TECH_I18N).length;
  const nbT = Object.keys(g.TECH_I18N.cs || {}).length;
  console.log('   vocabulaire : ' + nbT + ' termes dans ' + couv + ' langues');
  if (couv !== 8) failed = new Error('vocabulaire incomplet');

  // couverture des dictionnaires
  const cles = Object.keys(g.I18N.en).length;
  const complets = Object.entries(g.I18N).every(([c, d]) => Object.keys(d).length === cles);
  console.log('   ' + Object.keys(g.I18N).length + ' dictionnaires de ' + cles + ' entrées — ' +
              (complets ? 'tous complets' : 'INCOMPLETS'));
  if (!complets) failed = new Error('dictionnaires incomplets');
}

if (failed) {
  console.log('ECHEC AU CHARGEMENT :', failed.message);
  console.log(String(failed.stack).split('\n').slice(0,4).join('\n'));
  process.exit(1);
}
console.log('OK — le module s\'exécute sans erreur au chargement');
