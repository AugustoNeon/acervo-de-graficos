/**
 * Mosaico (Marimekko): composição de planos por canal de aquisição.
 *
 * Duas normalizações aninhadas, recalculadas do zero a partir das
 * contagens brutas -- nunca a partir de x0/x1/y0/y1 já prontos do R (mesmo
 * princípio de sempre desta base). A LARGURA de cada coluna vem do total do
 * canal sobre o total geral; a ALTURA de cada célula vem da contagem do
 * plano sobre o total DAQUELE canal específico (não do total geral) -- é
 * essa segunda normalização, feita coluna a coluna, que torna a composição
 * interna comparável entre canais de tamanhos bem diferentes.
 */

import { select } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Celula {
  canal: string;
  plano: string;
  clientes: number;
}

interface Dados {
  meta: { cores: Record<string, string>; canais: string[]; planos: string[] };
  celulas: Celula[];
}

interface Retangulo extends Celula {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  proporcaoCanal: number;
}

const VB_W = 900;
const VB_H = 620;
const MARGEM = { topo: 56, dir: 4, baixo: 4, esq: 4 };

/** Calcula x0/x1 (largura por canal) e y0/y1 (altura por plano dentro do canal), tudo em [0,1]. */
function calcularMosaico(celulas: Celula[], canais: string[], planos: string[]): Retangulo[] {
  const totalPorCanal = new Map(canais.map((c) => [c, 0]));
  celulas.forEach((c) => totalPorCanal.set(c.canal, (totalPorCanal.get(c.canal) ?? 0) + c.clientes));
  const totalGeral = [...totalPorCanal.values()].reduce((a, b) => a + b, 0);

  let xAcumulado = 0;
  const x0PorCanal = new Map<string, number>();
  const x1PorCanal = new Map<string, number>();
  canais.forEach((canal) => {
    const largura = (totalPorCanal.get(canal) ?? 0) / totalGeral;
    x0PorCanal.set(canal, xAcumulado);
    xAcumulado += largura;
    x1PorCanal.set(canal, xAcumulado);
  });

  const retangulos: Retangulo[] = [];
  canais.forEach((canal) => {
    const totalCanal = totalPorCanal.get(canal) ?? 0;
    let yAcumulado = 0;
    // Empilha de cima pra baixo na mesma ordem da legenda (Free no topo,
    // Enterprise embaixo) -- ordem invertida em relação ao array `planos`
    // (que lista do menor pro maior) pra bater com a leitura do output.png.
    [...planos].reverse().forEach((plano) => {
      const celula = celulas.find((c) => c.canal === canal && c.plano === plano);
      const clientes = celula?.clientes ?? 0;
      const proporcaoCanal = totalCanal > 0 ? clientes / totalCanal : 0;
      retangulos.push({
        canal,
        plano,
        clientes,
        x0: x0PorCanal.get(canal) ?? 0,
        x1: x1PorCanal.get(canal) ?? 0,
        y0: yAcumulado,
        y1: yAcumulado + proporcaoCanal,
        proporcaoCanal,
      });
      yAcumulado += proporcaoCanal;
    });
  });
  return retangulos;
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Mosaico (Marimekko): composição de quatro planos de assinatura dentro de cada um dos quatro canais de ' +
    'aquisição, com a largura de cada coluna representando o tamanho do canal.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, celulas } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const retangulos = calcularMosaico(celulas, meta.canais, meta.planos);
    const totalPorCanal = new Map<string, number>();
    celulas.forEach((c) => totalPorCanal.set(c.canal, (totalPorCanal.get(c.canal) ?? 0) + c.clientes));
    const totalGeral = [...totalPorCanal.values()].reduce((a, b) => a + b, 0);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const xPx = (v: number) => v * larguraUtil;
    const yPx = (v: number) => v * alturaUtil;

    const chaveDe = (d: Retangulo) => `${d.canal}-${d.plano}`;
    const gap = px(2);
    const celulasSel = g
      .selectAll<SVGRectElement, Retangulo>('rect')
      .data(retangulos, chaveDe as never)
      .join('rect')
      .attr('data-interactive', '')
      .attr('x', (d) => xPx(d.x0) + gap / 2)
      .attr('y', (d) => yPx(d.y0) + gap / 2)
      .attr('width', (d) => Math.max(0, xPx(d.x1) - xPx(d.x0) - gap))
      .attr('height', (d) => Math.max(0, yPx(d.y1) - yPx(d.y0) - gap))
      .attr('fill', (d) => meta.cores[d.plano] ?? theme.primary);

    const rotulos = g
      .selectAll<SVGTextElement, Retangulo>('text.valor')
      .data(retangulos.filter((d) => d.proporcaoCanal > 0.06), chaveDe as never)
      .join('text')
      .attr('class', 'valor')
      .attr('x', (d) => (xPx(d.x0) + xPx(d.x1)) / 2)
      .attr('y', (d) => (yPx(d.y0) + yPx(d.y1)) / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('font-size', px(13))
      .attr('fill', theme.bg)
      .attr('pointer-events', 'none')
      .text((d) => `${Math.round(d.proporcaoCanal * 100)}%`);

    const cabecalhos = g
      .selectAll<SVGTextElement, string>('text.canal')
      .data(meta.canais)
      .join('text')
      .attr('class', 'canal')
      .attr('x', (canal) => {
        const r = retangulos.find((d) => d.canal === canal)!;
        return (xPx(r.x0) + xPx(r.x1)) / 2;
      })
      .attr('y', -px(30))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('font-size', px(13))
      .attr('fill', theme.ink)
      .text((canal) => canal);

    g.selectAll<SVGTextElement, string>('text.canal-pct')
      .data(meta.canais)
      .join('text')
      .attr('class', 'canal-pct')
      .attr('x', (canal) => {
        const r = retangulos.find((d) => d.canal === canal)!;
        return (xPx(r.x0) + xPx(r.x1)) / 2;
      })
      .attr('y', -px(14))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(11))
      .attr('fill', theme.inkMuted)
      .text((canal) => `${Math.round(((totalPorCanal.get(canal) ?? 0) / totalGeral) * 100)}% da base`);

    function mostrarTooltip(evento: PointerEvent, d: Retangulo) {
      tooltip.show(
        `<span class="viz-swatch" style="background:${meta.cores[d.plano]}"></span>` +
          `<strong>${d.plano}</strong> em ${d.canal}<br>${d.clientes.toLocaleString('pt-BR')} clientes · ` +
          `${Math.round(d.proporcaoCanal * 100)}% do canal`,
        evento
      );
    }
    celulasSel.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());

    function realcar(plano: string) {
      celulasSel.attr('opacity', (d) => (d.plano === plano ? 1 : 0.22));
      legenda.attr('opacity', (p: string) => (p === plano ? 1 : 0.45));
    }
    function limpar() {
      celulasSel.attr('opacity', 1);
      legenda.attr('opacity', 1);
    }

    tornarFixavel(root, { selecao: celulasSel, chaveDe: (d: Retangulo) => d.plano }, realcar, limpar);

    const legenda = select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(meta.planos)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((p) => `<span class="viz-swatch" style="background:${meta.cores[p]}"></span>${p}`)
      .on('pointerenter', (_e, p) => realcar(p))
      .on('pointerleave', limpar);

    if (animate) {
      celulasSel.attr('opacity', 0);
      rotulos.attr('opacity', 0);
      cabecalhos.attr('opacity', 0);

      const canalIndex = new Map(meta.canais.map((c, i) => [c, i]));
      celulasSel
        .transition()
        .delay((d) => stagger(canalIndex.get(d.canal) ?? 0, meta.canais.length, 400))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('opacity', 1);

      rotulos.transition().delay(DURATION.enter * 0.6).duration(DURATION.base).attr('opacity', 1);
      cabecalhos.transition().duration(DURATION.base).attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + 250, () => {
        celulasSel.interrupt().attr('opacity', 1);
        rotulos.interrupt().attr('opacity', 1);
        cabecalhos.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
