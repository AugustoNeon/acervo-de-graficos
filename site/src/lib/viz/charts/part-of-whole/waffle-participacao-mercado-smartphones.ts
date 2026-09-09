/**
 * Waffle chart: participação de mercado de fabricantes de smartphone.
 *
 * Primeiro gráfico de `part-of-whole` que codifica proporção por ÁREA
 * DISCRETA CONTADA (100 quadrados, um por ponto percentual) em vez de
 * ângulo/área contínua (pizza, rosca, treemap, sunburst e circle packing
 * desta mesma categoria são todos contínuos). O R exporta só a lista
 * fabricante+participação -- o D3 "estoura" essa lista em 100 unidades e
 * preenche a grade 10×10 sozinho, mesmo princípio de nunca exportar
 * geometria pronta já usado nos outros gráficos desta base.
 */

import { select } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Fatia {
  fabricante: string;
  participacao: number;
}

interface Dados {
  meta: { cores: Record<string, string>; lado: number };
  dados: Fatia[];
}

interface Unidade {
  fabricante: string;
  indice: number;
  coluna: number;
  linha: number;
}

const VB = 900;

/**
 * Estoura a lista fabricante+participação em uma unidade por ponto percentual.
 *
 * O `script.R` inverte a linha (`LADO-1 - floor(indice/lado)`) porque o eixo Y
 * do ggplot cresce PRA CIMA -- sem inverter, a primeira fatia (Vertex) cairia
 * embaixo da grade em vez de em cima. O SVG é o oposto: y=0 já é o TOPO e
 * cresce pra baixo, então aqui a linha é `floor(indice/lado)` direto, sem
 * inversão nenhuma -- inverter os dois ao mesmo tempo (copiar a fórmula do R
 * sem ajustar) desenharia a grade de cabeça pra baixo (fatia grande embaixo,
 * "Outras marcas" no topo).
 */
function gerarUnidades(dados: Fatia[], lado: number): Unidade[] {
  const unidades: Unidade[] = [];
  let indice = 0;
  dados.forEach((d) => {
    for (let i = 0; i < d.participacao; i++) {
      const coluna = indice % lado;
      const linha = Math.floor(indice / lado);
      unidades.push({ fabricante: d.fabricante, indice, coluna, linha });
      indice++;
    }
  });
  return unidades;
}

const chart: VizChart = {
  aspectRatio: 0.88,
  label:
    'Waffle chart: grade de 100 quadrados representando a participação de mercado de seis fabricantes de ' +
    'smartphone, um quadrado por ponto percentual, preenchida da esquerda pra direita e de baixo pra cima.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, dados } = data as Dados;
    const lado = meta.lado;

    const escala = VB / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const MARGEM = { topo: 20, lat: 20, baixo: 20 };
    const larguraGrade = VB - MARGEM.lat * 2;
    const celula = larguraGrade / lado;
    const gap = celula * 0.09;
    const alturaGrade = celula * lado;

    const unidades = gerarUnidades(dados, lado);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB} ${VB * 0.88}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.lat},${MARGEM.topo})`);

    const xDe = (d: Unidade) => d.coluna * celula + gap / 2;
    const yDe = (d: Unidade) => d.linha * celula + gap / 2;
    const cxDe = (d: Unidade) => xDe(d) + (celula - gap) / 2;
    const cyDe = (d: Unidade) => yDe(d) + (celula - gap) / 2;

    const chaveDe = (d: Unidade) => d.indice;
    const quadrados = g
      .selectAll<SVGRectElement, Unidade>('rect')
      .data(unidades, chaveDe as never)
      .join('rect')
      .attr('data-interactive', '')
      .attr('x', xDe)
      .attr('y', yDe)
      .attr('width', celula - gap)
      .attr('height', celula - gap)
      .attr('rx', px(2))
      .attr('fill', (d) => meta.cores[d.fabricante] ?? theme.primary);

    function mostrarTooltip(evento: PointerEvent, d: Unidade) {
      const fatia = dados.find((f) => f.fabricante === d.fabricante)!;
      tooltip.show(
        `<span class="viz-swatch" style="background:${meta.cores[d.fabricante]}"></span>` +
          `<strong>${d.fabricante}</strong><br>${fatia.participacao}% do mercado`,
        evento
      );
    }
    quadrados.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());

    function realcar(fabricante: string) {
      quadrados.attr('opacity', (d) => (d.fabricante === fabricante ? 1 : 0.16));
      legenda.attr('opacity', (f: Fatia) => (f.fabricante === fabricante ? 1 : 0.45));
    }
    function limpar() {
      quadrados.attr('opacity', 1);
      legenda.attr('opacity', 1);
    }

    tornarFixavel(root, { selecao: quadrados, chaveDe: (d: Unidade) => d.fabricante }, realcar, limpar);

    const legenda = select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(dados)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((f) => `<span class="viz-swatch" style="background:${meta.cores[f.fabricante]}"></span>${f.fabricante} — ${f.participacao}%`)
      .on('pointerenter', (_e, f) => realcar(f.fabricante))
      .on('pointerleave', limpar);

    if (animate) {
      // Cada quadrado nasce como um ponto no próprio centro e cresce até o
      // tamanho final -- x/y/width/height animados em vez de opacidade pura,
      // pra dar a sensação de "quadrado se materializando", não só um fade.
      quadrados.attr('x', cxDe).attr('y', cyDe).attr('width', 0).attr('height', 0);

      quadrados
        .transition()
        .delay((d) => stagger(d.indice, unidades.length, 900))
        .duration(DURATION.base)
        .ease(EASE_ENTER)
        .attr('x', xDe)
        .attr('y', yDe)
        .attr('width', celula - gap)
        .attr('height', celula - gap);

      garantirEstadoFinal(900 + DURATION.base + 250, () => {
        quadrados.interrupt().attr('x', xDe).attr('y', yDe).attr('width', celula - gap).attr('height', celula - gap);
      });
    }
  },
};

export default chart;
