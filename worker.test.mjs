import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorker,makeStatus} from './worker.mjs';
const policy={dateFormat:'day-first',history:'last-night',missingAuthor:'Pending product confirmation'};
const feed={updatedAt:'2026-11-09T18:00:00Z',incidents:[{id:'old',line:'bus',opened:'2026-09-12T23:00:00Z',closed:'2026-09-12T23:20:00Z',what:'old',author:'ops'},{id:'new',line:'tram 3',opened:'2026-09-14T02:00:00Z',closed:null,what:'<script>alert(1)</script>',author:'—'},{id:'night',line:'bus',opened:'2026-09-13T22:00:00Z',closed:'2026-09-13T22:20:00Z',what:'earlier',author:'ops'}]};
test('rejects an invalid explicit policy',()=>assert.throws(()=>makeStatus(feed,{})));
test('filters the incident night, sorts newest first and preserves upstream freshness',()=>{const s=makeStatus(feed,policy);assert.deepEqual(s.incidents.map(i=>i.id),['new','night']);assert.equal(s.updatedAt,feed.updatedAt);assert.equal(s.incidents[0].author,policy.missingAuthor);});
test('serves fresh JSON with board CORS and short caching',async()=>{let n=0;const w=createWorker(async()=>new Response(JSON.stringify({...feed,updatedAt:`2026-11-09T18:00:0${n++}Z`})));
 const req=new Request('https://example.test/status.json');const env={PRODUCT_POLICY:JSON.stringify(policy)};const a=await w.fetch(req,env),b=await w.fetch(req,env);assert.equal(a.headers.get('Access-Control-Allow-Origin'),'*');assert.match(a.headers.get('Cache-Control'),/max-age=30/);assert.notEqual((await a.json()).updatedAt,(await b.json()).updatedAt);});
test('escapes incident text and reports feed failures without stale success',async()=>{const env={PRODUCT_POLICY:JSON.stringify(policy)};const w=createWorker(async()=>Response.json(feed));const page=await (await w.fetch(new Request('https://example.test/'),env)).text();assert.ok(page.includes('&lt;script&gt;'));assert.ok(!page.includes('<script>alert'));const bad=createWorker(async()=>new Response('',{status:500}));assert.equal((await bad.fetch(new Request('https://example.test/status.json'),env)).status,503);});

test('default page keeps the week and preserves unresolved dates and author without guessing',async()=>{
 const w=createWorker(async()=>Response.json(feed));
 const response=await w.fetch(new Request('https://example.test/'));
 assert.equal(response.status,200);
 const page=await response.text();
 assert.ok(page.includes('12/09 (day/month) · 09/12 (month/day)'));
 const json=await (await w.fetch(new Request('https://example.test/status.json'))).json();
 assert.equal(json.incidents.length,3);
 assert.equal(json.incidents[0].author,'—');
});
