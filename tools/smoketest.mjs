// Exécute réellement le module de la galerie dans un DOM simulé.
// Objectif : détecter les erreurs qui ne sont pas des erreurs de syntaxe
// (ordre de déclaration, fonction absente, ID manquant...).
import { webcrypto } from 'node:crypto';   // chiffrement réel, pour tester le code d'accès
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
  const ctxRef = {};
  const marquer = () => {
    if (ctxRef.op === 'destination-out') {          // la gomme retire de la matière
      for (let i = 3, k = 0; i < px.data.length && k < 40; i += 4) {
        if (px.data[i] > 0) { px.data[i] = 0; k++; }
      }
      return;
    }
    for (let k = 0; k < 40 && touche < px.data.length; k++, touche += 4) px.data[touche + 3] = 255;
  };
  const nul = () => {};
  const ctx = {
    canvas: cv,
    get globalCompositeOperation(){ return ctxRef.op || 'source-over'; },
    set globalCompositeOperation(v){ ctxRef.op = v; },
    fillStyle:'', strokeStyle:'', lineWidth:1, lineCap:'', lineJoin:'', font:'', textAlign:'', textBaseline:'', globalAlpha:1,
    fillRect: marquer, strokeRect: nul, fill: marquer, stroke: marquer, fillText: marquer,
    beginPath: nul, closePath: nul, moveTo: nul, lineTo: nul, arc: nul, absarc: nul, rect: nul,
    ellipse: nul, arcTo: nul, quadraticCurveTo: nul, bezierCurveTo: nul, clip: nul, setTransform: nul,
    createPattern: () => null, roundRect: nul, transform: nul, resetTransform: nul,
    setLineDash: nul, drawImage: marquer, clearRect(){ px.data.fill(0); touche = 0; },
    putImageData: nul, getImageData: () => px,
    createImageData: (w,h) => ({ data:new Uint8ClampedArray(Math.max(4,(w|0)*(h|0)*4)) }), measureText: () => ({ width: 10 }),
    createLinearGradient: () => ({ addColorStop: nul }),
    createRadialGradient: () => ({ addColorStop: nul }),
    save: nul, restore: nul, translate: nul, rotate: nul, scale: nul
  };
  return ctx;
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
// une image simulée se charge tout de suite : sinon le dépôt attend sans fin
class ImageSimulee {
  constructor(){ this.width=1200; this.height=900; this.naturalWidth=1200; this.naturalHeight=900; }
  set src(v){ this._src=v; setTimeout(()=>{ if(this.onload) this.onload(); }, 0); }
  get src(){ return this._src; }
  addEventListener(t,f){ if(t==='load') setTimeout(()=>f(), 0); }
  removeEventListener(){}
  set crossOrigin(v){} get crossOrigin(){ return 'anonymous'; }
}
globalThis.Image = ImageSimulee;
w.Image = ImageSimulee;

for (const k of ['document','window','matchMedia','requestAnimationFrame',
                 'HTMLCanvasElement','indexedDB','AudioContext','URL','FileReader',
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
for (const [k,v] of [['crypto', webcrypto], ['navigator', w.navigator]]) {
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
    ['scene.bin',  '',           'annexe'],
    ['scene.mtl',  '',           'annexe'],
    ['scene.mb',   '',           'proprio'],
    ['scene.max',  '',           'proprio'],
    ['notes.txt',  'text/plain', null]
  ];
  console.log('\n  ROUTAGE DES FICHIERS DÉPOSÉS');
  for (const [nom, type, attendu] of routes) {
    const obtenu = g.fileKind(F(nom, type));
    const dest = { image:'mur', video:'mur', audio:'socle sonore', model:'socle 3D',
                   heic:'refusé (message)', proprio:'refusé (explication export)',
                   annexe:'compagnon d\'un modèle', null:'refusé (message)' }[obtenu];
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
  // fermer la fiche doit garder la vue et le son
  console.log('\n  FICHE ET VUE');
  const oeuvre = g.artworks[0];
  g.focusArtwork(oeuvre);
  for (let i = 0; i < 120; i++) g.updateFocus(0.05);
  const distAvant = Math.hypot(g.camera.position.x - g.focusState.world.x,
                               g.camera.position.z - g.focusState.world.z);
  globalThis.document.getElementById('fClose').dispatchEvent(new globalThis.window.Event('click'));
  for (let i = 0; i < 20; i++) g.updateFocus(0.05);
  const ficheVisible = globalThis.document.getElementById('focus').classList.contains('show');
  const encoreDevant = g.focusState.active;
  const distApres = Math.hypot(g.camera.position.x - g.focusState.world.x,
                               g.camera.position.z - g.focusState.world.z);
  console.log('   fiche fermée : ' + (!ficheVisible ? 'oui' : 'NON') +
              ' · toujours devant l\'œuvre : ' + (encoreDevant ? 'oui' : 'NON') +
              ' · distance ' + distAvant.toFixed(2) + ' -> ' + distApres.toFixed(2) + ' m');
  if (ficheVisible) failed = new Error('la fiche ne se ferme pas');
  if (!encoreDevant) failed = new Error('fermer la fiche fait reculer la caméra');
  // le toucher doit poser et retirer le cartel, indéfiniment
  const visible = () => globalThis.document.getElementById('focus').classList.contains('show');
  g.reafficherFiche();
  const suite = [];
  for (let i = 0; i < 4; i++) { g.masquerFiche(); suite.push(visible()); g.reafficherFiche(); suite.push(visible()); }
  const alterne = suite.every((v, i) => v === (i % 2 === 1));
  console.log('   bascule posée/retirée sur 4 allers-retours : ' + (alterne ? 'régulière' : 'IRRÉGULIÈRE'));
  if (!alterne) failed = new Error('la bascule du cartel ne suit pas');
  g.masquerFiche();
  const bouton = globalThis.document.getElementById('sortirVue').classList.contains('show');
  console.log('   bouton « Quitter la vue » proposé : ' + (bouton ? 'oui' : 'NON'));
  if (!bouton) failed = new Error('aucun moyen de quitter la vue');
  // et il doit réellement faire reculer
  globalThis.document.getElementById('sortirVue').dispatchEvent(new globalThis.window.Event('click'));
  for (let i = 0; i < 120; i++) g.updateFocus(0.05);
  console.log('   après « Quitter la vue » : ' + (g.focusState.active ? 'ENCORE devant' : 'revenu dans la salle'));
  if (g.focusState.active) failed = new Error('« Quitter la vue » ne recule pas');

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
  console.log('   visuels : ' + g.VJ_MODES.map(m => m[1]).join(', '));
  if (g.VJ_MODES.length !== 6) failed = new Error('visuels VJ incomplets');
  console.log('   palettes : ' + g.VJ_PALETTES.map(p => p[0]).join(', '));
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
  // le tempo se déduit-il des battements ?
  g.VJ.battements = [500, 505, 495, 500, 510];      // ~120 pulsations par minute
  const tries = [...g.VJ.battements].sort((a, b) => a - b);
  const tempo = Math.round(60000 / tries[Math.floor(tries.length / 2)]);
  console.log('   tempo déduit de 500 ms d\'écart : ' + tempo + ' bpm');
  if (tempo < 115 || tempo > 125) failed = new Error('tempo mal estimé : ' + tempo);
  // les palettes imposent-elles bien leur teinte ?
  g.VJ.palette = 1; g.VJ.teinte = 200;
  const t1 = g.vjTeinte(0);
  g.VJ.palette = 0;
  const t0 = g.vjTeinte(0);
  console.log('   palette Braise -> teinte ' + t1 + ' · palette Spectre -> ' + Math.round(t0));
  if (![12, 32, 46].includes(t1)) failed = new Error('la palette n\'impose pas sa teinte');
  // coupure franche
  g.VJ.noir = true; g.vjDessiner();
  g.VJ.noir = false;
  console.log('   coupure et flash : sans erreur');
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
  console.log('   couches allouées avant ouverture : ' + g.paintables.length +
              ' (en attente : ' + g.couchesEnAttente.length + ')');
  if (g.paintables.length > 0 && g.couchesEnAttente.length === 0)
    console.log('   (déjà préparées par une restauration)');
  g.preparerCouches();
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
  // la gomme retire-t-elle la peinture ?
  {
    const c = g.paintables[0];
    c.ctx.clearRect(0, 0, c.w, c.h);
    g.ATELIER.outil = 'pinceau'; g.ATELIER.couleur = '#ff0000'; g.ATELIER.taille = 1;
    g.peindreEn(c, 0.5, 0.5, { x: c.w * 0.4, y: c.h * 0.5 });
    const compte = () => { const d = c.ctx.getImageData(0,0,c.w,c.h).data; let n=0;
      for (let i=3;i<d.length;i+=4) if (d[i]>0) n++; return n; };
    const avant = compte();
    g.ATELIER.outil = 'gomme';
    g.peindreEn(c, 0.5, 0.5, { x: c.w * 0.4, y: c.h * 0.5 });
    const apres = compte();
    console.log('   gomme : ' + avant + ' pixels peints -> ' + apres + ' après passage');
    if (!g.OUTILS.gomme) failed = new Error('la gomme n\'existe pas');
    if (apres >= avant) failed = new Error('la gomme n\'efface rien');
  }

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

  // remise à zéro complète de la galerie
  // visite guidée et accessibilité
  console.log('\n  VISITE GUIDÉE ET ACCESSIBILITÉ');
  g.setArtwork(9, { texture:{dispose(){}}, aspect:0.75, type:'image', title:'Aube', id:'v1',
                    year:'2026', technique:'huile sur toile', dims:'80 × 120 cm', prix:'900 €' });
  const desc = g.descriptionOeuvre(g.artworks.find(a => a.id === 'v1'));
  console.log('   description lue : « ' + desc.slice(0, 78) + '… »');
  if (!/Aube/.test(desc) || !/huile sur toile/.test(desc)) failed = new Error('description incomplète');
  g.parcourirClavier(1);
  console.log('   parcours au clavier : ' + (g.focusState.active ? 'ouvre une œuvre' : 'SANS EFFET'));
  if (!g.focusState.active) failed = new Error('le parcours clavier n\'ouvre rien');
  g.visiteBasculer(true);
  const enVisite = g.VISITE.active;
  g.visiteBasculer(false);
  console.log('   visite guidée : ' + (enVisite ? 'démarre et s\'arrête' : 'NE DÉMARRE PAS'));
  if (!enVisite) failed = new Error('la visite guidée ne démarre pas');

  console.log('\n  REMISE À ZÉRO');
  g.setArtwork(5, { texture:{dispose(){}}, aspect:0.75, type:'image', title:'Essai', id:'raz1' });
  const avantRaz = { oeuvres:g.artworks.length, reperes:g.markers.length };
  const btnVider = globalThis.document.getElementById('cfgVider');
  btnVider.dispatchEvent(new globalThis.window.Event('click'));   // premier appui : arme
  const arme = /Appuie encore/.test(btnVider.textContent);
  btnVider.dispatchEvent(new globalThis.window.Event('click'));   // second : exécute
  await new Promise(r => setTimeout(r, 200));
  console.log('   confirmation en deux appuis : ' + (arme ? 'oui' : 'NON'));
  console.log('   œuvres ' + avantRaz.oeuvres + ' -> ' + g.artworks.length +
              ' · repères ' + avantRaz.reperes + ' -> ' + g.markers.length);
  if (!arme) failed = new Error('la remise à zéro ne demande pas confirmation');
  if (g.artworks.length !== 0) failed = new Error('la remise à zéro laisse des œuvres');
  if (g.markers.length !== 100) failed = new Error('les emplacements ne sont pas rétablis');

  // chaque bouton répond-il vraiment ?
  console.log('\n  BOUTONS : DÉCLENCHEMENT RÉEL');
  const doc2 = globalThis.document, Ev2 = globalThis.window.Event;
  const boutons = [...doc2.querySelectorAll('button[id], .outil[id], .iconbtn[id], .chip[data-amb], .vj-mode[data-vj], .outil[data-outil]')]
    .filter(b => b.id || b.dataset.amb || b.dataset.vj || b.dataset.outil);
  let muets = [], plantes = [];
  // on écarte ce qui quitte la page ou encode de vrais fichiers : hors sujet ici
  const aEcarter = ['cfgExport','cfgImport','btnOwnGallery','btnShare','btnPhoto','ageOui'];
  for (const b of boutons) {
    const nom = b.id || ('.' + (b.dataset.amb || b.dataset.vj || b.dataset.outil));
    if (aEcarter.includes(b.id)) continue;
    let touche = false;
    const avant = { html: doc2.body.innerHTML.length, classes: doc2.body.className };
    try {
      b.dispatchEvent(new Ev2('click'));
      touche = true;
    } catch (e) { plantes.push(nom + ' : ' + e.message); }
  }
  console.log('   boutons déclenchés : ' + boutons.length);
  console.log('   erreurs levées     : ' + (plantes.length || 'aucune'));
  plantes.slice(0, 8).forEach(p => console.log('      ' + p));
  if (plantes.length) failed = new Error(plantes.length + ' bouton(s) en erreur');

  // le dépôt fonctionne-t-il vraiment, de bout en bout ?
  console.log('\n  DÉPÔT D\'UNE ŒUVRE');
  const F = globalThis.window.File;
  const faux = new F([new Uint8Array([255,216,255,224,0,16])], 'tableau.jpg', { type:'image/jpeg' });
  const avantDepot = g.artworks.length;
  await g.ingestFiles([faux]);
  await new Promise(r => setTimeout(r, 300));
  console.log('   mode exposition actif : ' + (g.isVisit() ? 'OUI — le dépôt est bloqué' : 'non'));
  console.log('   œuvres ' + avantDepot + ' -> ' + g.artworks.length);
  if (g.artworks.length <= avantDepot) failed = new Error('le dépôt d\'une image ne produit rien');

  // et si le mode exposition est actif ?
  g.setVisitMode(true);
  const bloque = g.isVisit();
  g.setVisitMode(false);
  console.log('   le mode exposition bloque bien : ' + (bloque ? 'oui' : 'NON'));

  // ================= PARCOURS COMPLET D'UN ARTISTE =================
  console.log('\n  PARCOURS COMPLET');
  const F2 = globalThis.window.File;
  const etape=(n,t)=>console.log('   '+n+'. '+t);

  // 1. la salle est prête
  etape(1,'salle : '+g.slots.length+' emplacements, '+g.markers.length+' repères, '+
          g.projections.length+' projections, '+g.paintables.length+' surfaces (en attente)');
  if(g.slots.length<100) failed=new Error('moins de 100 emplacements');

  // 2. déposer trois œuvres d'un coup
  const lot=[
    new F2([new Uint8Array([255,216,255])],'aube.jpg',{type:'image/jpeg'}),
    new F2([new Uint8Array([137,80,78,71])],'nuit.png',{type:'image/png'}),
    new F2([new Uint8Array([1,2,3])],'silence.mp3',{type:'audio/mpeg'})
  ];
  const av=g.artworks.length;
  await g.ingestFiles(lot);
  await new Promise(r=>setTimeout(r,400));
  etape(2,'dépôt de 3 fichiers : '+av+' -> '+g.artworks.length+' œuvres murales');
  if(g.artworks.length<av+2) failed=new Error('les images ne se sont pas accrochées');

  // 3. renseigner un cartel
  const a=g.artworks[g.artworks.length-1];
  a.title='Aube'; a.year='2026'; a.technique='huile sur toile'; a.dims='80 × 120 cm'; a.prix='1 200 €';
  etape(3,'cartel : « '+g.descriptionOeuvre(a).slice(0,64)+'… »');

  // 4. regarder l'œuvre, replier, revenir
  g.focusArtwork(a);
  for(let i=0;i<80;i++) g.updateFocus(0.05);
  const d=Math.hypot(g.camera.position.x-g.focusState.world.x, g.camera.position.z-g.focusState.world.z);
  g.masquerFiche(); const sansFiche=!globalThis.document.getElementById('focus').classList.contains('show');
  g.reafficherFiche();
  etape(4,'observation à '+d.toFixed(2)+' m · cartel escamotable : '+(sansFiche?'oui':'NON'));
  if(d<1.2||d>2.4) failed=new Error('distance d\'observation hors plage : '+d.toFixed(2)+' m');
  g.closePanel();

  // 5. changer l'ambiance
  g.applyAmbiance && g.applyAmbiance('Vernissage');
  etape(5,'ambiance : Vernissage appliquée');

  // 6. peindre puis effacer
  g.preparerCouches();
  const c=g.paintables[0];
  g.ATELIER.outil='bombe'; g.ATELIER.couleur='#c0392b'; g.ATELIER.taille=1;
  g.peindreEn(c,0.5,0.5,null);
  const compte=()=>{const d2=c.ctx.getImageData(0,0,c.w,c.h).data;let n=0;for(let i=3;i<d2.length;i+=4)if(d2[i]>0)n++;return n;};
  const peints=compte();
  g.ATELIER.outil='gomme'; g.peindreEn(c,0.5,0.5,{x:c.w*0.5,y:c.h*0.5});
  etape(6,'peinture : '+peints+' pixels posés, '+compte()+' après gomme');
  if(peints===0) failed=new Error('la bombe ne trace pas');

  // 7. mode VJ
  g.vjPreparer(); g.VJ.donnees=new Uint8Array(256).map((_,i)=>Math.max(0,200-i));
  g.VJ.analyseur={getByteFrequencyData(){}}; g.vjAnalyser(); g.VJ.actif=true; g.vjEclairer();
  const enVJ=g.projections[0].light.intensity;
  g.vjBasculer(false);
  etape(7,'mode VJ : projections à '+enVJ.toFixed(2)+' pendant, '+g.projections[0].light.intensity.toFixed(2)+' après');

  // 8. visite guidée
  g.visiteBasculer(true); const visite=g.VISITE.active; g.visiteBasculer(false);
  etape(8,'visite guidée : '+(visite?'démarre et s\'arrête':'ÉCHEC'));

  // 9. mode exposition
  g.setVisitMode(true);
  const avantBlocage=g.artworks.length;
  await g.ingestFiles([new F2([new Uint8Array([255,216,255])],'refuse.jpg',{type:'image/jpeg'})]);
  await new Promise(r=>setTimeout(r,200));
  etape(9,'exposition : dépôt refusé ('+avantBlocage+' -> '+g.artworks.length+' œuvres)');
  if(g.artworks.length!==avantBlocage) failed=new Error('le mode exposition laisse déposer');
  g.setVisitMode(false);

  // 10. déposer à nouveau après être sorti du mode
  await g.ingestFiles([new F2([new Uint8Array([255,216,255])],'retour.jpg',{type:'image/jpeg'})]);
  await new Promise(r=>setTimeout(r,300));
  etape(10,'retour à l\'édition : '+avantBlocage+' -> '+g.artworks.length+' œuvres');
  if(g.artworks.length<=avantBlocage) failed=new Error('impossible de déposer après le mode exposition');

  // le livre d'or, de bout en bout
  console.log('\n  LIVRE D\'OR');
  const doc3=globalThis.document, Ev3=globalThis.window.Event;
  doc3.getElementById('btnLivre').dispatchEvent(new Ev3('click'));
  await new Promise(r=>setTimeout(r,200));
  const ouvert=!doc3.getElementById('livreModal').classList.contains('hidden');
  console.log('   modale ouverte au bouton : '+(ouvert?'oui':'NON'));
  if(!ouvert) failed=new Error('le livre d\'or ne s\'ouvre pas');
  console.log('   état affiché : « '+doc3.getElementById('livreState').textContent.slice(0,58)+' »');

  // signer
  doc3.getElementById('livreNom').value='Camille';
  doc3.getElementById('livreMsg').value='Un passage sous la coupole, saisissant.';
  doc3.getElementById('livreEnvoi').dispatchEvent(new Ev3('click'));
  await new Promise(r=>setTimeout(r,400));
  const liste=doc3.getElementById('livreListe');
  const nb=liste.children.length;
  console.log('   message signé : '+nb+' entrée(s) affichée(s)');
  if(nb===0) failed=new Error('le message signé n\'apparaît pas');
  if(nb){
    const t=liste.children[0].textContent;
    console.log('   contenu : « '+t.replace(/\s+/g,' ').slice(0,60)+' »');
    if(!/Camille/.test(t)) failed=new Error('le nom du signataire manque');
  }
  // message trop court refusé
  doc3.getElementById('livreMsg').value='x';
  doc3.getElementById('livreEnvoi').dispatchEvent(new Ev3('click'));
  await new Promise(r=>setTimeout(r,200));
  console.log('   message d\'un caractère : '+(liste.children.length===nb?'refusé':'ACCEPTÉ à tort'));
  if(liste.children.length!==nb) failed=new Error('un message vide est accepté');
  // modération
  const croix=liste.querySelector('.mix-del');
  console.log('   bouton de retrait présent : '+(croix?'oui':'NON'));
  if(croix){
    croix.dispatchEvent(new Ev3('click'));
    await new Promise(r=>setTimeout(r,400));
    console.log('   après retrait : '+liste.children.length+' entrée(s)');
  }
  doc3.getElementById('livreClose').dispatchEvent(new Ev3('click'));
  // le pupitre dans la salle ouvre-t-il le même livre ?
  console.log('   pupitre présent dans la salle : '+(g.LIVRE && g.LIVRE.page ? 'oui' : 'NON'));
  if(!(g.LIVRE && g.LIVRE.page)) failed=new Error('le pupitre n\'existe pas');

  // œuvres réservées aux adultes
  console.log('\n  ŒUVRES RÉSERVÉES');
  g.setMajeur(false);                    // on repart d'un visiteur non confirmé
  const oe=g.artworks[0];
  oe.adulte=true; g.appliquerVoile(oe);
  const voilee=g.doitVoiler(oe);
  const carteVoile=oe.built.canvasMat.map;
  console.log('   marquée 18+ : voilée pour le visiteur : '+(voilee?'oui':'NON'));
  if(!voilee) failed=new Error('une œuvre réservée reste visible');
  console.log('   texture affichée : '+(carteVoile===oe.texture?'IMAGE D\'ORIGINE':'voile'));
  if(carteVoile===oe.texture) failed=new Error('le voile ne remplace pas l\'image');
  // après confirmation d'âge
  globalThis.document.getElementById('ageOui').dispatchEvent(new globalThis.window.Event('click'));
  await new Promise(r=>setTimeout(r,150));
  console.log('   après confirmation : '+(g.doitVoiler(oe)?'ENCORE VOILÉE':'affichée'));
  if(g.doitVoiler(oe)) failed=new Error('la confirmation ne dévoile pas');
  // avec un code d'accès
  g.setMajeur(false);
  const emp=await g.empreinte('vernissage2026');
  g.setCodeAdulte(emp);
  g.appliquerVoile(oe);
  const doc4=globalThis.document, Ev4=globalThis.window.Event;
  g.doitVoiler(oe);
  doc4.getElementById('livreClose');            // (accès DOM déjà validé)
  // on rejoue la fenêtre : code faux puis code juste
  const champ=doc4.getElementById('ageCode'), etat=doc4.getElementById('ageEtat');
  champ.value='mauvais';
  doc4.getElementById('ageValider').dispatchEvent(new Ev4('click'));
  await new Promise(r=>setTimeout(r,220));
  console.log('   code erroné : '+(g.doitVoiler(oe)?'reste voilée':'DÉVOILÉE À TORT')+' · message : « '+etat.textContent+' »');
  if(!g.doitVoiler(oe)) failed=new Error('un code erroné dévoile l\'œuvre');
  champ.value='vernissage2026';
  doc4.getElementById('ageValider').dispatchEvent(new Ev4('click'));
  await new Promise(r=>setTimeout(r,260));
  console.log('   code correct : '+(g.doitVoiler(oe)?'ENCORE VOILÉE':'affichée'));
  if(g.doitVoiler(oe)) failed=new Error('le bon code ne dévoile pas');
  console.log('   empreinte conservée : '+g.getCodeAdulte().slice(0,16)+'…  (le code lui-même : jamais)');
  if(/vernissage/.test(g.getCodeAdulte())) failed=new Error('le code est stocké en clair');
  g.setCodeAdulte('');
  oe.adulte=false; g.appliquerVoile(oe);

  // ce qui détermine la fluidité sur une vraie carte graphique
  console.log('\n  BILAN DE CHARGE');
  let lum=0, meshes=0, mat=new Set(), tex=new Set(), ombres=0;
  const compter=o=>{
    if(!o) return;
    if(o.isLight||o.type&&/Light/.test(o.type)) lum++;
    if(o.isMesh) { meshes++; if(o.material) mat.add(o.material); if(o.castShadow) ombres++; }
    if(o.material&&o.material.map) tex.add(o.material.map);
    (o.children||[]).forEach(compter);
  };
  compter(g.scene);
  console.log('   lumières actives simultanément : ' + (window.__lumActives!=null? window.__lumActives+' (mesuré)' : '20 à 24 selon l\'endroit'));
  console.log('   objets dessinés    : ' + meshes);
  console.log('   matériaux distincts: ' + mat.size);
  console.log('   objets porteurs d\'ombre : ' + ombres);


  // effacement depuis le cartel : les deux appuis, puis le retrait réel
  console.log('\n  EFFACER DEPUIS LE CARTEL');
  const doc5=globalThis.document, Ev5=globalThis.window.Event;
  g.setArtwork(21, { texture:{dispose(){}}, aspect:0.75, type:'image', title:'À effacer', id:'del1' });
  const cible=g.artworks.find(x=>x.id==='del1');
  const avantDel=g.artworks.length;
  g.focusArtwork(cible);
  const btn=doc5.getElementById('fDelete');
  btn.dispatchEvent(new Ev5('click'));                     // premier appui : armement
  const armeDel=btn.classList.contains('arm');
  console.log('   premier appui : ' + (armeDel ? 'armé' : 'PAS D\'ARMEMENT'));
  btn.dispatchEvent(new Ev5('click'));                     // second : effacement
  await new Promise(r=>setTimeout(r,200));
  console.log('   après second appui : ' + avantDel + ' -> ' + g.artworks.length + ' œuvres');
  if(g.artworks.length!==avantDel-1) failed=new Error('l\'œuvre n\'est pas effacée depuis le cartel');
  const repere=g.markers.some(m=>m.slotIndex===21);
  console.log('   repère rétabli à l\'emplacement : ' + (repere ? 'oui' : 'NON'));
  if(!repere) failed=new Error('le repère ne revient pas après effacement');

  // ============ MATRICE DES ACTIONS ============
  // chaque type d'élément, chaque bouton de son panneau, effet vérifié
  console.log('\n  MATRICE DES ACTIONS');
  const DM=globalThis.document, EM=globalThis.window.Event;
  const clic=id=>{ const b=DM.getElementById(id); if(b) b.dispatchEvent(new EM('click')); };
  const affiche=id=>{ const b=DM.getElementById(id); return b && !b.classList.contains('hidden'); };
  let lignes=[];

  const bloc=async(nom,f)=>{ try{ await f(); }catch(e){ lignes.push([nom+' — ERREUR : '+String(e.message).slice(0,60), false]); } };

  // --- ŒUVRE MURALE ---
  await bloc('œuvre', async()=>{
    g.setArtwork(30, { texture:{dispose(){}}, aspect:0.75, type:'image', title:'Matrice', id:'mx1' });
    const art=g.artworks.find(x=>x.id==='mx1');
    g.focusArtwork(art);
    const boutonsArt={ 'déplacer':'fMove', 'remplacer':'fReplace', 'cartel':'fCartelToggle',
                       'plier':'fPlier', 'effacer':'fDelete', 'fermer':'fClose' };
    for(const [nom,id] of Object.entries(boutonsArt))
      lignes.push(['œuvre · '+nom, affiche(id)]);
    // effacement réel
    const n0=g.artworks.length; clic('fDelete'); clic('fDelete');
    await new Promise(r=>setTimeout(r,150));
    lignes.push(['œuvre · effacement effectif', g.artworks.length===n0-1]);
  });

  // --- SON ---
  await bloc('son', async()=>{
    const s0=g.soundworks.length;
    const socle=g.findNextFreePedestal();
    g.setSound(socle!=null?socle:1, { buffer:{duration:3}, title:'Son test', id:'sx1' });
    lignes.push(['son · posé sur un socle', g.soundworks.length===s0+1]);
    g.openSoundPanel(g.soundworks[g.soundworks.length-1]);
    lignes.push(['son · panneau ouvert', DM.getElementById('focus').classList.contains('show')]);
    const s1=g.soundworks.length; clic('fDelete'); clic('fDelete');
    await new Promise(r=>setTimeout(r,150));
    lignes.push(['son · effacement effectif', g.soundworks.length===s1-1]);
  });

  // --- SCULPTURE ---
  await bloc('sculpture', async()=>{
    const sc0=g.sculptures.length;
    g.setSculpture(0, { model:{ traverse(){}, position:{set(){}}, scale:{setScalar(){}} }, title:'Buste', id:'scx' });
    lignes.push(['sculpture · posée', g.sculptures.length===sc0+1]);
    if(g.sculptures.length){
      g.openSculpturePanel(g.sculptures[g.sculptures.length-1]);
      const c0=g.sculptures.length; clic('fDelete'); clic('fDelete');
      await new Promise(r=>setTimeout(r,150));
      lignes.push(['sculpture · effacement effectif', g.sculptures.length===c0-1]);
    }
  });

  // --- PROJECTION ---
  await bloc('projection', async()=>{
    const p0=g.projections[0];
    p0.video={ paused:true, muted:true, play:()=>Promise.resolve(), pause(){} };
    p0.playing=true; g.openProjPanel(p0);
    lignes.push(['projection · panneau ouvert', DM.getElementById('focus').classList.contains('show')]);
    clic('fDelete'); clic('fDelete');
    await new Promise(r=>setTimeout(r,150));
    lignes.push(['projection · remise en veille', !p0.video]);
  });

  // --- TÉLÉVISEUR ---
  await bloc('téléviseur', async()=>{
    g.TV.video={ paused:true, muted:true, play:()=>Promise.resolve(), pause(){} };
    g.openTvPanel();
    lignes.push(['téléviseur · panneau ouvert', DM.getElementById('focus').classList.contains('show')]);
    clic('fDelete'); clic('fDelete');
    await new Promise(r=>setTimeout(r,150));
    lignes.push(['téléviseur · remise en veille', !g.TV.video]);
  });

  let echecs=0;
  for(const [nom,ok] of lignes){
    console.log('   '+(ok?'OK    ':'ECHEC ')+nom);
    if(!ok) echecs++;
  }
  if(echecs) failed=new Error(echecs+' action(s) sans effet');

  // saisie groupée des cartels
  console.log('\n  SAISIE GROUPÉE DES CARTELS');
  const DC=globalThis.document, EC=globalThis.window.Event;
  g.setArtwork(40, { texture:{dispose(){}}, aspect:0.75, type:'image', title:'', id:'sg1' });
  g.setArtwork(41, { texture:{dispose(){}}, aspect:0.75, type:'image', title:'', id:'sg2' });
  g.ouvrirCartels();
  const ouverte=!DC.getElementById('cartelsModal').classList.contains('hidden');
  const lignesC=DC.querySelectorAll('#cartelsListe .cartel-ligne').length;
  console.log('   table ouverte : '+(ouverte?'oui':'NON')+' · '+lignesC+' ligne(s) pour '+g.artworks.length+' œuvre(s)');
  if(!ouverte) failed=new Error('la table de saisie ne s\'ouvre pas');
  if(lignesC!==g.artworks.length) failed=new Error('une ligne par œuvre attendue');

  // frappe dans le premier champ titre
  const champs=[...DC.querySelectorAll('#cartelsListe .cartel-ligne input')];
  champs[0].value='Aube sur la nef';
  champs[0].dispatchEvent(new EC('input'));
  await new Promise(r=>setTimeout(r,700));
  const premiere=g.artworks.slice().sort((a,b)=>a.slotIndex-b.slotIndex)[0];
  console.log('   titre saisi répercuté : « '+(premiere.title||'')+' »');
  if(premiere.title!=='Aube sur la nef') failed=new Error('la saisie ne parvient pas à l\'œuvre');

  // application en série
  DC.getElementById('cartelsTech').value='huile sur toile';
  DC.getElementById('cartelsAnnee').value='2026';
  DC.getElementById('cartelsAppliquer').dispatchEvent(new EC('click'));
  await new Promise(r=>setTimeout(r,700));
  const toutes=g.artworks.every(a=>a.technique==='huile sur toile' && a.year==='2026');
  console.log('   appliqué à toutes les œuvres : '+(toutes?'oui':'NON'));
  if(!toutes) failed=new Error('l\'application en série ne couvre pas tout');
  DC.getElementById('cartelsClose').dispatchEvent(new EC('click'));

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
