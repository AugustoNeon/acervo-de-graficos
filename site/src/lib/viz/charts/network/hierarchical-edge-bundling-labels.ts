/**
 * Hierarchical edge bundling com rótulos — versão interativa.
 *
 * O layout NÃO vem do R: o dendrograma circular do `ggraph` depende de como
 * o `igraph` ordena a árvore por baixo dos panos, sem posição "oficial" pra
 * herdar — mesma regra do resto do acervo pra gráfico de hierarquia/rede. O
 * D3 recalcula do zero com `d3.hierarchy()`+`d3.cluster()`, e o bundling das
 * conexões vem de `curveBundle` aplicado ao caminho entre dois nós pela
 * árvore (`origem.path(destino)`) — a mesma técnica do `geom_conn_bundle()`.
 *
 * O que o estático não dá: passar o cursor num item destaca só as conexões
 * daquele item (e apaga o resto), em vez de tentar seguir uma curva isolada
 * no emaranhado.
 */

import {
  select,
  hierarchy,
  cluster,
  lineRadial,
  curveBundle,
  pointRadial,
  scaleSqrt,
  type HierarchyNode,
} from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface No {
  nome: string;
  valor?: number;
  filhos?: No[];
}

interface Conexao {
  from: string;
  to: string;
}

interface Dados {
  meta: { paletaGrupo: Record<string, string>; gradiente: [string, string]; nota?: string };
  arvore: No;
  conexoes: Conexao[];
}

type Ponto = HierarchyNode<No> & { x: number; y: number };

const VB = 900;
/** Margem reservada pros rótulos, fora do raio das folhas. */
const MARGEM_ROTULO = 90;
const OPACIDADE_ARESTA = 0.28;
const OPACIDADE_ARESTA_APAGADA = 0.03;
const OPACIDADE_ARESTA_REALCE = 0.9;
const OPACIDADE_APAGADA = 0.15;

const chart: VizChart = {
  aspectRatio: 1,
  label:
    'Hierarchical edge bundling: 8 grupos de 12 itens cada, com 165 conexões entre itens ' +
    'desenhadas como curvas que acompanham a hierarquia.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, arvore, conexoes } = data as Dados;

    const raizHierarquia = hierarchy<No>(arvore, (d) => d.filhos);
    const R = VB / 2 - MARGEM_ROTULO;
    const layout = cluster<No>().size([2 * Math.PI, R]);
    const raiz = layout(raizHierarquia) as Ponto;

    const folhas = raiz.leaves() as Ponto[];
    const folhaPorNome = new Map(folhas.map((d) => [d.data.nome, d]));

    const valores = folhas.map((d) => d.data.valor ?? 0);
    const raioNo = scaleSqrt()
      .domain([Math.min(...valores), Math.max(...valores)])
      .range([1.2, 7]);

    const escala = VB / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `${-VB / 2} ${-VB / 2} ${VB} ${VB}`)
      .attr('aria-hidden', 'true');

    const linhaRadial = lineRadial<Ponto>()
      .curve(curveBundle.beta(0.85))
      .radius((d) => d.y)
      .angle((d) => d.x);

    interface Aresta {
      from: string;
      to: string;
      caminho: Ponto[];
    }

    const arestas: Aresta[] = conexoes
      .map((c) => {
        const origem = folhaPorNome.get(c.from);
        const destino = folhaPorNome.get(c.to);
        if (!origem || !destino) return null;
        return { from: c.from, to: c.to, caminho: origem.path(destino) as Ponto[] };
      })
      .filter((d): d is Aresta => d !== null);

    // Adjacencia por folha, pra saber quais arestas realcar no hover.
    const arestasPorFolha = new Map<string, number[]>();
    arestas.forEach((a, i) => {
      [a.from, a.to].forEach((nome) => {
        if (!arestasPorFolha.has(nome)) arestasPorFolha.set(nome, []);
        arestasPorFolha.get(nome)!.push(i);
      });
    });

    // Um <linearGradient> por aresta, indo do ponto de origem ao ponto de
    // destino em coordenadas reais do SVG (userSpaceOnUse) -- no estatico,
    // o gradiente de cada curva vai sempre das mesmas duas cores extremas da
    // rampa YlGnBu, na direcao origem->destino (aes(colour=after_stat(index))).
    // Orientar cada gradiente pela reta origem-destino (em vez de um unico
    // gradiente compartilhado, sempre horizontal) acompanha bem o sentido de
    // cada curva mesmo sem seguir a curvatura exata do bundling.
    const defs = svg.append('defs');
    defs
      .selectAll('linearGradient')
      .data(arestas)
      .join('linearGradient')
      .attr('id', (_d, i) => `heb-grad-${i}`)
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', (d) => pointRadial(d.caminho[0].x, d.caminho[0].y)[0])
      .attr('y1', (d) => pointRadial(d.caminho[0].x, d.caminho[0].y)[1])
      .attr('x2', (d) => pointRadial(d.caminho[d.caminho.length - 1].x, d.caminho[d.caminho.length - 1].y)[0])
      .attr('y2', (d) => pointRadial(d.caminho[d.caminho.length - 1].x, d.caminho[d.caminho.length - 1].y)[1])
      .each(function (d) {
        select(this)
          .selectAll('stop')
          .data(meta.gradiente)
          .join('stop')
          .attr('offset', (_c, i) => `${i * 100}%`)
          .attr('stop-color', (c) => c);
      });

    const camadaArestas = svg.append('g').attr('fill', 'none');
    const caminhos = camadaArestas
      .selectAll<SVGPathElement, Aresta>('path')
      .data(arestas)
      .join('path')
      .attr('d', (d) => linhaRadial(d.caminho))
      .attr('stroke', (_d, i) => `url(#heb-grad-${i})`)
      .attr('stroke-width', px(1))
      .attr('stroke-opacity', OPACIDADE_ARESTA);

    const camadaNos = svg.append('g');
    const pontos = camadaNos
      .selectAll<SVGCircleElement, Ponto>('circle')
      .data(folhas)
      .join('circle')
      .attr('transform', (d) => `translate(${pointRadial(d.x, R)})`)
      .attr('r', (d) => px(raioNo(d.data.valor ?? 0)))
      .attr('fill', (d) => meta.paletaGrupo[d.parent?.data.nome ?? ''] ?? theme.accent)
      .attr('fill-opacity', 0.85)
      .attr('data-interactive', '');

    const camadaRotulos = svg.append('g');
    const rotulos = camadaRotulos
      .selectAll<SVGTextElement, Ponto>('text')
      .data(folhas)
      .join('text')
      .each(function (d) {
        const [x, y] = pointRadial(d.x, R + px(12));
        let graus = (d.x * 180) / Math.PI - 90;
        const espelhado = graus > 90;
        if (espelhado) graus -= 180;
        select(this)
          .attr('transform', `translate(${x},${y}) rotate(${graus})`)
          .attr('text-anchor', espelhado ? 'end' : 'start');
      })
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(9))
      .attr('fill', (d) => meta.paletaGrupo[d.parent?.data.nome ?? ''] ?? theme.ink)
      .attr('data-interactive', '')
      .text((d) => d.data.nome.replace('subgroup_', '#'));

    // -------------------------------------------------------------- interacao
    const realcar = (nome: string | null) => {
      const ativas = nome ? new Set(arestasPorFolha.get(nome) ?? []) : null;

      caminhos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('stroke-opacity', (_d, i) =>
          ativas === null ? OPACIDADE_ARESTA : ativas.has(i) ? OPACIDADE_ARESTA_REALCE : OPACIDADE_ARESTA_APAGADA
        );

      const conectadas = new Set<string>();
      if (nome) {
        conectadas.add(nome);
        (arestasPorFolha.get(nome) ?? []).forEach((i) => {
          conectadas.add(arestas[i].from);
          conectadas.add(arestas[i].to);
        });
      }

      pontos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('fill-opacity', (d) => (nome === null || conectadas.has(d.data.nome) ? 0.85 : OPACIDADE_APAGADA));

      rotulos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('opacity', (d) => (nome === null || conectadas.has(d.data.nome) ? 1 : OPACIDADE_APAGADA));
    };

    const conteudoTooltip = (d: Ponto) =>
      `<strong>${d.data.nome}</strong><br>grupo ${d.parent?.data.nome ?? '—'}<br>valor ${(d.data.valor ?? 0).toFixed(2)}`;

    pontos
      .on('pointerenter', (evento: PointerEvent, d) => {
        realcar(d.data.nome);
        tooltip.show(conteudoTooltip(d), evento);
      })
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(conteudoTooltip(d), evento))
      .on('pointerleave', () => {
        realcar(null);
        tooltip.hide();
      });

    rotulos
      .on('pointerenter', (evento: PointerEvent, d) => {
        realcar(d.data.nome);
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
    // As arestas desenham por ultimo (crescem em opacidade), depois de nos e
    // rotulos ja no lugar -- entrar com tudo de uma vez, incluindo o
    // emaranhado de curvas, deixaria dificil perceber o que apareceu.
    if (animate) {
      pontos
        .attr('r', 0)
        .transition()
        .delay((_d, i) => stagger(i, folhas.length, 380))
        .duration(DURATION.base)
        .ease(EASE_ENTER)
        .attr('r', (d) => px(raioNo(d.data.valor ?? 0)));

      rotulos.attr('opacity', 0).transition().delay(280).duration(DURATION.base).attr('opacity', 1);

      caminhos
        .attr('stroke-opacity', 0)
        .transition()
        .delay(420)
        .duration(DURATION.slow)
        .attr('stroke-opacity', OPACIDADE_ARESTA);

      garantirEstadoFinal(420 + DURATION.slow + 250, () => {
        pontos.interrupt().attr('r', (d) => px(raioNo(d.data.valor ?? 0)));
        rotulos.interrupt().attr('opacity', 1);
        caminhos.interrupt().attr('stroke-opacity', OPACIDADE_ARESTA);
      });
    }
  },
};

export default chart;
