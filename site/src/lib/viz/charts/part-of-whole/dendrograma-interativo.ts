/**
 * Dendrograma interativo colapsável — versão em D3.
 *
 * Substitui o widget `collapsibleTree` (D3 v3, empacotado pelo htmlwidgets)
 * por um módulo desenhado no próprio runtime do site. Igual ao widget
 * antigo, começa fechado — só a raiz e o primeiro nível aparecem — e cada nó
 * com filhos pode ser clicado pra abrir/fechar.
 *
 * Sem paleta por nível de propósito: é a mesma exceção do `script.R` (dataset
 * e estilo mantidos simples, sem cor por profundidade).
 */

import { select, hierarchy, tree, linkHorizontal, type HierarchyNode, type Selection } from 'd3';
import { DURATION, EASE_STATE, garantirEstadoFinal } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface No {
  nome: string;
  filhos?: No[];
  lotes?: number;
}

interface Dados {
  meta: { nota?: string };
  arvore: No;
}

type Ponto = HierarchyNode<No> & {
  id: string;
  x: number;
  y: number;
  x0?: number;
  y0?: number;
  children?: Ponto[];
  _children?: Ponto[];
};

/** Distância vertical entre irmãos e horizontal entre níveis, em unidades do viewBox. */
const ALTURA_LINHA = 26;
const LARGURA_NIVEL = 150;
const MARGEM = 20;

const chart: VizChart = {
  aspectRatio: 2.4,
  label:
    'Dendrograma interativo do dataset warpbreaks: tipo de lã, nível de tensão e valores de ' +
    'quebra do fio, expansível por clique.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, arvore } = data as Dados;

    const raiz = hierarchy<No>(arvore, (d) => d.filhos) as Ponto;
    raiz.x0 = 0;
    raiz.y0 = 0;

    // Chave estavel por no, atribuida uma unica vez -- necessaria pro join
    // reconhecer o mesmo no entre chamadas de atualizar(). Usar o proprio
    // objeto como chave NAO funciona: o d3 converte a chave via `+ ""`
    // internamente, e todo objeto vira a mesma string "[object Object]",
    // colidindo e duplicando os nos a cada clique.
    let proximoId = 0;
    raiz.each((d) => {
      (d as Ponto).id = String(++proximoId);
    });

    const colapsarTudo = (d: Ponto) => {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(colapsarTudo);
        d.children = undefined;
      }
    };
    // Comeca fechado: so a raiz e o primeiro nivel visiveis, mesmo estado
    // inicial do widget antigo (ver output.png).
    raiz.children?.forEach(colapsarTudo);

    const svg = select(root).append('svg').attr('aria-hidden', 'true');
    const camadaLinks = svg
      .append('g')
      .attr('fill', 'none')
      .attr('stroke', theme.border)
      .attr('stroke-width', 1.5);
    const camadaNos = svg.append('g');

    const linkGen = linkHorizontal<unknown, Ponto>()
      .x((d) => d.y)
      .y((d) => d.x);

    const rotuloTooltip = (d: Ponto): string => {
      if (!d.children && !d._children) {
        return `<strong>${d.data.nome} quebras</strong><br>${d.data.lotes} lote(s)`;
      }
      const folhas = d.leaves().length;
      return `<strong>${d.data.nome}</strong><br>${folhas} valor(es) de quebra`;
    };

    const aplicar = <E extends Element, D>(sel: Selection<E, D, any, any>, transicionar: boolean) =>
      transicionar ? sel.transition().duration(DURATION.base).ease(EASE_STATE) : sel;

    let escala = 1;
    const px = (v: number) => v * escala;

    function atualizar(source: Ponto, transicionar: boolean) {
      const layout = tree<No>().nodeSize([ALTURA_LINHA, LARGURA_NIVEL]);
      layout(raiz);

      const nos = raiz.descendants() as Ponto[];
      const links = raiz.links() as { source: Ponto; target: Ponto }[];

      let minX = Infinity;
      let maxX = -Infinity;
      let maxY = 0;
      nos.forEach((d) => {
        minX = Math.min(minX, d.x);
        maxX = Math.max(maxX, d.x);
        maxY = Math.max(maxY, d.y);
      });
      const vbW = maxY + LARGURA_NIVEL + MARGEM;
      const vbH = maxX - minX + ALTURA_LINHA + MARGEM * 2;
      svg.attr('viewBox', `${-MARGEM} ${minX - MARGEM} ${vbW} ${vbH}`);
      escala = vbW / Math.max(width, 1);

      // -------------------------------------------------------------- links
      const linkSel = camadaLinks
        .selectAll<SVGPathElement, { source: Ponto; target: Ponto }>('path')
        .data(links, (d) => d.target.id);

      const origemLink = { x: source.x0 ?? source.x, y: source.y0 ?? source.y } as Ponto;

      const linkEnter = linkSel
        .enter()
        .append('path')
        .attr('d', () => linkGen({ source: origemLink, target: origemLink }));

      aplicar(linkEnter.merge(linkSel), transicionar)
        .attr('d', linkGen)
        .attr('stroke-width', px(1.5));

      aplicar(linkSel.exit(), transicionar)
        .attr('d', () => linkGen({ source, target: source }))
        .remove();

      // --------------------------------------------------------------- nos
      const nodeSel = camadaNos.selectAll<SVGGElement, Ponto>('g.no').data(nos, (d) => d.id);

      const nodeEnter = nodeSel
        .enter()
        .append('g')
        .attr('class', 'no')
        .attr('transform', `translate(${origemLink.y},${origemLink.x})`)
        .style('cursor', (d) => (d.children || d._children ? 'pointer' : 'default'))
        .attr('data-interactive', (d) => (d.children || d._children ? '' : null))
        .on('click', (_evento: PointerEvent, d: Ponto) => {
          if (!d.children && !d._children) return;
          if (d.children) {
            d._children = d.children;
            d.children = undefined;
          } else {
            d.children = d._children;
            d._children = undefined;
          }
          atualizar(d, true);
        })
        .on('pointerenter', (evento: PointerEvent, d: Ponto) => tooltip.show(rotuloTooltip(d), evento))
        .on('pointermove', (evento: PointerEvent, d: Ponto) => tooltip.show(rotuloTooltip(d), evento))
        .on('pointerleave', () => tooltip.hide());

      nodeEnter.append('circle').attr('r', 1e-6);
      nodeEnter
        .append('text')
        .attr('dy', '0.32em')
        .attr('fill', theme.ink)
        .attr('font-family', theme.fontBody)
        .attr('paint-order', 'stroke')
        .attr('stroke', theme.bg)
        .style('opacity', 0);

      const nodeMerge = nodeEnter.merge(nodeSel);
      aplicar(nodeMerge, transicionar).attr('transform', (d) => `translate(${d.y},${d.x})`);

      nodeMerge
        .select<SVGCircleElement>('circle')
        .attr('fill', (d) => (d._children ? theme.primary : theme.bg))
        .attr('stroke', theme.primary)
        .call((sel) =>
          aplicar(sel, transicionar)
            .attr('r', (d) => px(d._children ? 6 : d.children ? 5 : 3.5))
            .attr('stroke-width', px(1.5))
        );

      nodeMerge
        .select<SVGTextElement>('text')
        .attr('x', (d) => (d.children || d._children ? -px(10) : px(10)))
        .attr('text-anchor', (d) => (d.children || d._children ? 'end' : 'start'))
        .attr('font-size', px(12))
        .attr('stroke-width', px(3))
        .text((d) => d.data.nome)
        .style('opacity', 1);

      aplicar(nodeSel.exit(), transicionar)
        .attr('transform', `translate(${source.y},${source.x})`)
        .remove();

      nos.forEach((d) => {
        d.x0 = d.x;
        d.y0 = d.y;
      });
    }

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    atualizar(raiz, animate);
    if (animate) {
      garantirEstadoFinal(DURATION.base + 250, () => {
        // Nada a forcar aqui alem do que a transicao ja aplica -- a rede de
        // seguranca existe pro caso do rAF nunca avancar (renderer sem
        // composicao), garantindo que o layout final seja o mesmo aplicado
        // sem transicao.
        atualizar(raiz, false);
      });
    }
  },
};

export default chart;
