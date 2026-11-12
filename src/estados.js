import { config } from '../config.js';
import { vibrar } from './entrada.js';

export const DIRIGINDO = 'DIRIGINDO';
export const FREADA = 'FREADA';
export const IMPACTO = 'IMPACTO';
export const MENSAGEM = 'MENSAGEM';

export function criarSimulacao({ recentralizar }) {
  const velocidadeCruzeiro = config.velocidadeCruzeiroKmh / 3.6;
  const tempoDescidaMs = config.tempoDescida * 1000;
  const distanciaInicial = Math.min(config.distanciaInicial, (velocidadeCruzeiro * config.tempoDescida) / 2);

  let estado = DIRIGINDO;
  let freadaMs = 0;
  let impactoMs = 0;
  let velocidade = velocidadeCruzeiro;
  let distanciaPercorrida = 0;

  function reiniciar() {
    recentralizar();
    estado = DIRIGINDO;
    velocidade = velocidadeCruzeiro;
  }

  function processar({ comando, fonte }, instanteMs) {
    if (comando === 'A') {
      reiniciar();
      vibrar(fonte, config.vibracao.reinicio);
    } else if (comando === 'B' && estado === DIRIGINDO) {
      estado = FREADA;
      freadaMs = instanteMs;
      vibrar(fonte, config.vibracao.batida);
    }
  }

  function distanciaAoCarroDaFrente(instanteMs) {
    if (estado === DIRIGINDO) return distanciaInicial;
    if (estado !== FREADA) return 0;
    // Desaceleracao constante do carro da frente: chega a zero exatamente em T.
    const fracao = Math.min(1, (instanteMs - freadaMs) / tempoDescidaMs);
    return distanciaInicial * (1 - fracao * fracao);
  }

  function atualizar(instanteMs, dt) {
    if (estado === FREADA && instanteMs - freadaMs >= tempoDescidaMs) {
      estado = IMPACTO;
      impactoMs = freadaMs + tempoDescidaMs;
      velocidade = 0;
    }
    if (estado === IMPACTO && (instanteMs - impactoMs) / 1000 >= config.atrasoMensagem) {
      estado = MENSAGEM;
    }

    distanciaPercorrida += velocidade * dt;
    const bateu = estado === IMPACTO || estado === MENSAGEM;

    return {
      estado,
      distanciaPercorrida,
      distanciaFrente: distanciaAoCarroDaFrente(instanteMs),
      freioAceso: estado !== DIRIGINDO,
      // Segundos desde o instante exato do impacto (negativo antes dele).
      tempoDesdeImpacto: bateu ? (instanteMs - impactoMs) / 1000 : -1,
    };
  }

  return { processar, atualizar, reiniciar };
}
