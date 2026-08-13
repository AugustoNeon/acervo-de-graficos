/**
 * Sankey simplificado — versão em D3.
 *
 * Antes um widget `networkD3::sankeyNetwork()` em `<iframe>`; agora um
 * módulo comum do runtime, usando `d3-sankey` (o mesmo algoritmo de layout
 * que o `networkD3` usa por baixo dos panos, só que direto, sem o widget em
 * volta). O script.R só exporta nós/fluxos pelo nome e a cor de cada nó — a
 * posição de cada nó na coluna e a espessura de cada fluxo são calculadas
 * aqui.
 */

import { select } from 'd3';
import { sankey, sankeyLinkHorizontal, type SankeyNode, type SankeyLink } from 'd3-sankey';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface No {
  name: string;
  cor: string;
}

interface Fluxo {
  origem: string;
  destino: string;
  valor: number;
}

interface Dados {
  meta: { nota?: string };
  nos: No[];
  fluxos: Fluxo[];
}

type NoSankey = SankeyNode<No, {}>;
type LinkSankey = SankeyLink<No, {}>;

const VB_W = 900;
const VB_H = 480;
const OPACIDADE_LINK = 0.45;
const OPACIDADE_LINK_APAGADO = 0.06;

const chart: VizChart = {
  aspectRatio: 1.85,
  label: 'Sankey de fluxo em 3 estágios: 3 fontes, 3 canais e 2 resultados, com a espessura do fluxo proporcional ao valor.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, nos, fluxos } = data as Dados;

    const gerarSankey = sankey<No, {}>()
      .nodeId((d) => d.name)
      .nodeWidth(18)
      .nodePadding(14)
      .extent([
        [1, 6],
        [VB_W - 1, VB_H - 6],
      ]);

    const { nodes, links } = gerarSankey({
      nodes: nos.map((d) => ({ ...d })),
      links: fluxos.map((f) => ({ source: f.origem, target: f.destino, value: f.valor })),
    });

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    const corDoNo = (n: NoSankey) => n.cor ?? theme.accent;

    const caminhoLink = sankeyLinkHorizontal<NoSankey, LinkSankey>();

    const vizinhos = new Map<string, Set<LinkSankey>>();
    const registrar = (nome: string, l: LinkSankey) => {
      if (!vizinhos.has(nome)) vizinhos.set(nome, new Set());
      vizinhos.get(nome)!.add(l);
    };
    links.forEach((l) => {
      registrar((l.source as NoSankey).name, l);
      registrar((l.target as NoSankey).name, l);
    });
    // Apos o layout, source/target sempre viram o objeto do no (nunca
    // sobra string/indice) -- o cast acima so contorna o tipo da lib, que
    // ainda permite `number | string` por causa da API de entrada.

    const camadaLinks = svg.append('g').attr('fill', 'none');
    const linksSel = camadaLinks
      .selectAll<SVGPathElement, LinkSankey>('path')
      .data(links)
      .join('path')
      .attr('d', caminhoLink)
      .attr('stroke', (d) => corDoNo(d.source as NoSankey))
      .attr('stroke-width', (d) => Math.max(1, d.width ?? 1))
      .attr('stroke-opacity', OPACIDADE_LINK)
      .attr('data-interactive', '');

    const camadaNos = svg.append('g');
    const noG = camadaNos
      .selectAll<SVGGElement, NoSankey>('g')
      .data(nodes)
      .join('g')
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`)
      .attr('data-interactive', '');

    const retangulos = noG
      .append('rect')
      .attr('width', (d) => (d.x1 ?? 0) - (d.x0 ?? 0))
      .attr('height', (d) => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
      .attr('fill', corDoNo)
      .attr('rx', px(2));

    const rotulos = noG
      .append('text')
      .attr('y', (d) => ((d.y1 ?? 0) - (d.y0 ?? 0)) / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(13))
      .attr('fill', theme.ink)
      .attr('x', (d) => ((d.x0 ?? 0) < VB_W / 2 ? (d.x1 ?? 0) - (d.x0 ?? 0) + px(8) : -px(8)))
      .attr('text-anchor', (d) => ((d.x0 ?? 0) < VB_W / 2 ? 'start' : 'end'))
      .text((d) => d.name);

    // -------------------------------------------------------------- interacao
    const realcar = (nome: string | null) => {
      const tocados = nome ? vizinhos.get(nome) ?? new Set() : null;

      linksSel
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('stroke-opacity', (d) =>
          tocados === null ? OPACIDADE_LINK : tocados.has(d) ? 0.85 : OPACIDADE_LINK_APAGADO
        );

      rotulos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('opacity', (d) => {
          const n = d.name;
          if (!nome) return 1;
          if (n === nome) return 1;
          const ligado = [...(tocados ?? [])].some(
            (l) => (l.source as NoSankey).name === n || (l.target as NoSankey).name === n
          );
          return ligado ? 1 : 0.35;
        });
    };

    const tooltipNo = (d: NoSankey) => {
      const total = [...(vizinhos.get(d.name) ?? [])].reduce(
        (soma, l) => soma + (l.source === d || l.target === d ? l.value ?? 0 : 0),
        0
      );
      return `<strong>${d.name}</strong><br>${total} no total`;
    };

    noG
      .on('pointerenter', (evento: PointerEvent, d) => {
        realcar(d.name);
        tooltip.show(tooltipNo(d), evento);
      })
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(tooltipNo(d), evento))
      .on('pointerleave', () => {
        realcar(null);
        tooltip.hide();
      });

    linksSel
      .on('pointerenter', (evento: PointerEvent, d) => {
        realcar((d.source as NoSankey).name);
        const origem = (d.source as NoSankey).name;
        const destino = (d.target as NoSankey).name;
        tooltip.show(`${origem} &rarr; ${destino}<br><strong>${d.value}</strong>`, evento);
      })
      .on('pointermove', (evento: PointerEvent, d) => {
        const origem = (d.source as NoSankey).name;
        const destino = (d.target as NoSankey).name;
        tooltip.show(`${origem} &rarr; ${destino}<br><strong>${d.value}</strong>`, evento);
      })
      .on('pointerleave', () => {
        realcar(null);
        tooltip.hide();
      });

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // Nos entram primeiro (da esquerda pra direita); os fluxos desenham por
    // cima depois, crescendo em opacidade -- ve-los "encher" da fonte ate o
    // resultado acompanha a leitura natural do diagrama.
    if (animate) {
      retangulos
        .attr('transform', 'scale(0,1)')
        .attr('transform-origin', '0 0')
        .transition()
        .delay((_d, i) => stagger(i, nodes.length, 280))
        .duration(DURATION.base)
        .ease(EASE_ENTER)
        .attr('transform', 'scale(1,1)');

      rotulos.attr('opacity', 0).transition().delay(260).duration(DURATION.base).attr('opacity', 1);

      linksSel
        .attr('stroke-opacity', 0)
        .transition()
        .delay((_d, i) => 380 + stagger(i, links.length, 280))
        .duration(DURATION.base)
        .attr('stroke-opacity', OPACIDADE_LINK);

      garantirEstadoFinal(380 + DURATION.base + 280 + 250, () => {
        retangulos.interrupt().attr('transform', 'scale(1,1)');
        rotulos.interrupt().attr('opacity', 1);
        linksSel.interrupt().attr('stroke-opacity', OPACIDADE_LINK);
      });
    }
  },
};

export default chart;
