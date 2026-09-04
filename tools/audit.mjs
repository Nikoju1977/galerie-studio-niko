// Audit statique : défauts que le test d'exécution ne peut pas voir.
import fs from 'fs';
const html = fs.readFileSync('galerie.html', 'utf8');
const brut = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const css  = html.match(/<style>([\s\S]*?)<\/style>/)[1];

/* Analyseur : neutralise commentaires, chaînes et littéraux régonaux.
   Une expression régulière ne suffit pas — une apostrophe dans un
   commentaire français décale tout le reste du fichier. */
function neutraliser(src){
  let out='', i=0, n=src.length;
  const prec=()=>{ for(let k=out.length-1;k>=0;k--){ const c=out[k]; if(!/\s/.test(c)) return c; } return ''; };
  while(i<n){
    const c=src[i], d=src[i+1];
    if(c==='/' && d==='*'){ const f=src.indexOf('*/',i+2); i=(f<0?n:f+2); out+=' '; continue; }
    if(c==='/' && d==='/'){ const f=src.indexOf('\n',i); i=(f<0?n:f); out+=' '; continue; }
    if(c==="'" || c==='"' || c==='`'){
      const q=c; i++;
      while(i<n && src[i]!==q){ if(src[i]==='\\') i++; i++; }
      i++; out+=q+q; continue;
    }
    if(c==='/' && /[=(,:[!&|?+\-*%;{}\n]/.test(prec()||'\n')){   // littéral régonal
      let j=i+1, cls=false;
      while(j<n){ const e=src[j];
        if(e==='\\'){ j+=2; continue; }
        if(e==='[') cls=true; else if(e===']') cls=false;
        else if(e==='/' && !cls) break;
        else if(e==='\n') break;
        j++; }
      if(src[j]==='/'){ i=j+1; while(i<n && /[a-z]/.test(src[i])) i++; out+='/re/'; continue; }
    }
    out+=c; i++;
  }
  return out;
}
const js = neutraliser(brut);

let ko = 0;
const dire = (t, liste, grave=true) => {
  if (!liste.length) { console.log('  OK    ' + t); return; }
  console.log((grave ? '  ECHEC ' : '  NOTE  ') + t + ' : ' + liste.length);
  liste.slice(0, 6).forEach(x => console.log('        ' + x));
  if (grave) ko++;
};

// 1. fonctions définies deux fois (la seconde écrase la première, en silence)
const defs = {};
for (const m of js.matchAll(/(?:^|[^.\w$])(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm))
  defs[m[1]] = (defs[m[1]] || 0) + 1;
dire('fonctions définies plusieurs fois', Object.entries(defs).filter(([,n]) => n > 1).map(([n,c]) => n + ' ×' + c));

// 2. fonctions appelées mais jamais définies
const globales = new Set(['if','for','while','switch','catch','return','typeof','new','await','function',
  'Math','JSON','Object','Array','String','Number','Boolean','Promise','Set','Map','Date','Error','parseInt',
  'parseFloat','isFinite','isNaN','setTimeout','setInterval','clearTimeout','clearInterval','requestAnimationFrame',
  'console','document','window','navigator','location','atob','btoa','encodeURIComponent','decodeURIComponent',
  'URL','Blob','File','FileReader','Image','Audio','XMLHttpRequest','TextEncoder','TextDecoder','crypto',
  'indexedDB','screen','fetch','alert','prompt','confirm','Uint8Array','ArrayBuffer','THREE','Response',
  'CompressionStream','DecompressionStream','URLSearchParams','CanvasRenderingContext2D','performance','structuredClone',
  'matchMedia','addEventListener','removeEventListener','getComputedStyle','requestIdleCallback','queueMicrotask',
  'Uint8ClampedArray','Float32Array','Int32Array','WeakMap','WeakSet','Symbol','Proxy','Reflect','RegExp','Intl']);
const declarees = new Set([...Object.keys(defs),
  ...[...js.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)].map(m => m[1]),
  ...[...js.matchAll(/(?:const|let|var)\s*\{([^}]+)\}\s*=/g)].flatMap(m => m[1].split(',').map(s => s.trim().split(':').pop().trim())),
  ...[...js.matchAll(/import\s+\{([^}]+)\}/g)].flatMap(m => m[1].split(',').map(s => s.trim())),
  ...[...js.matchAll(/function\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)/g)].flatMap(m => m[1].split(',').map(s => s.trim().split('=')[0].trim())),
  ...[...js.matchAll(/\(?([A-Za-z_$][\w$]*)\)?\s*=>/g)].map(m => m[1]),
  ...[...js.matchAll(/for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1]),
  ...[...js.matchAll(/catch\s*\(\s*([A-Za-z_$][\w$]*)/g)].map(m => m[1]),
  // méthodes abrégées d'objet : async put(rec){ … }
  ...[...js.matchAll(/(?:^|[,{]\s*)(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm)].map(m => m[1])]);
const appels = new Set([...js.matchAll(/(?:^|[^.\w$?])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1])
  .filter(n => !/^(else|do|try|finally|in|of|instanceof|delete|void|yield|case|async|await|typeof|return|new)$/.test(n)));
dire('fonctions appelées mais non définies',
  [...appels].filter(n => !declarees.has(n) && !globales.has(n)));

// 3. classes CSS employées par le code mais absentes de la feuille de style
const classesJS = new Set([...brut.matchAll(/classList\.(?:add|toggle|remove)\('([a-zA-Z0-9_-]+)'/g)].map(m => m[1]));
dire('classes CSS utilisées mais non définies',
  [...classesJS].filter(c => !new RegExp('\\.' + c + '[\\s,{:.]').test(css) && c !== 'hidden'));

// 4. types enregistrés vs types relus au démarrage
const ecrits = new Set([...brut.matchAll(/safeStorage\.put\(\{[^}]*type:'([a-z]+)'/g)].map(m => m[1]));
const relus  = new Set([...brut.matchAll(/rec\.type==='([a-z]+)'/g)].map(m => m[1]));
const jamaisRelus = [...ecrits].filter(t => !relus.has(t) && !['image','vault','config','pubtokens','livreor'].includes(t));   // lus à la demande, pas au lancement
dire('types enregistrés jamais restaurés au lancement', jamaisRelus);

// 5. champs de fichiers déclarés mais jamais ouverts
const inputs = [...html.matchAll(/<input type="file" id="([^"]+)"/g)].map(m => m[1]);
dire('sélecteurs de fichiers jamais ouverts',
  inputs.filter(id => !new RegExp("\\$\\('" + id + "'\\)\\.click\\(\\)").test(brut)));

// 6. boutons sans gestionnaire
const boutons = [...html.matchAll(/<button[^>]*id="([^"]+)"/g)].map(m => m[1]);
dire('boutons sans action associée',
  boutons.filter(id => !new RegExp("\\$\\('" + id + "'\\)\\.addEventListener").test(brut)));

// 7. traces de mise au point oubliées
dire('traces de mise au point restantes',
  [...js.matchAll(/console\.(log|debug)\(/g)].map(m => m[0]), false);
dire('mentions TODO / FIXME', [...js.matchAll(/TODO|FIXME|XXX/g)].map(m => m[0]));

console.log(ko ? '\n  ' + ko + ' point(s) à corriger' : '\n  audit statique : rien à signaler');
process.exit(ko ? 1 : 0);
