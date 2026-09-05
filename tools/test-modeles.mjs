// Le regroupement d'un dépôt multi-fichiers est-il correct ?
const scenarios = [
  { nom:'gltf + bin + texture citée',
    fichiers:[{name:'statue.gltf',type:''},{name:'statue.bin',type:''},{name:'peau.png',type:'image/png'}],
    contenu:'{"buffers":[{"uri":"statue.bin"}],"images":[{"uri":"peau.png"}]}',
    attendu:{ modeles:1, annexes:2, oeuvres:0 } },
  { nom:'gltf + bin + photo NON citée',
    fichiers:[{name:'statue.gltf',type:''},{name:'statue.bin',type:''},{name:'tableau.jpg',type:'image/jpeg'}],
    contenu:'{"buffers":[{"uri":"statue.bin"}]}',
    attendu:{ modeles:1, annexes:1, oeuvres:1 } },
  { nom:'bin déposé seul',
    fichiers:[{name:'statue.bin',type:''}], contenu:'',
    attendu:{ modeles:0, annexes:0, oeuvres:0, orphelin:true } },
  { nom:'obj + mtl',
    fichiers:[{name:'buste.obj',type:''},{name:'buste.mtl',type:''}],
    contenu:'mtllib buste.mtl',
    attendu:{ modeles:1, annexes:1, oeuvres:0 } }
];
const EXT_ANNEXE=/\.(bin|mtl)$/i, EXT_MODEL=/\.(glb|gltf|fbx|obj|dae|stl)$/i;
let ko=0;
for(const s of scenarios){
  const modelesTexte=s.fichiers.filter(f=>/\.(gltf|obj)$/i.test(f.name));
  const compagnons=new Set();
  for(const f of s.fichiers) if(EXT_ANNEXE.test(f.name)) compagnons.add(f);
  if(modelesTexte.length){
    const cite=s.contenu.toLowerCase();
    for(const f of s.fichiers){
      const n=f.name.toLowerCase();
      if(compagnons.has(f) || !/^image\//.test(f.type) && !/\.(png|jpe?g|webp)$/i.test(n)) continue;
      if(cite.includes(n)) compagnons.add(f);
    }
  }
  const orphelins=s.fichiers.filter(f=>EXT_ANNEXE.test(f.name) && !modelesTexte.length);
  const restants=s.fichiers.filter(f=>!compagnons.has(f) && !orphelins.includes(f));
  const modeles=restants.filter(f=>EXT_MODEL.test(f.name)).length;
  const oeuvres=restants.filter(f=>/^image\//.test(f.type)).length;
  const annexes=modelesTexte.length? compagnons.size : 0;
  const a=s.attendu;
  const bon = modeles===a.modeles && annexes===a.annexes && oeuvres===a.oeuvres &&
              (!a.orphelin || orphelins.length>0);
  console.log((bon?'  OK    ':'  ECHEC ')+s.nom.padEnd(30)+
    'modèle:'+modeles+' annexes:'+annexes+' œuvres:'+oeuvres+
    (orphelins.length?' (annexe seule détectée)':''));
  if(!bon) ko++;
}
process.exit(ko?1:0);
