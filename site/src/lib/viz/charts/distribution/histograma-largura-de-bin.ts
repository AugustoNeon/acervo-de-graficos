/**
 * Histograma com slider de número de bins — mesma distribuição, largura de
 * bin variável ao vivo.
 *
 * O R só exporta as idades BRUTAS (`data.json`'s `idades`); o D3 recalcula
 * os bins (`d3.bin()`) a cada posição do slider, e desenha por cima uma
 * curva de densidade (KDE gaussiano, `shared/densidade.ts` — a mesma técnica
 * do ridgeline e do violino deste acervo) como referência. A curva é
 * reescalada pra unidade de contagem de acordo com a largura de bin atual —
 * sua ALTURA acompanha o eixo Y a cada posição do slider, mas a FORMA nunca
 * muda, deixando visível que o histograma é só uma discretização com perda
 * da mesma distribuição contínua por baixo.
 *
 * Sem chave estável entre reposições do slider (o número de barras muda a
 * cada movimento) — usa enter/exit comuns do D3 em vez do padrão de "mesmo
 * elemento, geometria recalculada" dos outros switchers deste acervo, porque
 * aqui não haveria o que preservar: um bin de 3 anos e um de 30 anos não são
 * "a mesma coisa mudando de forma".
 */

import { select, scaleLinear, axisBottom, axisLeft, bin as d3bin, max as d3max, area as d3area, curveBasis } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo, estilarGrade } from '../../shared/cartesiano';
import { estimarDensidade } from '../../shared/densidade';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Dados {
  meta: { binsPadrao: number; binsMax: number; nota?: string };
  idades: number[];
}

const VB_W = 900;
const VB_H = 520;
const MARGEM = { topo: 24, dir: 24, baixo: 48, esq: 56 };
const N_AMOSTRAS_KDE = 200;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Histograma da idade de participantes de uma corrida de bairro fictícia, com um controle deslizante ' +
    'pro número de bins e uma curva de densidade estimada por cima, mostrando os dois grupos etários ' +
    '(infantil e adulto) que poucos bins escondem e muitos bins transformam em ruído.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, idades } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const domMin = Math.min(...idades);
    const domMax = Math.max(...idades);
    const folga = (domMax - domMin) * 0.03;

    const x = scaleLinear().domain([domMin - folga, domMax + folga]).range([0, larguraUtil]);
    const y = scaleLinear().range([alturaUtil, 0]);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const eixoBaixoSel = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const eixoEsqSel = g.append('g');
    const gGrade = g.append('g');
    const gBarras = g.append('g');
    const gCurva = g.append('g');

    // KDE calculado uma vez só (não depende do slider) — só a escala que
    // converte densidade em "contagem esperada por bin" muda a cada arrasto.
    const xsKde = Array.from({ length: N_AMOSTRAS_KDE + 1 }, (_, i) => domMin + (i * (domMax - domMin)) / N_AMOSTRAS_KDE);
    const curvaDensidade = estimarDensidade(idades, xsKde);

    const gerarAreaCurva = d3area<[number, number]>()
      .curve(curveBasis)
      .x((d) => x(d[0]))
      .y0(alturaUtil)
      .y1((d) => y(d[1]));

    function conteudoTooltip(x0: number, x1: number, contagem: number): string {
      return `<strong>${x0.toFixed(0)}–${x1.toFixed(0)} anos</strong><br>${contagem} participante(s)`;
    }

    function redesenhar(nBins: number, transicao: boolean) {
      const gerador = d3bin<number, number>().domain(x.domain() as [number, number]).thresholds(nBins);
      const bins = gerador(idades);
      const larguraBin = (bins[0]?.x1 ?? 0) - (bins[0]?.x0 ?? 0);

      const maxContagem = d3max(bins, (b) => b.length) ?? 1;
      const maxCurva = d3max(curvaDensidade, (d) => d[1] * idades.length * larguraBin) ?? 1;
      y.domain([0, Math.max(maxContagem, maxCurva) * 1.1]);

      const eixoEsqAlvo = transicao ? eixoEsqSel.transition().duration(DURATION.slow).ease(EASE_STATE) : eixoEsqSel;
      eixoEsqAlvo.call(axisLeft(y).ticks(6).tickSizeOuter(0));
      estilarEixo(eixoEsqSel, theme, px);

      const gradeAlvo = transicao ? gGrade.transition().duration(DURATION.slow).ease(EASE_STATE) : gGrade;
      gradeAlvo.call(
        axisLeft(y)
          .ticks(6)
          .tickSize(-larguraUtil)
          .tickFormat(() => '')
      );
      estilarGrade(gGrade, theme);

      const barras = gBarras
        .selectAll<SVGRectElement, (typeof bins)[number]>('rect')
        .data(bins, (_d, i) => i);

      const gap = Math.max(px(1), 1);
      const entrando = barras
        .enter()
        .append('rect')
        .attr('data-interactive', '')
        .attr('fill', theme.primary)
        .attr('stroke', theme.surface)
        .attr('stroke-width', px(0.6))
        .attr('x', (b) => x(b.x0 ?? 0) + gap / 2)
        .attr('width', (b) => Math.max(x(b.x1 ?? 0) - x(b.x0 ?? 0) - gap, 0))
        .attr('y', alturaUtil)
        .attr('height', 0);

      const saindo = barras.exit();
      if (transicao) {
        saindo
          .transition()
          .duration(DURATION.base)
          .ease(EASE_STATE)
          .attr('y', alturaUtil)
          .attr('height', 0)
          .remove();
      } else {
        saindo.remove();
      }

      const todas = entrando.merge(barras);
      const alvoBarras = transicao ? todas.transition().duration(DURATION.slow).ease(EASE_STATE) : todas;
      alvoBarras
        .attr('x', (b) => x(b.x0 ?? 0) + gap / 2)
        .attr('width', (b) => Math.max(x(b.x1 ?? 0) - x(b.x0 ?? 0) - gap, 0))
        .attr('y', (b) => y(b.length))
        .attr('height', (b) => alturaUtil - y(b.length));

      // Numero de bins muda a cada arrasto do slider — re-vincula em cima da
      // selecao INTEIRA (nao so das barras que acabaram de entrar) a cada
      // redesenho; `tornarFixavel` e' seguro de chamar de novo (troca o
      // listener de "clicar fora" antigo pelo novo, sem acumular) e o
      // namespace do evento faz o d3 substituir o handler em vez de duplicar.
      const chaveDaBarra = (b: (typeof bins)[number]) => `${b.x0}_${b.x1}`;
      todas
        .on('pointermove', (evento: PointerEvent, b) => tooltip.show(conteudoTooltip(b.x0 ?? 0, b.x1 ?? 0, b.length), evento))
        .on('pointerleave', () => tooltip.hide());
      tornarFixavel(
        root,
        { selecao: todas, chaveDe: chaveDaBarra },
        (chave) =>
          todas
            .transition('foco')
            .duration(DURATION.fast)
            .ease(EASE_STATE)
            .attr('fill', (b) => (chaveDaBarra(b) === chave ? theme.accent : theme.primary)),
        () => todas.transition('foco').duration(DURATION.fast).ease(EASE_STATE).attr('fill', theme.primary)
      );

      const pontosCurva: [number, number][] = curvaDensidade.map(([v, d]) => [v, d * idades.length * larguraBin]);
      let caminhoCurva = gCurva.select<SVGPathElement>('path.curva-densidade');
      if (caminhoCurva.empty()) {
        caminhoCurva = gCurva
          .append('path')
          .attr('class', 'curva-densidade')
          .attr('fill', theme.ink)
          .attr('fill-opacity', 0.08)
          .attr('stroke', theme.ink)
          .attr('stroke-width', px(2));
      }
      const alvoCurva = transicao ? caminhoCurva.transition().duration(DURATION.slow).ease(EASE_STATE) : caminhoCurva;
      alvoCurva.attr('d', gerarAreaCurva(pontosCurva));
    }

    eixoBaixoSel.call(axisBottom(x).tickSizeOuter(0));
    estilarEixo(eixoBaixoSel, theme, px);

    let binsAtual = meta.binsPadrao;
    redesenhar(binsAtual, false);

    // --------------------------------------------------------------- slider
    const controles = select(root).append('div').attr('class', 'viz-slider');
    controles.append('span').attr('class', 'viz-slider-rotulo').text('Número de bins');
    const saida = controles.append('output').text(String(binsAtual));
    controles
      .append('input')
      .attr('type', 'range')
      .attr('min', 3)
      .attr('max', meta.binsMax)
      .attr('step', 1)
      .attr('value', binsAtual)
      .attr('data-interactive', '')
      .on('input', function () {
        binsAtual = Number((this as HTMLInputElement).value);
        saida.text(String(binsAtual));
        redesenhar(binsAtual, true);
      });

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    if (animate) {
      const barras = gBarras.selectAll<SVGRectElement, unknown>('rect');
      const yFinal = new Map<SVGRectElement, number>();
      const alturaFinal = new Map<SVGRectElement, number>();
      barras.each(function () {
        yFinal.set(this, Number(select(this).attr('y')));
        alturaFinal.set(this, Number(select(this).attr('height')));
      });
      barras.attr('y', alturaUtil).attr('height', 0);
      barras
        .transition()
        .delay((_d, i) => stagger(i, barras.size()))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('y', function () {
          return yFinal.get(this) ?? alturaUtil;
        })
        .attr('height', function () {
          return alturaFinal.get(this) ?? 0;
        });

      gCurva.attr('opacity', 0).transition().delay(DURATION.enter * 0.6).duration(DURATION.base).attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + 300, () => {
        barras
          .interrupt()
          .attr('y', function () {
            return yFinal.get(this) ?? alturaUtil;
          })
          .attr('height', function () {
            return alturaFinal.get(this) ?? 0;
          });
        gCurva.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
