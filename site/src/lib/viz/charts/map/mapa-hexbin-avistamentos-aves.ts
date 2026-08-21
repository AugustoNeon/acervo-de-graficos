/**
 * Mapa hexagonal de densidade (hexbin map) — versão em D3.
 *
 * Ao contrário dos outros gráficos de `map` deste acervo (bolhas por
 * coordenada, rotas de conexão, país pintado por indicador), este binna uma
 * NUVEM DE PONTOS brutos (lat/lon de avistamentos individuais) em células
 * hexagonais e colore cada uma pela contagem — a técnica de densidade
 * geográfica quando o dado é "um evento, um ponto" em vez de "um valor por
 * região already agregado".
 *
 * A MESMA célula hexagonal que o `ggplot2::geom_hex()` calculou é reaproveitada
 * aqui — `ggplot_build(p)$data[[2]]` dá o centro/contagem/cor já resolvidos, e
 * `hexbin::hexcoords()` dá os 6 vértices (deslocamento do centro) de UM
 * hexágono, iguais pra todas as células. O D3 só projeta lon/lat pra pixel
 * (a mesma correção de aspecto do `coord_quickmap()`) e desenha os hexágonos
 * nesses pontos — nenhum binning novo acontece aqui, então a versão
 * interativa não pode divergir da estática por construção.
 */

import { select } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface PontoContorno {
  long: number;
  lat: number;
  group: number;
}

interface Hexagono {
  x: number;
  y: number;
  contagem: number;
  cor: string;
}

interface Offset {
  x: number;
  y: number;
}

interface Dados {
  meta: { nota?: string };
  brasil: Record<string, PontoContorno[]>;
  hexagonos: Hexagono[];
  offsetsHexagono: Offset[];
}

const VB_W = 760;
const PAD_GRAUS = 1;
const ALTURA_LEGENDA = 64;

const chart: VizChart = {
  aspectRatio: 0.92,
  label: 'Mapa hexagonal de densidade: avistamentos de aves migratórias reportados no Brasil, agregados por célula geográfica.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, brasil, hexagonos, offsetsHexagono } = data as Dados;
    const contornos = Object.values(brasil);

    const lons = contornos.flatMap((poly) => poly.map((p) => p.long));
    const lats = contornos.flatMap((poly) => poly.map((p) => p.lat));
    const lonMin = Math.min(...lons) - PAD_GRAUS;
    const lonMax = Math.max(...lons) + PAD_GRAUS;
    const latMin = Math.min(...lats) - PAD_GRAUS;
    const latMax = Math.max(...lats) + PAD_GRAUS;

    // Mesma correção do coord_quickmap() do ggplot2: 1 grau de longitude vale
    // cos(lat média) vezes 1 grau de latitude em distância real -- sem isso o
    // contorno do Brasil sairia esticado/achatado em relação ao estático.
    const correcao = Math.cos(((latMin + latMax) / 2) * (Math.PI / 180));
    const pxPorGrauLon = VB_W / (lonMax - lonMin);
    const pxPorGrauLat = pxPorGrauLon / correcao;
    const VB_H = (latMax - latMin) * pxPorGrauLat + ALTURA_LEGENDA;

    const x = (lon: number) => (lon - lonMin) * pxPorGrauLon;
    const y = (lat: number) => (latMax - lat) * pxPorGrauLat;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    // ------------------------------------------------------------- contorno
    const gContorno = svg.append('g');
    contornos.forEach((poly) => {
      const d = poly.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.long)},${y(p.lat)}`).join('') + 'Z';
      gContorno
        .append('path')
        .attr('d', d)
        .attr('fill', theme.surface)
        .attr('stroke', theme.border)
        .attr('stroke-width', px(0.6));
    });

    // ------------------------------------------------------------ hexagonos
    const caminhoHex = (h: Hexagono) =>
      offsetsHexagono.map((o, i) => `${i === 0 ? 'M' : 'L'}${x(h.x + o.x)},${y(h.y + o.y)}`).join('') + 'Z';

    const gHex = svg.append('g');
    const hexSel = gHex
      .selectAll<SVGPathElement, Hexagono>('path')
      .data(hexagonos)
      .join('path')
      .attr('d', caminhoHex)
      .attr('fill', (d) => d.cor)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(0.8))
      .attr('data-interactive', '');

    // --------------------------------------------------------------- legenda
    const contagens = hexagonos.map((h) => h.contagem).sort((a, b) => a - b);
    const porOrdemDeContagem = [...hexagonos].sort((a, b) => a.contagem - b.contagem);
    const N_PARADAS = 6;
    const paradas = Array.from({ length: N_PARADAS }, (_, i) => {
      const idx = Math.round((i * (porOrdemDeContagem.length - 1)) / (N_PARADAS - 1));
      return porOrdemDeContagem[idx];
    });

    const gradienteId = 'gradiente-hexbin-aves';
    const defs = svg.append('defs');
    defs
      .append('linearGradient')
      .attr('id', gradienteId)
      .attr('x1', '0%')
      .attr('x2', '100%')
      .selectAll('stop')
      .data(paradas)
      .join('stop')
      .attr('offset', (_d, i) => `${(i / (N_PARADAS - 1)) * 100}%`)
      .attr('stop-color', (d) => d.cor);

    const legendaW = 160;
    const legendaX = VB_W - legendaW - 16;
    const legendaY = VB_H - ALTURA_LEGENDA + 26;

    const gLegenda = svg.append('g').attr('transform', `translate(${legendaX},${legendaY})`);
    gLegenda
      .append('text')
      .attr('y', -8)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .attr('fill', theme.ink)
      .text('Avistamentos por célula');

    gLegenda
      .append('rect')
      .attr('width', legendaW)
      .attr('height', px(12))
      .attr('rx', px(2))
      .attr('fill', `url(#${gradienteId})`)
      .attr('stroke', theme.border)
      .attr('stroke-width', px(0.6));

    gLegenda
      .append('text')
      .attr('x', 0)
      .attr('y', px(28))
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(10.5))
      .attr('fill', theme.inkMuted)
      .text(contagens[0]);

    gLegenda
      .append('text')
      .attr('x', legendaW)
      .attr('y', px(28))
      .attr('text-anchor', 'end')
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(10.5))
      .attr('fill', theme.inkMuted)
      .text(contagens[contagens.length - 1]);

    // -------------------------------------------------------------- interacao
    const realcar = (chave: string | null) => {
      hexSel
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('stroke', (d) => (chave !== null && String(hexagonos.indexOf(d)) === chave ? theme.ink : theme.bg))
        .attr('stroke-width', (d) => px(chave !== null && String(hexagonos.indexOf(d)) === chave ? 2.2 : 0.8));
    };

    hexSel
      .on('pointermove', (evento: PointerEvent, d) => {
        tooltip.show(`<strong>${d.contagem}</strong> avistamento${d.contagem === 1 ? '' : 's'}`, evento);
      })
      .on('pointerleave', () => tooltip.hide());

    tornarFixavel(
      root,
      { selecao: hexSel, chaveDe: (d: Hexagono) => String(hexagonos.indexOf(d)) },
      realcar,
      () => realcar(null)
    );

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // Contorno aparece primeiro (fundo geográfico), os hexágonos entram por
    // cima crescendo do centro pra fora, em leve cascata -- acompanha a
    // leitura "primeiro o mapa, depois os dados sobre ele".
    if (animate) {
      gContorno.attr('opacity', 0).transition().duration(DURATION.base).attr('opacity', 1);

      hexSel
        .attr('transform', (d) => `translate(${x(d.x)},${y(d.y)}) scale(0) translate(${-x(d.x)},${-y(d.y)})`)
        .transition()
        .delay((_d, i) => 220 + stagger(i, hexagonos.length, 520))
        .duration(DURATION.base)
        .ease(EASE_ENTER)
        .attr('transform', (d) => `translate(${x(d.x)},${y(d.y)}) scale(1) translate(${-x(d.x)},${-y(d.y)})`);

      garantirEstadoFinal(220 + 520 + DURATION.base + 250, () => {
        gContorno.interrupt().attr('opacity', 1);
        hexSel.interrupt().attr('transform', null);
      });
    }
  },
};

export default chart;
