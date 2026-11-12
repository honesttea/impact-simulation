import * as THREE from 'three';
import { config } from '../config.js';
import { POSICAO_BANCO } from './carro.js';
import { criarTrinca } from './trinca.js';

const AVANCO_CABECA = 0.24;
const QUEDA_CABECA = 0.07;
const INCLINACAO_CABECA = 0.2;
const PICO_TRANCO = 0.08;

// 0 a 1 no pico do tranco, depois volta oscilando (rebote no encosto).
function curvaTranco(t) {
  if (t < PICO_TRANCO) return Math.sin((t / PICO_TRANCO) * (Math.PI / 2));
  const depois = t - PICO_TRANCO;
  return Math.exp(-depois * 6) * Math.cos(depois * 14);
}

export function criarEfeitos({ cena, camera, tranco }) {
  const trinca = criarTrinca();
  cena.add(trinca.malha);

  // Escurecimento: esfera preta em volta da cabeca. Vai so para o preto, nunca para claro.
  const materialEscuro = new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false,
  });
  const esferaEscura = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), materialEscuro);
  esferaEscura.renderOrder = 1000;
  esferaEscura.visible = false;
  camera.add(esferaEscura);

  function atualizar(quadro) {
    const t = quadro.tempoDesdeImpacto;
    if (t < 0) {
      tranco.position.copy(POSICAO_BANCO);
      tranco.rotation.set(0, 0, 0);
      esferaEscura.visible = false;
      // Desenho novo para a proxima batida, gerado fora do momento critico.
      if (trinca.malha.visible) trinca.regenerar();
      trinca.malha.visible = false;
      return;
    }

    const curva = curvaTranco(t);
    const tremor = t < 0.3 ? 0.015 * Math.sin(t * 90) * (1 - t / 0.3) : 0;
    tranco.position.set(
      POSICAO_BANCO.x + tremor,
      POSICAO_BANCO.y - QUEDA_CABECA * curva,
      POSICAO_BANCO.z - AVANCO_CABECA * curva,
    );
    tranco.rotation.x = -INCLINACAO_CABECA * curva;

    trinca.malha.visible = true;
    esferaEscura.visible = true;
    materialEscuro.opacity = Math.min(1, t / config.duracaoEscurecimento);
  }

  return { atualizar };
}
