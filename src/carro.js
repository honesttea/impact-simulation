import * as THREE from 'three';

// Referencial do nosso carro: frente para -Z, centro do carro em x = 0, motorista a esquerda.
export const POSICAO_BANCO = new THREE.Vector3(-0.37, 1.12, 0);
export const PARA_CHOQUE_DIANTEIRO_Z = -2.35;
export const PARA_BRISA = {
  baseCentro: new THREE.Vector3(0, 0.98, -1.02),
  topoCentro: new THREE.Vector3(0, 1.44, -0.58),
  largura: 1.45,
};

const materiais = {
  carroceria: new THREE.MeshLambertMaterial({ color: 0x9a1c1c }),
  painel: new THREE.MeshLambertMaterial({ color: 0x232528 }),
  coluna: new THREE.MeshLambertMaterial({ color: 0x3b3f45 }),
  // Sem iluminacao: a luz do chao deixava o teto esverdeado.
  forro: new THREE.MeshBasicMaterial({ color: 0x6a6762 }),
  volante: new THREE.MeshLambertMaterial({ color: 0x141414 }),
  banco: new THREE.MeshLambertMaterial({ color: 0x2c2f36 }),
};

const EIXO_Y = new THREE.Vector3(0, 1, 0);

export function criarNossoCarro() {
  const grupo = new THREE.Group();

  const caixa = (material, largura, altura, comprimento, x, y, z) => {
    const malha = new THREE.Mesh(new THREE.BoxGeometry(largura, altura, comprimento), material);
    malha.position.set(x, y, z);
    grupo.add(malha);
  };

  // Barra entre dois pontos (colunas e moldura).
  const barra = (material, inicio, fim, espessura) => {
    const direcao = new THREE.Vector3().subVectors(fim, inicio);
    const malha = new THREE.Mesh(new THREE.BoxGeometry(espessura, direcao.length(), espessura), material);
    malha.position.addVectors(inicio, fim).multiplyScalar(0.5);
    malha.quaternion.setFromUnitVectors(EIXO_Y, direcao.normalize());
    grupo.add(malha);
  };

  const comprimentoCapo = PARA_BRISA.baseCentro.z - PARA_CHOQUE_DIANTEIRO_Z;
  caixa(materiais.carroceria, 1.75, 0.1, comprimentoCapo, 0, 0.91, PARA_CHOQUE_DIANTEIRO_Z + comprimentoCapo / 2);

  caixa(materiais.painel, 1.66, 0.3, 0.5, 0, 0.82, -0.8);
  caixa(materiais.painel, 0.42, 0.08, 0.2, POSICAO_BANCO.x, 0.99, -0.66);
  caixa(materiais.painel, 0.22, 0.28, 0.8, 0, 0.5, -0.45);
  caixa(materiais.painel, 1.6, 0.02, 1.8, 0, 0.25, -0.3);
  caixa(materiais.banco, 0.5, 0.12, 0.5, POSICAO_BANCO.x, 0.5, 0.15);
  caixa(materiais.banco, 0.5, 0.12, 0.5, -POSICAO_BANCO.x, 0.5, 0.15);

  for (const lado of [-1, 1]) {
    caixa(materiais.coluna, 0.08, 0.6, 1.7, lado * 0.85, 0.65, -0.15);
    barra(materiais.coluna, new THREE.Vector3(lado * 0.78, 0.98, -1.02), new THREE.Vector3(lado * 0.72, 1.45, -0.58), 0.07);
    barra(materiais.coluna, new THREE.Vector3(lado * 0.83, 0.95, 0.4), new THREE.Vector3(lado * 0.78, 1.46, 0.32), 0.09);
  }
  barra(materiais.coluna, new THREE.Vector3(-0.75, 1.45, -0.58), new THREE.Vector3(0.75, 1.45, -0.58), 0.06);
  barra(materiais.coluna, new THREE.Vector3(-0.8, 0.98, -1.02), new THREE.Vector3(0.8, 0.98, -1.02), 0.04);
  caixa(materiais.forro, 1.6, 0.03, 1.3, 0, 1.48, 0.05);

  caixa(materiais.volante, 0.24, 0.07, 0.025, 0, 1.36, -0.62);
  barra(materiais.volante, new THREE.Vector3(0, 1.39, -0.62), new THREE.Vector3(0, 1.46, -0.6), 0.015);

  grupo.add(criarVolante());
  return grupo;
}

function criarVolante() {
  const volante = new THREE.Group();
  volante.position.set(POSICAO_BANCO.x, 0.84, -0.5);
  volante.rotation.x = -0.35;

  volante.add(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 8, 32), materiais.volante));
  const cubo = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12).rotateX(Math.PI / 2), materiais.volante);
  volante.add(cubo);
  for (const angulo of [0, Math.PI, -Math.PI / 2]) {
    const raio = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.03, 0.02), materiais.volante);
    raio.position.set(Math.cos(angulo) * 0.1, Math.sin(angulo) * 0.1, 0);
    raio.rotation.z = angulo;
    volante.add(raio);
  }
  const eixo = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8).rotateX(Math.PI / 2), materiais.coluna);
  eixo.position.z = -0.2;
  volante.add(eixo);
  return volante;
}
