/**
 * Barras divergentes: variação de vendas por categoria vs. média da rede.
 *
 * Primeiro gráfico divergente da categoria ranking -- o "zero" do eixo não é
 * ausência de valor, é a referência (a média), então a barra cresce pros dois
 * lados a partir dele. A escala linear é centrada em 0 por construção
 * (domínio simétrico ao redor do maior desvio absoluto), e a categoria fica
 * ordenada pelo valor (maior alta no topo, maior queda embaixo) -- mesma
 * leitura do `output.png`.
 */

import { select, scaleLinear, scaleBand, axisLeft, max } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Linha {
  categoria: string;
  variacao: number;
  sinal: string;
}

interface Dados {
  meta: { cores: Record<string, string> };
  dados: Linha[];
}

const VB_W = 900;
const VB_H = 560;
const MARGEM = { topo: 16, dir: 64, baixo: 40, esq: 128 };

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Barras divergentes horizontais: variação percentual de vendas de 10 categorias de produto em relação ' +
    'à média da rede, verde para acima da média e laranja-queimado para abaixo.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, dados } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    // Ordem de leitura: maior alta no topo -- mesma ordenação do script.R
    // (fct_reorder crescente + coord_flip inverte visualmente).
    const ordenado = [...dados].sort((a, b) => b.variacao - a.variacao);

    const limite = (max(dados, (d) => Math.abs(d.variacao)) ?? 0) * 1.35;
    const x = scaleLinear().domain([-limite, limite]).range([0, larguraUtil]);
    const y = scaleBand<string>()
      .domain(ordenado.map((d) => d.categoria))
      .range([0, alturaUtil])
      .padding(0.32);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const gGrade = g.append('g');
    gGrade.call(
      axisLeft(y)
        .tickSize(-larguraUtil)
        .tickFormat(() => '')
    );
    gGrade.select('.domain').remove();
    gGrade.selectAll('.tick line').attr('stroke', theme.border).attr('stroke-opacity', 0.35);

    const gEixoY = g.append('g');
    gEixoY.call(axisLeft(y).tickSizeOuter(0));
    estilarEixo(gEixoY, theme, px);
    gEixoY.selectAll('text').attr('font-weight', 700).attr('fill', theme.ink);
    gEixoY.select('.domain').attr('stroke', theme.border);

    // Linha de referência no zero (a média) -- é o eixo conceitual do
    // gráfico, mais forte que a grade comum.
    g.append('line')
      .attr('x1', x(0))
      .attr('x2', x(0))
      .attr('y1', 0)
      .attr('y2', alturaUtil)
      .attr('stroke', theme.ink)
      .attr('stroke-width', px(1.4));

    const chaveDe = (d: Linha) => d.categoria;
    const alturaBarra = () => y.bandwidth();
    const xDe = (d: Linha) => x(Math.min(0, d.variacao));
    const larguraDe = (d: Linha) => Math.abs(x(d.variacao) - x(0));

    const barras = g
      .selectAll<SVGRectElement, Linha>('rect')
      .data(dados, chaveDe)
      .join('rect')
      .attr('data-interactive', '')
      .attr('x', (d) => x(0))
      .attr('y', (d) => y(d.categoria) ?? 0)
      .attr('width', 0)
      .attr('height', alturaBarra())
      .attr('rx', px(2))
      .attr('fill', (d) => meta.cores[d.sinal] ?? theme.primary);

    const rotulos = g
      .selectAll<SVGTextElement, Linha>('text.valor')
      .data(dados, chaveDe)
      .join('text')
      .attr('class', 'valor')
      .attr('y', (d) => (y(d.categoria) ?? 0) + alturaBarra() / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontMono)
      .attr('font-weight', 700)
      .attr('font-size', px(12))
      .attr('fill', theme.inkMuted)
      .text((d) => `${d.variacao >= 0 ? '+' : ''}${d.variacao}%`);

    function posicionarRotulo(sel: typeof rotulos, transicao: boolean) {
      const alvo = transicao ? sel.transition().duration(DURATION.base) : sel;
      alvo
        .attr('x', (d) => x(d.variacao) + (d.variacao >= 0 ? px(8) : -px(8)))
        .attr('text-anchor', (d) => (d.variacao >= 0 ? 'start' : 'end'));
    }

    function mostrarTooltip(evento: PointerEvent, d: Linha) {
      tooltip.show(
        `<span class="viz-swatch" style="background:${meta.cores[d.sinal]}"></span>` +
          `<strong>${d.categoria}</strong><br>${d.variacao >= 0 ? '+' : ''}${d.variacao}% · ${d.sinal.toLowerCase()}`,
        evento
      );
    }
    barras.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());

    function realcar(categoria: string) {
      barras.attr('opacity', (d) => (d.categoria === categoria ? 1 : 0.35));
      rotulos.attr('opacity', (d) => (d.categoria === categoria ? 1 : 0.35));
      legenda.attr('opacity', 1);
    }
    function limpar() {
      barras.attr('opacity', 1);
      rotulos.attr('opacity', 1);
      legenda.attr('opacity', 1);
    }

    tornarFixavel(root, { selecao: barras, chaveDe }, realcar, limpar);

    const sinais = Object.keys(meta.cores);
    const legenda = select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(sinais)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((s) => `<span class="viz-swatch" style="background:${meta.cores[s]}"></span>${s}`)
      .on('pointerenter', (_e, s) => {
        barras.attr('opacity', (d) => (d.sinal === s ? 1 : 0.25));
        rotulos.attr('opacity', (d) => (d.sinal === s ? 1 : 0.25));
      })
      .on('pointerleave', () => {
        barras.attr('opacity', 1);
        rotulos.attr('opacity', 1);
      });

    if (animate) {
      barras.attr('width', 0).attr('x', x(0));
      rotulos.attr('opacity', 0);

      const delayDe = (d: Linha) => stagger(ordenado.findIndex((o) => o.categoria === d.categoria), ordenado.length);

      barras
        .transition()
        .delay(delayDe)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('x', xDe)
        .attr('width', larguraDe)
        .on('end', function (d) {
          if (dados.indexOf(d) === dados.length - 1) posicionarRotulo(rotulos, false);
        });

      rotulos
        .transition()
        .delay((d) => delayDe(d) + DURATION.enter * 0.6)
        .duration(DURATION.base)
        .attr('opacity', 1);
      posicionarRotulo(rotulos, false);

      garantirEstadoFinal(DURATION.enter + 250, () => {
        barras.interrupt().attr('x', xDe).attr('width', larguraDe);
        rotulos.interrupt().attr('opacity', 1);
        posicionarRotulo(rotulos, false);
      });
    } else {
      barras.attr('x', xDe).attr('width', larguraDe);
      posicionarRotulo(rotulos, false);
    }
  },
};

export default chart;
