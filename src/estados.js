import { config } from '../config.js';
import { vibrar } from './entrada.js';

export const PARADO = 'PARADO';
export const DIRIGINDO = 'DIRIGINDO';
export const FREADA = 'FREADA';
export const IMPACTO = 'IMPACTO';
export const MENSAGEM = 'MENSAGEM';

const CHAVE_TEMPO_DESCIDA = 'simuladorImpacto.tempoDescidaMs';

function carregarTempoDescidaMs() {
  const salvo = Number(localStorage.getItem(CHAVE_TEMPO_DESCIDA));
  return salvo > 0 ? salvo : Math.round(config.tempoDescidaPadrao * 1000);
}

const suavizar = (x) => x * x * (3 - 2 * x);

export function criarSimulacao({ audio, recentralizar }) {
  const velocidadeCruzeiro = config.velocidadeCruzeiroKmh / 3.6;
  const passoMs = Math.round(config.passoAjusteT * 1000);

  let estado = PARADO;
  let inicioEstadoMs = 0;
  let gatilhoMs = 0;
  let tempoDescidaMs = carregarTempoDescidaMs();
  // Nao e salvo: ao abrir a pagina a experiencia sempre comeca silenciosa.
  let modoCalibracao = false;
  let velocidade = 0;
  let distanciaPercorrida = 0;
  let bipeAgendado = null;

  const tempoDescida = () => tempoDescidaMs / 1000;
  const distanciaInicial = () => Math.min(config.distanciaInicial, (velocidadeCruzeiro * tempoDescida()) / 2);

  function entrar(novoEstado, instanteMs) {
    estado = novoEstado;
    inicioEstadoMs = instanteMs;
  }

  function voltarAoInicio(instanteMs) {
    bipeAgendado?.cancelar();
    bipeAgendado = null;
    velocidade = 0;
    entrar(PARADO, instanteMs);
  }

  function ajustarTempoDescida(sinal, fonte) {
    const minimo = config.tempoMinimo * 1000;
    const maximo = config.tempoMaximo * 1000;
    const novo = Math.min(maximo, Math.max(minimo, tempoDescidaMs + sinal * passoMs));
    if (novo === tempoDescidaMs) return;
    tempoDescidaMs = novo;
    localStorage.setItem(CHAVE_TEMPO_DESCIDA, String(novo));
    vibrar(fonte, config.vibracao.tique);
  }

  function processar({ comando, fonte }, instanteMs) {
    if (comando === 'B') {
      voltarAoInicio(instanteMs);
      vibrar(fonte, config.vibracao.retorno);
    } else if (comando === 'A' && (estado === PARADO || estado === DIRIGINDO)) {
      recentralizar();
      if (estado === PARADO) entrar(DIRIGINDO, instanteMs);
      vibrar(fonte, config.vibracao.confirmacao);
    } else if (comando === 'gatilho' && estado === DIRIGINDO) {
      gatilhoMs = instanteMs;
      entrar(FREADA, instanteMs);
      if (modoCalibracao) {
        const jaPassou = (performance.now() - instanteMs) / 1000;
        bipeAgendado = audio.agendarBipe(tempoDescida() - jaPassou);
      }
      vibrar(fonte, config.vibracao.gatilho);
    } else if (comando === 'calibracao' && estado === PARADO) {
      modoCalibracao = !modoCalibracao;
      vibrar(fonte, config.vibracao.confirmacao);
    } else if (comando === 'T+' && estado === PARADO) {
      ajustarTempoDescida(1, fonte);
    } else if (comando === 'T-' && estado === PARADO) {
      ajustarTempoDescida(-1, fonte);
    }
  }

  function distanciaAoCarroDaFrente(instanteMs) {
    if (estado === IMPACTO || estado === MENSAGEM) return 0;
    if (estado !== FREADA) return distanciaInicial();
    // Desaceleracao constante do carro da frente: chega a zero exatamente em T.
    const fracao = Math.min(1, (instanteMs - gatilhoMs) / tempoDescidaMs);
    return distanciaInicial() * (1 - fracao * fracao);
  }

  function atualizar(instanteMs, dt) {
    if (estado === DIRIGINDO) {
      const decorrido = (instanteMs - inicioEstadoMs) / 1000;
      velocidade = velocidadeCruzeiro * suavizar(Math.min(1, decorrido / config.tempoAceleracao));
    }
    if (estado === FREADA && instanteMs - gatilhoMs >= tempoDescidaMs) {
      entrar(IMPACTO, gatilhoMs + tempoDescidaMs);
      velocidade = 0;
    }
    if (estado === IMPACTO && (instanteMs - inicioEstadoMs) / 1000 >= config.atrasoMensagem) {
      entrar(MENSAGEM, inicioEstadoMs + config.atrasoMensagem * 1000);
    }

    distanciaPercorrida += velocidade * dt;

    return {
      estado,
      velocidade,
      distanciaPercorrida,
      distanciaFrente: distanciaAoCarroDaFrente(instanteMs),
      freioAceso: estado === FREADA || estado === IMPACTO || estado === MENSAGEM,
      // Segundos desde o instante exato do impacto (negativo antes dele).
      tempoDesdeImpacto: estado === IMPACTO || estado === MENSAGEM
        ? (instanteMs - gatilhoMs - tempoDescidaMs) / 1000
        : -1,
      tempoDescida: tempoDescida(),
      modoCalibracao,
    };
  }

  return { processar, atualizar, voltarAoInicio };
}
