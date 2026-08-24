/**
 * Bubble chart: investimento x crescimento x porte — versão em D3.
 *
 * Três variáveis numéricas ao mesmo tempo (posição X, posição Y e raio da
 * bolha) mais uma categórica (cor) — a técnica que dá nome à categoria
 * "correlation" quando duas variáveis não bastam. O raio usa escala de
 * RAIZ QUADRADA (não linear): é a área do círculo, não o raio, que precisa
 * ser proporcional ao valor — um raio linear faria a diferença visual
 * entre duas bolhas parecer maior do que a diferença real nos dados.
 *
 * O que a imagem não dá: passar o cursor mostra os 4 números de cada
 * empresa (investimento, crescimento, funcionários, setor) juntos; clicar
 * numa cor da legenda isola aquele setor entre as 50 bolhas.
 */

import { select, scaleLog, scaleLinear, scaleSqrt, axisBottom, axisLeft, format } from 'd3';
import { estilarEixo } from '../../shared/cartesiano';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Startup {
  empresa: string;
  setor: string;
  investimento_milhoes: number;
  funcionarios: number;
  crescimento_receita: number;
}

interface Dados {
  meta: { setores: string[]; paleta: Record<string, string>; nota?: string };
  startups: Startup[];
}

const VB_W = 860;
const VB_H = 620;
const MARGEM = { topo: 20, dir: 24, baixo: 48, esq: 56 };

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Bubble chart: 50 startups fictícias — investimento captado no eixo X (escala log), crescimento de ' +
    'receita no eixo Y, número de funcionários no tamanho da bolha, setor na cor.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, startups } = data as Dados;
    const { paleta } = meta;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const x = scaleLog()
      .domain([Math.min(...startups.map((s) => s.investimento_milhoes)) * 0.85, Math.max(...startups.map((s) => s.investimento_milhoes)) * 1.15])
      .range([0, larguraUtil]);
    const y = scaleLinear()
      .domain([Math.min(...startups.map((s) => s.crescimento_receita)) - 10, Math.max(...startups.map((s) => s.crescimento_receita)) + 10])
      .range([alturaUtil, 0]);
    const raio = scaleSqrt()
      .domain([0, Math.max(...startups.map((s) => s.funcionarios))])
      .range([px(4), px(34)]);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    // Escala log gera ticks demais por padrao (1,2,3,4,5,6,7,8,9 dentro de
    // cada decada) quando o dominio cobre poucas decadas -- amontoa rotulos
    // no eixo. Filtra pra só as "dezenas redondas" de uma escala log
    // (mantissa 1, 2 ou 5), o mesmo criterio que scales::breaks_log() usa
    // por baixo no eixo do output.png.
    const ticksLog = x.ticks(20).filter((v) => {
      const mantissa = v / 10 ** Math.floor(Math.log10(v));
      return [1, 2, 5].some((m) => Math.abs(mantissa - m) < 1e-9);
    });

    const eixoBaixo = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const eixoEsq = g.append('g');
    estilarEixo(
      eixoBaixo.call(
        axisBottom(x)
          .tickValues(ticksLog)
          .tickFormat((d) => `US$ ${format('~r')(d as number)}M`)
          .tickSizeOuter(0)
      ),
      theme,
      px
    );
    estilarEixo(eixoEsq.call(axisLeft(y).ticks(6).tickFormat((d) => `${d}%`).tickSizeOuter(0)), theme, px);

    g.append('text')
      .attr('x', larguraUtil / 2)
      .attr('y', alturaUtil + px(38))
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(11))
      .text('Investimento captado (escala log)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -alturaUtil / 2)
      .attr('y', -px(40))
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(11))
      .text('Crescimento anual de receita (%)');

    const bolhas = g
      .append('g')
      .selectAll<SVGCircleElement, Startup>('circle')
      .data(startups, (d) => d.empresa)
      .join('circle')
      .attr('cx', (d) => x(d.investimento_milhoes))
      .attr('cy', (d) => y(d.crescimento_receita))
      .attr('fill', (d) => paleta[d.setor] ?? theme.accent)
      .attr('fill-opacity', 0.75)
      .attr('stroke', (d) => paleta[d.setor] ?? theme.accent)
      .attr('stroke-width', px(1))
      .attr('data-interactive', '');

    function conteudoTooltip(d: Startup): string {
      return `<strong>${d.empresa}</strong> · ${d.setor}<br>US$ ${d.investimento_milhoes}M captados · ${d.crescimento_receita}% de crescimento<br>${d.funcionarios} funcionários`;
    }

    bolhas
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(conteudoTooltip(d), evento))
      .on('pointerleave', () => tooltip.hide());

    const legenda = select(root).append('div').attr('class', 'viz-legenda');
    const legendaBotoes = legenda
      .selectAll('button')
      .data(meta.setores)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((s) => `<span class="viz-swatch" style="background:${paleta[s]}"></span>${s}`);

    tornarFixavel(
      root,
      [
        { selecao: bolhas, chaveDe: (d: Startup) => d.setor },
        { selecao: legendaBotoes, chaveDe: (s: string) => s },
      ],
      (setor) =>
        bolhas
          .transition('realce')
          .duration(DURATION.fast)
          .attr('fill-opacity', (d) => (d.setor === setor ? 0.9 : 0.08))
          .attr('stroke-opacity', (d) => (d.setor === setor ? 1 : 0.08)),
      () => bolhas.transition('realce').duration(DURATION.fast).attr('fill-opacity', 0.75).attr('stroke-opacity', 1)
    );

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    if (animate) {
      const raioFinal = (d: Startup) => raio(d.funcionarios);
      bolhas
        .attr('r', 0)
        .transition()
        .delay((_d, i) => stagger(i, startups.length, 620))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('r', raioFinal);

      garantirEstadoFinal(DURATION.enter + stagger(startups.length - 1, startups.length, 620) + 100, () => {
        bolhas.interrupt().attr('r', raioFinal);
      });
    } else {
      bolhas.attr('r', (d) => raio(d.funcionarios));
    }
  },
};

export default chart;
