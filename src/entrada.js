// Indices do mapeamento xr-standard do Quest Touch.
const BOTAO_GATILHO = 0;
const BOTAO_GRIP = 1;
const BOTAO_ANALOGICO = 3;
const BOTAO_A = 4;
const BOTAO_B = 5;
const EIXO_VERTICAL = 3;

const LIMIAR_EIXO = 0.7;
const LIMIAR_SOLTURA_EIXO = 0.3;

const TECLAS = {
  KeyA: 'A',
  Space: 'gatilho',
  KeyB: 'B',
  ArrowUp: 'T+',
  ArrowDown: 'T-',
  KeyD: 'depuracao',
  KeyC: 'calibracao',
};

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

      const anterior = estadoAnterior.get(fonte) ?? { botoes: [], eixoArmado: true };
      const apertado = (indice) => Boolean(gamepad.buttons[indice]?.pressed);
      const bordaDe = (indice) => apertado(indice) && !anterior.botoes[indice];

      if (bordaDe(BOTAO_A)) eventos.push({ comando: 'A', fonte });
      if (bordaDe(BOTAO_B)) eventos.push({ comando: 'B', fonte });
      if (bordaDe(BOTAO_GATILHO)) eventos.push({ comando: 'gatilho', fonte });
      if (bordaDe(BOTAO_ANALOGICO)) eventos.push({ comando: 'depuracao', fonte });
      if (bordaDe(BOTAO_GRIP)) eventos.push({ comando: 'calibracao', fonte });

      // Para cima o eixo e negativo. Um passo por empurrao: so rearma depois de voltar ao centro.
      const eixo = gamepad.axes[EIXO_VERTICAL] ?? 0;
      let eixoArmado = anterior.eixoArmado;
      if (eixoArmado && Math.abs(eixo) > LIMIAR_EIXO) {
        eventos.push({ comando: eixo < 0 ? 'T+' : 'T-', fonte });
        eixoArmado = false;
      } else if (Math.abs(eixo) < LIMIAR_SOLTURA_EIXO) {
        eixoArmado = true;
      }

      estadoAnterior.set(fonte, {
        botoes: gamepad.buttons.map((botao) => botao.pressed),
        eixoArmado,
      });
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
