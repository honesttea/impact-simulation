// Ao mudar qualquer arquivo, aumente VERSAO para o Quest baixar a nova copia.
const VERSAO = '9';
const NOME_CACHE = `simulador-impacto-v${VERSAO}`;

const ARQUIVOS = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './icone.svg',
  './src/main.js',
  './src/modelos.js',
  './src/carro.js',
  './src/cena.js',
  './src/efeitos.js',
  './src/entrada.js',
  './src/estados.js',
  './src/painel.js',
  './src/trinca.js',
  './vendor/three/three.module.js',
  './vendor/three/three.core.js',
  './vendor/three/addons/loaders/GLTFLoader.js',
  './vendor/three/addons/utils/BufferGeometryUtils.js',
  './vendor/three/addons/utils/SkeletonUtils.js',
  './assets/fontes/poppins-700.woff2',
  './assets/logos/logo-transita-verso.png',
  './assets/logos/logo-detran.png',
  './assets/logos/logo-integra.png',
  './assets/modelos/sedan.glb',
  './assets/modelos/Textures/colormap.png',
  './assets/modelos/tree_default.glb',
  './assets/modelos/tree_oak.glb',
  './assets/modelos/tree_pineRoundA.glb',
  './assets/modelos/tree_pineTallA.glb',
  './assets/modelos/estrada/light-curved.glb',
  './assets/modelos/estrada/Textures/colormap.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(NOME_CACHE)
      .then((cache) => cache.addAll(ARQUIVOS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((nome) => nome !== NOME_CACHE).map((nome) => caches.delete(nome))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  evento.respondWith(
    caches.match(evento.request, { ignoreSearch: true }).then((resposta) => resposta ?? fetch(evento.request)),
  );
});

self.addEventListener('message', (evento) => {
  if (evento.data === 'versao') evento.ports[0]?.postMessage(VERSAO);
});
