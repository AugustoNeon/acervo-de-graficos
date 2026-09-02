/**
 * Sismógrafo kaiju — parede de sismogramas de 8 estações.
 *
 * O dado é uma simulação sísmica de verdade (ver script.R): cada pegada da
 * criatura é um impulso amortecido, atenuado pela distância até a estação. O
 * que o gráfico mostra, e nenhuma tabela mostraria, é a DIAGONAL: o pico
 * descendo de estação em estação ao longo do tempo é a criatura andando pra
 * dentro da cidade. Por isso as 8 trilhas dividem um eixo X só e uma escala de
 * amplitude só — normalizar cada trilha pelo próprio pico faria a estação mais
 * calma parecer tão violenta quanto a mais atingida, matando a leitura.
 *
 * Cada segundo do registro é uma coluna min/max (decimação pico-a-pico, a
 * mesma que um visualizador de sismograma real usa), desenhada como um
 * segmento vertical. A cor não é identidade de estação: é ESTADO de amplitude
 * (calmo/alerta/crítico), com os limiares vindos prontos do R — o PNG e este
 * módulo aplicam a mesma regra aos mesmos números, então não têm como
 * divergir.
 */

import { select, scaleLinear, axisBottom, pointer, type Selection } from 'd3';
import { DURATION, garantirEstadoFinal, prefersReducedMotion } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import type { DrawContext, VizChart } from '../../types';

/**
 * O runtime redesenha o gráfico no MESMO `root` a cada resize (ver mount.ts),
 * e o listener de rugido vive no root, não nos elementos redesenhados — sem
 * esta limpeza cada redesenho empilharia mais um, todos apontando pro SVG
 * anterior já descartado. Mesmo padrão do `tornarFixavel`.
 */
const limpezaPorRaiz = new WeakMap<HTMLElement, () => void>();

interface Estacao {
  codigo: string;
  nome: string;
  km: number;
  pico: number;
  tPico: number;
  shindo: number;
  pgv: number;
  /** Plano e intercalado: [min0, max0, min1, max1, ...], escalado por meta.escala. */
  traco: number[];
}

interface Dados {
  meta: {
    duracao: number;
    bins: number;
    segundosPorBin: number;
    escala: number;
    unidade: string;
    pgvMaximo: number;
    emersao: number;
    rugido: number;
    passo: number;
    paleta: { calmo: string; alerta: string; critico: string };
    limiares: { alerta: number; critico: number };
  };
  pegadas: number[];
  estacoes: Estacao[];
}

const VB_W = 1000;
const VB_H = 680;

/**
 * Margens em px REAIS, não em unidades de viewBox.
 *
 * As margens laterais existem pra caber texto (nome da estação, PGV), e o
 * texto deste runtime é dimensionado em px reais via `px()` — ou seja, ele
 * NÃO encolhe junto com o container. Uma margem fixa em unidades de viewBox
 * encolhe: a 375px de largura, `esq: 116` vira 43px reais de espaço pra um
 * rótulo que continua ocupando ~60px, e o nome vaza por baixo do gráfico.
 * Convertidas por `px()`, margem e texto passam a encolher (ou não) juntos.
 */
const MARGEM_REAL = { topo: 34, dir: 64, baixo: 30, esq: 92 };

/** Abaixo disto o nome por extenso não cabe e as estações viram código IATA-like. */
const LARGURA_COMPACTA = 560;

/** Quanto tempo de relógio leva pra percorrer os 11 minutos de registro — vale
 *  tanto pra abertura quanto pro botão de tocar. Longa de propósito: um
 *  sismógrafo que se preenche instantaneamente não lê como registro, lê como
 *  imagem pronta. */
const VARREDURA_MS = 3400;

/** Altura de meia trilha, em fração da faixa da estação. */
const GANHO = 0.44;

const mmss = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.round(s % 60)).padStart(2, '0')}`;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Parede de sismogramas de oito estações do corredor Tóquio-baía durante 11 minutos. ' +
    'O pico de agitação aparece primeiro na estação mais próxima da água e desce, uma a uma, ' +
    'até a mais distante — a assinatura de uma fonte sísmica se deslocando para o interior.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    limpezaPorRaiz.get(root)?.();

    const { meta, estacoes, pegadas } = data as Dados;
    const { paleta, limiares, escala } = meta;

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const compacto = width < LARGURA_COMPACTA;
    const nomeDe = (e: Estacao) => (compacto ? e.codigo : e.nome);
    const MARGEM = {
      topo: px(MARGEM_REAL.topo),
      dir: px(compacto ? 34 : MARGEM_REAL.dir),
      baixo: px(MARGEM_REAL.baixo),
      esq: px(compacto ? 46 : MARGEM_REAL.esq),
    };

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;
    const faixa = alturaUtil / estacoes.length;
    const meiaAltura = faixa * GANHO;

    /** Segundo do registro -> x. */
    const x = scaleLinear().domain([0, meta.duracao]).range([0, larguraUtil]);
    /** Linha de base da estação i. */
    const baseY = (i: number) => faixa * (i + 0.5);

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true')
      .attr('class', 'sismo-svg');

    // ---------------------------------------------------------------- defs
    const defs = svg.append('defs');

    // Brilho: uma região de filtro só, cobrindo o gráfico inteiro, em vez de
    // uma por trilha — o custo de um filtro é a área que ele rasteriza, então
    // 8 regiões pequenas custam mais que 1 grande e ainda cortariam o halo na
    // borda de cada faixa.
    const brilho = defs.append('filter').attr('id', 'sismo-brilho').attr('x', '-2%').attr('y', '-2%').attr('width', '104%').attr('height', '104%');
    brilho.append('feGaussianBlur').attr('stdDeviation', 1.6).attr('result', 'borrado');
    const merge = brilho.append('feMerge');
    merge.append('feMergeNode').attr('in', 'borrado');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');

    // A varredura revela as trilhas por recorte: animar a largura de UM
    // retângulo é muito mais barato que animar `stroke-dasharray` em 24
    // caminhos de centenas de subtrajetos cada.
    const recorte = defs.append('clipPath').attr('id', 'sismo-recorte').append('rect').attr('x', -2).attr('y', -MARGEM.topo).attr('width', animate ? 0 : larguraUtil + 4).attr('height', VB_H);

    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    // ------------------------------------------------------------- réguas
    // Linha de base de cada estação: é ela que dá a referência de "zero" pra
    // leitura da amplitude, e sozinha já desenha a grade horizontal.
    g.selectAll('line.base')
      .data(estacoes)
      .join('line')
      .attr('class', 'base')
      .attr('x1', 0)
      .attr('x2', larguraUtil)
      .attr('y1', (_d, i) => baseY(i))
      .attr('y2', (_d, i) => baseY(i))
      .attr('stroke', theme.border)
      .attr('stroke-width', px(0.5));

    // ------------------------------------------------------------ trilhas
    // Três caminhos por estação (um por estado de amplitude), cada um de cor
    // chapada. A alternativa — um gradiente ao longo do X — só aproximaria os
    // limiares; assim a cor de cada coluna é exatamente a mesma que o R
    // calculou pro PNG.
    const gTrilhas = g.append('g').attr('clip-path', 'url(#sismo-recorte)');
    const gCalmo = gTrilhas.append('g');
    const gQuente = gTrilhas.append('g').attr('filter', 'url(#sismo-brilho)');

    // Um grupo por estação DENTRO de cada camada, com os caminhos desenhados
    // relativos a y=0 e a linha de base aplicada no `transform` do grupo. É o
    // que torna o ganho possível: amplificar vira `scale(1,fator)` no grupo,
    // em vez de reconstruir 660 colunas por estação a cada mudança. Manter a
    // divisão calmo/quente preserva a região ÚNICA do filtro de brilho.
    //
    // Escala não-uniforme costuma distorcer traço, mas não aqui: cada coluna é
    // um segmento vertical, e a espessura de um segmento vertical se mede em X
    // — que o `scale(1,…)` não toca.
    const trilhas: { i: number; sel: Selection<SVGGElement, unknown, null, undefined> }[] = [];

    estacoes.forEach((estacao, i) => {
      const partes = { calmo: '', alerta: '', critico: '' };

      for (let b = 0; b < meta.bins; b++) {
        const min = estacao.traco[b * 2] / escala;
        const max = estacao.traco[b * 2 + 1] / escala;
        const amp = Math.max(Math.abs(min), Math.abs(max));
        const estado = amp >= limiares.critico ? 'critico' : amp >= limiares.alerta ? 'alerta' : 'calmo';
        const cx = x(b * meta.segundosPorBin).toFixed(2);
        partes[estado] += `M${cx},${(-max * meiaAltura).toFixed(2)}L${cx},${(-min * meiaAltura).toFixed(2)}`;
      }

      const desenhar = (grupo: Selection<SVGGElement, unknown, null, undefined>, d: string, cor: string) => {
        if (!d) return;
        grupo
          .append('path')
          .attr('d', d)
          .attr('stroke', cor)
          .attr('stroke-width', px(0.9))
          .attr('fill', 'none');
      };

      const gc = gCalmo.append('g').attr('transform', `translate(0,${baseY(i)})`);
      const gq = gQuente.append('g').attr('transform', `translate(0,${baseY(i)})`);
      trilhas.push({ i, sel: gc }, { i, sel: gq });

      desenhar(gc, partes.calmo, paleta.calmo);
      desenhar(gq, partes.alerta, paleta.alerta);
      desenhar(gq, partes.critico, paleta.critico);
    });

    /** Ganho: recurso de sismógrafo de verdade — amplificar o traço pra ler a
     *  estrutura das estações calmas, que na escala das fortes some. As
     *  trilhas passam a invadir a faixa da vizinha, e isso é o comportamento
     *  correto: numa parede de sismogramas real elas invadem mesmo. */
    let ganho = 1;
    const aplicarGanho = (fator: number, animar: boolean) => {
      ganho = fator;
      trilhas.forEach(({ i, sel }) => {
        const alvo =
          animar && !prefersReducedMotion() ? sel.transition().duration(DURATION.base) : sel;
        alvo.attr('transform', `translate(0,${baseY(i)}) scale(1,${fator})`);
      });
    };

    // ------------------------------------------------------------ eventos
    // Duas marcas verticais que atravessam TODAS as estações, porque os dois
    // eventos que elas nomeiam são compartilhados: a emersão (origem de tudo)
    // e o rugido, que chega em todas as estações quase junto — é o único
    // momento do registro em que as 8 trilhas saltam ao mesmo tempo, e sem a
    // marca isso passaria por coincidência.
    const marcos = [
      { t: meta.emersao, rotulo: 'EMERSÃO', cor: paleta.alerta },
      { t: meta.rugido, rotulo: 'RUGIDO', cor: paleta.critico },
    ];

    const gMarcos = g.append('g');
    marcos.forEach((m) => {
      gMarcos
        .append('line')
        .attr('x1', x(m.t))
        .attr('x2', x(m.t))
        .attr('y1', -14)
        .attr('y2', alturaUtil)
        .attr('stroke', m.cor)
        .attr('stroke-width', px(1))
        .attr('stroke-dasharray', `${px(3)} ${px(4)}`)
        .attr('opacity', 0.55);

      gMarcos
        .append('text')
        .attr('x', x(m.t) + px(5))
        .attr('y', -20)
        .attr('fill', m.cor)
        .attr('font-family', theme.fontMono)
        .attr('font-size', px(9.5))
        .attr('letter-spacing', px(0.8))
        .text(`${m.rotulo} ${mmss(m.t)}`);
    });

    // -------------------------------------------------------------- picos
    // Marca só no pico de cada estação (nunca um número por coluna), e a linha
    // que liga as oito. Essa linha É a leitura do gráfico: ligada, ela deixa de
    // ser "oito trilhas agitadas" e vira a trajetória de uma coisa só andando.
    // Fica no mesmo recorte das trilhas, então se revela junto com a varredura
    // em vez de já estar desenhada esperando o registro chegar.
    const gPicos = g.append('g').attr('clip-path', 'url(#sismo-recorte)');
    const pontosPico = estacoes.map((estacao, i) => ({
      x: x(estacao.tPico),
      y: baseY(i) - meiaAltura - px(7),
    }));

    gPicos
      .append('path')
      .attr('d', pontosPico.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(''))
      .attr('fill', 'none')
      .attr('stroke', paleta.alerta)
      .attr('stroke-width', px(1))
      .attr('stroke-dasharray', `${px(5)} ${px(4)}`)
      .attr('opacity', 0.5);

    pontosPico.forEach((p) => {
      gPicos
        .append('path')
        .attr('d', `M${p.x},${p.y - px(3.4)}L${p.x + px(3.4)},${p.y}L${p.x},${p.y + px(3.4)}L${p.x - px(3.4)},${p.y}Z`)
        .attr('fill', paleta.critico)
        .attr('opacity', 0.9);
    });

    // No compacto este rótulo cairia em cima do de EMERSÃO (os dois disputam o
    // mesmo canto quando a área de plotagem encolhe). A linha tracejada
    // continua lá, e o texto de abertura da página já nomeia a diagonal.
    if (!compacto) {
      gPicos
        .append('text')
        .attr('x', pontosPico[0].x + px(9))
        .attr('y', pontosPico[0].y + px(3.5))
        .attr('fill', paleta.alerta)
        .attr('font-family', theme.fontMono)
        .attr('font-size', px(9))
        .attr('letter-spacing', px(0.8))
        .text('FRENTE DE AVANÇO ↓');
    }

    // ------------------------------------------------------------ rótulos
    // Nome à esquerda + shindo, PGV à direita: identidade e magnitude sempre
    // legíveis sem depender da cor (que aqui codifica estado, não estação).
    const gNomes = svg.append('g').attr('transform', `translate(0,${MARGEM.topo})`);
    estacoes.forEach((estacao, i) => {
      const y = baseY(i);

      gNomes
        .append('text')
        .attr('x', MARGEM.esq - px(24))
        .attr('y', y + px(3))
        .attr('text-anchor', 'end')
        .attr('fill', theme.ink)
        .attr('font-family', theme.fontMono)
        .attr('font-size', px(10))
        .attr('letter-spacing', px(0.4))
        .text(nomeDe(estacao));

      // Selo de shindo (escala JMA 0-7). Quadrado + número, nunca só cor.
      const selo = gNomes.append('g').attr('transform', `translate(${MARGEM.esq - px(19)},${y - px(7)})`);
      selo
        .append('rect')
        .attr('width', px(14))
        .attr('height', px(14))
        .attr('fill', estacao.shindo >= 7 ? paleta.critico : estacao.shindo >= 6 ? paleta.alerta : 'none')
        .attr('stroke', estacao.shindo >= 6 ? 'none' : theme.borderStrong)
        .attr('stroke-width', px(1));
      selo
        .append('text')
        .attr('x', px(7))
        .attr('y', px(10.5))
        .attr('text-anchor', 'middle')
        .attr('fill', estacao.shindo >= 6 ? '#07090C' : theme.inkMuted)
        .attr('font-family', theme.fontMono)
        .attr('font-size', px(9.5))
        .attr('font-weight', 700)
        .text(estacao.shindo);

      // No compacto o PGV sai: a tabela abaixo do gráfico carrega os mesmos
      // números, e espremer 9 caracteres na margem de um celular só produziria
      // texto cortado.
      if (!compacto) {
        gNomes
          .append('text')
          .attr('x', VB_W - MARGEM.dir + px(6))
          .attr('y', y + px(3))
          .attr('fill', theme.inkMuted)
          .attr('font-family', theme.fontMono)
          .attr('font-size', px(10))
          .text(`${estacao.pgv.toFixed(1)} ${meta.unidade}`);
      }
    });

    // --------------------------------------------------------------- eixo
    const gEixo = g.append('g').attr('transform', `translate(0,${alturaUtil + px(13)})`);
    gEixo.call(
      axisBottom(x)
        .tickValues([0, 120, 240, 360, 480, 600])
        .tickSizeOuter(0)
        .tickFormat(((s: number) => mmss(s)) as never) as never
    );
    estilarEixo(gEixo, theme, px);

    // Régua de pegadas, entre o gráfico e o eixo: uma marca por passo
    // registrado. É o compasso do dado (e o mesmo em que as placas dorsais da
    // página pulsam), não um enfeite — por isso mora colada na base do
    // registro, e não solta no rodapé.
    const gPegadas = g.append('g').attr('clip-path', 'url(#sismo-recorte)');
    pegadas.forEach((t) => {
      gPegadas
        .append('line')
        .attr('x1', x(t))
        .attr('x2', x(t))
        .attr('y1', alturaUtil + px(2))
        .attr('y2', alturaUtil + px(7))
        .attr('stroke', paleta.calmo)
        .attr('stroke-width', px(0.7))
        .attr('opacity', 0.8);
    });

    // ----------------------------------------------------------- varredura
    const cabecote = g
      .append('line')
      .attr('y1', -14)
      .attr('y2', alturaUtil)
      .attr('stroke', paleta.calmo)
      .attr('stroke-width', px(1.4))
      .attr('opacity', 0);

    // Marcador da frente de avanço: onde a criatura está no instante que está
    // sendo lido. A posição não é inventada — sai da interpolação entre os
    // instantes de pico das estações, que é justamente o que a diagonal
    // desenha. Por isso ele anda pra direita E pra baixo ao mesmo tempo.
    const frente = g.append('g').attr('opacity', 0).attr('pointer-events', 'none');
    frente
      .append('circle')
      .attr('r', px(6))
      .attr('fill', 'none')
      .attr('stroke', paleta.critico)
      .attr('stroke-width', px(1.5));
    frente.append('circle').attr('r', px(2.2)).attr('fill', paleta.critico);

    const indiceDaFrente = (s: number) => {
      const picos = estacoes.map((e) => e.tPico);
      if (s <= picos[0]) return 0;
      for (let i = 1; i < picos.length; i++) {
        if (s <= picos[i]) return i - 1 + (s - picos[i - 1]) / (picos[i] - picos[i - 1] || 1);
      }
      return picos.length - 1;
    };

    // ------------------------------------------------------- transporte
    // O registro deixa de ser uma abertura de tiro único e vira uma linha do
    // tempo que dá pra tocar, pausar e arrastar. Os controles moram na página
    // (HTML nativo, então teclado e leitor de tela vêm de graça) e conversam
    // com o gráfico por evento, mesmo padrão já usado pelo rugido.
    let segundoAtual = animate ? 0 : meta.duracao;
    let tocando = false;
    let raf = 0;
    let ultimoQuadro = 0;

    const anunciar = () => {
      root.dispatchEvent(
        new CustomEvent('sismo:varredura', {
          bubbles: true,
          detail: {
            segundo: Math.round(segundoAtual),
            terminou: segundoAtual >= meta.duracao,
            duracao: meta.duracao,
            tocando,
            ganho,
          },
        })
      );
    };

    const aplicarTempo = (s: number) => {
      segundoAtual = Math.max(0, Math.min(meta.duracao, s));
      const larguraAtual = larguraUtil * (segundoAtual / meta.duracao);
      recorte.attr('width', larguraAtual + 2);
      cabecote
        .attr('x1', larguraAtual)
        .attr('x2', larguraAtual)
        .attr('opacity', segundoAtual > 0 && segundoAtual < meta.duracao ? 0.9 : 0);

      // O marcador só existe enquanto há evento acontecendo: antes da emersão
      // não há fonte, e no fim do registro o que fica na tela é o documento
      // completo, não um instante.
      if (segundoAtual <= meta.emersao || segundoAtual >= meta.duracao) {
        frente.attr('opacity', 0);
      } else {
        frente
          .attr('opacity', 1)
          .attr('transform', `translate(${x(segundoAtual)},${baseY(indiceDaFrente(segundoAtual))})`);
      }
      anunciar();
    };

    const pausar = () => {
      if (!tocando) return;
      tocando = false;
      cancelAnimationFrame(raf);
      anunciar();
    };

    const quadro = (ts: number) => {
      if (!tocando) return;
      // Avanço por tempo real decorrido, não por quadro: num monitor de 120Hz
      // ou num quadro atrasado a leitura continua andando na mesma velocidade.
      const dt = ultimoQuadro ? ts - ultimoQuadro : 16;
      ultimoQuadro = ts;
      aplicarTempo(segundoAtual + (dt / VARREDURA_MS) * meta.duracao);
      if (segundoAtual >= meta.duracao) {
        pausar();
        return;
      }
      raf = requestAnimationFrame(quadro);
    };

    const tocar = () => {
      if (tocando) return;
      if (segundoAtual >= meta.duracao) aplicarTempo(0); // no fim, recomeça
      tocando = true;
      ultimoQuadro = 0;
      raf = requestAnimationFrame(quadro);
      anunciar();
    };

    /** Completa o registro e para: é o que qualquer interação de leitura faz.
     *  Encostar no gráfico quer dizer "quero ler isto", e não dá pra ler o que
     *  ainda não foi revelado. */
    const pararVarredura = () => {
      pausar();
      if (segundoAtual < meta.duracao) aplicarTempo(meta.duracao);
    };

    aplicarTempo(segundoAtual);
    if (animate) {
      tocar();
      // Rede de segurança: `requestAnimationFrame` não avança em renderer sem
      // composição (aba em segundo plano, captura headless), e sem isto a
      // varredura deixaria o gráfico recortado em zero — ou seja, vazio.
      garantirEstadoFinal(VARREDURA_MS, pararVarredura);
    }

    // ------------------------------------------------------------- leitura
    // Cruz de mira + tooltip. Um sismograma sem leitura pontual obriga o
    // visitante a estimar a olho o instante de cada pico.
    const mira = g
      .append('line')
      .attr('y1', 0)
      .attr('y2', alturaUtil)
      .attr('stroke', theme.ink)
      .attr('stroke-width', px(0.8))
      .attr('opacity', 0);

    const realce = g
      .append('rect')
      .attr('x', 0)
      .attr('width', larguraUtil)
      .attr('height', faixa)
      .attr('fill', theme.ink)
      .attr('opacity', 0);

    g.append('rect')
      .attr('width', larguraUtil)
      .attr('height', alturaUtil)
      .attr('fill', 'transparent')
      .attr('data-mira', '')
      .on('pointermove', function (evento: PointerEvent) {
        pararVarredura();
        const [mx, my] = pointer(evento, this as SVGRectElement);
        const segundo = Math.max(0, Math.min(meta.duracao - 1, Math.round(x.invert(mx))));
        const i = Math.max(0, Math.min(estacoes.length - 1, Math.floor(my / faixa)));
        const estacao = estacoes[i];
        const b = Math.min(meta.bins - 1, Math.round(segundo / meta.segundosPorBin));
        const amp = Math.max(Math.abs(estacao.traco[b * 2]), Math.abs(estacao.traco[b * 2 + 1])) / escala;

        mira.attr('x1', mx).attr('x2', mx).attr('opacity', 0.45);
        realce.attr('y', faixa * i).attr('opacity', 0.05);

        tooltip.show(
          `<strong>${estacao.nome}</strong> <span class="sismo-tt-km">${estacao.km.toFixed(1)} km</span><br>` +
            `${mmss(segundo)} · ${(amp * meta.pgvMaximo).toFixed(1)} ${meta.unidade}<br>` +
            `<span class="sismo-tt-pico">pico ${mmss(estacao.tPico)} · shindo ${estacao.shindo}</span>`,
          evento
        );
      })
      .on('pointerleave', () => {
        mira.attr('opacity', 0);
        realce.attr('opacity', 0);
        tooltip.hide();
      });

    // --------------------------------------------------------------- rugido
    // A página tem um controle que reproduz o evento de 08:35. Ele não inventa
    // nada: leva a leitura até o único instante em que as 8 trilhas saltam
    // juntas, que é o que diferencia o rugido (acústico, chega em todas quase
    // ao mesmo tempo) das pegadas (sísmicas, chegam uma estação por vez).
    const bloom = g
      .append('circle')
      .attr('cx', x(meta.rugido))
      .attr('cy', alturaUtil / 2)
      .attr('r', 0)
      .attr('fill', 'none')
      .attr('stroke', paleta.critico)
      .attr('stroke-width', px(2))
      .attr('opacity', 0);

    const aoRugir = () => {
      pararVarredura();
      mira.attr('x1', x(meta.rugido)).attr('x2', x(meta.rugido)).attr('opacity', 0.75);

      if (prefersReducedMotion()) return;

      // Uma única expansão lenta, nunca um piscar repetido: acima de 3 flashes
      // por segundo um efeito destes vira risco real pra quem tem epilepsia
      // fotossensível (WCAG 2.3.1).
      bloom
        .attr('r', 0)
        .attr('opacity', 0.85)
        .transition()
        .duration(1500)
        .attr('r', larguraUtil * 0.62)
        .attr('opacity', 0)
        .on('end', () => bloom.attr('r', 0));

      brilho
        .select('feGaussianBlur')
        .attr('stdDeviation', 5.5)
        .transition()
        .duration(1400)
        .attr('stdDeviation', 1.6);
    };

    // ---------------------------------------------------------- controles
    // Tudo que a página pode pedir ao gráfico. Guardado num mapa pra que
    // registrar e desfazer os ouvintes seja a mesma lista — no resize o
    // runtime redesenha no MESMO root, e sem a limpeza cada redesenho
    // empilharia mais um jogo de ouvintes apontando pro SVG anterior.
    const comandos: Record<string, (e: Event) => void> = {
      'sismo:rugido': aoRugir,
      'sismo:tocar': () => (tocando ? pausar() : tocar()),
      'sismo:ir': (e) => {
        pausar();
        aplicarTempo((e as CustomEvent<{ segundo: number }>).detail.segundo);
      },
      'sismo:ganho': (e) => aplicarGanho((e as CustomEvent<{ fator: number }>).detail.fator, true),
    };

    Object.entries(comandos).forEach(([nome, fn]) => root.addEventListener(nome, fn));
    limpezaPorRaiz.set(root, () =>
      Object.entries(comandos).forEach(([nome, fn]) => root.removeEventListener(nome, fn))
    );
  },
};

export default chart;
