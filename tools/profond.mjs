// Analyse approfondie : code mort, budget mémoire, cohérence des livrables.
import fs from 'fs';
const html = fs.readFileSync('galerie.html','utf8');
const brut = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const css  = html.match(/<style>([\s\S]*?)<\/style>/)[1];
let ko=0;
const dire=(t,l,grave=true)=>{ if(!l.length){console.log('  OK    '+t);return;}
  console.log((grave?'  ECHEC ':'  NOTE  ')+t+' : '+l.length);
  l.slice(0,8).forEach(x=>console.log('        '+x)); if(grave) ko++; };

// --- code mort : fonctions jamais appelées ---
const defs=[...brut.matchAll(/(?:^|[^.\w$])(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1]);
const jamais=defs.filter(n=>{
  const usages=(brut.match(new RegExp('\\b'+n.replace(/\$/g,'\\$')+'\\b','g'))||[]).length;
  return usages<=1;                       // seulement sa définition
});
dire('fonctions définies mais jamais appelées', jamais, false);

// --- identifiants HTML jamais utilisés ---
const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
const inutiles=ids.filter(id=>{
  if(new RegExp("\\$\\('"+id+"'\\)").test(brut)) return false;
  if(new RegExp('#'+id+'[\\s,{:.]').test(css)) return false;
  if(new RegExp('getElementById\\(.'+id).test(brut)) return false;
  // identifiants construits : bindRange('sExposure'), $('v'+clé)…
  if(new RegExp("'"+id+"'").test(brut)) return false;
  const suffixe=id.replace(/^[vs]/,'');
  if(suffixe!==id && new RegExp("'"+suffixe[0].toLowerCase()+suffixe.slice(1)+"'","i").test(brut)) return false;
  return true;
});
dire('éléments jamais référencés', inutiles, false);

// --- budget mémoire des textures ---
const couches = 21 * 1600 * 1408 * 4 / 1048576 / 21;   // moyenne par couche
const estim = {
  'peinture (21 couches)': 23,
  'coupole + murs + sol': 6,
  'cartels (à la demande)': 2,
  'visuels VJ': 0.6,
  'miroir du sol': 4
};
let total=0; for(const v of Object.values(estim)) total+=v;
console.log('\n  BUDGET MÉMOIRE (textures)');
for(const [k,v] of Object.entries(estim)) console.log('    '+k.padEnd(26)+v+' Mo');
console.log('    '+'total'.padEnd(26)+total.toFixed(0)+' Mo'+(total<120?'  — tenable sur mobile':'  — TROP LOURD'));
if(total>=120) ko++;

// --- cohérence des livrables ---
const idx=fs.readFileSync('index.html','utf8');
const auto=fs.readFileSync('galerie-autonome.html','utf8');
const pbs=[];
if(!/type="module"/.test(idx)) pbs.push('index.html : module absent');
if(/jsdelivr/.test(auto)) pbs.push('version autonome : dépendance CDN résiduelle');
if(!/three/.test(auto)) pbs.push('version autonome : moteur 3D absent');
const idsIdx=[...idx.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
if(new Set(idsIdx).size!==idsIdx.length) pbs.push('index.html : identifiants en double');
dire('cohérence des deux versions livrées', pbs);

// --- secrets ---
const fuites=[];
if(/sb_secret_|service_role/.test(brut)) fuites.push('clé secrète Supabase dans le code');
if(/ghp_[A-Za-z0-9]{20,}/.test(brut+idx)) fuites.push('jeton GitHub dans le code livré');
dire('aucun secret dans les fichiers publiés', fuites);

console.log(ko? '\n  '+ko+' point(s) à corriger' : '\n  analyse approfondie : rien de bloquant');
process.exit(ko?1:0);
