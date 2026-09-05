// Stub three.js suffisamment réaliste pour exécuter le module de bout en bout.
const mk = () => new Proxy(function(){}, {
  get(t,k){ if(k==='then') return undefined; if(!(k in t)) t[k]=mk(); return t[k]; },
  set(t,k,v){ t[k]=v; return true; }, apply(){ return mk(); }, construct(){ return mk(); }
});
export class Vector3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  clone(){return new Vector3(this.x,this.y,this.z);}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
  length(){return Math.hypot(this.x,this.y,this.z);}
  lengthSq(){return this.x**2+this.y**2+this.z**2;}
  setLength(l){const n=this.length()||1;return this.multiplyScalar(l/n);}
  normalize(){return this.setLength(1);}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);}
  lerpVectors(a,b,t){this.x=a.x+(b.x-a.x)*t;this.y=a.y+(b.y-a.y)*t;this.z=a.z+(b.z-a.z)*t;return this;}
  lerp(v,t){return this.lerpVectors(this,v,t);}
  setScalar(s){return this.set(s,s,s);}
  getWorldPosition(t){return (t||new Vector3()).copy(this);}
}
export class Vector2{ constructor(x=0,y=0){this.x=x;this.y=y;} set(x,y){this.x=x;this.y=y;return this;} }
export class Euler{ constructor(x=0,y=0,z=0,o='XYZ'){this.x=x;this.y=y;this.z=z;this.order=o;}
  setFromQuaternion(){return this;} }
export class Quaternion{
  constructor(x=0,y=0,z=0,w=1){this.x=x;this.y=y;this.z=z;this.w=w;}
  copy(q){this.x=q.x;this.y=q.y;this.z=q.z;this.w=q.w;return this;}
  clone(){return new Quaternion(this.x,this.y,this.z,this.w);}
  slerpQuaternions(a,b,t){ // suffisant pour un test : interpolation puis normalisation
    this.x=a.x+(b.x-a.x)*t; this.y=a.y+(b.y-a.y)*t;
    this.z=a.z+(b.z-a.z)*t; this.w=a.w+(b.w-a.w)*t;
    const n=Math.hypot(this.x,this.y,this.z,this.w)||1;
    this.x/=n;this.y/=n;this.z/=n;this.w/=n; return this;
  }
  setFromEuler(e){
    const c1=Math.cos(e.x/2),c2=Math.cos(e.y/2),c3=Math.cos(e.z/2);
    const s1=Math.sin(e.x/2),s2=Math.sin(e.y/2),s3=Math.sin(e.z/2);
    this.x=s1*c2*c3+c1*s2*s3; this.y=c1*s2*c3-s1*c2*s3;
    this.z=c1*c2*s3-s1*s2*c3; this.w=c1*c2*c3+s1*s2*s3; return this;
  }
  setFromRotationBasis(x,y,z){ // colonnes de la matrice de rotation
    const tr=x.x+y.y+z.z;
    if(tr>0){ const s=0.5/Math.sqrt(tr+1); this.w=0.25/s; this.x=(y.z-z.y)*s; this.y=(z.x-x.z)*s; this.z=(x.y-y.x)*s; }
    else if(x.x>y.y && x.x>z.z){ const s=2*Math.sqrt(1+x.x-y.y-z.z);
      this.w=(y.z-z.y)/s; this.x=0.25*s; this.y=(y.x+x.y)/s; this.z=(z.x+x.z)/s; }
    else if(y.y>z.z){ const s=2*Math.sqrt(1+y.y-x.x-z.z);
      this.w=(z.x-x.z)/s; this.x=(y.x+x.y)/s; this.y=0.25*s; this.z=(z.y+y.z)/s; }
    else { const s=2*Math.sqrt(1+z.z-x.x-y.y);
      this.w=(x.y-y.x)/s; this.x=(z.x+x.z)/s; this.y=(z.y+y.z)/s; this.z=0.25*s; }
    return this;
  }
}
export class Box3{
  setFromObject(){ this.min=new Vector3(-1,-1,-1); this.max=new Vector3(1,1,1); return this; }
  getSize(t){ return (t||new Vector3()).set(2,2,2); }
  getCenter(t){ return (t||new Vector3()).set(0,0,0); }
}
class Obj3D{
  constructor(){ this.position=new Vector3(); this.rotation=new Vector3(); this.scale=new Vector3(1,1,1);
    this.quaternion=new Quaternion(); this.children=[]; this.userData={}; this.visible=true; }
  add(...o){ this.children.push(...o); return this; }
  remove(){ return this; }
  traverse(fn){ fn(this); this.children.forEach(c=>c.traverse&&c.traverse(fn)); }
  getWorldPosition(t){ return (t||new Vector3()).copy(this.position); }
  updateMatrixWorld(){}
  lookAt(t){
    const cible = (t && t.x!==undefined) ? t : new Vector3();
    // three.js : une caméra regarde vers -Z, un objet ordinaire vers +Z
    const de = this.isCamera ? this.position : cible;
    const vers = this.isCamera ? cible : this.position;
    let z=new Vector3(de.x-vers.x, de.y-vers.y, de.z-vers.z);
    if(z.lengthSq()===0) z.z=1;
    z.normalize();
    let up=new Vector3(0,1,0);
    let x=new Vector3(up.y*z.z-up.z*z.y, up.z*z.x-up.x*z.z, up.x*z.y-up.y*z.x);
    if(x.lengthSq()===0){ z.x+=1e-4; z.normalize();
      x=new Vector3(up.y*z.z-up.z*z.y, up.z*z.x-up.x*z.z, up.x*z.y-up.y*z.x); }
    x.normalize();
    const y=new Vector3(z.y*x.z-z.z*x.y, z.z*x.x-z.x*x.z, z.x*x.y-z.y*x.x);
    this.quaternion.setFromRotationBasis(x,y,z);
  }
  setScalar(){}
}
export class Group extends Obj3D{}
export class Object3D extends Obj3D{}
export class Mesh extends Obj3D{
  constructor(geo,mat){ super(); this.geometry=geo||mk(); this.material=mat||mk(); this.isMesh=true; }
}
export class Scene extends Obj3D{ constructor(){ super(); this.background=mk(); this.fog=mk(); this.environment=null; } }
class Light extends Obj3D{ constructor(c,i){ super(); this.color=new Color(); this.intensity=i||1;
  this.target=new Object3D(); this.shadow={ mapSize:{set(){}}, camera:{}, bias:0 }; } }
export class SpotLight extends Light{ constructor(c,i){ super(c,i); this.isSpotLight=true; } }
export class PointLight extends Light{ constructor(c,i){ super(c,i); this.isPointLight=true; } }
export class DirectionalLight extends Light{}
export class HemisphereLight extends Light{}
export class AmbientLight extends Light{}
export class Color{
  constructor(){ this.r=this.g=this.b=1; }
  setHex(){return this;} setHSL(){return this;} offsetHSL(){return this;}
  copy(){return this;} clone(){return new Color();} lerp(){return this;}
  multiplyScalar(){return this;} set(){return this;}
}
export const MathUtils={ degToRad:d=>d*Math.PI/180, clamp:(v,a,b)=>Math.max(a,Math.min(b,v)) };
export const SRGBColorSpace='srgb', ACESFilmicToneMapping=1, PCFSoftShadowMap=1,
  BackSide=1, FrontSide=0, AdditiveBlending=2, NormalBlending=1,
  RepeatWrapping=1000, DoubleSide=2, LinearMipmapLinearFilter=1008, LinearFilter=1006;
export class PerspectiveCamera extends Object3D{
  constructor(fov=50,aspect=1,near=.1,far=1000){
    super(); this.fov=fov; this.aspect=aspect; this.near=near; this.far=far;
    this.isPerspectiveCamera=true; this.isCamera=true;
  }
  updateProjectionMatrix(){}
}
export class PlaneGeometry{
  constructor(width=1,height=1){ this.parameters={width,height}; this.type='PlaneGeometry'; }
  dispose(){}
}
export const SphereGeometry=mk(), ShapeGeometry=mk(), CircleGeometry=mk(), BoxGeometry=mk(), CylinderGeometry=mk(), TorusGeometry=mk(), ConeGeometry=mk(),
  IcosahedronGeometry=mk(), ExtrudeGeometry=mk(), Shape=mk(), Path=mk(),
  MeshStandardMaterial=mk(), MeshBasicMaterial=mk(), CanvasTexture=mk(), Texture=mk(), VideoTexture=mk(),
  FogExp2=mk(), WebGLRenderer=mk(), PMREMGenerator=mk(),
  Raycaster=mk(), AudioListener=mk(), PositionalAudio=mk(), AudioAnalyser=mk();
export class LoadingManager{ setURLModifier(f){ this.modif=f; return this; } }
export class Clock{ getDelta(){ return 0.016; } getElapsedTime(){ return 0; } }
