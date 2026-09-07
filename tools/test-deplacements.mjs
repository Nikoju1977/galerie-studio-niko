// Les déplacements : sens, collisions, limites de la salle.
const HALL={x:24,z:16};
// mêmes formules que dans la galerie
function avancer(yaw, f, s, dt, vitesse=3.4){
  const dir={x:s, z:f};
  const n=Math.hypot(dir.x,dir.z)||1; dir.x/=n; dir.z/=n;
  const sinY=Math.sin(yaw), cosY=Math.cos(yaw);
  const wx = dir.x*cosY - dir.z*sinY;
  const wz = -dir.x*sinY - dir.z*cosY;
  return { dx:wx*vitesse*dt, dz:wz*vitesse*dt };
}
let ko=0;
const dire=(t,ok,det='')=>{ console.log((ok?'  OK    ':'  ECHEC ')+t+(det?' — '+det:'')); if(!ok) ko++; };

console.log('  SENS DE MARCHE (avant = direction du regard)');
// yaw=PI : la caméra regarde vers +z
let r=avancer(Math.PI, 1, 0, 1);
dire('regard vers +z, avancer va vers +z', r.dz>3, 'dz='+r.dz.toFixed(2));
r=avancer(Math.PI, -1, 0, 1);
dire('reculer va vers -z', r.dz<-3, 'dz='+r.dz.toFixed(2));
r=avancer(Math.PI, 0, 1, 1);
dire('pas à droite est perpendiculaire', Math.abs(r.dx)>3 && Math.abs(r.dz)<0.01, 'dx='+r.dx.toFixed(2));
// yaw=0 : regard vers -z
r=avancer(0, 1, 0, 1);
dire('regard vers -z, avancer va vers -z', r.dz<-3, 'dz='+r.dz.toFixed(2));
// yaw=PI/2 : regard vers +x ? on vérifie la cohérence
r=avancer(Math.PI/2, 1, 0, 1);
dire('quart de tour : déplacement sur x', Math.abs(r.dx)>3 && Math.abs(r.dz)<0.01, 'dx='+r.dx.toFixed(2));

console.log('\n  DIAGONALE');
const d=avancer(Math.PI, 1, 1, 1);
const norme=Math.hypot(d.dx,d.dz);
dire('vitesse identique en diagonale', Math.abs(norme-3.4)<0.01, norme.toFixed(2)+' m/s');

console.log('\n  MURS ET OBSTACLES');
const colliders=[
  {minX:-20.15,maxX:-7.85,minZ:-8.35,maxZ:-7.65},{minX:7.85,maxX:20.15,minZ:-8.35,maxZ:-7.65},
  {minX:-20.15,maxX:-7.85,minZ:7.65,maxZ:8.35},{minX:7.85,maxX:20.15,minZ:7.65,maxZ:8.35},
  {minX:-18.15,maxX:-5.85,minZ:-0.35,maxZ:0.35},{minX:5.85,maxX:18.15,minZ:-0.35,maxZ:0.35}
];
function collide(p, rayon=0.4){
  const m=0.55;
  p.x=Math.max(-HALL.x+m,Math.min(HALL.x-m,p.x));
  p.z=Math.max(-HALL.z+m,Math.min(HALL.z-m,p.z));
  for(const b of colliders){
    if(p.x>b.minX-rayon&&p.x<b.maxX+rayon&&p.z>b.minZ-rayon&&p.z<b.maxZ+rayon){
      const dl=Math.abs(p.x-(b.minX-rayon)), dr=Math.abs((b.maxX+rayon)-p.x);
      const dt=Math.abs(p.z-(b.minZ-rayon)), db=Math.abs((b.maxZ+rayon)-p.z);
      const mn=Math.min(dl,dr,dt,db);
      if(mn===dl)p.x=b.minX-rayon; else if(mn===dr)p.x=b.maxX+rayon;
      else if(mn===dt)p.z=b.minZ-rayon; else p.z=b.maxZ+rayon;
    }
  }
  return p;
}
let p=collide({x:0,z:-30});
dire('mur nord infranchissable', p.z>=-HALL.z+0.54, 'z='+p.z.toFixed(2));
p=collide({x:40,z:0});
dire('mur est infranchissable', p.x<=HALL.x-0.54, 'x='+p.x.toFixed(2));
p=collide({x:-12,z:0});                       // en plein dans une cimaise centrale
dire('cimaise centrale repousse', Math.abs(p.z)>0.3, 'z='+p.z.toFixed(2));
p=collide({x:-12,z:-8});                      // dans une cimaise latérale
dire('cimaise latérale repousse', Math.abs(p.z+8)>0.3, 'z='+p.z.toFixed(2));

console.log('\n  PARCOURS COMPLET (marche de 60 s dans toutes les directions)');
let pos={x:0,z:0}, sorties=0, bloque=0;
for(let i=0;i<3600;i++){
  const yaw=(i/180)*Math.PI;
  const m=avancer(yaw,1,0,1/60);
  const avant={...pos};
  pos=collide({x:pos.x+m.dx, z:pos.z+m.dz});
  if(Math.abs(pos.x)>HALL.x-0.5 || Math.abs(pos.z)>HALL.z-0.5) sorties++;
  if(pos.x===avant.x && pos.z===avant.z) bloque++;
}
dire('jamais hors de la salle', sorties===0, sorties+' sortie(s)');
dire('jamais coincé définitivement', bloque<600, bloque+' images immobiles sur 3600');
console.log('    position finale : x='+pos.x.toFixed(1)+' z='+pos.z.toFixed(1));
console.log('\n  JOYSTICK TACTILE');
// dans le code : f = -joyVec.y  et  s = joyVec.x
const joy=(jx,jy)=>avancer(Math.PI, -jy, jx, 1);
let j=joy(0,-1);   // doigt vers le haut
dire('doigt vers le haut : on avance', j.dz>3, 'dz='+j.dz.toFixed(2));
j=joy(0,1);
dire('doigt vers le bas : on recule', j.dz<-3, 'dz='+j.dz.toFixed(2));
j=joy(1,0);
dire('doigt à droite : pas de côté', Math.abs(j.dx)>3 && Math.abs(j.dz)<0.01, 'dx='+j.dx.toFixed(2));
j=joy(0.7,-0.7);
dire('diagonale du joystick sans survitesse', Math.hypot(j.dx,j.dz)<=3.41, Math.hypot(j.dx,j.dz).toFixed(2)+' m/s');

console.log('\n  CE QUI DOIT ARRÊTER LA MARCHE');
import('fs').then(({default:fs})=>{
  const js=fs.readFileSync('galerie.html','utf8').match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  // on isole la fonction par comptage d'accolades, pas au jugé
  const i=js.indexOf('function updateWalk');
  let d=0, fin=i;
  for(let k=js.indexOf('{', i); k<js.length; k++){
    if(js[k]==='{') d++;
    else if(js[k]==='}'){ d--; if(d===0){ fin=k+1; break; } }
  }
  const w=js.slice(i, fin);
  const arrets=[['vue rapprochée d\'une œuvre','focusState.active'],['mode orbite',"mode!=='walk'"]];
  for(const [nom,motif] of arrets)
    dire('marche suspendue : '+nom, w.includes(motif));
  const bloqueAtelier=w.includes('ATELIER.actif');
  dire('marche possible pendant la peinture', !bloqueAtelier, bloqueAtelier?'BLOQUÉE à tort':'le joystick reste actif');
  process.exit(ko?1:0);
});
