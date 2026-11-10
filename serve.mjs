import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const port=Number(process.env.PORT||55321);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);}catch{res.writeHead(400).end();return;}
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(resolve(root)+sep)){res.writeHead(403).end();return;}
  try{const info=await stat(path);if(!info.isFile())throw new Error('not file');const data=await readFile(path);res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream','cache-control':'no-cache','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'"});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404,{'content-type':'text/plain; charset=utf-8'}).end('未找到该文件');}
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`端口 ${port} 已被占用。可设置 PORT 后重新启动。`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Multica 设计对照站 http://127.0.0.1:${port}/`));
