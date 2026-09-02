/**
 * Sonificação do registro sísmico — o som sai do MESMO dado que o desenho.
 *
 * Nada aqui é uma gravação: não há arquivo de áudio no projeto. O que toca é
 * sintetizado em tempo real e conduzido pela envoltória do registro (a maior
 * amplitude entre as 8 estações a cada segundo), então o que se ouve é
 * literalmente a altura das trilhas que se vê. Sonificar assim é a mesma
 * regra que já vale pra cor: o número nasce uma vez, no R, e as duas saídas
 * o aplicam — nenhuma pode divergir da outra.
 *
 * Por que envoltória e não as pegadas uma a uma: a reprodução comprime 660 s
 * em 3,4 s (194x), e nessa velocidade as pegadas ficam a 14 ms de distância —
 * 69 por segundo. Passo individual viraria zumbido de 69 Hz, não passo.
 * Acelerar sismograma até virar som audível é, aliás, técnica de sismologia
 * de verdade, não invenção desta página.
 *
 * O áudio NUNCA começa sozinho: navegador nenhum permite, e mesmo que
 * permitisse seria hostil. Só existe depois de um clique explícito no botão.
 */

export interface Som {
  ligado(): boolean;
  /** Liga/desliga. Assíncrono porque retomar o AudioContext é uma promessa. */
  alternar(): Promise<boolean>;
  /** Chamado a cada quadro da reprodução, com o instante lido. */
  atualizar(segundo: number, tocando: boolean): void;
  /** O evento de 07:50, disparável também fora da reprodução. */
  rugir(): void;
}

interface Config {
  /** Amplitude 0..1 por segundo de registro, vinda do data.json. */
  envelope: number[];
  duracao: number;
}

/** Curva de distorção suave (tanh). Sem ela o rugido sai como um apito de
 *  sintetizador; com ela ganha a aspereza de corda raspada que o som de kaiju
 *  clássico tem (ele foi feito esfregando luva de resina num contrabaixo). */
function curvaAspera(quantidade = 12): Float32Array<ArrayBuffer> {
  const n = 1024;
  // `Float32Array<ArrayBuffer>` explícito: desde que os TypedArray viraram
  // genéricos sobre o buffer, `Float32Array` cru infere `ArrayBufferLike`, que
  // inclui `SharedArrayBuffer` e não serve pro `curve` do WaveShaper.
  const curva = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curva[i] = Math.tanh(x * quantidade) / Math.tanh(quantidade);
  }
  return curva;
}

export function criarSom({ envelope, duracao }: Config): Som {
  let ctx: AudioContext | null = null;
  let mestre: GainNode;
  let ganhoRonco: GainNode;
  let ganhoRuido: GainNode;
  let filtroRonco: BiquadFilterNode;
  let ativo = false;

  function montar() {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();

    mestre = ctx.createGain();
    mestre.gain.value = 0.17; // discreto de propósito — isto acompanha, não anuncia
    mestre.connect(ctx.destination);

    // ------------------------------------------------------------- ronco
    // Duas ondas graves levemente desafinadas: a batida entre elas cria a
    // oscilação lenta que faz massa grande soar como massa grande, em vez de
    // como uma nota só.
    filtroRonco = ctx.createBiquadFilter();
    filtroRonco.type = 'lowpass';
    filtroRonco.frequency.value = 120;
    filtroRonco.Q.value = 6;

    ganhoRonco = ctx.createGain();
    ganhoRonco.gain.value = 0;
    filtroRonco.connect(ganhoRonco).connect(mestre);

    [34, 51.5].forEach((hz, i) => {
      const osc = ctx!.createOscillator();
      osc.type = i === 0 ? 'sine' : 'sawtooth';
      osc.frequency.value = hz;
      osc.connect(filtroRonco);
      osc.start();
    });

    // -------------------------------------------------------------- grit
    // Ruído filtrado = entulho, vidro, estrutura cedendo. Entra ao quadrado da
    // amplitude, então só aparece de verdade nos picos.
    const quadros = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, quadros, ctx.sampleRate);
    const canal = buffer.getChannelData(0);
    for (let i = 0; i < quadros; i++) canal[i] = Math.random() * 2 - 1;

    const ruido = ctx.createBufferSource();
    ruido.buffer = buffer;
    ruido.loop = true;

    const filtroRuido = ctx.createBiquadFilter();
    filtroRuido.type = 'bandpass';
    filtroRuido.frequency.value = 240;
    filtroRuido.Q.value = 0.7;

    ganhoRuido = ctx.createGain();
    ganhoRuido.gain.value = 0;
    ruido.connect(filtroRuido).connect(ganhoRuido).connect(mestre);
    ruido.start();
  }

  function amplitudeEm(segundo: number): number {
    const i = Math.max(0, Math.min(envelope.length - 1, Math.round(segundo)));
    return envelope[i] ?? 0;
  }

  return {
    ligado: () => ativo,

    async alternar() {
      if (!ctx) {
        try {
          montar();
        } catch {
          return false; // sem Web Audio o resto da página segue igual
        }
      }
      if (ctx!.state === 'suspended') await ctx!.resume();
      ativo = !ativo;
      if (!ativo) {
        // Desliga descendo, nunca cortando: corte seco em onda grave estala.
        const t = ctx!.currentTime;
        ganhoRonco.gain.setTargetAtTime(0, t, 0.05);
        ganhoRuido.gain.setTargetAtTime(0, t, 0.05);
      }
      return ativo;
    },

    atualizar(segundo, tocando) {
      if (!ativo || !ctx) return;
      const t = ctx.currentTime;
      const amp = tocando && segundo < duracao ? amplitudeEm(segundo) : 0;

      // `setTargetAtTime` em vez de valor direto: a leitura chega a cada
      // quadro, e saltar o ganho a cada quadro produz zíper audível.
      ganhoRonco.gain.setTargetAtTime(amp * 0.85, t, 0.03);
      ganhoRuido.gain.setTargetAtTime(amp * amp * 0.22, t, 0.03);
      // Mais amplitude abre o filtro: forte não é só mais alto, é mais áspero.
      filtroRonco.frequency.setTargetAtTime(110 + amp * 320, t, 0.05);
    },

    rugir() {
      if (!ativo || !ctx) return;
      const t = ctx.currentTime;
      const dur = 2;

      // Fundamental baixa. O que impede isso de sumir em alto-falante de
      // notebook (que mal reproduz abaixo de ~150 Hz) é a distorção logo
      // adiante: ela gera harmônicos em 2x, 3x, 4x da fundamental, então o
      // ouvido reconstrói o grave a partir deles mesmo quando o alto-falante
      // não o emite. É por isso que dá pra ir fundo sem ficar inaudível.
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(46, t);
      osc.frequency.exponentialRampToValueAtTime(72, t + 0.5);
      osc.frequency.exponentialRampToValueAtTime(30, t + dur);

      // Sub uma oitava abaixo, em senoide pura: peso. Um rugido lido como
      // "grave" precisa de corpo embaixo, não só de fundamental menor.
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(23, t);
      sub.frequency.exponentialRampToValueAtTime(36, t + 0.5);
      sub.frequency.exponentialRampToValueAtTime(15, t + dur);
      const subGanho = ctx.createGain();
      subGanho.gain.value = 0.5;

      // Vibrato: a instabilidade de altura é o que separa "bicho" de "sirene".
      // Desvio menor que antes porque a fundamental caiu — 7 Hz sobre 46 Hz
      // soaria como afinação errada, não como voz.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 4.8;
      const lfoGanho = ctx.createGain();
      lfoGanho.gain.value = 3.5;
      lfo.connect(lfoGanho).connect(osc.frequency);

      const aspero = ctx.createWaveShaper();
      aspero.curve = curvaAspera();

      const filtro = ctx.createBiquadFilter();
      filtro.type = 'lowpass';
      filtro.Q.value = 8;
      filtro.frequency.setValueAtTime(170, t);
      filtro.frequency.exponentialRampToValueAtTime(620, t + 0.45);
      filtro.frequency.exponentialRampToValueAtTime(95, t + dur);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.85, t + 0.14);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(aspero).connect(filtro).connect(g).connect(mestre);
      sub.connect(subGanho).connect(g);
      osc.start(t);
      sub.start(t);
      lfo.start(t);
      osc.stop(t + dur + 0.05);
      sub.stop(t + dur + 0.05);
      lfo.stop(t + dur + 0.05);
      // Nós de uso único precisam ser soltos, senão cada rugido deixa uma
      // cadeia viva pendurada no grafo de áudio.
      osc.onended = () => {
        [osc, sub, subGanho, lfo, lfoGanho, aspero, filtro, g].forEach((n) => n.disconnect());
      };
    },
  };
}
