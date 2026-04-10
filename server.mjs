import { createReadStream, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const port = Number.parseInt(process.env.PORT ?? '8080', 10);
const appUrl = process.env.APP_URL;

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function getContentType(filename) {
  return MIME_TYPES.get(path.extname(filename).toLowerCase()) ?? 'application/octet-stream';
}

function resolveFilePath(urlPath) {
  const normalizedPath = urlPath === '/' ? '/index.html' : urlPath;
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, '');
  return path.join(distDir, safePath);
}

function escapeHtmlAttribute(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
}

function getPublicOrigin(request) {
  const forwardedProto = request.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string' && forwardedProto.length > 0
    ? forwardedProto.split(',')[0].trim()
    : 'https';
  const host = request.headers.host;

  if (typeof host === 'string' && host.length > 0) {
    return `${protocol}://${host}`;
  }

  if (typeof appUrl === 'string' && appUrl.length > 0) {
    return appUrl;
  }

  return `http://127.0.0.1:${port}`;
}

async function sendIndex(request, response) {
  const indexPath = path.join(distDir, 'index.html');
  const html = await readFile(indexPath, 'utf8');
  const publicUrl = escapeHtmlAttribute(getPublicOrigin(request));
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html.replaceAll('__APP_URL__', publicUrl));
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const filePath = resolveFilePath(requestUrl.pathname);

    if (existsSync(filePath) && statSync(filePath).isFile()) {
      response.writeHead(200, { 'Content-Type': getContentType(filePath) });
      createReadStream(filePath).pipe(response);
      return;
    }

    await sendIndex(request, response);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : 'Unexpected server error.');
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Cube Attack listening on http://0.0.0.0:${port}`);
});
