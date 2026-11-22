'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const {spawn,execFileSync}=require('node:child_process');
const {readFile,mkdtemp,rm}=require('node:fs/promises');
const os=require('node:os'),path=require('node:path');
const port=19868,base='http://127.0.0.1:'+port;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const readHttp=url=>new Promise((resolve,reject)=>http.get(url,res=>{let t='';res.setEncoding('utf8');res.on('data',x=>t+=x);res.on('end',()=>resolve({status:res.statusCode,text:t}));res.on('error',reject)}).on('error',reject));
async function poll(fn,label,timeout=18000){let e;const start=Date.now();while(Date.now()-start<timeout){try{const v=await fn();if(v)return v}catch(err){e=err}await sleep(130)}throw Error('Timeout '+label+(e?': '+e.message:''))}
async function main(){
 const tmp=await mkdtemp(path.join(os.tmpdir(),'studio-gallery-2d-'));let server,chrome,ws,seq=0,logs='';
 const pending=new Map(),exceptions=[];
 try{
  server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1','--directory','.'],{stdio:['ignore','ignore','pipe']});
  server.stderr.on('data',x=>logs+=String(x).slice(-300));
  await poll(async()=>(await readHttp(base+'/galerie-2d.html')).status===200,'local gallery HTTP');
  let bin=process.env.CHROME_BIN;
  if(!bin)for(const b of ['google-chrome','chromium','chromium-browser']){try{bin=execFileSync('which',[b],{encoding:'utf8'}).trim();break}catch{}}
  if(!bin)throw Error('Chromium executable missing');
  chrome=spawn(bin,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run',
   '--disable-background-networking','--remote-debugging-port=0','--remote-allow-origins=*',
   '--user-data-dir='+path.join(tmp,'chrome'),'about:blank'],{stdio:['ignore','ignore','pipe']});
  chrome.stderr.on('data',x=>logs+=String(x).slice(-300));
  const debuggerPort=await poll(async()=>Number((await readFile(path.join(tmp,'chrome','DevToolsActivePort'),'utf8')).split('\n')[0]),'CDP');
  const tabs=JSON.parse((await readHttp('http://127.0.0.1:'+debuggerPort+'/json/list')).text);
  const tab=tabs.find(x=>x.type==='page');assert.ok(tab?.webSocketDebuggerUrl);
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});
  ws.addEventListener('message',event=>{
   const m=JSON.parse(event.data);
   if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params?.exceptionDetails?.exception?.description||'Browser error');
   if(!m.id||!pending.has(m.id))return;
   const op=pending.get(m.id);pending.delete(m.id);m.error?op.reject(Error(JSON.stringify(m.error))):op.resolve(m.result);
  });
  function call(method,params={}){const id=++seq;return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method))},15000);pending.set(id,{resolve:v=>{clearTimeout(timeout);resolve(v)},reject:e=>{clearTimeout(timeout);reject(e)}});ws.send(JSON.stringify({id,method,params}))})}
  async function evaluate(expression){const res=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(res.exceptionDetails)throw Error(res.exceptionDetails.exception?.description||res.exceptionDetails.text);return res.result?.value;}
  const wait=(expr,label)=>poll(()=>evaluate(expr),label,20000);
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xw7wAAAAASUVORK5CYII=';
  const inject=(selector,source,name)=>'(()=>{const bytes=Uint8Array.from(atob('+JSON.stringify(source)+'),c=>c.charCodeAt(0));const d=new DataTransfer();d.items.add(new File([bytes],'+JSON.stringify(name)+',{type:"image/png"}));const input=document.querySelector('+JSON.stringify(selector)+');input.files=d.files;input.dispatchEvent(new Event("change",{bubbles:true}));return true})()';
  const backupFile=data=>'(()=>{const d=new DataTransfer();d.items.add(new File(['+JSON.stringify(data)+'],"gallery.json",{type:"application/json"}));const input=document.querySelector("#restoreFile");input.files=d.files;input.dispatchEvent(new Event("change",{bubbles:true}));return true})()';
  await call('Page.enable');await call('Runtime.enable');
  await call('Page.navigate',{url:base+'/galerie-2d.html'});
  await wait('document.readyState==="complete"&&!!window.StudioNikoGalleryBackup&&document.querySelector("#status").textContent.includes("localement")','gallery IndexedDB initialized');
  await evaluate(inject('#images',png,'Original.png'));
  await wait('document.querySelector("#count").textContent==="1"','image added');
  await evaluate('(()=>{const original=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{window.__lastBlob=blob;return original(blob)};document.querySelector("#backup").click();return true})()');
  await wait('document.querySelector("#manualDownload a")&&window.__lastBlob?.type.startsWith("application/json")','backup download ready');
  const raw=await evaluate('window.__lastBlob.text()');
  const saved=JSON.parse(raw);assert.equal(saved.works.length,1);assert.equal(saved.format,'studio-niko-galerie-2d-v1');
  await evaluate('window.confirm=()=>false;document.querySelector("#gallery button").click();true');
  assert.equal(await evaluate('document.querySelector("#count").textContent'),'1','Cancelled delete must preserve artwork');
  const updated={...saved,works:[...saved.works,{...saved.works[0],sourceId:'imported-work-2',name:'Seconde.png',caption:'À exposer'}]};
  await evaluate(backupFile(JSON.stringify(updated)));
  await wait('document.querySelector("#status").textContent.includes("Restauration annulée")','restore cancelled');
  assert.equal(await evaluate('document.querySelector("#count").textContent'),'1','Cancelled import must preserve');
  await evaluate('window.confirm=()=>true;true');
  await evaluate(backupFile(JSON.stringify(updated)));
  await wait('document.querySelector("#count").textContent==="2"','new image restored');
  await evaluate(backupFile(JSON.stringify(updated)));
  await wait('document.querySelector("#status").textContent.includes("Aucune nouvelle œuvre")','duplicate import skipped');
  assert.equal(await evaluate('document.querySelector("#count").textContent'),'2');
  await evaluate(backupFile('{notjson'));
  await wait('document.querySelector("#status").textContent.includes("Restauration refusée")','bad backup rejected');
  assert.equal(await evaluate('document.querySelector("#count").textContent'),'2');
  await call('Page.navigate',{url:base+'/galerie-2d.html?reload=1'});
  await wait('document.querySelector("#count")?.textContent==="2"','two works persisted in IndexedDB');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:3,mobile:true});
  const mobile=await evaluate('(()=>{const b=document.querySelector("#restoreTrigger").getBoundingClientRect();return b.height>=44&&b.width>=44&&b.left>=0&&b.right<=innerWidth})()');
  assert.equal(mobile,true,'Mobile restore button must be at least 44px and within viewport');
  assert.deepEqual(exceptions,[],'No JavaScript error');
  console.log('PASS Galerie 2D Chromium: upload, export, confirmation, restore, dedupe, invalid file, reload and 390px mobile control');
 }catch(e){throw Error(e.message+(logs?'\nRunner logs: '+logs.slice(-500):''))}
 finally{try{ws?.close()}catch{}try{chrome?.kill('SIGKILL')}catch{}try{server?.kill('SIGTERM')}catch{}await sleep(300);await rm(tmp,{recursive:true,force:true,maxRetries:5,retryDelay:200}).catch(()=>{})}
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
