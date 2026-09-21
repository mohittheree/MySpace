const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 3000);

function readEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return {};
  return Object.fromEntries(fs.readFileSync(envPath, 'utf8').split(/\r?\n/).filter(line => line && !line.trim().startsWith('#')).map(line => {
    const index = line.indexOf('=');
    return index === -1 ? [line.trim(), ''] : [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')];
  }));
}

const env = { ...readEnv(), ...process.env };
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.sql': 'text/plain; charset=utf-8' };

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(request.url.split('?')[0]);
  if (requestPath === '/env.js') {
    const url = env.SUPABASE_URL || '';
    const key = env.SUPABASE_ANON_KEY || '';
    response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    return response.end(`window.MYSPACE_CONFIG = ${JSON.stringify({ supabaseUrl: url, supabaseAnonKey: key })};`);
  }
  const relative = requestPath === '/' ? '/index.html' : requestPath;
  const filePath = path.normalize(path.join(root, relative));
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) { response.writeHead(404); return response.end('Not found'); }
  response.writeHead(200, { 'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, () => console.log(`MySpace running at http://localhost:${port}`));
