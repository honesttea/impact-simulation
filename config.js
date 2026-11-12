export const config = {
  // T: tempo de descida do carrinho real, em segundos. O valor ajustado pelo controle (salvo no Quest) vence este.
  tempoDescidaPadrao: 1.5,
  passoAjusteT: 0.05,
  tempoMinimo: 0.3,
  tempoMaximo: 5,

  velocidadeCruzeiroKmh: 60,
  tempoAceleracao: 3,
  // Metros entre os para-choques. Limitada a velocidade * T / 2 para o carro da frente nunca parecer andar de re.
  distanciaInicial: 12,

  duracaoEscurecimento: 0.6,
  atrasoMensagem: 0.9,
  velocidadeImpactoKmh: 10,
  // {X} vira a velocidade de impacto acima.
  mensagem: 'Esta batida foi a {X} km/h.\nUse sempre o cinto.',

  vibracao: {
    confirmacao: { intensidade: 0.7, ms: 90 },
    gatilho: { intensidade: 1.0, ms: 60 },
    retorno: { intensidade: 1.0, ms: 450 },
    tique: { intensidade: 0.4, ms: 25 },
  },

  // A experiencia e silenciosa. O bipe so toca no modo de calibracao (grip no estado PARADO).
  bipeCalibracao: { frequencia: 1000, ms: 150, volume: 0.6 },
};
