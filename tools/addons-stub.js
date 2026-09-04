const mk = () => new Proxy(function(){}, {
  get(t,k){ if(k==='then') return undefined; if(!(k in t)) t[k]=mk(); return t[k]; },
  set(t,k,v){ t[k]=v; return true; }, apply(){ return mk(); }, construct(){ return mk(); }
});
export const OrbitControls=mk(), RoomEnvironment=mk(), Reflector=mk(), EffectComposer=mk(),
  RenderPass=mk(), UnrealBloomPass=mk(), OutputPass=mk(), GLTFLoader=mk(),
  FBXLoader=mk(), OBJLoader=mk(), ColladaLoader=mk(), STLLoader=mk();
