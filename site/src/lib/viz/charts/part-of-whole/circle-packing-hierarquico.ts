/**
 * Circle packing hierárquico — versão interativa.
 *
 * O output.png vem do layout "circlepack" do ggraph, que é estocástico (duas
 * chamadas com os mesmos dados dão arranjos diferentes) — então aqui o
 * layout NÃO é importado do R, é recalculado com d3.hierarchy()+d3.pack(),
 * mesma regra usada pelo módulo de rede (recalcular no D3, não replicar
 * posição a posição). O que vem do data.json é só a árvore (estrutura +
 * valores) e a paleta por nível, pra manter a MESMA cor dos dois lados.
 *
 * A raiz (nível 0) fica oculta — mesmo truque do estático — e o clique numa
 * bolha dá zoom nela (substitui a navegação por clique que o circlepackeR
 * dava, sem as duas limitações dele: gradiente contínuo de 2 cores em vez de
 * uma cor por nível, e folhas forçadas em branco pelo CSS do pacote).
 */

import {
  select,
  hierarchy,
  pack,
  interpolateZoom,
  type HierarchyCircularNode,
  type ZoomView,
} from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface No {
  nome: string;
  valor?: number;
  filhos?: No[];
}

interface Dados {
  meta: { paleta: Record<string, string>; nota?: string };
  arvore: No;
}

type Circulo = HierarchyCircularNode<No>;

/** Lado do viewBox — coincide com o layout do d3.pack(). */
const VB = 800;

const chart: VizChart = {
  aspectRatio: 1,
  label:
    'Circle packing hierárquico: catálogo de streaming dividido em mídia, gênero e título, ' +
    'com o total de horas de cada título definindo o tamanho da bolha.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, arvore } = data as Dados;

    const raizHierarquia = hierarchy<No>(arvore, (d) => d.filhos)
      .sum((d) => d.valor ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const raizPack = pack<No>().size([VB, VB]).padding(3)(raizHierarquia);

    // Nível 0 (a raiz) nunca é desenhado — ocupa espaço no layout mas fica
    // invisível, mesmo efeito do branco-sobre-branco do estático.
    const nos = raizPack.descendants().filter((d) => d.depth > 0);

    const escala = VB / Math.max(width, 1);
    const px = (valor: number) => valor * escala;

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `${-VB / 2} ${-VB / 2} ${VB} ${VB}`)
      .attr('aria-hidden', 'true')
      // Sobrescreve o overflow:visible global (pensado pra rótulo de rede) --
      // aqui, bolhas fora de foco do zoom vão parar em coordenadas bem fora
      // do viewBox, e sem isso vazariam da página.
      .style('overflow', 'hidden');

    const circulos = svg
      .append('g')
      .selectAll<SVGCircleElement, Circulo>('circle')
      .data(nos)
      .join('circle')
      .attr('fill', (d) => meta.paleta[String(d.depth)] ?? theme.accent)
      .attr('fill-opacity', 0.92)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1.5))
      .attr('data-interactive', '');

    // -------------------------------------------------------------- zoom
    // Padrao classico de "zoomable circle packing": a "view" e um circulo
    // [x, y, diametro] que define o que preenche o viewBox; zoomTo() reprojeta
    // cada no nessa janela, e o tween interpola de uma janela pra outra.
    let foco = raizPack;
    let janela: ZoomView;

    const zoomarPara = (v: ZoomView) => {
      const k = VB / v[2];
      janela = v;
      circulos.attr('cx', (d) => (d.x - v[0]) * k).attr('cy', (d) => (d.y - v[1]) * k).attr('r', (d) => d.r * k);
    };

    const zoomarPra = (d: Circulo) => {
      foco = d;
      svg
        .transition()
        .duration(DURATION.slow)
        .ease(EASE_STATE)
        .tween('zoom', () => {
          const i = interpolateZoom(janela, [foco.x, foco.y, foco.r * 2]);
          return (t: number) => zoomarPara(i(t));
        });
    };

    circulos.on('click', (evento: MouseEvent, d) => {
      if (foco === d) return;
      zoomarPra(d);
      evento.stopPropagation();
    });
    // Clicar fora de qualquer bolha (ou na bolha atualmente em foco, que
    // deixa o clique borbulhar por nao ter dado stopPropagation) volta pra
    // visao geral.
    svg.on('click', () => zoomarPra(raizPack));

    zoomarPara([raizPack.x, raizPack.y, raizPack.r * 2]);

    // -------------------------------------------------------------- interacao
    const realcar = (alvo: Circulo | null) => {
      circulos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('fill-opacity', (d) => (alvo === null || d === alvo ? 0.92 : 0.4))
        .attr('stroke-width', (d) => px(alvo === d ? 2.5 : 1.5));
    };

    const conteudoTooltip = (d: Circulo) => {
      const horas = d.value ?? 0;
      const rotulo = d.children ? `${horas} horas no total` : `${horas} horas assistidas/ouvidas`;
      return `<strong>${d.data.nome}</strong><br>${rotulo}`;
    };

    circulos
      .on('pointerenter', (evento: PointerEvent, d) => {
        realcar(d);
        tooltip.show(conteudoTooltip(d), evento);
      })
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(conteudoTooltip(d), evento))
      .on('pointerleave', () => {
        realcar(null);
        tooltip.hide();
      });

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // As bolhas crescem do centro do pai pra fora, uma camada de profundidade
    // de cada vez -- acompanha a leitura natural de "catálogo, depois mídia,
    // depois gênero, depois título".
    if (animate) {
      const raioFinal = new Map(nos.map((d) => [d, d.r]));
      circulos
        .attr('r', 0)
        .transition()
        .delay((d) => d.depth * 140 + stagger(nos.indexOf(d), nos.length, 260))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('r', (d) => raioFinal.get(d)!);

      garantirEstadoFinal(DURATION.enter * 1.6 + 3 * 140, () => {
        circulos.interrupt().attr('r', (d) => raioFinal.get(d)!);
      });
    }
  },
};

export default chart;
