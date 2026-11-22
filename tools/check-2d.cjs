'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','galerie-2d.html'),'utf8');
const helper=fs.readFileSync(path.join(__dirname,'..','backup-2d.js'),'utf8');
const api=require('../backup-2d.js');
new Function(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1]);
assert(html.includes('<script src="./backup-2d.js"></script>'),'Backup helper loaded before app');
for(const id of ['backup','restoreTrigger','restoreFile','manualDownload','images','export','gallery'])
 assert(html.includes('id="'+id+'"'),'Required gallery control: '+id);
assert(html.includes('if(!confirm('),'Destructive actions require confirmation');
assert(html.includes('database.transaction("works","readwrite")'),'Atomic IndexedDB import present');
assert(html.includes('dataUrlBlob(item.dataUrl,item.mime)'),'Backup images reconstructed');
assert(html.includes('offerDownload(new Blob([html]'),'HTML export manual fallback present');
assert(helper.includes('studio-niko-galerie-2d-v1'));
const tiny='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xw7wAAAAASUVORK5CYII=';
const backup={format:api.FORMAT,works:[{sourceId:'abc-123',name:'Ma photo',caption:'Un cartel',mime:'image/png',created:1,dataUrl:tiny}]};
assert.equal(api.parse(JSON.stringify(backup)).works[0].name,'Ma photo');
for(const invalid of [
 {...backup,format:'unknown'}, {...backup,works:[{...backup.works[0],mime:'image/svg+xml'}]},
 {...backup,works:[{...backup.works[0],dataUrl:'data:text/html;base64,PHNjcmlwdD4='}]},
 {...backup,works:[backup.works[0],backup.works[0]]},
 {...backup,works:[{...backup.works[0],sourceId:'<script>'}]},
 {...backup,works:[{...backup.works[0],created:'yesterday'}]}
])assert.throws(()=>api.parse(JSON.stringify(invalid)));
assert.throws(()=>api.parse('{invalid'),/JSON invalide/);
console.log('PASS Galerie 2D: local JSON schema, MIME filtering, duplication, transactional merge and accessible controls');
