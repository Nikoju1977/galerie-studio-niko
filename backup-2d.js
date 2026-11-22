/* Galerie Studio Niko 2D: sauvegarde locale portable. Aucune donnée envoyée au réseau. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.StudioNikoGalleryBackup=api;
})(typeof window==='object'?window:typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const FORMAT='studio-niko-galerie-2d-v1';
  const MAX_BACKUP_BYTES=64*1024*1024,MAX_IMAGE_BYTES=15*1024*1024,MAX_WORKS=100;
  const types=['image/png','image/jpeg','image/webp','image/gif'];
  function clean(value,max,label){
    if(typeof value!=='string'||value.length>max)throw Error(label+' invalide.');
    return value;
  }
  function parse(raw){
    if(typeof raw!=='string'||raw.length>MAX_BACKUP_BYTES)throw Error('Sauvegarde JSON trop volumineuse (64 Mo maximum).');
    let source;try{source=JSON.parse(raw)}catch{throw Error('Fichier JSON invalide.');}
    if(!source||Array.isArray(source)||typeof source!=='object'||source.format!==FORMAT||
      !Array.isArray(source.works)||source.works.length>MAX_WORKS)
      throw Error('Ce fichier ne correspond pas à une sauvegarde Galerie Studio Niko 2D.');
    let totalBytes=0;
    const seen=new Set();
    const works=source.works.map((item,i)=>{
      if(!item||Array.isArray(item)||typeof item!=='object')throw Error('Œuvre invalide : '+(i+1));
      const sourceId=clean(item.sourceId,128,'Identifiant');
      if(!/^[a-zA-Z0-9_.-]+$/.test(sourceId)||seen.has(sourceId))
        throw Error('Identifiant absent ou dupliqué : '+(i+1));
      seen.add(sourceId);
      const name=clean(item.name,200,'Nom');
      const caption=clean(item.caption,200,'Cartel');
      if(!name.trim())throw Error('Nom vide : '+(i+1));
      const mime=clean(item.mime,40,'Format image');
      if(!types.includes(mime))throw Error('Format image non autorisé : '+(i+1));
      const dataUrl=item.dataUrl;
      if(typeof dataUrl!=='string'||!dataUrl.startsWith('data:'+mime+';base64,'))
        throw Error('Image manquante ou incompatible : '+(i+1));
      const encoded=dataUrl.slice(('data:'+mime+';base64,').length);
      if(!encoded.length||encoded.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
        throw Error('Contenu image Base64 invalide : '+(i+1));
      const estimatedBytes=encoded.length*3/4-(encoded.endsWith('==')?2:encoded.endsWith('=')?1:0);
      if(estimatedBytes>MAX_IMAGE_BYTES)throw Error('Image de plus de 15 Mo : '+(i+1));
      totalBytes+=estimatedBytes;
      if(totalBytes>MAX_BACKUP_BYTES)throw Error('Taille totale des images supérieure à 64 Mo.');
      const created=item.created;
      if(typeof created!=='number'||!Number.isSafeInteger(created)||created<0)
        throw Error('Date de création invalide : '+(i+1));
      return {sourceId,name,caption,mime,dataUrl,created};
    });
    return {works,totalBytes};
  }
  return Object.freeze({FORMAT,MAX_BACKUP_BYTES,MAX_IMAGE_BYTES,MAX_WORKS,parse});
});
