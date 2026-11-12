import { config } from '../config.js';

// Unico som do projeto: o bipe do modo de calibracao, no instante exato da batida virtual.
export function criarAudio() {
  const ctx = new AudioContext();

  // Atraso entre agendar e o som sair do alto-falante; descontado para o bipe coincidir com a imagem.
  const latenciaSaida = () => (ctx.baseLatency || 0) + (ctx.outputLatency || 0);

  return {
    destravar: () => ctx.resume(),
    agendarBipe(segundosAteImpacto) {
      const { frequencia, ms, volume } = config.bipeCalibracao;
      const inicio = ctx.currentTime + Math.max(0, segundosAteImpacto - latenciaSaida());
      const fim = inicio + ms / 1000;

      const oscilador = ctx.createOscillator();
      oscilador.type = 'square';
      oscilador.frequency.value = frequencia;
      const ganho = ctx.createGain();
      ganho.gain.setValueAtTime(volume, inicio);
      ganho.gain.setValueAtTime(0, fim);
      oscilador.connect(ganho).connect(ctx.destination);
      oscilador.start(inicio);
      oscilador.stop(fim);

      return {
        cancelar() {
          try { oscilador.stop(); } catch { /* ja parado */ }
          ganho.disconnect();
        },
      };
    },
  };
}
