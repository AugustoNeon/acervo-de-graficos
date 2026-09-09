/**
 * Candlestick: preço diário (OHLC) de uma ação fictícia.
 *
 * O R exporta abertura/máxima/mínima/fechamento brutos por pregão -- o D3
 * calcula a posição do corpo (retângulo entre abertura e fechamento) e do
 * pavio (linha entre mínima e máxima) sozinho, mesmo princípio de sempre
 * desta base. Sem pacote financeiro nenhum de nenhum dos dois lados: cada
 * vela é só duas formas geométricas simples sobre um eixo categórico.
 */

import { select, scaleLinear, scaleBand, axisBottom, axisLeft, max, min } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Pregao {
  pregao: number;
  abertura: number;
  fechamento: number;
  maxima: number;
  minima: number;
  direcao: 'Alta' | 'Baixa';
}

interface Dados {
  meta: { cores: Record<string, string> };
  pregoes: Pregao[];
}

const VB_W = 950;
const VB_H = 560;
const MARGEM = { topo: 20, dir: 20, baixo: 40, esq: 56 };

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Candlestick: preço diário de uma ação fictícia ao longo de 40 pregões, com corpo verde para dias de alta ' +
    'e vermelho para dias de baixa, e um pavio fino marcando a máxima e a mínima de cada dia.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, pregoes } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const xBand = scaleBand<number>()
      .domain(pregoes.map((d) => d.pregao))
      .range([0, larguraUtil])
      .padding(0.32);
    const yMin = min(pregoes, (d) => d.minima) ?? 0;
    const yMax = max(pregoes, (d) => d.maxima) ?? 1;
    const folga = (yMax - yMin) * 0.08;
    const y = scaleLinear().domain([yMin - folga, yMax + folga]).range([alturaUtil, 0]);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const gGrade = g.append('g');
    gGrade.call(axisLeft(y).ticks(5).tickSize(-larguraUtil).tickFormat(() => ''));
    gGrade.select('.domain').remove();
    gGrade.selectAll('.tick line').attr('stroke', theme.border).attr('stroke-opacity', 0.4);

    const gEixoY = g.append('g');
    gEixoY.call(
      axisLeft(y)
        .ticks(5)
        .tickFormat((v) => `R$ ${v}`)
        .tickSizeOuter(0)
    );
    estilarEixo(gEixoY, theme, px);

    const gEixoX = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    gEixoX.call(
      axisBottom(xBand)
        .tickValues(pregoes.filter((d) => d.pregao % 5 === 0).map((d) => d.pregao))
        .tickSizeOuter(0)
    );
    estilarEixo(gEixoX, theme, px);

    const chaveDe = (d: Pregao) => d.pregao;
    const larguraCorpo = xBand.bandwidth();

    const pavios = g
      .selectAll<SVGLineElement, Pregao>('line')
      .data(pregoes, chaveDe as never)
      .join('line')
      .attr('x1', (d) => (xBand(d.pregao) ?? 0) + larguraCorpo / 2)
      .attr('x2', (d) => (xBand(d.pregao) ?? 0) + larguraCorpo / 2)
      .attr('y1', (d) => y(d.maxima))
      .attr('y2', (d) => y(d.minima))
      .attr('stroke', (d) => meta.cores[d.direcao])
      .attr('stroke-width', px(1));

    const corpos = g
      .selectAll<SVGRectElement, Pregao>('rect')
      .data(pregoes, chaveDe as never)
      .join('rect')
      .attr('data-interactive', '')
      .attr('x', (d) => xBand(d.pregao) ?? 0)
      .attr('width', larguraCorpo)
      .attr('y', (d) => y(Math.max(d.abertura, d.fechamento)))
      .attr('height', (d) => Math.max(px(1), Math.abs(y(d.abertura) - y(d.fechamento))))
      .attr('fill', (d) => meta.cores[d.direcao]);

    function mostrarTooltip(evento: PointerEvent, d: Pregao) {
      tooltip.show(
        `<span class="viz-swatch" style="background:${meta.cores[d.direcao]}"></span>` +
          `<strong>Pregão ${d.pregao}</strong> · ${d.direcao}<br>` +
          `abertura R$ ${d.abertura.toFixed(2)} → fechamento R$ ${d.fechamento.toFixed(2)}<br>` +
          `mín R$ ${d.minima.toFixed(2)} · máx R$ ${d.maxima.toFixed(2)}`,
        evento
      );
    }
    corpos.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());

    function realcar(pregao: number) {
      corpos.attr('opacity', (d) => (d.pregao === pregao ? 1 : 0.3));
      pavios.attr('opacity', (d) => (d.pregao === pregao ? 1 : 0.2));
    }
    function limpar() {
      corpos.attr('opacity', 1);
      pavios.attr('opacity', 1);
    }
    tornarFixavel(root, { selecao: corpos, chaveDe: (d: Pregao) => String(d.pregao) }, realcar, limpar);

    const cores = Object.keys(meta.cores);
    select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(cores)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((c) => `<span class="viz-swatch" style="background:${meta.cores[c]}"></span>${c}`)
      .on('pointerenter', (_e, c) => {
        corpos.attr('opacity', (d) => (d.direcao === c ? 1 : 0.2));
        pavios.attr('opacity', (d) => (d.direcao === c ? 1 : 0.15));
      })
      .on('pointerleave', limpar);

    if (animate) {
      const alturaFinal = (d: Pregao) => Math.max(px(1), Math.abs(y(d.abertura) - y(d.fechamento)));
      const yFinal = (d: Pregao) => y(Math.max(d.abertura, d.fechamento));
      corpos.attr('y', (d) => y((d.minima + d.maxima) / 2)).attr('height', 0);
      pavios.attr('opacity', 0);

      corpos
        .transition()
        .delay((d) => stagger(d.pregao - 1, pregoes.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('y', yFinal)
        .attr('height', alturaFinal);

      pavios
        .transition()
        .delay((d) => stagger(d.pregao - 1, pregoes.length) + DURATION.enter * 0.4)
        .duration(DURATION.base)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + 250, () => {
        corpos.interrupt().attr('y', yFinal).attr('height', alturaFinal);
        pavios.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
