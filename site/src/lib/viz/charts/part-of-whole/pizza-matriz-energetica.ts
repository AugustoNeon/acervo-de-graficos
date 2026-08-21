/**
 * Pizza clássica da matriz de geração elétrica — versão em D3.
 *
 * Mesma técnica da rosca de alocação de tempo (`d3.pie()`+`d3.arc()`), só que
 * com raio interno zero — sem o buraco do meio.
 *
 * O que a imagem não dá: passar o cursor mostra o percentual exato e o total
 * em GWh/ano, e a fatia sob o cursor "salta" um pouco pra fora do círculo.
 */

import { select, pie, arc } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Fatia {
  fonte: string;
  gwh: number;
}

interface Dados {
  meta: { nota?: string };
  fatias: Fatia[];
  paleta: Record<string, string>;
}

const VB = 600;
const RAIO_EXTERNO = VB / 2 - 90;
const SALTO = 10;

const chart: VizChart = {
  aspectRatio: 1,
  label: 'Pizza clássica: matriz de geração elétrica de um país fictício, 6 fontes de energia.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, fatias, paleta } = data as Dados;

    const total = fatias.reduce((soma, f) => soma + f.gwh, 0);
    const gerarPie = pie<Fatia>()
      .value((d) => d.gwh)
      .sort(null);
    const arcos = gerarPie(fatias);

    const escala = VB / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const gerarArco = arc<(typeof arcos)[number]>().innerRadius(0).outerRadius(RAIO_EXTERNO);
    const gerarArcoSalto = arc<(typeof arcos)[number]>()
      .innerRadius(0)
      .outerRadius(RAIO_EXTERNO + px(SALTO));

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `${-VB / 2} ${-VB / 2} ${VB} ${VB}`)
      .attr('aria-hidden', 'true');

    const fatiasSel = svg
      .append('g')
      .selectAll<SVGPathElement, (typeof arcos)[number]>('path')
      .data(arcos)
      .join('path')
      .attr('d', gerarArco)
      .attr('fill', (d) => paleta[d.data.fonte] ?? theme.accent)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(2))
      .attr('data-interactive', '');

    // Rotulo dentro da fatia, so quando o arco e largo o bastante pra caber
    // "fonte" + "XX%" sem se sobrepor -- fatias pequenas dependem so do
    // tooltip, em vez de espremer texto ilegivel.
    const camadaTexto = svg.append('g').attr('text-anchor', 'middle').attr('pointer-events', 'none');
    const rotulos = camadaTexto
      .selectAll<SVGTextElement, (typeof arcos)[number]>('text')
      .data(arcos.filter((d) => d.endAngle - d.startAngle > 0.3))
      .join('text')
      .attr('transform', (d) => `translate(${gerarArco.centroid(d).map((v) => v * 0.68)})`)
      .attr('font-family', theme.fontBody)
      .attr('fill', theme.bg);

    rotulos
      .append('tspan')
      .attr('x', 0)
      .attr('font-size', px(13))
      .attr('font-weight', 600)
      .text((d) => d.data.fonte);
    rotulos
      .append('tspan')
      .attr('x', 0)
      .attr('dy', '1.3em')
      .attr('font-size', px(14))
      .attr('font-weight', 700)
      .text((d) => `${Math.round((d.data.gwh / total) * 100)}%`);

    // -------------------------------------------------------------- interacao
    const conteudoTooltip = (d: (typeof arcos)[number]) => {
      const pct = ((d.data.gwh / total) * 100).toFixed(1);
      return `<strong>${d.data.fonte}</strong><br>${d.data.gwh.toFixed(0)} GWh/ano · ${pct}%`;
    };

    fatiasSel
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(conteudoTooltip(d), evento))
      .on('pointerleave', () => tooltip.hide());

    tornarFixavel(
      root,
      { selecao: fatiasSel, chaveDe: (d) => d.data.fonte },
      (fonte) =>
        fatiasSel
          .transition()
          .duration(DURATION.fast)
          .ease(EASE_STATE)
          .attr('d', (d) => (d.data.fonte === fonte ? gerarArcoSalto(d) : gerarArco(d))),
      () => fatiasSel.transition().duration(DURATION.fast).ease(EASE_STATE).attr('d', gerarArco)
    );

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // As fatias varrem do angulo zero ate o angulo final, em sequencia --
    // igual a leitura de um relogio se enchendo.
    if (animate) {
      fatiasSel
        .attr('d', (d) => gerarArco({ ...d, endAngle: d.startAngle })!)
        .transition()
        .delay((_d, i) => stagger(i, arcos.length, 260))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attrTween('d', (d) => {
          const interpAngulo = (t: number) => d.startAngle + (d.endAngle - d.startAngle) * t;
          return (t: number) => gerarArco({ ...d, endAngle: interpAngulo(t) })!;
        });

      rotulos.attr('opacity', 0).transition().delay(DURATION.enter * 0.7).duration(DURATION.base).attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter * 1.6, () => {
        fatiasSel.interrupt().attr('d', gerarArco);
        rotulos.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
