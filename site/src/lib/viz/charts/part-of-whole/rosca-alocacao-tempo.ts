/**
 * Rosca de alocação de tempo — versão em D3.
 *
 * Antes desenhada com a função nativa de pizza do plotly (o `ggplotly()` não
 * converte bem `coord_polar()`); esse problema nem existe aqui, já que o D3
 * desenha a rosca do zero com `d3.pie()`+`d3.arc()`.
 *
 * O que a imagem não dá: passar o cursor mostra o percentual exato, e a
 * fatia sob o cursor "salta" um pouco pra fora do anel.
 */

import { select, pie, arc } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface Fatia {
  categoria: string;
  horas: number;
}

interface Dados {
  meta: { nota?: string };
  fatias: Fatia[];
  paleta: Record<string, string>;
}

const VB = 600;
const RAIO_EXTERNO = VB / 2 - 90;
const RAIO_INTERNO = RAIO_EXTERNO * 0.55;
const SALTO = 10;

const chart: VizChart = {
  aspectRatio: 1,
  label: 'Rosca de alocação de tempo: 5 categorias somando 24 horas de um dia fictício.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, fatias, paleta } = data as Dados;

    const total = fatias.reduce((soma, f) => soma + f.horas, 0);
    const gerarPie = pie<Fatia>()
      .value((d) => d.horas)
      .sort(null);
    const arcos = gerarPie(fatias);

    const escala = VB / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const gerarArco = arc<typeof arcos[number]>().innerRadius(RAIO_INTERNO).outerRadius(RAIO_EXTERNO);
    const gerarArcoSalto = arc<typeof arcos[number]>()
      .innerRadius(RAIO_INTERNO)
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
      .attr('fill', (d) => paleta[d.data.categoria] ?? theme.accent)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(2))
      .attr('data-interactive', '');

    // Rotulo dentro da fatia, so quando o arco e largo o bastante pra caber
    // "categoria" + "Xh" sem se sobrepor -- fatias pequenas dependem so do
    // tooltip, em vez de espremer texto ilegivel.
    const camadaTexto = svg.append('g').attr('text-anchor', 'middle').attr('pointer-events', 'none');
    const rotulos = camadaTexto
      .selectAll<SVGTextElement, (typeof arcos)[number]>('text')
      .data(arcos.filter((d) => d.endAngle - d.startAngle > 0.35))
      .join('text')
      .attr('transform', (d) => `translate(${gerarArco.centroid(d)})`)
      .attr('font-family', theme.fontBody)
      .attr('fill', theme.bg);

    rotulos
      .append('tspan')
      .attr('x', 0)
      .attr('font-size', px(14))
      .attr('font-weight', 600)
      .text((d) => d.data.categoria);
    rotulos
      .append('tspan')
      .attr('x', 0)
      .attr('dy', '1.3em')
      .attr('font-size', px(13))
      .text((d) => `${d.data.horas}h`);

    // -------------------------------------------------------------- interacao
    const conteudoTooltip = (d: (typeof arcos)[number]) => {
      const pct = ((d.data.horas / total) * 100).toFixed(1);
      return `<strong>${d.data.categoria}</strong><br>${d.data.horas}h · ${pct}%`;
    };

    fatiasSel
      .on('pointerenter', function (evento: PointerEvent, d) {
        select(this).transition().duration(DURATION.fast).ease(EASE_STATE).attr('d', gerarArcoSalto);
        tooltip.show(conteudoTooltip(d), evento);
      })
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(conteudoTooltip(d), evento))
      .on('pointerleave', function () {
        select(this).transition().duration(DURATION.fast).ease(EASE_STATE).attr('d', gerarArco);
        tooltip.hide();
      });

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
