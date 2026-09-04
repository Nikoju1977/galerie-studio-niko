// Extrait la logique de reprise du fichier livré et la confronte à un serveur
// simulé qui répond 429, pour vérifier qu'elle récupère vraiment.
import fs from 'fs';
const src = fs.readFileSync('galerie.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1];
// on ne prend que la partie « appel réseau », sans l'interface
const debut = src.indexOf('const MISTRAL =');
const fin   = src.indexOf('async function persistArtworkMeta');
let bloc = src.slice(debut, fin);
bloc = bloc.slice(0, bloc.indexOf('/* --- image'));   // s'arrête avant le reste du module

let reponses = [];      // scénario
let appels = 0;
class FakeXHR {
  constructor(){ this.headers={}; }
  open(){} setRequestHeader(){} getResponseHeader(h){ return this.headers[h]||null; }
  send(){
    const r = reponses[Math.min(appels, reponses.length-1)]; appels++;
    setTimeout(()=>{
      this.status = r.status;
      this.responseText = JSON.stringify({ok:true, n:appels});
      if(r.retryAfter) this.headers['Retry-After']=String(r.retryAfter);
      this.onload();
    }, 1);
  }
}
globalThis.XMLHttpRequest = FakeXHR;
globalThis.AI = { endpoint:'x', key:'k' };
globalThis.toast = (t)=>messages.push(String(t).replace(/<[^>]+>/g,''));
let messages = [];
const mod = new Function(bloc + '; return {xhrJSON, MISTRAL};')();

async function scenario(nom, plan, attenduOk){
  reponses = plan; appels = 0; messages = [];
  mod.MISTRAL.dernier = 0; mod.MISTRAL.minInterval = 20;   // test accéléré
  const t0 = Date.now();
  let ok=false, err;
  try { await mod.xhrJSON({}); ok = true; } catch(e){ err = e.message; }
  const d = Date.now()-t0;
  const verdict = ok === attenduOk;
  console.log((verdict?'  OK   ':'  ECHEC ') + nom.padEnd(42) +
    (ok ? 'réussi après '+appels+' appel(s)' : 'échec : '+err) + ' — ' + d + ' ms');
  if(messages.length) console.log('        message affiché : « '+messages[0]+' »');
  return verdict;
}

let tout = true;
tout &= await scenario('réponse immédiate',            [{status:200}], true);
tout &= await scenario('429 puis succès',              [{status:429},{status:200}], true);
tout &= await scenario('429 ×3 puis succès',           [{status:429},{status:429},{status:429},{status:200}], true);
tout &= await scenario('429 permanent (quota épuisé)', [{status:429}], false);
tout &= await scenario('429 avec Retry-After: 1 s',    [{status:429,retryAfter:1},{status:200}], true);
tout &= await scenario('503 momentané puis succès',    [{status:503},{status:200}], true);
tout &= await scenario('401 clé invalide (pas de reprise)', [{status:401}], false);
process.exit(tout ? 0 : 1);
