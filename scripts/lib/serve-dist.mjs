/**
 * Serves a built site (dist/) on a free local port, the way GitHub Pages
 * does: a folder answers with its index.html, `/about` is sent on to
 * `/about/`, and a missing address gets 404.html with status 404. Used by the
 * browser checks (scripts/smoke-pages.mjs, scripts/audit-mobile.mjs), so they
 * need no `astro preview` running beside them.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json', '.pdf': 'application/pdf', '.mp4': 'video/mp4',
};

/** Start serving `dir`. Resolves to `{ server, base }`; close with `server.close()`. */
export function serveDist(dir) {
  const root = resolve(dir);
  const server = createServer((req, res) => {
    let path;
    try { path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)); } catch { res.writeHead(400).end(); return; }
    let file = join(root, path);
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!path.endsWith('/')) { res.writeHead(301, { location: `${path}/` }).end(); return; }
      file = join(file, 'index.html');
    }
    if (!existsSync(file)) {
      const notFound = join(root, '404.html');
      res.writeHead(404, { 'content-type': TYPES['.html'] }).end(existsSync(notFound) ? readFileSync(notFound) : 'not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
  });
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done({ server, base: `http://127.0.0.1:${server.address().port}` })));
}
