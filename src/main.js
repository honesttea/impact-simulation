import * as THREE from 'three';
import { config } from '../config.js';
import { criarAudio } from './audio.js';
import { criarCena } from './cena.js';
import { POSICAO_BANCO } from './carro.js';
import { criarEfeitos } from './efeitos.js';
import { criarEntrada } from './entrada.js';
import { criarSimulacao, PARADO, MENSAGEM } from './estados.js';
import { criarPainelTexto } from './painel.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local');
renderer.xr.setFoveation(1);
document.body.appendChild(renderer.domElement);

// Hierarquia: cena > tranco (banco, recebe o tranco do impacto) > rig (giro e trava da cabeca) > camera.
const { cena, atualizarCena } = criarCena(renderer);
const tranco = new THREE.Group();
tranco.position.copy(POSICAO_BANCO);
const rig = new THREE.Group();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 400);
cena.add(tranco);
tranco.add(rig);
rig.add(camera);

const audio = criarAudio();
const entrada = criarEntrada();
const efeitos = criarEfeitos({ cena, camera, tranco });
const simulacao = criarSimulacao({ audio, recentralizar: () => { recentralizarPendente = true; } });

const formatarNumero = (valor, casas) =>
  valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

const painelTempo = criarPainelTexto({ larguraPx: 640, alturaPx: 220, larguraMetros: 0.18, tamanhoFonte: 56 });
painelTempo.malha.position.set(-0.19, -0.16, -0.6);
camera.add(painelTempo.malha);

const painelDepuracao = criarPainelTexto({ larguraPx: 512, alturaPx: 300, larguraMetros: 0.2, tamanhoFonte: 42 });
painelDepuracao.malha.position.set(0.2, -0.12, -0.6);
camera.add(painelDepuracao.malha);

const painelMensagem = criarPainelTexto({ larguraPx: 1024, alturaPx: 360, larguraMetros: 1.1, tamanhoFonte: 66 });
painelMensagem.malha.position.set(0, 0.05, -1.4);
painelMensagem.escrever(config.mensagem.replace('{X}', formatarNumero(config.velocidadeImpactoKmh, 0)));
tranco.add(painelMensagem.malha);

// Trava da cabeca: a translacao do headset e anulada, so a rotacao vale.
const EIXO_Y = new THREE.Vector3(0, 1, 0);
const posicaoCabeca = new THREE.Vector3();
const orientacaoCabeca = new THREE.Quaternion();
const frenteCabeca = new THREE.Vector3();
let recentralizarPendente = true;

function guinada(quaternion) {
  frenteCabeca.set(0, 0, -1).applyQuaternion(quaternion);
  return Math.atan2(-frenteCabeca.x, -frenteCabeca.z);
}

function travarCabecaNoBanco(frame) {
  const pose = frame.getViewerPose(renderer.xr.getReferenceSpace());
  if (!pose) return;
  const { position, orientation } = pose.transform;
  posicaoCabeca.set(position.x, position.y, position.z);
  orientacaoCabeca.set(orientation.x, orientation.y, orientation.z, orientation.w);
  if (recentralizarPendente) {
    rig.rotation.y = -guinada(orientacaoCabeca);
    recentralizarPendente = false;
  }
  rig.position.copy(posicaoCabeca).applyAxisAngle(EIXO_Y, rig.rotation.y).negate();
}

// Modo desktop: arrastar o mouse para olhar.
let guinadaMouse = 0;
let arfagemMouse = 0;
let arrastando = false;
renderer.domElement.addEventListener('pointerdown', (evento) => {
  arrastando = true;
  renderer.domElement.setPointerCapture(evento.pointerId);
});
renderer.domElement.addEventListener('pointerup', () => { arrastando = false; });
renderer.domElement.addEventListener('pointermove', (evento) => {
  if (!arrastando) return;
  guinadaMouse -= evento.movementX * 0.004;
  arfagemMouse = THREE.MathUtils.clamp(arfagemMouse - evento.movementY * 0.004, -1.3, 1.3);
});

function posicionarCameraDesktop() {
  if (recentralizarPendente) {
    guinadaMouse = 0;
    arfagemMouse = 0;
    recentralizarPendente = false;
  }
  rig.position.set(0, 0, 0);
  rig.rotation.set(0, 0, 0);
  camera.position.set(0, 0, 0);
  camera.rotation.set(arfagemMouse, guinadaMouse, 0, 'YXZ');
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let depuracaoLigada = false;
let versao = '?';
let fps = 0;
let quadrosContados = 0;
let inicioContagemMs = 0;
let ultimoQuadroMs = null;

function contarQuadro(instanteMs) {
  quadrosContados++;
  if (instanteMs - inicioContagemMs >= 500) {
    fps = Math.round((quadrosContados * 1000) / (instanteMs - inicioContagemMs));
    quadrosContados = 0;
    inicioContagemMs = instanteMs;
  }
}

function atualizarPaineis(quadro) {
  const tempoTexto = `T = ${formatarNumero(quadro.tempoDescida, 2)} s`;
  const calibracaoTexto = quadro.modoCalibracao ? 'calibração: bipe ligado' : 'sem som';
  painelTempo.malha.visible = quadro.estado === PARADO;
  painelTempo.escrever(`${tempoTexto}\n${calibracaoTexto}`);

  painelDepuracao.malha.visible = depuracaoLigada;
  if (depuracaoLigada) {
    painelDepuracao.escrever(`${quadro.estado}\n${tempoTexto}\n${fps} fps\nversão ${versao}`);
  }

  painelMensagem.malha.visible = quadro.estado === MENSAGEM;
}

renderer.setAnimationLoop((instanteMs, frame) => {
  const dt = ultimoQuadroMs === null ? 0 : Math.min(0.1, (instanteMs - ultimoQuadroMs) / 1000);
  ultimoQuadroMs = instanteMs;
  contarQuadro(instanteMs);

  for (const evento of entrada.coletar(renderer.xr.getSession())) {
    if (evento.comando === 'depuracao') depuracaoLigada = !depuracaoLigada;
    else simulacao.processar(evento, instanteMs);
  }

  if (frame) travarCabecaNoBanco(frame);
  else posicionarCameraDesktop();

  const quadro = simulacao.atualizar(instanteMs, dt);
  atualizarCena(quadro);
  efeitos.atualizar(quadro);
  atualizarPaineis(quadro);
  renderer.render(cena, camera);
});

// Tela inicial.
const telaInicio = document.getElementById('inicio');
const botaoVR = document.getElementById('entrar-vr');
const botaoDesktop = document.getElementById('ver-navegador');
const aviso = document.getElementById('aviso');
const textoVersao = document.getElementById('versao');

function comecar() {
  telaInicio.hidden = true;
  recentralizarPendente = true;
  simulacao.voltarAoInicio(performance.now());
}

botaoVR.addEventListener('click', async () => {
  audio.destravar();
  try {
    const sessao = await navigator.xr.requestSession('immersive-vr');
    sessao.addEventListener('end', () => { telaInicio.hidden = false; });
    await renderer.xr.setSession(sessao);
    comecar();
  } catch (erro) {
    aviso.textContent = `Não foi possível entrar no VR: ${erro.message}`;
  }
});

botaoDesktop.addEventListener('click', () => {
  audio.destravar();
  comecar();
});

if (navigator.xr) {
  navigator.xr.isSessionSupported('immersive-vr').then((suportado) => {
    if (!suportado) aviso.textContent = 'Este navegador não tem VR. Use "Ver no navegador" para testar.';
    botaoVR.disabled = !suportado;
  });
} else {
  botaoVR.disabled = true;
  aviso.textContent = 'WebXR indisponível aqui (precisa de localhost ou HTTPS). Use "Ver no navegador".';
}

// Offline: service worker e pedido de armazenamento persistente.
if ('serviceWorker' in navigator) {
  const jaTinhaControlador = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (jaTinhaControlador && !renderer.xr.isPresenting) window.location.reload();
  });
  navigator.serviceWorker.register('./sw.js').catch((erro) => {
    textoVersao.textContent = `Sem modo offline: ${erro.message}`;
  });
  navigator.serviceWorker.ready.then((registro) => {
    const canal = new MessageChannel();
    canal.port1.onmessage = (evento) => {
      versao = evento.data;
      textoVersao.textContent = `Versão ${versao}: pronto para uso offline`;
    };
    registro.active.postMessage('versao', [canal.port2]);
  });
}
navigator.storage?.persist?.();
