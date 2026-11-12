export const config = {
  // Tempo medido no carrinho real, do pino solto (botao B) ate a batida, em segundos.
  tempoDescida: 2.25,

  velocidadeCruzeiroKmh: 60,
  // Metros entre os para-choques. Limitada a velocidade * T / 2 para o carro da frente nunca parecer andar de re.
  distanciaInicial: 12,

  duracaoEscurecimento: 0.6,
  atrasoMensagem: 0.9,
  velocidadeImpactoKmh: 7,
  // {X} vira a velocidade de impacto acima.
  mensagem: 'Esta batida foi a {X} km/h.\nSempre use o cinto de segurança.',
  // Escrito por extenso, sem logo: periodo eleitoral.
  textoGoverno: 'Governo do Distrito Federal',

  vibracao: {
    reinicio: { intensidade: 0.7, ms: 90 },
    batida: { intensidade: 1.0, ms: 60 },
  },
};
