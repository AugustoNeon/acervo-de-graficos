/**
 * Icicle chart: uso de espaço em disco de um projeto de software fictício.
 *
 * A profundidade da hierarquia vira um EIXO Y discreto (uma linha por
 * nível, raiz no topo) -- diferença central em relação aos outros membros
 * de `part-of-whole` desta base, que codificam profundidade por anel
 * concêntrico (sunburst, circle packing) ou aninhamento 2D livre (treemap).
 * O R exporta só a lista achatada categoria+subpasta+tamanho -- o D3 monta
 * a partição aninhada (largura acumulada por nível, filho reescalado pro
 * intervalo do próprio pai) sozinho, mesmo princípio de sempre desta base.
 */

import { select } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Folha {
  categoria: string;
  subpasta: string;
  tamanhoMb: number;
}

interface Dados {
  meta: { cores: Record<string, string>; totalGeral: number };
  folhas: Folha[];
}

interface Retangulo {
  id: string;
  rotulo: string;
  categoria: string | null;
  nivel: 1 | 2 | 3;
  x0: number;
  x1: number;
  tamanhoMb: number;
}

const VB_W = 1000;
const VB_H = 460;
const COR_RAIZ = '#E4E1D8';

/** Monta a partição de 3 níveis (raiz, categoria, subpasta) a partir da lista achatada. */
function calcularIcicle(folhas: Folha[], totalGeral: number): Retangulo[] {
  const totalPorCategoria = new Map<string, number>();
  folhas.forEach((f) => totalPorCategoria.set(f.categoria, (totalPorCategoria.get(f.categoria) ?? 0) + f.tamanhoMb));

  // Nível 1 (categoria): ordenada da maior pra menor, mesma leitura de
  // "quem ocupa mais espaço primeiro" de qualquer analisador de disco.
  const categorias = [...totalPorCategoria.entries()].sort((a, b) => b[1] - a[1]);

  const retangulos: Retangulo[] = [{ id: 'raiz', rotulo: 'projeto', categoria: null, nivel: 3, x0: 0, x1: 1, tamanhoMb: totalGeral }];

  let xAcumulado = 0;
  categorias.forEach(([categoria, total]) => {
    const x0 = xAcumulado;
    const x1 = xAcumulado + total / totalGeral;
    xAcumulado = x1;
    retangulos.push({ id: `cat:${categoria}`, rotulo: categoria, categoria, nivel: 2, x0, x1, tamanhoMb: total });

    // Nível 2 (subpasta): largura proporcional ao total DA PRÓPRIA
    // categoria, depois reescalada pro intervalo [x0,x1] da categoria --
    // é essa reescala (multiplicar pela largura do pai) que aninha o
    // filho DENTRO do pai, em vez de reocupar o eixo inteiro (diferença
    // pro mosaico desta base, onde as colunas são independentes).
    const doNivel = folhas
      .filter((f) => f.categoria === categoria)
      .sort((a, b) => b.tamanhoMb - a.tamanhoMb);
    let fracAcumulada = 0;
    doNivel.forEach((f) => {
      const fracInicio = fracAcumulada;
      const fracFim = fracAcumulada + f.tamanhoMb / total;
      fracAcumulada = fracFim;
      retangulos.push({
        id: `folha:${categoria}-${f.subpasta}`,
        rotulo: f.subpasta,
        categoria,
        nivel: 1,
        x0: x0 + fracInicio * (x1 - x0),
        x1: x0 + fracFim * (x1 - x0),
        tamanhoMb: f.tamanhoMb,
      });
    });
  });

  return retangulos;
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Icicle chart: uso de espaço em disco de um projeto de software fictício, três linhas de cima pra baixo -- ' +
    'projeto inteiro, categoria de pasta, subpasta -- com a largura de cada bloco proporcional ao tamanho.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, folhas } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const retangulos = calcularIcicle(folhas, meta.totalGeral);
    const alturaLinha = VB_H / 3;
    const gap = px(2);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g');

    const xPx = (v: number) => v * VB_W;
    // Nível 3 (raiz) fica na linha de cima; nível 1 (folha) na de baixo --
    // inverte "nivel" pra posição de topo-a-baixo (nivel alto = y pequeno).
    const yPx = (nivel: number) => (3 - nivel) * alturaLinha;

    const cor = (d: Retangulo) => (d.nivel === 3 ? COR_RAIZ : meta.cores[d.categoria ?? ''] ?? theme.primary);

    const blocos = g
      .selectAll<SVGRectElement, Retangulo>('rect')
      .data(retangulos, (d) => d.id)
      .join('rect')
      .attr('data-interactive', '')
      .attr('x', (d) => xPx(d.x0) + gap / 2)
      .attr('y', (d) => yPx(d.nivel) + gap / 2)
      .attr('width', (d) => Math.max(0, xPx(d.x1) - xPx(d.x0) - gap))
      .attr('height', alturaLinha - gap)
      .attr('fill', cor);

    const rotulos = g
      .selectAll<SVGTextElement, Retangulo>('text')
      .data(
        retangulos.filter((d) => d.x1 - d.x0 > 0.035),
        (d) => d.id
      )
      .join('text')
      .attr('x', (d) => (xPx(d.x0) + xPx(d.x1)) / 2)
      .attr('y', (d) => yPx(d.nivel) + alturaLinha / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('font-size', px(13))
      .attr('fill', theme.ink)
      .attr('pointer-events', 'none')
      .text((d) => d.rotulo);

    function mostrarTooltip(evento: PointerEvent, d: Retangulo) {
      const pct = ((d.tamanhoMb / meta.totalGeral) * 100).toFixed(1);
      const contexto = d.nivel === 3 ? '' : d.nivel === 2 ? ` · ${pct}% do projeto` : ` · em ${d.categoria}`;
      tooltip.show(
        `${d.nivel !== 3 ? `<span class="viz-swatch" style="background:${cor(d)}"></span>` : ''}` +
          `<strong>${d.rotulo}</strong>${contexto}<br>${d.tamanhoMb.toFixed(1)} MB`,
        evento
      );
    }
    blocos.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());

    function realcar(categoria: string) {
      blocos.attr('opacity', (d) => (d.nivel === 3 || d.categoria === categoria ? 1 : 0.18));
      rotulos.attr('opacity', (d) => (d.nivel === 3 || d.categoria === categoria ? 1 : 0.25));
      legenda.attr('opacity', (c: string) => (c === categoria ? 1 : 0.45));
    }
    function limpar() {
      blocos.attr('opacity', 1);
      rotulos.attr('opacity', 1);
      legenda.attr('opacity', 1);
    }

    tornarFixavel(
      root,
      { selecao: blocos.filter((d) => d.nivel !== 3), chaveDe: (d: Retangulo) => d.categoria ?? '' },
      realcar,
      limpar
    );

    const categoriasOrdenadas = Object.keys(meta.cores).sort(
      (a, b) => (retangulos.find((r) => r.id === `cat:${b}`)?.tamanhoMb ?? 0) - (retangulos.find((r) => r.id === `cat:${a}`)?.tamanhoMb ?? 0)
    );
    const legenda = select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(categoriasOrdenadas)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((c) => `<span class="viz-swatch" style="background:${meta.cores[c]}"></span>${c}`)
      .on('pointerenter', (_e, c) => realcar(c))
      .on('pointerleave', limpar);

    if (animate) {
      blocos.attr('opacity', 0);
      rotulos.attr('opacity', 0);

      blocos
        .transition()
        .delay((d) => stagger(3 - d.nivel, 3, 380))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('opacity', 1);

      rotulos
        .transition()
        .delay((d) => stagger(3 - d.nivel, 3, 380) + DURATION.enter * 0.5)
        .duration(DURATION.base)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + 400, () => {
        blocos.interrupt().attr('opacity', 1);
        rotulos.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
