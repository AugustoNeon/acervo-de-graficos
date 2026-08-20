/**
 * Treemap com zoom — orçamento municipal fictício, secretaria > programa >
 * ação. Clique numa secretaria pra ver os programas dela, num programa pra
 * ver as ações; o caminho acima funciona como breadcrumb pra voltar.
 *
 * O layout do treemap é calculado UMA VEZ SÓ, pra árvore inteira (todos os 3
 * níveis de uma vez, cada nó já nasce com seu retângulo dentro do retângulo
 * do pai). "Zoom" não é um recálculo de layout a cada clique — são só duas
 * escalas lineares (x/y) cujo domínio muda pro retângulo do nó em foco; como
 * os filhos desse nó já têm coordenadas dentro dele (por construção do
 * layout), reescalar o domínio faz esses retângulos se espalharem pra
 * preencher a tela, sem precisar recalcular nada. Isso evita o problema
 * clássico de "zoom" via `transform: scale()` num `<g>`, que distorceria a
 * espessura de traço e o tamanho da fonte junto com o zoom.
 *
 * Não existe uma chave "estável" no sentido dos outros switchers deste
 * acervo (boxplot/violino): aqui a identidade de cada retângulo É o próprio
 * nó da hierarquia (caminho de nomes desde a raiz), e o join troca
 * completamente de conjunto de dados a cada nível de zoom — mas quando se
 * volta a um nível já visitado, a MESMA chave reaparece e a transição
 * reconecta com o retângulo certo sozinha, de graça, só por causa da chave.
 */

import { select, hierarchy, treemap, treemapSquarify, scaleLinear, type HierarchyRectangularNode } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface NoBruto {
  nome: string;
  valor?: number;
  filhos?: NoBruto[];
}

interface Dados {
  meta: { paletaSecretarias: Record<string, string>; nota?: string };
  arvore: NoBruto;
}

type No = HierarchyRectangularNode<NoBruto>;

const VB_W = 900;
const VB_H = 540;
const TAM_MIN_ROTULO = { largura: 46, altura: 20 };

function chaveDe(d: No): string {
  return d
    .ancestors()
    .map((a) => a.data.nome)
    .reverse()
    .join('/');
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Treemap com zoom: orçamento municipal fictício dividido em secretaria, programa e ação — a área de ' +
    'cada retângulo é proporcional ao valor. Clique numa secretaria pra ver os programas, e num programa ' +
    'pra ver as ações.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, arvore } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const raiz = hierarchy<NoBruto>(arvore, (d) => d.filhos)
      .sum((d) => d.valor ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)) as No;

    treemap<NoBruto>().tile(treemapSquarify).size([VB_W, VB_H]).paddingInner(px(2)).round(true)(raiz);

    const idPorNo = new Map<No, number>();
    raiz.descendants().forEach((d, i) => idPorNo.set(d as No, i));

    function corDe(d: No): string {
      const nivel1 = d.ancestors().reverse()[1] as No | undefined; // depth 1 = secretaria
      const nome = (nivel1 ?? d).data.nome;
      return meta.paletaSecretarias[nome] ?? theme.primary;
    }

    function conteudoTooltip(d: No): string {
      const valor = (d.value ?? 0).toFixed(1);
      const itens = d.children ? `<br>${d.children.length} ${d.children.length === 1 ? 'item' : 'itens'}` : '';
      return `<strong>${d.data.nome}</strong><br>R$ ${valor} milhões${itens}`;
    }

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const gTiles = svg.append('g').attr('class', 'tiles');

    const x = scaleLinear().domain([0, VB_W]).range([0, VB_W]);
    const y = scaleLinear().domain([0, VB_H]).range([0, VB_H]);

    let foco: No = raiz;

    const controles = select(root).append('div').attr('class', 'viz-controles');

    function atualizarBreadcrumb() {
      const caminho = foco.ancestors().reverse() as No[];
      const botoes = controles.selectAll<HTMLButtonElement, No>('button').data(caminho, (d) => chaveDe(d));
      botoes.exit().remove();
      botoes
        .enter()
        .append('button')
        .attr('type', 'button')
        .attr('data-interactive', '')
        .merge(botoes)
        .text((d) => d.data.nome)
        .attr('aria-pressed', (d) => String(d === foco))
        .on('click', (_e, d) => {
          if (d !== foco) mostrar(d, true);
        });
    }

    function mostrar(alvo: No, transicao: boolean) {
      const anterior = foco;
      const indoMaisFundo = alvo.depth > anterior.depth;
      foco = alvo;

      x.domain([alvo.x0 ?? 0, alvo.x1 ?? VB_W]);
      y.domain([alvo.y0 ?? 0, alvo.y1 ?? VB_H]);

      const filhos = (alvo.children ?? []) as No[];

      let origemX = 0;
      let origemY = 0;
      let origemW = VB_W;
      let origemH = VB_H;
      if (!indoMaisFundo) {
        // Saindo pra um nível mais raso: os novos irmãos "nascem" de dentro
        // do retângulo que o foco anterior ocupa na escala NOVA.
        origemX = x(anterior.x0 ?? 0);
        origemY = y(anterior.y0 ?? 0);
        origemW = x(anterior.x1 ?? 0) - origemX;
        origemH = y(anterior.y1 ?? 0) - origemY;
      }

      const grupos = gTiles.selectAll<SVGGElement, No>('g.tile').data(filhos, (d) => chaveDe(d as No));

      const entrando = grupos
        .enter()
        .append('g')
        .attr('class', 'tile')
        .attr('data-interactive', '');

      entrando
        .append('clipPath')
        .attr('id', (d) => `treemap-clip-${idPorNo.get(d)}`)
        .append('rect')
        .attr('x', origemX)
        .attr('y', origemY)
        .attr('width', origemW)
        .attr('height', origemH);

      entrando
        .append('rect')
        .attr('class', 'fundo')
        .attr('x', origemX)
        .attr('y', origemY)
        .attr('width', origemW)
        .attr('height', origemH)
        .attr('fill', (d) => corDe(d))
        .attr('fill-opacity', (d) => 0.92 - d.depth * 0.12)
        .attr('stroke', theme.surface)
        .attr('stroke-width', px(1.4));

      entrando
        .append('text')
        .attr('class', 'rotulo')
        .attr('clip-path', (d) => `url(#treemap-clip-${idPorNo.get(d)})`)
        .attr('fill', theme.ink)
        .attr('font-family', theme.fontBody)
        .attr('font-weight', 600)
        .attr('font-size', px(12))
        .attr('x', origemX + px(6))
        .attr('y', origemY + px(16));

      entrando
        .on('pointerenter', function (evento: PointerEvent, d) {
          select(this)
            .select('rect.fundo')
            .transition('hover')
            .duration(DURATION.fast)
            .ease(EASE_STATE)
            .attr('stroke', theme.ink)
            .attr('stroke-width', px(2.5));
          tooltip.show(conteudoTooltip(d), evento);
        })
        .on('pointermove', (evento: PointerEvent, d) => tooltip.show(conteudoTooltip(d), evento))
        .on('pointerleave', function () {
          select(this)
            .select('rect.fundo')
            .transition('hover')
            .duration(DURATION.fast)
            .ease(EASE_STATE)
            .attr('stroke', theme.surface)
            .attr('stroke-width', px(1.4));
          tooltip.hide();
        })
        .on('click', (_e, d) => {
          if (d.children) mostrar(d, true);
        });

      const saindo = grupos.exit();
      if (transicao) {
        saindo
          .select('rect.fundo')
          .transition()
          .duration(DURATION.base)
          .ease(EASE_STATE)
          .attr('fill-opacity', 0);
        saindo.select('text').transition().duration(DURATION.base).attr('opacity', 0);
        saindo.transition().delay(DURATION.base).remove();
      } else {
        saindo.remove();
      }

      const todas = entrando.merge(grupos);
      const tTodas = transicao ? todas.transition().duration(DURATION.slow).ease(EASE_STATE) : todas;

      tTodas
        .select<SVGRectElement>('clipPath rect')
        .attr('x', (d) => x(d.x0 ?? 0))
        .attr('y', (d) => y(d.y0 ?? 0))
        .attr('width', (d) => Math.max(x(d.x1 ?? 0) - x(d.x0 ?? 0), 0))
        .attr('height', (d) => Math.max(y(d.y1 ?? 0) - y(d.y0 ?? 0), 0));

      tTodas
        .select<SVGRectElement>('rect.fundo')
        .attr('x', (d) => x(d.x0 ?? 0))
        .attr('y', (d) => y(d.y0 ?? 0))
        .attr('width', (d) => Math.max(x(d.x1 ?? 0) - x(d.x0 ?? 0), 0))
        .attr('height', (d) => Math.max(y(d.y1 ?? 0) - y(d.y0 ?? 0), 0));

      tTodas
        .select<SVGTextElement>('text.rotulo')
        .attr('x', (d) => x(d.x0 ?? 0) + px(6))
        .attr('y', (d) => y(d.y0 ?? 0) + px(16))
        .attr('opacity', (d) => {
          const w = x(d.x1 ?? 0) - x(d.x0 ?? 0);
          const h = y(d.y1 ?? 0) - y(d.y0 ?? 0);
          return w > px(TAM_MIN_ROTULO.largura) && h > px(TAM_MIN_ROTULO.altura) ? 1 : 0;
        })
        .text((d) => d.data.nome);

      atualizarBreadcrumb();
    }

    mostrar(raiz, false);

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    if (animate) {
      const tiles = gTiles.selectAll<SVGGElement, No>('g.tile');
      tiles.attr('opacity', 0);
      tiles
        .transition('entrada')
        .delay((_d, i) => stagger(i, tiles.size()))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + 300, () => {
        tiles.interrupt('entrada').attr('opacity', 1);
      });
    }
  },
};

export default chart;
