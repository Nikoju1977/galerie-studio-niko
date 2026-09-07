import fs from 'fs';
const js=fs.readFileSync('galerie.html','utf8');
const m=js.match(/function texteSur\(html\)\{[\s\S]*?\n\}/)[0];
const texteSur=new Function('return ('+m.replace('function texteSur','function')+')')();
const actives=s=>(s.match(/<[^>]+>/g)||[]).filter(t=>!/^<\/?b>$|^<br>$/.test(t));
const cas=['<img src=x onerror=alert(1)>.jpg','<script>alert(1)</scr'+'ipt>','<svg onload=alert(1)>',
           '"><b onclick=alert(1)>x','<b>gras</b> légitime','ligne1<br>ligne2','Aube & Nuit'];
let ko=0;
for(const e of cas){
  const r=texteSur(e), rest=actives(r);
  const ok=rest.length===0;
  if(!ok) ko++;
  console.log((ok?'  OK     ':'  ALERTE ')+'« '+e.slice(0,32)+' »'+(ok?'':'  -> '+rest.join(' ')));
}
console.log(ko? '\n  '+ko+' cas dangereux' : '\n  seuls le gras et le retour à la ligne subsistent');
process.exit(ko?1:0);
