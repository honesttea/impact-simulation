// Servidor estatico local, so com modulos nativos do Node. Uso: node servidor.mjs [porta]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORTA = Number(process.argv[2]) || 8080;
const RAIZ = fileURLToPath(new URL('.', import.meta.url));

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary',
  '.woff2': 'font/woff2',
};

createServer(async (requisicao, resposta) => {
  const caminhoUrl = decodeURIComponent(new URL(requisicao.url, 'http://localhost').pathname);
  const relativo = caminhoUrl.endsWith('/') ? `${caminhoUrl}index.html` : caminhoUrl;
  const arquivo = normalize(join(RAIZ, relativo));
  if (!arquivo.startsWith(RAIZ.endsWith(sep) ? RAIZ : RAIZ + sep)) {
    resposta.writeHead(403).end();
    return;
  }
  try {
    const conteudo = await readFile(arquivo);
    resposta.writeHead(200, {
      'Content-Type': TIPOS[extname(arquivo)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    resposta.end(conteudo);
    console.log(`200 ${caminhoUrl}`);
  } catch {
    resposta.writeHead(404).end();
    console.log(`404 ${caminhoUrl}`);
  }
}).listen(PORTA, '127.0.0.1', () => {
  console.log(`Servindo ${RAIZ} em http://localhost:${PORTA}`);
});
