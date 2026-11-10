import http from 'node:http';
import {pathToFileURL} from 'node:url';
import worker from './worker.mjs';
export function createServer({policy=process.env.PRODUCT_POLICY,app=worker}={}){
 return http.createServer(async(req,res)=>{
  if(req.url==='/healthz'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');return;}
  try{
   const request=new Request(new URL(req.url,'http://localhost'),{method:req.method,headers:req.headers});
   const response=await app.fetch(request,{PRODUCT_POLICY:policy});
   res.writeHead(response.status,Object.fromEntries(response.headers));
   res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(500,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('Internal error');}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const server=createServer();
 server.listen(Number(process.env.PORT||10000),'0.0.0.0',()=>console.log('Status service listening'));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();});
}
