import * as THREE from 'three';
import { criarNossoCarro, PARA_CHOQUE_DIANTEIRO_Z } from './carro.js';

const COR_CEU = 0xa9cde8;
const LARGURA_FAIXA = 3.5;
const PERIODO_TRACEJADO = 16;
const COMPRIMENTO_ESTRADA = 320;
const COMPRIMENTO_BLOCO_PAISAGEM = 48;

export function criarCena(renderer) {
  const cena = new THREE.Scene();
  cena.background = new THREE.Color(COR_CEU);
  cena.fog = new THREE.Fog(COR_CEU, 70, 230);

  cena.add(new THREE.HemisphereLight(0xdcefff, 0x4a6b3a, 2.2));
  const sol = new THREE.DirectionalLight(0xfff4e0, 1.6);
  sol.position.set(-30, 60, -40);
  cena.add(sol);

  const chao = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x5d8a46 }),
  );
  chao.position.set(0, -0.02, -200);
  cena.add(chao);

  const texturaEstrada = criarTexturaEstrada(renderer);
  const estrada = new THREE.Mesh(
    new THREE.PlaneGeometry(LARGURA_FAIXA * 2 + 1, COMPRIMENTO_ESTRADA).rotateX(-Math.PI / 2),
    new THREE.MeshLambertMaterial({ map: texturaEstrada }),
  );
  estrada.position.set(-LARGURA_FAIXA / 2, 0, 20 - COMPRIMENTO_ESTRADA / 2);
  cena.add(estrada);

  const paisagem = criarPaisagem();
  cena.add(paisagem);

  const carroDaFrente = criarCarroDaFrente();
  cena.add(carroDaFrente.grupo);

  cena.add(criarNossoCarro());

  function atualizarCena(quadro) {
    texturaEstrada.offset.y = (quadro.distanciaPercorrida / PERIODO_TRACEJADO) % 1;
    paisagem.position.z = quadro.distanciaPercorrida % COMPRIMENTO_BLOCO_PAISAGEM;
    carroDaFrente.grupo.position.z = PARA_CHOQUE_DIANTEIRO_Z - quadro.distanciaFrente;
    carroDaFrente.acenderFreio(quadro.freioAceso);
  }

  return { cena, atualizarCena };
}

function criarTexturaEstrada(renderer) {
  const pixelsPorMetro = 32;
  const largura = (LARGURA_FAIXA * 2 + 1) * pixelsPorMetro;
  const altura = PERIODO_TRACEJADO * pixelsPorMetro;
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const g = canvas.getContext('2d');

  g.fillStyle = '#3a3c3f';
  g.fillRect(0, 0, largura, altura);
  for (let i = 0; i < 2500; i++) {
    const tom = 45 + Math.random() * 35;
    g.fillStyle = `rgb(${tom},${tom},${tom + 3})`;
    g.fillRect(Math.random() * largura, Math.random() * altura, 2, 2);
  }

  const linha = 0.15 * pixelsPorMetro;
  g.fillStyle = '#e8e8e2';
  g.fillRect(0.5 * pixelsPorMetro - linha / 2, 0, linha, altura);
  g.fillRect(largura - 0.5 * pixelsPorMetro - linha / 2, 0, linha, altura);
  g.fillRect(largura / 2 - linha / 2, 0, linha, 4 * pixelsPorMetro);

  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(1, COMPRIMENTO_ESTRADA / PERIODO_TRACEJADO);
  textura.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return textura;
}

// Um bloco de paisagem repetido; o grupo inteiro anda e volta um bloco, entao o padrao nunca emenda torto.
function criarPaisagem() {
  const grupo = new THREE.Group();
  const sorteio = criarSorteio(13);
  const primeiroBloco = -1;
  const quantidadeBlocos = 7;
  const bordaDireita = 2.6;
  const bordaEsquerda = -LARGURA_FAIXA * 2 + LARGURA_FAIXA / 2 - 1.4;

  const postes = [];
  const arvores = [];
  for (let bloco = primeiroBloco; bloco < primeiroBloco + quantidadeBlocos; bloco++) {
    const inicioZ = -bloco * COMPRIMENTO_BLOCO_PAISAGEM;
    for (let z = 0; z < COMPRIMENTO_BLOCO_PAISAGEM; z += 24) {
      postes.push([bordaDireita, inicioZ - z]);
      postes.push([bordaEsquerda, inicioZ - z - 12]);
    }
  }
  const arvoresPorBloco = [];
  for (let i = 0; i < 12; i++) {
    const lado = i % 2 === 0 ? 1 : -1;
    const x = lado > 0 ? bordaDireita + 3 + sorteio() * 14 : bordaEsquerda - 3 - sorteio() * 14;
    arvoresPorBloco.push([x, -sorteio() * COMPRIMENTO_BLOCO_PAISAGEM, 0.8 + sorteio() * 0.6]);
  }
  for (let bloco = primeiroBloco; bloco < primeiroBloco + quantidadeBlocos; bloco++) {
    for (const [x, z, escala] of arvoresPorBloco) arvores.push([x, z - bloco * COMPRIMENTO_BLOCO_PAISAGEM, escala]);
  }

  const matriz = new THREE.Matrix4();
  const instanciar = (geometria, material, posicoes, alturaBase) => {
    const malha = new THREE.InstancedMesh(geometria, material, posicoes.length);
    posicoes.forEach(([x, z, escala = 1], i) => {
      matriz.makeScale(escala, escala, escala).setPosition(x, alturaBase * escala, z);
      malha.setMatrixAt(i, matriz);
    });
    malha.frustumCulled = false;
    grupo.add(malha);
  };

  instanciar(new THREE.CylinderGeometry(0.08, 0.12, 7, 6), new THREE.MeshLambertMaterial({ color: 0x8a8d90 }), postes, 3.5);
  instanciar(new THREE.CylinderGeometry(0.15, 0.22, 2.4, 6), new THREE.MeshLambertMaterial({ color: 0x6b4a2f }), arvores, 1.2);
  instanciar(new THREE.ConeGeometry(1.6, 4.2, 7), new THREE.MeshLambertMaterial({ color: 0x2f6b34 }), arvores, 4.2);
  return grupo;
}

function criarCarroDaFrente() {
  // Origem no para-choque traseiro, carro voltado para -Z.
  const grupo = new THREE.Group();
  const caixa = (largura, altura, comprimento, cor, x, y, z) => {
    const material = cor instanceof THREE.Material ? cor : new THREE.MeshLambertMaterial({ color: cor });
    const malha = new THREE.Mesh(new THREE.BoxGeometry(largura, altura, comprimento), material);
    malha.position.set(x, y, z);
    grupo.add(malha);
    return malha;
  };

  caixa(1.8, 0.72, 4.3, 0x2f5f9e, 0, 0.66, -2.15);
  caixa(1.56, 0.56, 2.2, 0x2f5f9e, 0, 1.3, -2.25);
  caixa(1.4, 0.42, 0.02, 0x1a2230, 0, 1.3, -1.14);
  caixa(1.84, 0.2, 0.12, 0x222222, 0, 0.42, -0.04);
  caixa(0.52, 0.12, 0.02, 0xf0f0f0, 0, 0.62, 0.005);
  for (const x of [-0.78, 0.78]) {
    for (const z of [-0.8, -3.5]) caixa(0.24, 0.62, 0.62, 0x151515, x, 0.31, z);
  }

  const luzApagada = new THREE.Color(0x4a0d0d);
  const luzAcesa = new THREE.Color(0xff2020);
  const materialFreio = new THREE.MeshBasicMaterial({ color: luzApagada });
  caixa(0.36, 0.16, 0.04, materialFreio, -0.66, 0.86, 0.0);
  caixa(0.36, 0.16, 0.04, materialFreio, 0.66, 0.86, 0.0);
  caixa(0.42, 0.05, 0.03, materialFreio, 0, 1.54, -1.12);

  return {
    grupo,
    acenderFreio(aceso) {
      materialFreio.color.copy(aceso ? luzAcesa : luzApagada);
    },
  };
}

function criarSorteio(semente) {
  let estado = semente;
  return () => {
    estado = (estado * 16807) % 2147483647;
    return (estado - 1) / 2147483646;
  };
}
