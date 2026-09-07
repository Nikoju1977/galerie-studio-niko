import { Vector3 } from './three-stub.js';
/* Les modules additionnels simulés. Les contrôles d'orbite ont besoin
   d'une vraie cible : sinon le zoom tente de soustraire un objet vide. */
function mk(){
  return class {
    constructor(){
      this.target = new Vector3(0, 1.6, 0);
      this.position = new Vector3();
      this.rotation = { x:0, y:0, z:0, order:'XYZ', set(){}, copy(){ return this; } };
      this.scale = new Vector3(1,1,1);
      this.material = { dispose(){}, needsUpdate:false };
      this.geometry = { dispose(){}, computeVertexNormals(){}, boundingBox:null };
      this.children = []; this.visible = true;
      this.castShadow = this.receiveShadow = false;
      this.renderOrder = 0; this.matrixAutoUpdate = true;
      this.uniforms = {}; this.strength = 0; this.threshold = 0; this.radius = 0;
      this.object = { position: new Vector3() };
      this.enabled = true; this.enableDamping = true;
      this.minDistance = 0.1; this.maxDistance = 100;
      this.minPolarAngle = 0; this.maxPolarAngle = Math.PI;
      this.scene = { environment: null };
      this.domElement = null;
    }
    update(){ return this; }
    dispose(){}
    addEventListener(){} removeEventListener(){}
    setSize(){} render(){} addPass(){} parse(){ return {}; }
    load(){} setPath(){ return this; } setMaterials(){ return this; }
    preload(){}
    fromScene(){ return { texture:{} }; }
    add(){ return this; } remove(){ return this; } traverse(f){ if(f) f(this); }
    lookAt(){} updateMatrixWorld(){} getObjectByName(){ return null; }
    clear(){} setPixelRatio(){} setRenderTarget(){}
  };
}
export const OrbitControls=mk(), RoomEnvironment=mk(), Reflector=mk(), EffectComposer=mk(),
  RenderPass=mk(), UnrealBloomPass=mk(), OutputPass=mk(), GLTFLoader=mk(),
  FBXLoader=mk(), OBJLoader=mk(), ColladaLoader=mk(), STLLoader=mk(), MTLLoader=mk();
