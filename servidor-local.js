// Servidor local simples para abrir o Big Burger no PC sem QZ Tray.
// Ele serve os arquivos do projeto em http://127.0.0.1:3000
import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.dirname(url.fileURLToPath(import.meta.url));

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function resolveFile(reqUrl) {
  let pathname = decodeURIComponent(new URL(reqUrl, `http://127.0.0.1:${PORT}`).pathname);

  // Rotas bonitas do sistema
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  if (pathname === '/admin') pathname = '/admin.html';
  if (pathname === '/motoboy') pathname = '/motoboy.html';

  // Evita sair da pasta do projeto
  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) return null;
  return filePath;
}

const server = http.createServer((req, res) => {
  // Aviso amigável para API local: o painel visual abre local; os dados reais continuam no Vercel/Supabase quando publicado.
  if (req.url.startsWith('/api/')) {
    return send(res, 503, JSON.stringify({
      ok: false,
      error: 'API local não configurada neste modo.',
      dica: 'Para usar pedidos reais, publique na Vercel. Para impressão sem QZ, abra o admin local só para imprimir/testar com dados que já aparecem no painel.'
    }), 'application/json; charset=utf-8');
  }

  const filePath = resolveFile(req.url);
  if (!filePath) return send(res, 403, 'Acesso negado');

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      const fallback = path.join(ROOT, 'index.html');
      if (fs.existsSync(fallback)) {
        return fs.createReadStream(fallback).pipe(res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }));
      }
      return send(res, 404, 'Arquivo não encontrado');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Big Burger local rodando em http://127.0.0.1:' + PORT + '/admin.html');
  console.log('Pode deixar esta janela aberta enquanto usa a impressao automatica.');
});
