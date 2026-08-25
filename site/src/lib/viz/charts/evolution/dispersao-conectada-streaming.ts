/**
 * Dispersão conectada — preço médio × assinantes de um streaming fictício,
 * ano a ano, ligados em ordem cronológica.
 *
 * O caminho "se desenha" na entrada (técnica clássica de animar um <path>
 * pelo próprio comprimento, via stroke-dasharray/dashoffset) em vez de só
 * aparecer pronto — reforça que a ordem dos pontos é temporal, não uma
 * dispersão comum onde a ordem não importaria.
 */

import { select, scaleLinear, interpolateRgb } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface Ponto {
  ano: number;
  preco: number;
  assinantes: number;
}

interface Dados {
  meta: { corInicio: string; corFim: string; anosRotulados: number[]; nota?: string };
  pontos: Ponto[];
}

const VB_W = 760;
const VB_H = 600;
const MARGEM = { topo: 20, dir: 24, baixo: 46, esq: 56 };

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Dispersão conectada mostrando preço médio de assinatura e número de assinantes de um serviço de streaming ' +
    'fictício, ano a ano, com o caminho voltando pra trás em 2023-2024 quando um reajuste de preço estagna o crescimento.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, pontos } = data as Dados;
    const { corInicio, corFim, anosRotulados } = meta;

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const precos = pontos.map((p) => p.preco);
    const assinantes = pontos.map((p) => p.assinantes);
    const x = scaleLinear().domain([Math.min(...precos) * 0.92, Math.max(...precos) * 1.05]).range([0, larguraUtil]);
    const y = scaleLinear().domain([0, Math.max(...assinantes) * 1.08]).range([alturaUtil, 0]);

    const anoMin = Math.min(...pontos.map((p) => p.ano));
    const anoMax = Math.max(...pontos.map((p) => p.ano));
    const corDoAno = (ano: number) => interpolateRgb(corInicio, corFim)((ano - anoMin) / (anoMax - anoMin));

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const eixoBaixoSel = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const eixoEsqSel = g.append('g');

    // -- ticks manuais (poucos pontos, eixo simples) --------------------
    const xTicks = x.ticks(6);
    eixoBaixoSel
      .selectAll('line')
      .data(xTicks)
      .join('line')
      .attr('x1', (d) => x(d))
      .attr('x2', (d) => x(d))
      .attr('y1', 0)
      .attr('y2', px(5))
      .attr('stroke', theme.border);
    eixoBaixoSel
      .selectAll('text')
      .data(xTicks)
      .join('text')
      .attr('x', (d) => x(d))
      .attr('y', px(18))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(10))
      .attr('fill', theme.inkMuted)
      .text((d) => String(d));

    const yTicks = y.ticks(6);
    eixoEsqSel
      .selectAll('line')
      .data(yTicks)
      .join('line')
      .attr('x1', 0)
      .attr('x2', larguraUtil)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', theme.border)
      .attr('stroke-opacity', 0.5);
    eixoEsqSel
      .selectAll('text')
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
      .attr('x', MARGEM.esq + larguraUtil / 2)
      .attr('y', VB_H - px(4))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .attr('fill', theme.inkMuted)
      .text('Preço médio da assinatura (R$/mês)');

    svg
      .append('text')
      .attr('transform', `translate(${px(16)},${MARGEM.topo + alturaUtil / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .attr('fill', theme.inkMuted)
      .text('Assinantes (milhões)');

    // ------------------------------------------------------------ caminho
    const linha = (pts: Ponto[]) => {
      if (pts.length === 0) return '';
      return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.preco)},${y(p.assinantes)}`).join('');
    };

    const caminho = g
      .append('path')
      .attr('d', linha(pontos))
      .attr('fill', 'none')
      .attr('stroke', theme.inkMuted)
      .attr('stroke-width', px(1.4));

    // -------------------------------------------------------------- pontos
    const raio = px(4.2);
    const pontosSel = g
      .append('g')
      .selectAll<SVGCircleElement, Ponto>('circle')
      .data(pontos)
      .join('circle')
      .attr('data-interactive', '')
      .attr('cx', (d) => x(d.preco))
      .attr('cy', (d) => y(d.assinantes))
      .attr('fill', (d) => corDoAno(d.ano))
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1))
      .on('pointerenter', function () {
        select(this).attr('r', raio * 1.4);
      })
      .on('pointermove', (evento: PointerEvent, d) =>
        tooltip.show(`<strong>${d.ano}</strong><br>R$ ${d.preco.toFixed(1)}/mês · ${d.assinantes.toFixed(2)} mi assinantes`, evento)
      )
      .on('pointerleave', function () {
        select(this).attr('r', raio);
        tooltip.hide();
      });

    // -------------------------------------------------------------- rótulos
    g.append('g')
      .selectAll('text')
      .data(pontos.filter((p) => anosRotulados.includes(p.ano)))
      .join('text')
      .attr('x', (d) => x(d.preco))
      .attr('y', (d) => y(d.assinantes) - px(10))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('font-size', px(11.5))
      .attr('fill', theme.ink)
      .text((d) => String(d.ano));

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    if (animate) {
      const comprimento = caminho.node()?.getTotalLength() ?? 0;
      caminho
        .attr('stroke-dasharray', `${comprimento} ${comprimento}`)
        .attr('stroke-dashoffset', comprimento)
        .transition()
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('stroke-dashoffset', 0);

      pontosSel
        .attr('r', 0)
        .transition()
        .delay((_d, i) => (i / Math.max(pontos.length - 1, 1)) * DURATION.enter)
        .duration(DURATION.base)
        .attr('r', raio);

      garantirEstadoFinal(DURATION.enter + DURATION.base + 250, () => {
        caminho.interrupt().attr('stroke-dashoffset', 0);
        pontosSel.interrupt().attr('r', raio);
      });
    } else {
      pontosSel.attr('r', raio);
    }
  },
};

export default chart;
