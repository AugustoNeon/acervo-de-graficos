/**
 * Hexbin de dispersão: tempo de tela x horas de sono (1.500 pessoas).
 *
 * Primeiro gráfico de `correlation` que resolve OVERPLOTTING -- com 1.500
 * pontos brutos um scatter comum vira uma mancha sólida onde não dá mais
 * pra ver onde a densidade real está. O R exporta os 1.500 pontos crus
 * (nunca os hexágonos já agregados pelo `geom_hex()`) -- o D3 monta a
 * própria grade hexagonal e agrega sozinho, mesmo princípio de sempre
 * desta base.
 *
 * Agregação por "centro de hexágono mais próximo" (distância euclidiana):
 * pra uma grade hexagonal REGULAR, as células de Voronoi dos centros SÃO
 * exatamente os hexágonos -- não é uma aproximação, é o jeito mais simples
 * de fazer a atribuição sem reimplementar a matemática de coordenada axial
 * (arredondamento em coordenadas offset, ver `map/mapa-hexbin-avistamentos-
 * aves` -- lá a grade já vinha calculada pelo R, aqui o D3 monta a própria).
 */

import { select, scaleLinear, scaleSequential, interpolateGreens, axisBottom, axisLeft, max as d3max } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Ponto {
  tela: number;
  sono: number;
}

interface Dados {
  meta: { dominio: { telaMax: number; sonoMin: number; sonoMax: number } };
  pontos: Ponto[];
}

interface Hexagono {
  id: number;
  cx: number;
  cy: number;
  contagem: number;
}

const VB_W = 900;
const VB_H = 560;
const MARGEM = { topo: 20, dir: 28, baixo: 46, esq: 60 };
const HEX_COLUNAS_ALVO = 17;

/** Gera os centros de uma grade hexagonal "flat-top" cobrindo [0,larg]×[0,alt], com folga nas bordas. */
function gerarCentrosHex(larg: number, alt: number, r: number): { cx: number; cy: number }[] {
  const dx = 1.5 * r;
  const dy = Math.sqrt(3) * r;
  const centros: { cx: number; cy: number }[] = [];
  const colMin = -1;
  const colMax = Math.ceil(larg / dx) + 1;
  for (let col = colMin; col <= colMax; col++) {
    const cx = col * dx;
    const offsetY = col % 2 !== 0 ? dy / 2 : 0;
    const linMin = -1;
    const linMax = Math.ceil(alt / dy) + 1;
    for (let lin = linMin; lin <= linMax; lin++) {
      const cy = lin * dy + offsetY;
      if (cx > -r * 1.2 && cx < larg + r * 1.2 && cy > -r * 1.2 && cy < alt + r * 1.2) {
        centros.push({ cx, cy });
      }
    }
  }
  return centros;
}

/** Vértices de um hexágono "flat-top" (lado plano em cima/embaixo) de raio `r` centrado em (cx,cy). */
function caminhoHex(cx: number, cy: number, r: number): string {
  const angulos = [0, 60, 120, 180, 240, 300].map((g) => (g * Math.PI) / 180);
  return (
    'M' +
    angulos.map((a) => `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`).join('L') +
    'Z'
  );
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Hexbin de dispersão: relação entre tempo de tela diário e horas de sono por noite em 1.500 pessoas ' +
    'fictícias, agregadas em hexágonos coloridos por contagem para revelar a densidade sem sobreposição de pontos.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, pontos } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const x = scaleLinear().domain([0, meta.dominio.telaMax]).range([0, larguraUtil]);
    const y = scaleLinear().domain([meta.dominio.sonoMin, meta.dominio.sonoMax]).range([alturaUtil, 0]);

    const raioHex = larguraUtil / (HEX_COLUNAS_ALVO * 1.5);
    const centros = gerarCentrosHex(larguraUtil, alturaUtil, raioHex);

    // Atribui cada ponto ao centro mais próximo (varredura simples -- poucas
    // centenas de centros x 1.500 pontos, sem custo nenhum no navegador).
    const contagemPorIndice = new Array(centros.length).fill(0);
    pontos.forEach((p) => {
      const px2 = x(p.tela);
      const py2 = y(p.sono);
      let melhorIdx = 0;
      let melhorDist = Infinity;
      centros.forEach((c, i) => {
        const dist = (c.cx - px2) ** 2 + (c.cy - py2) ** 2;
        if (dist < melhorDist) {
          melhorDist = dist;
          melhorIdx = i;
        }
      });
      contagemPorIndice[melhorIdx]++;
    });

    const hexagonos: Hexagono[] = centros
      .map((c, i) => ({ id: i, cx: c.cx, cy: c.cy, contagem: contagemPorIndice[i] }))
      .filter((h) => h.contagem > 0);

    const maxContagem = d3max(hexagonos, (h) => h.contagem) ?? 1;
    const cor = scaleSequential(interpolateGreens).domain([0, maxContagem]);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const gEixoX = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    gEixoX.call(axisBottom(x).ticks(6).tickSizeOuter(0));
    estilarEixo(gEixoX, theme, px);
    g.append('text')
      .attr('x', larguraUtil / 2)
      .attr('y', alturaUtil + px(38))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .attr('fill', theme.inkMuted)
      .text('Tempo de tela por dia (horas)');

    const gEixoY = g.append('g');
    gEixoY.call(axisLeft(y).ticks(6).tickSizeOuter(0));
    estilarEixo(gEixoY, theme, px);
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -alturaUtil / 2)
      .attr('y', -px(44))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .attr('fill', theme.inkMuted)
      .text('Sono por noite (horas)');

    const gHex = g.append('g');
    const hexSel = gHex
      .selectAll<SVGPathElement, Hexagono>('path')
      .data(hexagonos, (d) => d.id)
      .join('path')
      .attr('data-interactive', '')
      .attr('d', (d) => caminhoHex(d.cx, d.cy, raioHex))
      .attr('fill', (d) => cor(d.contagem))
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(0.6));

    function mostrarTooltip(evento: PointerEvent, d: Hexagono) {
      tooltip.show(
        `<strong>${d.contagem} ${d.contagem === 1 ? 'pessoa' : 'pessoas'}</strong><br>` +
          `~${x.invert(d.cx).toFixed(1)}h de tela · ~${y.invert(d.cy).toFixed(1)}h de sono`,
        evento
      );
    }
    hexSel.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());

    function realcar(id: string) {
      hexSel.attr('opacity', (d) => (String(d.id) === id ? 1 : 0.3));
    }
    function limpar() {
      hexSel.attr('opacity', 1);
    }
    tornarFixavel(root, { selecao: hexSel, chaveDe: (d: Hexagono) => String(d.id) }, realcar, limpar);

    // --------------------------------------------------------------- legenda
    const gradienteId = `gradiente-hexbin-tela-sono-${Math.random().toString(36).slice(2, 8)}`;
    const defs = svg.append('defs');
    const N_PARADAS = 6;
    defs
      .append('linearGradient')
      .attr('id', gradienteId)
      .attr('x1', '0%')
      .attr('x2', '100%')
      .selectAll('stop')
      .data(Array.from({ length: N_PARADAS }, (_, i) => (i / (N_PARADAS - 1)) * maxContagem))
      .join('stop')
      .attr('offset', (_d, i) => `${(i / (N_PARADAS - 1)) * 100}%`)
      .attr('stop-color', (d) => cor(d));

    const legendaW = px(150);
    const gLegenda = svg.append('g').attr('transform', `translate(${VB_W - MARGEM.dir - legendaW},${px(14)})`);
    gLegenda
      .append('text')
      .attr('y', -px(6))
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(11))
      .attr('fill', theme.inkMuted)
      .text('Pessoas por hexágono');
    gLegenda
      .append('rect')
      .attr('width', legendaW)
      .attr('height', px(10))
      .attr('rx', px(2))
      .attr('fill', `url(#${gradienteId})`)
      .attr('stroke', theme.border)
      .attr('stroke-width', px(0.6));
    gLegenda
      .append('text')
      .attr('x', 0)
      .attr('y', px(24))
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(10))
      .attr('fill', theme.inkMuted)
      .text('0');
    gLegenda
      .append('text')
      .attr('x', legendaW)
      .attr('y', px(24))
      .attr('text-anchor', 'end')
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(10))
      .attr('fill', theme.inkMuted)
      .text(maxContagem);

    if (animate) {
      hexSel
        .attr('opacity', 0)
        .transition()
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + 250, () => {
        hexSel.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
