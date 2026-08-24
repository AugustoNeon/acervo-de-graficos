/**
 * Mapa coroplético: acesso à internet banda larga por estado — versão D3.
 *
 * Mesma técnica do painel de mapa do dashboard mapa+dispersão+barras deste
 * acervo (`d3-geo`: `geoMercator` ajustado ao território + `geoPath`,
 * GeoJSON exportado do `sf` e corrigido com `corrigirEnrolamento()`), agora
 * como gráfico único (não painel de dashboard) e com rótulo de sigla
 * desenhado no centroide de cada estado.
 *
 * O que a imagem não dá: passar o cursor mostra o percentual exato, e a
 * fatia sob o cursor ganha um contorno mais grosso pra se destacar.
 */

import { select, geoMercator, geoPath, scaleSequential, interpolatePuBu } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { corrigirEnrolamento, type GeoFeatureCollection } from '../../shared/mapa';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Propriedades {
  nome: string;
  sigla: string;
  lat_rotulo: number;
  lon_rotulo: number;
  regiao: string;
  internet_banda_larga: number;
}

interface Feature {
  type: 'Feature';
  properties: Propriedades;
  geometry: unknown;
}

interface FeatureCollection extends GeoFeatureCollection {
  features: Feature[];
}

interface Dados {
  meta: { paleta: string; dominio: [number, number]; nota?: string };
  mapa: FeatureCollection;
}

const VB_W = 760;
const VB_H = 760;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label: 'Mapa coroplético do Brasil: percentual fictício de domicílios com internet banda larga, por estado.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, mapa } = data as Dados;
    corrigirEnrolamento(mapa);
    const estados = mapa.features;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const cor = scaleSequential(interpolatePuBu).domain(meta.dominio);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');

    const projecao = geoMercator().fitSize([VB_W - px(16), VB_H - px(16)], mapa as never);
    const caminho = geoPath(projecao);

    const g = svg.append('g').attr('transform', `translate(${px(8)},${px(8)})`);

    const estadosSel = g
      .selectAll<SVGPathElement, Feature>('path')
      .data(estados)
      .join('path')
      .attr('d', (d) => caminho(d as never))
      .attr('fill', (d) => cor(d.properties.internet_banda_larga))
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1))
      .attr('data-interactive', '');

    const rotulos = g
      .append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .selectAll<SVGTextElement, Feature>('text')
      .data(estados)
      .join('text')
      .attr('transform', (d) => {
        const p = projecao([d.properties.lon_rotulo, d.properties.lat_rotulo]);
        return p ? `translate(${p[0]},${p[1]})` : '';
      })
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('font-size', px(10))
      .attr('fill', theme.ink)
      .text((d) => d.properties.sigla);

    // -------------------------------------------------------------- interacao
    const conteudoTooltip = (d: Feature) =>
      `<strong>${d.properties.nome}</strong><br>${d.properties.internet_banda_larga.toFixed(1)}% dos domicílios com banda larga`;

    estadosSel
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(conteudoTooltip(d), evento))
      .on('pointerleave', () => tooltip.hide());

    tornarFixavel(
      root,
      { selecao: estadosSel, chaveDe: (d) => d.properties.sigla },
      (sigla) =>
        estadosSel
          .transition()
          .duration(DURATION.fast)
          .ease(EASE_STATE)
          .attr('stroke', (d) => (d.properties.sigla === sigla ? theme.ink : theme.bg))
          .attr('stroke-width', (d) => px(d.properties.sigla === sigla ? 2.5 : 1)),
      () => estadosSel.transition().duration(DURATION.fast).ease(EASE_STATE).attr('stroke', theme.bg).attr('stroke-width', px(1))
    );

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // Estados aparecem em sequencia (norte a sul, na ordem que vieram do R),
    // crescendo de opacidade -- suficiente pra um mapa coropletico, sem
    // precisar de nenhuma geometria intermediaria pra animar.
    if (animate) {
      estadosSel
        .attr('opacity', 0)
        .transition()
        .delay((_d, i) => stagger(i, estados.length, 500))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('opacity', 1);

      rotulos
        .attr('opacity', 0)
        .transition()
        .delay(DURATION.enter * 0.7)
        .duration(DURATION.base)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + stagger(estados.length - 1, estados.length, 500) + 100, () => {
        estadosSel.interrupt().attr('opacity', 1);
        rotulos.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
