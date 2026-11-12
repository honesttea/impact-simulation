import * as THREE from 'three';

// Painel de texto desenhado em canvas; desenhado por cima de tudo (inclusive do escurecimento).
export function criarPainelTexto({ larguraPx, alturaPx, larguraMetros, tamanhoFonte, ordem = 1010 }) {
  const canvas = document.createElement('canvas');
  canvas.width = larguraPx;
  canvas.height = alturaPx;
  const g = canvas.getContext('2d');
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;

  const malha = new THREE.Mesh(
    new THREE.PlaneGeometry(larguraMetros, (larguraMetros * alturaPx) / larguraPx),
    new THREE.MeshBasicMaterial({ map: textura, transparent: true, depthTest: false, depthWrite: false, fog: false }),
  );
  malha.renderOrder = ordem;
  malha.visible = false;

  let textoAtual = null;

  function escrever(texto) {
    if (texto === textoAtual) return;
    textoAtual = texto;
    g.clearRect(0, 0, larguraPx, alturaPx);
    g.fillStyle = 'rgba(10, 12, 16, 0.78)';
    g.beginPath();
    g.roundRect(0, 0, larguraPx, alturaPx, tamanhoFonte * 0.5);
    g.fill();

    const linhas = texto.split('\n');
    const alturaLinha = tamanhoFonte * 1.3;
    g.fillStyle = '#ffffff';
    g.font = `600 ${tamanhoFonte}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const inicioY = alturaPx / 2 - ((linhas.length - 1) * alturaLinha) / 2;
    linhas.forEach((linha, i) => g.fillText(linha, larguraPx / 2, inicioY + i * alturaLinha));
    textura.needsUpdate = true;
  }

  return { malha, escrever };
}
