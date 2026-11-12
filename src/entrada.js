// Indices do mapeamento xr-standard do Quest Touch: A/X e B/Y.
const BOTAO_A = 4;
const BOTAO_B = 5;

const TECLAS = { KeyA: 'A', KeyB: 'B' };

export function criarEntrada() {
  const estadoAnterior = new WeakMap();
  const filaTeclado = [];

  window.addEventListener('keydown', (evento) => {
    const comando = TECLAS[evento.code];
    if (!comando || evento.repeat) return;
    evento.preventDefault();
    filaTeclado.push({ comando, fonte: null });
  });

  function lerControles(sessao, eventos) {
    for (const fonte of sessao.inputSources) {
      const gamepad = fonte.gamepad;
      if (!gamepad) continue;
      const anterior = estadoAnterior.get(fonte) ?? [];
      const apertado = gamepad.buttons.map((botao) => botao.pressed);
      if (apertado[BOTAO_A] && !anterior[BOTAO_A]) eventos.push({ comando: 'A', fonte });
      if (apertado[BOTAO_B] && !anterior[BOTAO_B]) eventos.push({ comando: 'B', fonte });
      estadoAnterior.set(fonte, apertado);
    }
  }

  return {
    // Devolve os comandos novos deste quadro: bordas dos controles e teclas acumuladas.
    coletar(sessao) {
      const eventos = filaTeclado.splice(0);
      if (sessao) lerControles(sessao, eventos);
      return eventos;
    },
  };
}

export function vibrar(fonte, { intensidade, ms }) {
  const gamepad = fonte?.gamepad;
  if (!gamepad) return;
  const atuador = gamepad.hapticActuators?.[0];
  if (atuador?.pulse) {
    atuador.pulse(intensidade, ms);
  } else if (gamepad.vibrationActuator?.playEffect) {
    gamepad.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: intensidade, weakMagnitude: intensidade });
  }
}
