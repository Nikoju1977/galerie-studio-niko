// La qualité adaptative descend-elle vraiment, et s'arrête-t-elle ?
let bloom={enabled:true}, pr=2, ombres=true, toasts=[];
const FLUIDITE={images:0,temps:0,baisses:0,prevenu:false};
function surveiller(dt, ips_simule){
  FLUIDITE.images += ips_simule*dt; FLUIDITE.temps += dt;
  if(FLUIDITE.temps < 4) return;
  const ips = FLUIDITE.images/FLUIDITE.temps;
  FLUIDITE.images=0; FLUIDITE.temps=0;
  if(ips < 26 && FLUIDITE.baisses < 3){
    FLUIDITE.baisses++;
    if(FLUIDITE.baisses===1) bloom.enabled=false;
    else if(FLUIDITE.baisses===2) pr=Math.max(1, pr*0.75);
    else { ombres=false; }
    if(!FLUIDITE.prevenu){ FLUIDITE.prevenu=true; toasts.push('allégé'); }
  }
}
function scenario(nom, ips){
  bloom={enabled:true}; pr=2; ombres=true; toasts=[];
  Object.assign(FLUIDITE,{images:0,temps:0,baisses:0,prevenu:false});
  for(let t=0;t<40;t++) surveiller(1, ips);      // 40 s de fonctionnement
  console.log("  "+nom.padEnd(30)+"paliers: "+FLUIDITE.baisses+
    " | halo:"+(bloom.enabled?"on ":"off")+" | définition:"+pr.toFixed(2)+
    " | ombres:"+(ombres?"on ":"off")+" | messages:"+toasts.length);
  return FLUIDITE.baisses;
}
const a=scenario("appareil fluide (60 i/s)", 60);
const b=scenario("appareil moyen (30 i/s)", 30);
const c=scenario("appareil lent (14 i/s)", 14);
console.log();
console.log(a===0 ? "  OK   un appareil fluide n'est jamais dégradé" : "  ECHEC dégradation injustifiée");
console.log(b===0 ? "  OK   30 i/s jugé acceptable, rien n'est touché" : "  ECHEC dégradation à 30 i/s");
console.log(c===3 ? "  OK   appareil lent : 3 paliers puis arrêt" : "  ECHEC paliers: "+c);
