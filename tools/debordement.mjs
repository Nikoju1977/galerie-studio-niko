// Les textes tiennent-ils dans leur conteneur, dans les neuf langues ?
// Un libellé allemand ou polonais fait souvent 30 à 60 % de plus qu'en français.
import fs from 'fs';
const html = fs.readFileSync('galerie.html','utf8');
const js   = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const I18N = JSON.parse(js.match(/const I18N=(\{[\s\S]*?\});/)[1]);
let ko=0, alertes=[];

// largeur approchée : Cinzel et Cormorant sont des serif étroites
const LARGEURS={ 'Cinzel':0.62, 'Cormorant':0.46 };
function largeur(txt, px, police='Cormorant', espacement=0){
  return txt.length * px * LARGEURS[police] + txt.length*espacement;
}
function mesurer(nom, fr, contenant, px, police, espacement=0, marge=0){
  const utile = contenant - marge;
  const langues = ['fr', ...Object.keys(I18N)];
  let pire=null;
  for(const l of langues){
    const t = l==='fr' ? fr : (I18N[l][fr] || fr);
    const w = largeur(t, px, police, espacement);
    if(!pire || w>pire.w) pire={l, t, w};
  }
  const ok = pire.w <= utile;
  if(!ok){ ko++; alertes.push(nom+' ('+pire.l+')'); }
  console.log((ok?'  OK    ':'  ECHEC ')+nom.padEnd(30)+
    'pire : '+pire.l+' « '+pire.t.slice(0,26)+' » '+Math.round(pire.w)+'/'+utile+' px');
}

console.log('  BOUTONS DU MENU  (largeur utile : 300px/2 - marges = 128 px de texte)');
for(const t of ['Peindre','Sons','Curateur','Vue','Plein écran','Visite','Photo','Qualité',
                'Artiste','Livre d\'or','Aide'])
  mesurer(t, t, 128, 15, 'Cormorant');

console.log('\n  INTITULÉS DE GROUPE  (largeur du menu : 272 px)');
for(const t of ['CRÉER','PRÉSENTER','LA GALERIE'])
  mesurer(t, t, 272, 10, 'Cinzel', 1.6);

console.log('\n  PANNEAU D\'ÉCLAIRAGE  (étiquette : 200 px avant la valeur)');
for(const t of ['Exposition','Chaleur','Spots des œuvres','Lumière ambiante','Éclat','Puits de lumière'])
  mesurer(t, t, 200, 15, 'Cormorant');

console.log('\n  CHAMPS DE LA FICHE ARTISTE  (largeur : 300 px - 48 de marges)');
for(const t of ['Nom de la galerie','Texte de présentation','Nom de l\'artiste',
                'Biographie / démarche','Signature affichée en haut','Code d\'invitation',
                'Courriel de contact','Adresse souhaitée'])
  mesurer(t, t, 252, 14, 'Cormorant');

console.log('\n  BOUTONS PLEINE LARGEUR  (252 px)');
for(const t of ['Exporter la galerie','Restaurer une sauvegarde','Vider la galerie',
                'Copier mon lien public','Retirer ma galerie du serveur','Activer le curateur',
                'Générer le manifeste d\'exposition','Déposer des musiques','Signer le livre d\'or'])
  mesurer(t, t, 252, 15, 'Cormorant');

console.log('\n  VISUELS DU MODE VJ  (pastille : 74 px)');
for(const t of ['Pulsations','Spectre','Ondes','Tunnel','Kaléido','Strobo'])
  mesurer(t, t, 74, 11, 'Cinzel', 0.55);

// les cadres qui coupent proprement plutôt que de déborder
import fs2 from 'fs';
const css=fs2.readFileSync('galerie.html','utf8').match(/<style>([\s\S]*?)<\/style>/)[1];
console.log('\n  GARDE-FOUS');
for(const [nom,motif] of [
  ['libellés du menu', /\.btn\.menu-item \.lbl-txt\{overflow:hidden;text-overflow:ellipsis/],
  ['boutons pleine largeur', /\.cta,\.ghost,\.reset\{overflow:hidden;text-overflow:ellipsis/],
  ['étiquettes des curseurs', /\.slider-row label\{[^}]*overflow:hidden/],
  ['pastilles du mode VJ', /\.vj-mode\{max-width:22vw;overflow:hidden/],
  ['compteur', /\.counter\{white-space:nowrap;max-width:70vw/]
]){
  const ok=motif.test(css); if(!ok) ko++;
  console.log((ok?'  OK    ':'  ECHEC ')+nom);
}
console.log('\n'+(ko? '  '+ko+' problème(s) : '+alertes.join(', ') : '  aucun texte ne déborde'));
process.exit(ko?1:0);
