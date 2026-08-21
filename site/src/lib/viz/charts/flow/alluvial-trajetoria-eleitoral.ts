/**
 * Diagrama aluvial (trajetória de voto) — versão em D3.
 *
 * Um diagrama aluvial de eixos discretos é, por baixo dos panos, um Sankey em
 * várias colunas: cada "lode" (grupo de eleitores que passou pela mesma
 * sequência de blocos) vira um trecho por par de eleições consecutivas —
 * mesmo motor (`d3-sankey`) já usado no Sankey deste acervo, só que com 3
 * colunas em vez de 2 e um `lode` em comum entre os dois trechos de uma mesma
 * sequência. O script.R só exporta nós (bloco × eleição, já com a cor do
 * próprio bloco) e trechos (com a cor do bloco de origem em 2016) — a posição
 * de cada nó na coluna e a espessura de cada trecho são recalculadas aqui.
 *
 * Diferença do Sankey já existente no acervo: passar o cursor num trecho
 * acompanha o MESMO grupo de eleitores pelas três eleições (os dois trechos
 * do lode, mais os três nós que ele atravessa) — não só o par origem/destino
 * daquele trecho isolado.
 */

import { select } from 'd3';
import { sankey, sankeyLinkHorizontal, type SankeyNode, type SankeyLink } from 'd3-sankey';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface No {
  id: string;
  bloco: string;
  eleicao: string;
  cor: string;
}

interface Trecho {
  lode: number;
  origem: string;
  destino: string;
  valor: number;
  cor: string;
}

interface Coluna {
  id: string;
  rotulo: string;
}

interface Dados {
  meta: { nota?: string };
  colunas: Coluna[];
  nos: No[];
  trechos: Trecho[];
}

type LinkExtra = { lode: number; cor: string };
type NoSankey = SankeyNode<No, LinkExtra>;
type LinkSankey = SankeyLink<No, LinkExtra>;

const VB_W = 900;
const VB_H = 540;
const MARGEM_INFERIOR = 34;
const OPACIDADE_LINK = 0.55;
const OPACIDADE_LINK_APAGADO = 0.06;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label: 'Diagrama aluvial de trajetória de voto: o mesmo grupo de eleitores acompanhado em três eleições seguidas, entre quatro blocos.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, colunas, nos, trechos } = data as Dados;

    const gerarSankey = sankey<No, LinkExtra>()
      .nodeId((d) => d.id)
      .nodeWidth(16)
      .nodePadding(12)
      .extent([
        [1, 6],
        [VB_W - 1, VB_H - MARGEM_INFERIOR],
      ]);

    const { nodes, links } = gerarSankey({
      nodes: nos.map((d) => ({ ...d })),
      links: trechos.map((t) => ({
        source: t.origem,
        target: t.destino,
        value: t.valor,
        lode: t.lode,
        cor: t.cor,
      })),
    });
    // Apos o layout, source/target de cada link sempre viram o objeto do no
    // (nunca sobra string/indice) -- os casts abaixo so contornam o tipo da
    // lib, que ainda permite `number | string` por causa da API de entrada.

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    const corDoNo = (n: NoSankey) => n.cor ?? theme.accent;
    const caminhoLink = sankeyLinkHorizontal<NoSankey, LinkSankey>();

    // -------------------------------------------------------- indices de realce
    const vizinhosNo = new Map<string, Set<LinkSankey>>();
    const registrar = (id: string, l: LinkSankey) => {
      if (!vizinhosNo.has(id)) vizinhosNo.set(id, new Set());
      vizinhosNo.get(id)!.add(l);
    };
    const linksPorLode = new Map<number, LinkSankey[]>();
    links.forEach((l) => {
      registrar((l.source as NoSankey).id, l);
      registrar((l.target as NoSankey).id, l);
      const arr = linksPorLode.get(l.lode) ?? [];
      arr.push(l);
      linksPorLode.set(l.lode, arr);
    });

    const totalDoNo = (n: NoSankey) => {
      const entrando = links
        .filter((l) => (l.target as NoSankey).id === n.id)
        .reduce((soma, l) => soma + (l.value ?? 0), 0);
      if (entrando > 0) return entrando;
      return links
        .filter((l) => (l.source as NoSankey).id === n.id)
        .reduce((soma, l) => soma + (l.value ?? 0), 0);
    };

    // ------------------------------------------------------------------ desenho
    const camadaLinks = svg.append('g').attr('fill', 'none');
    const linksSel = camadaLinks
      .selectAll<SVGPathElement, LinkSankey>('path')
      .data(links)
      .join('path')
      .attr('d', caminhoLink)
      .attr('stroke', (d) => d.cor ?? theme.accent)
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
      .attr('stroke', theme.ink)
      .attr('stroke-opacity', 0.35)
      .attr('rx', px(2));

    const rotulos = noG
      .append('text')
      .attr('x', (d) => ((d.x1 ?? 0) - (d.x0 ?? 0)) / 2)
      .attr('y', (d) => ((d.y1 ?? 0) - (d.y0 ?? 0)) / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 600)
      .attr('font-size', px(12))
      .attr('fill', theme.ink)
      .attr('paint-order', 'stroke')
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(3))
      .text((d) => d.bloco);

    // Cabecalho de coluna (nome da eleicao), abaixo do grafico -- centro de
    // cada coluna calculado a partir dos proprios nos, nao fixo, pra
    // continuar certo se o layout mudar.
    const centroColuna = new Map<string, number>();
    colunas.forEach((c) => {
      const dessaColuna = nodes.filter((n) => n.eleicao === c.id);
      if (dessaColuna.length === 0) return;
      const soma = dessaColuna.reduce((s, n) => s + ((n.x0 ?? 0) + (n.x1 ?? 0)) / 2, 0);
      centroColuna.set(c.id, soma / dessaColuna.length);
    });

    svg
      .append('g')
      .selectAll('text')
      .data(colunas)
      .join('text')
      .attr('x', (d) => centroColuna.get(d.id) ?? 0)
      .attr('y', VB_H - 12)
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(13))
      .attr('fill', theme.inkMuted)
      .text((d) => d.rotulo);

    // -------------------------------------------------------------- interacao
    const realcar = (chave: string | null) => {
      let nosTocados: Set<string> | null = null;
      let linksTocados: Set<LinkSankey> | null = null;

      if (chave?.startsWith('no:')) {
        const id = chave.slice(3);
        linksTocados = vizinhosNo.get(id) ?? new Set();
        nosTocados = new Set<string>([id]);
        linksTocados.forEach((l) => {
          nosTocados!.add((l.source as NoSankey).id);
          nosTocados!.add((l.target as NoSankey).id);
        });
      } else if (chave?.startsWith('lode:')) {
        const lode = Number(chave.slice(5));
        const ls = linksPorLode.get(lode) ?? [];
        linksTocados = new Set(ls);
        nosTocados = new Set<string>();
        ls.forEach((l) => {
          nosTocados!.add((l.source as NoSankey).id);
          nosTocados!.add((l.target as NoSankey).id);
        });
      }

      linksSel
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('stroke-opacity', (d) =>
          linksTocados === null ? OPACIDADE_LINK : linksTocados.has(d) ? 0.9 : OPACIDADE_LINK_APAGADO
        );

      retangulos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('stroke-width', (d) => (nosTocados?.has(d.id) ? px(2.5) : px(1)))
        .attr('stroke-opacity', (d) => (nosTocados === null || nosTocados.has(d.id) ? 0.9 : 0.25))
        .attr('opacity', (d) => (nosTocados === null || nosTocados.has(d.id) ? 1 : 0.4));

      rotulos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('opacity', (d) => (nosTocados === null || nosTocados.has(d.id) ? 1 : 0.4));
    };

    const tooltipNo = (d: NoSankey) => {
      const coluna = colunas.find((c) => c.id === d.eleicao);
      return `<strong>${d.bloco}</strong> — ${coluna?.rotulo ?? d.eleicao}<br>${totalDoNo(d)} eleitores`;
    };

    const tooltipLink = (d: LinkSankey) => {
      const origem = d.source as NoSankey;
      const destino = d.target as NoSankey;
      return `${origem.bloco} (${origem.eleicao}) &rarr; ${destino.bloco} (${destino.eleicao})<br><strong>${d.value}</strong> eleitores`;
    };

    noG
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(tooltipNo(d), evento))
      .on('pointerleave', () => tooltip.hide());

    linksSel
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(tooltipLink(d), evento))
      .on('pointerleave', () => tooltip.hide());

    tornarFixavel(
      root,
      [
        { selecao: noG, chaveDe: (d: NoSankey) => `no:${d.id}` },
        { selecao: linksSel, chaveDe: (d: LinkSankey) => `lode:${d.lode}` },
      ],
      realcar,
      () => realcar(null)
    );

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // Nos entram primeiro, coluna a coluna (da esquerda pra direita); os
    // trechos desenham por cima depois, crescendo em opacidade -- ve-los
    // "encher" acompanha a leitura natural do diagrama, mesmo padrao do
    // Sankey deste acervo.
    if (animate) {
      retangulos
        .attr('transform', 'scale(0,1)')
        .attr('transform-origin', '0 0')
        .transition()
        .delay((d) => stagger(colunas.findIndex((c) => c.id === d.eleicao), colunas.length, 260))
        .duration(DURATION.base)
        .ease(EASE_ENTER)
        .attr('transform', 'scale(1,1)');

      rotulos.attr('opacity', 0).transition().delay(240).duration(DURATION.base).attr('opacity', 1);

      linksSel
        .attr('stroke-opacity', 0)
        .transition()
        .delay((_d, i) => 360 + stagger(i, links.length, 260))
        .duration(DURATION.base)
        .attr('stroke-opacity', OPACIDADE_LINK);

      garantirEstadoFinal(360 + DURATION.base + 260 + 250, () => {
        retangulos.interrupt().attr('transform', 'scale(1,1)');
        rotulos.interrupt().attr('opacity', 1);
        linksSel.interrupt().attr('stroke-opacity', OPACIDADE_LINK);
      });
    }
  },
};

export default chart;
