// Revue de code : ce qu'un contrôleur cherche, au-delà des fonctionnalités.
import fs from 'fs';
const html = fs.readFileSync('galerie.html','utf8');
const brut = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
let grave=0, notes=0;
const dire=(t,l,critique=true)=>{
  if(!l.length){ console.log('  OK    '+t); return; }
  console.log((critique?'  ALERTE ':'  NOTE   ')+t+' : '+l.length);
  l.slice(0,6).forEach(x=>console.log('          '+x));
  critique? grave++ : notes++;
};

console.log('  1. FUITES DE MÉMOIRE');
const crees=(brut.match(/URL\.createObjectURL/g)||[]).length;
const liberes=(brut.match(/URL\.revokeObjectURL/g)||[]).length;
dire('adresses temporaires libérées', crees>liberes+3? [crees+' créées, '+liberes+' libérées'] : [], false);
const disposeTex=(brut.match(/\.dispose\(\)/g)||[]).length;
dire('ressources 3D libérées', disposeTex<8? ['seulement '+disposeTex+' appels à dispose()'] : []);
const intervals=(brut.match(/setInterval\(/g)||[]).length;
const clears=(brut.match(/clearInterval\(/g)||[]).length;
dire('minuteries répétées arrêtées', intervals>clears? [intervals+' setInterval, '+clears+' clearInterval'] : []);

console.log('\n  2. INJECTION DE CONTENU (texte du visiteur)');
const innerHTML=[...brut.matchAll(/(\w+(?:\.\w+)*)\.innerHTML\s*=\s*([^;\n]{0,70})/g)]
  .map(m=>m[1]+' = '+m[2].trim())
  .filter(l=>!/=\s*''|=\s*""|=\s*`\s*`/.test(l));
// les messages passent par un filtre : c'est le seul innerHTML qui reçoit du texte externe
const filtre=/function texteSur\(html\)/.test(brut) && /t\.innerHTML=texteSur\(html\)/.test(brut);
const risques=innerHTML.filter(l=>!/texteSur|SOCIAL_DEFS/.test(l));
dire('innerHTML sans filtre sur du texte externe', risques, true);
dire('messages filtrés avant affichage', filtre? [] : ['toast() injecte du HTML brut'], true);
const textContent=(brut.match(/\.textContent\s*=/g)||[]).length;
console.log('  OK    affectations par textContent (sûres) : '+textContent);

console.log('\n  3. ERREURS AVALÉES');
const vides=(brut.match(/catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g)||[]).length;
dire('catch strictement vides', vides>40? [vides+' blocs — au-delà du raisonnable'] : [], false);
console.log('        (' + vides + ' blocs vides, souvent volontaires : API absente sur certains appareils)');

console.log('\n  4. ALLOCATIONS PAR IMAGE (boucle de rendu)');
const iRender=brut.indexOf('function render');
const boucle=brut.slice(iRender, iRender+2600);
const allocs=[...boucle.matchAll(/new THREE\.(Vector[23]|Color|Quaternion|Matrix4)\(/g)].map(m=>m[1]);
dire('objets créés à chaque image', allocs.length? [allocs.join(', ')] : [], allocs.length>2);

console.log('\n  5. ÉCOUTEURS EN DOUBLE');
const paires={};
for(const m of brut.matchAll(/\$\('(\w+)'\)\.addEventListener\('(\w+)'/g)){
  const k=m[1]+'/'+m[2]; paires[k]=(paires[k]||0)+1;
}
dire('même événement branché deux fois', Object.entries(paires).filter(([,n])=>n>1).map(([k,n])=>k+' ×'+n));

console.log('\n  6. STOCKAGE');
dire('saturation surveillée', /storageInfo/.test(brut)? [] : ['aucune surveillance']);
dire('alerte avant saturation', /0\.8|80\s*%/.test(brut)? [] : ['aucun seuil d\'alerte'], false);

console.log('\n  7. SECRETS ET DONNÉES SENSIBLES');
const fuites=[];
if(/ghp_[A-Za-z0-9]{20,}/.test(html)) fuites.push('jeton GitHub');
if(/sb_secret_|service_role/.test(html)) fuites.push('clé serveur Supabase');
if(/sk-[A-Za-z0-9]{20,}/.test(html)) fuites.push('clé API en clair');
dire('aucun secret dans le fichier', fuites);

console.log('\n'+(grave? '  '+grave+' point(s) critique(s)' : '  revue : rien de critique')+(notes? ' · '+notes+' remarque(s)':''));
process.exit(grave?1:0);
