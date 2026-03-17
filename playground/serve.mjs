import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const defaultPath = '/playground/';
const port = Number(process.env.PORT ?? 4173);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function getContentType(filePath) {
  return contentTypes[path.extname(filePath)] ?? 'application/octet-stream';
}

function normalizeRequestPath(urlPathname) {
  if (urlPathname === '/') {
    return defaultPath;
  }
  return urlPathname;
}

function mapToDiskPath(urlPathname) {
  const decoded = decodeURIComponent(urlPathname);
  const safePath = path.normalize(decoded).replace(/^\.\.(?:\/+|\\+)/, '');
  const relativePath = safePath.replace(/^\//, '');
  return path.resolve(repoRoot, relativePath);
}

const server = createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed');
    return;
  }

  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  const requestPath = normalizeRequestPath(requestUrl.pathname);

  if (requestUrl.pathname === '/') {
    res.writeHead(302, { Location: defaultPath });
    res.end();
    return;
  }

  const diskPath = mapToDiskPath(requestPath);
  if (!diskPath.startsWith(repoRoot)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  let targetPath = diskPath;
  if (requestPath.endsWith('/')) {
    targetPath = path.join(diskPath, 'index.html');
  }

  try {
    const file = await readFile(targetPath);
    res.writeHead(200, { 'Content-Type': getContentType(targetPath) });
    if (method === 'HEAD') {
      res.end();
      return;
    }
    res.end(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Playground server running at http://localhost:${port}${defaultPath}`);
});
