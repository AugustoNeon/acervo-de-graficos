/**
 * Manhattan plot — dispersão de milhares de marcadores genéticos ficticios,
 * organizados por posição cumulativa no "genoma" (cromossomos concatenados).
 *
 * A posição cumulativa de cada ponto (`bpCum`) já vem calculada do R —
 * exatamente a mesma conta usada pro `output.png`, pra que o eixo X nunca
 * divirja entre as duas versões. O D3 só cuida da escala, da cor por
 * paridade de cromossomo e do tooltip por marcador.
 */

import { select, scaleLinear } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface Ponto {
  snp: string;
  cromossomo: number;
  posicao: number;
  bpCum: number;
  p: number;
  logP: number;
}

interface EixoCromossomo {
  cromossomo: number;
  centro: number;
}

interface Dados {
  meta: {
    corPar: string;
    corImpar: string;
    limiarSugestivo: number;
    limiarGenomico: number;
    cumMax: number;
    eixoCromossomos: EixoCromossomo[];
    nota?: string;
  };
  pontos: Ponto[];
}

const VB_W = 1300;
const VB_H = 460;
const MARGEM = { topo: 16, dir: 16, baixo: 54, esq: 52 };

function formatarP(p: number): string {
  return p < 0.001 ? p.toExponential(1).replace('e-', ' × 10⁻').replace('+', '') : p.toFixed(3);
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Manhattan plot — dispersão de milhares de marcadores genéticos fictícios ao longo de 22 cromossomos, ' +
    'com dois agrupamentos que cruzam a linha de significância estatística.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, pontos } = data as Dados;
    const { corPar, corImpar, limiarSugestivo, limiarGenomico, cumMax, eixoCromossomos } = meta;

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const maxLogP = Math.max(...pontos.map((p) => p.logP), limiarGenomico);
    const x = scaleLinear().domain([0, cumMax]).range([0, larguraUtil]);
    const y = scaleLinear().domain([0, maxLogP * 1.08]).range([alturaUtil, 0]);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    // -------------------------------------------------------------- limiares
    function linhaLimiar(valor: number, cor: string, rotulo: string) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', larguraUtil)
        .attr('y1', y(valor))
        .attr('y2', y(valor))
        .attr('stroke', cor)
        .attr('stroke-width', px(1.2))
        .attr('stroke-dasharray', `${px(5)} ${px(4)}`);
      g.append('text')
        .attr('x', larguraUtil)
        .attr('y', y(valor) - px(4))
        .attr('text-anchor', 'end')
        .attr('font-family', theme.fontMono)
        .attr('font-size', px(9.5))
        .attr('fill', cor)
        .text(rotulo);
    }
    linhaLimiar(limiarSugestivo, theme.inkMuted, 'sugestivo');
    linhaLimiar(limiarGenomico, '#B22222', 'significância genômica');

    // ------------------------------------------------------------- eixo Y
    const yTicks = y.ticks(5);
    const gY = g.append('g');
    gY.selectAll('line')
      .data(yTicks)
      .join('line')
      .attr('x1', 0)
      .attr('x2', larguraUtil)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', theme.border)
      .attr('stroke-opacity', 0.5);
    gY.selectAll('text')
      .data(yTicks)
      .join('text')
      .attr('x', -px(8))
      .attr('y', (d) => y(d))
      .attr('dy', '0.32em')
      .attr('text-anchor', 'end')
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(10))
      .attr('fill', theme.inkMuted)
      .text((d) => String(d));

    svg
      .append('text')
      .attr('transform', `translate(${px(14)},${MARGEM.topo + alturaUtil / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .attr('fill', theme.inkMuted)
      .text('−log₁₀(p)');

    // ------------------------------------------------------------- eixo X
    const gX = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    gX.selectAll('text')
      .data(eixoCromossomos)
      .join('text')
      .attr('x', (d) => x(d.centro))
      .attr('y', px(12))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(9.5))
      .attr('fill', theme.inkMuted)
      .text((d) => String(d.cromossomo));

    svg
      .append('text')
      .attr('x', MARGEM.esq + larguraUtil / 2)
      .attr('y', VB_H - px(4))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .attr('fill', theme.inkMuted)
      .text('Cromossomo');

    // ------------------------------------------------------------- pontos
    function tooltipDe(d: Ponto): string {
      return `<strong>${d.snp}</strong><br>cromossomo ${d.cromossomo} · posição ${d.posicao.toLocaleString('pt-BR')}<br>p = ${formatarP(d.p)}`;
    }

    const raioBase = px(1.6);
    const pontosSel = g
      .append('g')
      .selectAll<SVGCircleElement, Ponto>('circle')
      .data(pontos)
      .join('circle')
      .attr('data-interactive', '')
      .attr('cx', (d) => x(d.bpCum))
      .attr('fill', (d) => (d.cromossomo % 2 === 0 ? corPar : corImpar))
      .attr('fill-opacity', 0.75)
      .on('pointerenter', function () {
        select(this).attr('r', raioBase * 2.2).attr('fill-opacity', 1);
      })
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(tooltipDe(d), evento))
      .on('pointerleave', function () {
        select(this).attr('r', raioBase).attr('fill-opacity', 0.75);
        tooltip.hide();
      });

    if (animate) {
      pontosSel
        .attr('cy', y(0))
        .attr('r', 0)
        .transition()
        .delay((_d, i) => stagger(i, pontos.length, 650))
        .duration(DURATION.base)
        .ease(EASE_ENTER)
        .attr('cy', (d) => y(d.logP))
        .attr('r', raioBase);

      garantirEstadoFinal(650 + DURATION.base + 250, () => {
        pontosSel.interrupt().attr('cy', (d) => y(d.logP)).attr('r', raioBase);
      });
    } else {
      pontosSel.attr('cy', (d) => y(d.logP)).attr('r', raioBase);
    }

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }
  },
};

export default chart;
