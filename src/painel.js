import * as THREE from 'three';

const LARGURA_PX = 1400;
const ALTURA_PX = 760;
const MARGEM_PX = 70;
const FONTE = 'Poppins, system-ui, sans-serif';
const AMARELO = '#f5c400';
// Mesma ordem e proporcoes do rodape do quiz.
const LOGOS = [
  { arquivo: 'logo-transita-verso.png', altura: 128 },
  { arquivo: 'logo-detran.png', altura: 115 },
  { arquivo: 'logo-integra.png', altura: 168 },
];

const fontePoppins = new FontFace('Poppins', 'url(./assets/fontes/poppins-700.woff2)', { weight: '700' });
document.fonts.add(fontePoppins);

function carregarImagem(arquivo) {
  return new Promise((resolver) => {
    const imagem = new Image();
    imagem.onload = () => resolver(imagem);
    imagem.onerror = () => resolver(null);
    imagem.src = `./assets/logos/${arquivo}`;
  });
}

// Quadro da tela preta: mensagem em cima, logos do evento embaixo. Desenhado por cima de tudo.
export function criarPainelEncerramento({ mensagem, textoGoverno, larguraMetros }) {
  const canvas = document.createElement('canvas');
  canvas.width = LARGURA_PX;
  canvas.height = ALTURA_PX;
  const g = canvas.getContext('2d');
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;

  const malha = new THREE.Mesh(
    new THREE.PlaneGeometry(larguraMetros, (larguraMetros * ALTURA_PX) / LARGURA_PX),
    new THREE.MeshBasicMaterial({ map: textura, transparent: true, depthTest: false, depthWrite: false, fog: false }),
  );
  malha.renderOrder = 1010;
  malha.visible = false;

  async function desenhar() {
    await fontePoppins.load().catch(() => { /* sem a fonte, usa a do sistema */ });
    const imagens = await Promise.all(LOGOS.map(({ arquivo }) => carregarImagem(arquivo)));

    g.clearRect(0, 0, LARGURA_PX, ALTURA_PX);
    g.fillStyle = 'rgba(16, 20, 24, 0.92)';
    g.beginPath();
    g.roundRect(0, 0, LARGURA_PX, ALTURA_PX, 40);
    g.fill();

    // Mensagem: a fonte encolhe ate a linha mais larga caber.
    const linhas = mensagem.split('\n');
    let tamanho = 76;
    g.font = `700 ${tamanho}px ${FONTE}`;
    const maisLarga = Math.max(...linhas.map((linha) => g.measureText(linha).width));
    tamanho = Math.min(tamanho, Math.floor((tamanho * (LARGURA_PX - 2 * MARGEM_PX)) / maisLarga));
    g.font = `700 ${tamanho}px ${FONTE}`;
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const alturaLinha = tamanho * 1.3;
    const centroMensagem = 210;
    linhas.forEach((linha, i) => {
      g.fillText(linha, LARGURA_PX / 2, centroMensagem + (i - (linhas.length - 1) / 2) * alturaLinha);
    });

    g.fillStyle = AMARELO;
    g.fillRect(MARGEM_PX, 400, LARGURA_PX - 2 * MARGEM_PX, 6);

    // Logos e o texto do governo distribuidos por igual na faixa de baixo.
    const centroFaixa = 580;
    g.font = `700 40px ${FONTE}`;
    const linhasGoverno = textoGoverno.replace(' do ', ' do\n').split('\n');
    const larguraGoverno = Math.max(...linhasGoverno.map((linha) => g.measureText(linha).width));
    const itens = imagens
      .map((imagem, i) => imagem && { imagem, altura: LOGOS[i].altura, largura: (imagem.width * LOGOS[i].altura) / imagem.height })
      .filter(Boolean);
    itens.push({ largura: larguraGoverno });
    const espaco = (LARGURA_PX - itens.reduce((soma, item) => soma + item.largura, 0)) / (itens.length + 1);

    let x = espaco;
    for (const item of itens) {
      if (item.imagem) {
        g.drawImage(item.imagem, x, centroFaixa - item.altura / 2, item.largura, item.altura);
      } else {
        g.fillStyle = '#ffffff';
        linhasGoverno.forEach((linha, i) => {
          g.fillText(linha, x + item.largura / 2, centroFaixa + (i - (linhasGoverno.length - 1) / 2) * 46);
        });
      }
      x += item.largura + espaco;
    }
    textura.needsUpdate = true;
  }
  desenhar();

  return { malha };
}
