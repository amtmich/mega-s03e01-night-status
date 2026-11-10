const FEED='https://hq.mega.dev/challenges/status-for-the-night/api/incidents/2b04e228c66a';
const headers={'Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=30'};
export const defaultPolicy={history:'week',dateFormat:'both',missingAuthor:'—'};
export function makeStatus(feed,policy){
  if(!['day-first','month-first','both'].includes(policy.dateFormat)||!['last-night','week'].includes(policy.history)||!policy.missingAuthor)throw new Error('Product decisions are required before deployment');
  const newest=Math.max(...feed.incidents.map(i=>Date.parse(i.opened)));
  const cutoff=policy.history==='week'?newest-7*86400000:Date.parse(new Date(newest).toISOString().slice(0,10)+'T00:00:00Z')-12*3600000;
  return {updatedAt:feed.updatedAt,incidents:feed.incidents.filter(i=>Date.parse(i.opened)>=cutoff).sort((a,b)=>Date.parse(b.opened)-Date.parse(a.opened)).map(i=>({...i,author:i.author&&i.author!=='—'?i.author:policy.missingAuthor}))};
}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function html(status,policy){
 const time=s=>s?new Date(s).toISOString().slice(11,16):'Open';
 const date=s=>{const d=new Date(s).toISOString().slice(0,10).split('-');const day=`${d[2]}/${d[1]}`,month=`${d[1]}/${d[2]}`;return policy.dateFormat==='day-first'?day:policy.dateFormat==='month-first'?month:`${day} (day/month) · ${month} (month/day)`;};
 const lines=[...new Set(status.incidents.map(i=>i.line))];
 return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>status for the night</title><style>body{margin:0;background:#f5f4f1;color:#222;font:16px system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:48px 24px}h1{font-size:clamp(30px,5vw,48px);font-weight:600;letter-spacing:-.04em}aside{background:#6f55c9;color:#fff;padding:20px 24px}.muted,footer{color:#626262}section{background:white;border:1px solid #ddd;border-radius:8px;padding:24px;margin:24px 0}h2{font-size:22px}table{width:100%;border-collapse:collapse;text-align:left;font-size:14px}th,td{padding:12px 8px;border-bottom:1px solid #ddd}th{color:#555} .scroll{overflow:auto}a{color:#45318b}footer{font-size:14px;line-height:1.8}</style><aside>Some services had problems overnight.</aside><main><p class="muted">sched-prod · night operations</p><h1>status for the night</h1><p>Updated ${esc(status.updatedAt)} · <a href="status.json">JSON feed</a></p><section><h2>Lines</h2><div class="scroll"><table><thead><tr><th>Line</th><th>Latest incident</th><th>Opened</th><th>Closed</th></tr></thead><tbody>${lines.map(line=>{const i=status.incidents.find(i=>i.line===line);return `<tr><td>${esc(line)}</td><td>${esc(i.what)}</td><td>${time(i.opened)}</td><td>${time(i.closed)}</td></tr>`;}).join('')}</tbody></table></div></section><section><h2>Incident history</h2><div class="scroll"><table><thead><tr><th>Date</th><th>Opened</th><th>Closed</th><th>Line</th><th>What happened</th><th>Who ran it</th></tr></thead><tbody>${status.incidents.map(i=>`<tr><td>${date(i.opened)}</td><td>${time(i.opened)}</td><td>${time(i.closed)}</td><td>${esc(i.line)}</td><td>${esc(i.what)}</td><td>${esc(i.author)}</td></tr>`).join('')}</tbody></table></div></section><footer>all times UTC<br>read on every tram 3 board</footer></main></html>`;
}
export function createWorker(fetchFeed=fetch){return {async fetch(request,env={}){
 const url=new URL(request.url);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, HEAD, OPTIONS'}});
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD, OPTIONS'}});
 if(!['/','/status.json'].includes(url.pathname))return new Response('Not found',{status:404});
 try{
  const policy={...defaultPolicy,...JSON.parse(env.PRODUCT_POLICY||'{}')};
  const upstream=await fetchFeed(FEED,{headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!upstream.ok)throw new Error('Ops feed unavailable');
  const status=makeStatus(await upstream.json(),policy);
  const json=url.pathname==='/status.json';
  return new Response(request.method==='HEAD'?null:json?JSON.stringify(status):html(status,policy),{headers:{...headers,'Content-Type':json?'application/json; charset=utf-8':'text/html; charset=utf-8'}});
 }catch{return new Response('Status temporarily unavailable',{status:503,headers:{...headers,'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});}
}};}
export default createWorker();
