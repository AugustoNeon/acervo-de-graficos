/**
 * Densidade 2D em bandas de contorno — primeira versão interativa (não é
 * migração de widget: o gráfico original só tinha `output.png`).
 *
 * O R não exporta a geometria das bandas — poligonos com furos, difícil de
 * serializar de forma genérica. Em vez disso o D3 recalcula suas próprias
 * bandas com `d3.contourDensity()`, a partir dos mesmos pontos brutos que
 * geraram o `output.png`. A paridade visual vem da mesma paleta e da mesma
 * família de técnica (bandas de nível), não de reimportar geometria exata —
 * mesma lógica já usada em layout recalculado do zero (circle packing,
 * dendrograma).
 */

import {
  select,
  scaleLinear,
  scaleSequential,
  interpolateYlOrRd,
  contourDensity,
  geoPath,
  axisBottom,
  axisLeft,
  pointer,
} from 'd3';
import { DURATION, EASE_STATE, garantirEstadoFinal } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import type { DrawContext, VizChart } from '../../types';

interface Ponto {
  x: number;
  y: number;
}

interface Dados {
  meta: { paleta: string; niveisInicial: number; niveisMax: number; nota?: string };
  pontos: { x: number[]; y: number[] };
}

interface Contorno {
  type: string;
  value: number;
  coordinates: [number, number][][][];
}

const VB_W = 900;
const VB_H = 675;
const MARGEM = { topo: 20, dir: 20, baixo: 44, esq: 50 };
const BANDWIDTH = 22;

function pontoDentro(mx: number, my: number, c: Contorno): boolean {
  let dentro = false;
  for (const polygon of c.coordinates) {
    for (const anel of polygon) {
      for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
        const [xi, yi] = anel[i];
        const [xj, yj] = anel[j];
        if (yi > my !== yj > my && mx < ((xj - xi) * (my - yi)) / (yj - yi) + xi) dentro = !dentro;
      }
    }
  }
  return dentro;
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Mapa de densidade 2D: quatro agrupamentos gaussianos representados por bandas de ' +
    'contorno, com controle do número de níveis e leitura de densidade sob o cursor.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, pontos: brutos } = data as Dados;
    const pontos: Ponto[] = brutos.x.map((xi, i) => ({ x: xi, y: brutos.y[i] }));

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const extX = [Math.min(...pontos.map((d) => d.x)), Math.max(...pontos.map((d) => d.x))];
    const extY = [Math.min(...pontos.map((d) => d.y)), Math.max(...pontos.map((d) => d.y))];
    const folgaX = (extX[1] - extX[0]) * 0.02;
    const folgaY = (extY[1] - extY[0]) * 0.02;

    const x = scaleLinear().domain([extX[0] - folgaX, extX[1] + folgaX]).range([0, larguraUtil]);
    const y = scaleLinear().domain([extY[0] - folgaY, extY[1] + folgaY]).range([alturaUtil, 0]);

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);
    const gBandas = g.append('g');
    const caminho = geoPath();

    const eixoXSel = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const eixoYSel = g.append('g');

    // Rótulos "x"/"y" — mesma leitura minimalista do output.png (theme_minimal).
    svg
      .append('text')
      .attr('x', MARGEM.esq + larguraUtil / 2)
      .attr('y', VB_H - px(6))
      .attr('text-anchor', 'middle')
      .attr('fill', theme.ink)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(13))
      .text('x');
    svg
      .append('text')
      .attr('x', px(14))
      .attr('y', MARGEM.topo + alturaUtil / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.ink)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(13))
      .attr('transform', `rotate(-90, ${px(14)}, ${MARGEM.topo + alturaUtil / 2})`)
      .text('y');

    let contornos: Contorno[] = [];
    let niveisAtual = meta.niveisInicial;

    function calcularContornos(niveis: number): void {
      contornos = contourDensity<Ponto>()
        .x((d) => x(d.x))
        .y((d) => y(d.y))
        .size([larguraUtil, alturaUtil])
        .bandwidth(BANDWIDTH)
        .thresholds(niveis)(pontos) as unknown as Contorno[];
    }

    function redesenhar(): void {
      const valorMax = Math.max(...contornos.map((c) => c.value));
      const cor = scaleSequential(interpolateYlOrRd).domain([0, valorMax * 1.05]);

      gBandas
        .selectAll<SVGPathElement, Contorno>('path')
        .data(contornos, (d) => d.value)
        .join('path')
        .attr('d', (c) => caminho(c as never))
        .attr('fill', (c) => cor(c.value))
        .attr('stroke', 'none');
    }

    calcularContornos(niveisAtual);
    redesenhar();
    estilarEixo(eixoXSel.call(axisBottom(x).ticks(6).tickSizeOuter(0)), theme, px);
    estilarEixo(eixoYSel.call(axisLeft(y).ticks(6).tickSizeOuter(0)), theme, px);

    // ------------------------------------------------------------- hover
    const overlay = g
      .append('rect')
      .attr('width', larguraUtil)
      .attr('height', alturaUtil)
      .attr('fill', 'transparent')
      .attr('data-interactive', '')
      .on('pointermove', (evento: PointerEvent) => {
        const [mx, my] = pointer(evento, g.node());
        // Do maior nível pro menor: a banda mais densa que contém o ponto é a
        // que está visualmente por cima nesse pixel.
        const ordenados = [...contornos].sort((a, b) => b.value - a.value);
        const achado = ordenados.find((c) => pontoDentro(mx, my, c));
        tooltip.show(
          achado
            ? `<strong>${x.invert(mx).toFixed(1)}, ${y.invert(my).toFixed(1)}</strong><br>densidade: nível ${
                contornos.indexOf(achado) + 1
              } de ${contornos.length}`
            : `<strong>${x.invert(mx).toFixed(1)}, ${y.invert(my).toFixed(1)}</strong><br>fora das bandas de contorno`,
          evento
        );
      })
      .on('pointerleave', () => tooltip.hide());

    // --------------------------------------------------------- controle
    const controles = select(root).append('div').attr('class', 'viz-slider');
    controles.append('span').attr('class', 'viz-slider-rotulo').text('Número de níveis');
    const saida = controles.append('output').text(String(niveisAtual));
    controles
      .append('input')
      .attr('type', 'range')
      .attr('min', 3)
      .attr('max', meta.niveisMax)
      .attr('step', 1)
      .attr('value', niveisAtual)
      .attr('data-interactive', '')
      .on('input', function () {
        niveisAtual = Number((this as HTMLInputElement).value);
        saida.text(String(niveisAtual));
        calcularContornos(niveisAtual);
        redesenhar();
        overlay.raise();
      });

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // ------------------------------------------------------------- entrada
    if (animate) {
      gBandas
        .selectAll<SVGPathElement, Contorno>('path')
        .attr('opacity', 0)
        .transition()
        .duration(DURATION.enter)
        .ease(EASE_STATE)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + 250, () => {
        gBandas.selectAll<SVGPathElement, Contorno>('path').interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
