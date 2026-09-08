// Static file server for local dev. Sends `Cache-Control: no-store` on every response —
// ES module files are fetched by exact URL with no cache-busting query, so without this,
// browsers happily serve stale JS across reloads while editing. python -m http.server doesn't
// send this header, which cost a chunk of a session's worth of "verified in browser" checks.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const PORT = Number(process.argv[2] || 8080);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

createServer(async (req, res) => {
  const path = normalize(join(ROOT, decodeURIComponent(req.url.split('?')[0])));
  if (!path.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  const file = path.endsWith('/') ? join(path, 'index.html') : path;
  try {
    const st = await stat(file);
    const target = st.isDirectory() ? join(file, 'index.html') : file;
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': TYPES[extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Cache-Control': 'no-store' });
    res.end('not found');
  }
}).listen(PORT, '127.0.0.1', () => console.log(`no-cache dev server on http://127.0.0.1:${PORT}`));
