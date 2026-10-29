const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../web');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav','.md':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{
 try {
  const url=new URL(req.url,'http://localhost');
  const relative=decodeURIComponent(url.pathname).replace(/^\/+/, '')||'index.html';
  const file=path.resolve(root,relative);
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  const bytes=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(bytes);
 }catch {res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT)||4173,'127.0.0.1',()=>console.log(`CopyPanda: http://127.0.0.1:${Number(process.env.PORT)||4173}/`));
