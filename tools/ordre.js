// Usage avant déclaration, au premier niveau uniquement.
const fs=require('fs');
const js=fs.readFileSync('galerie.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const lignes=js.split('\n');
let dansCommentaire=false;
function nettoie(l){                       // chaînes, gabarits et commentaires retirés
  let c=l.replace(/\\./g,'').replace(/'[^']*'/g,"''").replace(/"[^"]*"/g,'""').replace(/`[^`]*`/g,'``');
  if(dansCommentaire){ const f=c.indexOf('*/'); if(f<0) return ''; c=c.slice(f+2); dansCommentaire=false; }
  c=c.replace(/\/\*.*?\*\//g,'');
  const o=c.indexOf('/*'); if(o>=0){ dansCommentaire=true; c=c.slice(0,o); }
  return c.replace(/\/\/.*$/,'');
}
const decl=new Map(); let d=0; dansCommentaire=false;
lignes.forEach((l,i)=>{
  const c=nettoie(l);
  if(d===0){ const m=c.match(/^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/); if(m&&!decl.has(m[1])) decl.set(m[1],i); }
  d += (c.match(/[{(\[]/g)||[]).length - (c.match(/[}\)\]]/g)||[]).length;
});
const pb=[]; d=0; dansCommentaire=false;
lignes.forEach((l,i)=>{
  const c=nettoie(l);
  const avant=d;
  d += (c.match(/[{(\[]/g)||[]).length - (c.match(/[}\)\]]/g)||[]).length;
  if(avant!==0) return;                     // à l'intérieur d'un bloc : exécuté plus tard
  if(/^\s*(?:function|class)\b/.test(c)) return;
  if(/=>|function\s*\(/.test(c)) return;   // corps exécuté plus tard
  for(const [nom,ld] of decl){
    if(i>=ld) continue;
    if(new RegExp('\\b'+nom.replace(/\$/g,'\\$')+'\\b').test(c))
      pb.push({nom, usage:i+1, decl:ld+1, txt:l.trim().slice(0,72)});
  }
});
if(pb.length){
  console.log('USAGE AVANT DÉCLARATION (panne silencieuse) :');
  pb.slice(0,8).forEach(p=>console.log('  L'+p.usage+' utilise « '+p.nom+' » déclaré L'+p.decl+'\n    '+p.txt));
  process.exit(1);
}
console.log('ordre de déclaration : aucun usage anticipé au premier niveau');
