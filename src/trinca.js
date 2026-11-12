import * as THREE from 'three';
import { PARA_BRISA } from './carro.js';

// Coordenadas no plano do para-brisa, em metros: x a partir do centro, y subindo a partir da base.
const PONTO_IMPACTO = { x: -0.05, y: 0.3 };
const ESPESSURA_RAIO = 0.004;
const ESPESSURA_ANEL = 0.002;

export function criarTrinca() {
  const subida = new THREE.Vector3().subVectors(PARA_BRISA.topoCentro, PARA_BRISA.baseCentro);
  const limites = { meiaLargura: PARA_BRISA.largura / 2, altura: subida.length() };
  const inclinacao = Math.atan2(subida.z, subida.y);

  const malha = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({
      color: 0xd6dde2, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, fog: false,
    }),
  );
  malha.rotation.x = inclinacao;
  // Um pouco para dentro do carro, para nao brigar com a moldura.
  malha.position.copy(PARA_BRISA.baseCentro).add(new THREE.Vector3(0, -Math.sin(inclinacao), Math.cos(inclinacao)).multiplyScalar(0.004));
  malha.visible = false;

  function regenerar() {
    malha.geometry.dispose();
    malha.geometry = geometriaDosSegmentos(gerarSegmentos(limites));
  }
  regenerar();

  return { malha, regenerar };
}

function gerarSegmentos({ meiaLargura, altura }) {
  const segmentos = [];
  const margem = 0.02;
  const dentro = (x, y) => Math.abs(x) < meiaLargura - margem && y > margem && y < altura - margem;

  function rachadura(x, y, angulo, comprimento, espessura, nivel) {
    let percorrido = 0;
    while (percorrido < comprimento) {
      const passo = 0.02 + Math.random() * 0.04;
      angulo += (Math.random() - 0.5) * 0.5;
      const proximoX = x + Math.cos(angulo) * passo;
      const proximoY = y + Math.sin(angulo) * passo;
      if (!dentro(proximoX, proximoY)) return;
      const largura = espessura * (1 - (0.7 * percorrido) / comprimento);
      segmentos.push([x, y, proximoX, proximoY, largura]);
      x = proximoX;
      y = proximoY;
      percorrido += passo;
      if (nivel < 2 && Math.random() < 0.12) {
        const desvio = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.6);
        rachadura(x, y, angulo + desvio, (comprimento - percorrido) * 0.5, largura * 0.7, nivel + 1);
      }
    }
  }

  const { x: centroX, y: centroY } = PONTO_IMPACTO;
  const quantidadeRaios = 12 + Math.floor(Math.random() * 5);
  for (let i = 0; i < quantidadeRaios; i++) {
    const angulo = (i / quantidadeRaios) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    rachadura(centroX, centroY, angulo, 0.25 + Math.random() * 0.45, ESPESSURA_RAIO, 0);
  }

  // Aneis quebrados em volta do ponto de impacto.
  for (const raio of [0.035, 0.08]) {
    const pontos = [];
    for (let i = 0; i < quantidadeRaios; i++) {
      const angulo = (i / quantidadeRaios) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const r = raio * (0.8 + Math.random() * 0.4);
      pontos.push([centroX + Math.cos(angulo) * r, centroY + Math.sin(angulo) * r]);
    }
    pontos.forEach(([x, y], i) => {
      const [proximoX, proximoY] = pontos[(i + 1) % pontos.length];
      if (Math.random() < 0.8) segmentos.push([x, y, proximoX, proximoY, ESPESSURA_ANEL]);
    });
  }
  return segmentos;
}

// Cada segmento vira um retangulo fino (dois triangulos); linhas do WebGL ficam com 1 pixel e cintilam no VR.
function geometriaDosSegmentos(segmentos) {
  const posicoes = new Float32Array(segmentos.length * 18);
  segmentos.forEach(([x1, y1, x2, y2, largura], i) => {
    const comprimento = Math.hypot(x2 - x1, y2 - y1);
    const nx = (-(y2 - y1) / comprimento) * (largura / 2);
    const ny = ((x2 - x1) / comprimento) * (largura / 2);
    posicoes.set([
      x1 + nx, y1 + ny, 0, x1 - nx, y1 - ny, 0, x2 - nx, y2 - ny, 0,
      x1 + nx, y1 + ny, 0, x2 - nx, y2 - ny, 0, x2 + nx, y2 + ny, 0,
    ], i * 18);
  });
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.BufferAttribute(posicoes, 3));
  return geometria;
}
