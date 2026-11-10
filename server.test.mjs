import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from './server.mjs';
import {createWorker} from './worker.mjs';
test('Render adapter serves HTTP with JSON headers and a separate health check',async()=>{
 const feed={updatedAt:'2026-11-09T00:00:00Z',incidents:[{id:'1',line:'tram 3',opened:'2026-09-14T01:00:00Z',closed:null,what:'example',author:'ops'}]};
 const server=createServer({policy:JSON.stringify({dateFormat:'day-first',history:'week',missingAuthor:'test only'}),app:createWorker(async()=>Response.json(feed))});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 try{
  const base=`http://127.0.0.1:${server.address().port}`;
  assert.equal(await (await fetch(base+'/healthz')).text(),'ok');
  const r=await fetch(base+'/status.json');assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),'*');assert.equal((await r.json()).incidents[0].line,'tram 3');
  const head=await fetch(base+'/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
