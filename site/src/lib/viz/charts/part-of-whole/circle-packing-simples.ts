/**
 * Circle packing simples — versao interativa.
 *
 * Reproduz o output.png (mesmo layout de bolhas do packcircles, mesma paleta
 * Spectral resolvida pelo proprio ggplot_build no script.R) e acrescenta o
 * que a imagem nao da: entrada animada, realce e tooltip com o total de
 * downloads ao passar o cursor.
 *
 * x/y/radius de cada bolha ja vem prontos do layout do packcircles — aqui so
 * se desenha, sem recalcular posicao.
 */

import { select, scaleSqrt } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Circulo {
  id: number;
  jogo: string;
  downloads: number;
  x: number;
  y: number;
  radius: number;
  cor: string;
}

interface Dados {
  meta: { downloadsMin: number; downloadsMax: number; nota?: string };
  circulos: Circulo[];
}

/** Respiro em volta do aglomerado de bolhas, na mesma unidade do layout. */
const PADDING = 2.5;
/** Opacidade de preenchimento — a mesma alpha = 0.75 do geom_polygon. */
const OPACIDADE = 0.75;
const OPACIDADE_APAGADA = 0.16;

const chart: VizChart = {
  aspectRatio: 1.5,
  label:
    'Circle packing de um nível: 24 jogos indie fictícios, cada bolha proporcional ao total ' +
    'de downloads.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, circulos } = data as Dados;

    const minX = Math.min(...circulos.map((c) => c.x - c.radius)) - PADDING;
    const maxX = Math.max(...circulos.map((c) => c.x + c.radius)) + PADDING;
    const minY = Math.min(...circulos.map((c) => c.y - c.radius)) - PADDING;
    const maxY = Math.max(...circulos.map((c) => c.y + c.radius)) + PADDING;
    const vbW = maxX - minX;
    const vbH = maxY - minY;

    // O SVG e reescalado pelo CSS, entao um "px" dentro do viewBox nao e um px
    // na tela — converter na direcao contraria mantem texto/traco do mesmo
    // tamanho real em qualquer largura.
    const escala = vbW / Math.max(width, 1);
    const px = (valor: number) => valor * escala;

    const fontSize = scaleSqrt().domain([meta.downloadsMin, meta.downloadsMax]).range([8, 15]);

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `${minX} ${minY} ${vbW} ${vbH}`)
      .attr('aria-hidden', 'true');

    const bolhas = svg
      .append('g')
      .selectAll<SVGCircleElement, Circulo>('circle')
      .data(circulos)
      .join('circle')
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.y)
      .attr('fill', (d) => d.cor)
      .attr('fill-opacity', OPACIDADE)
      .attr('stroke', theme.ink)
      .attr('stroke-width', px(1))
      .attr('data-interactive', '');

    const rotulos = svg
      .append('g')
      .selectAll<SVGTextElement, Circulo>('text')
      .data(circulos)
      .join('text')
      .attr('x', (d) => d.x)
      .attr('y', (d) => d.y)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 600)
      .attr('font-size', (d) => px(fontSize(d.downloads)))
      .attr('fill', theme.ink)
      .attr('pointer-events', 'none')
      .text((d) => d.jogo);

    // -------------------------------------------------------------- interacao
    const realcar = (id: number | null) => {
      bolhas
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('fill-opacity', (d) => (id === null || d.id === id ? OPACIDADE : OPACIDADE_APAGADA))
        .attr('stroke-width', (d) => px(id === d.id ? 2 : 1));
      rotulos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('opacity', (d) => (id === null || d.id === id ? 1 : 0.35));
    };

    bolhas
      .on('pointermove', (evento: PointerEvent, d) =>
        tooltip.show(`<strong>${d.jogo}</strong><br>${d.downloads} mil downloads`, evento)
      )
      .on('pointerleave', () => tooltip.hide());

    tornarFixavel(root, { selecao: bolhas, chaveDe: (d) => String(d.id) }, (chave) => realcar(Number(chave)), () => realcar(null));

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // As bolhas crescem do centro pra fora, escalonadas da maior pra menor —
    // acompanha a leitura natural de "o que mais pesa aparece primeiro".
    if (animate) {
      const ordem = [...circulos].sort((a, b) => b.radius - a.radius);
      const indice = new Map(ordem.map((d, i) => [d.id, i]));

      bolhas
        .attr('r', 0)
        .transition()
        .delay((d) => stagger(indice.get(d.id)!, circulos.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('r', (d) => d.radius);

      rotulos
        .attr('opacity', 0)
        .transition()
        .delay(DURATION.enter * 0.5)
        .duration(DURATION.base)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter * 1.6, () => {
        bolhas.interrupt().attr('r', (d) => d.radius);
        rotulos.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
