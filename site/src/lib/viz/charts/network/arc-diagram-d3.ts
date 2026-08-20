/**
 * Arc diagram — versão em D3, agora dentro do runtime do site.
 *
 * Este gráfico já nascia em D3 escrito à mão (não existe pacote R com versão
 * interativa pronta) — o que muda aqui é só o lugar onde ele mora: de um
 * `widget.html` autocontido em `<iframe>` pra um módulo que herda fonte,
 * paleta e tooltip compartilhados do site, no fluxo normal da página.
 *
 * Posição de cada nó e geometria de cada arco são recalculadas aqui — o
 * script.R só exporta a lista de nós/arestas na ORDEM que importa (é a ordem
 * que faz a técnica funcionar, ver README) e a paleta por grupo.
 */

import { select, scalePoint } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface No {
  name: string;
  group: string;
}

interface Aresta {
  source: string;
  target: string;
}

interface Dados {
  meta: { paletaGrupo: Record<string, string>; nota?: string };
  nos: No[];
  arestas: Aresta[];
}

const VB_W = 1000;
const MARGEM_LATERAL = 60;
const MARGEM_TOPO = 20;
const MARGEM_RODAPE = 46;
const OPACIDADE_ARCO = 0.55;
const OPACIDADE_ARCO_APAGADO = 0.06;

/** Alvo de realce: um nó, um grupo, ou nada (estado neutro). */
type Foco = { no: string } | { grupo: string } | null;

const chart: VizChart = {
  aspectRatio: 2.15,
  label:
    'Arc diagram: 14 nós em 3 grupos alinhados numa linha, com as conexões entre eles ' +
    'desenhadas como arcos acima da linha.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, nos, arestas } = data as Dados;

    const x = scalePoint<string>()
      .domain(nos.map((d) => d.name))
      .range([MARGEM_LATERAL, VB_W - MARGEM_LATERAL])
      .padding(0.5);

    const raioDe = (a: Aresta) => Math.abs((x(a.target) ?? 0) - (x(a.source) ?? 0)) / 2;
    const raioMax = Math.max(1, ...arestas.map(raioDe));
    const vbH = raioMax + MARGEM_TOPO + MARGEM_RODAPE;
    const baseline = vbH - MARGEM_RODAPE;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${vbH}`)
      .attr('aria-hidden', 'true');

    const arcoPath = (a: Aresta) => {
      const x1 = x(a.source) ?? 0;
      const x2 = x(a.target) ?? 0;
      const r = Math.abs(x2 - x1) / 2;
      const sentido = x1 < x2 ? 1 : 0;
      return `M ${x1} ${baseline} A ${r} ${r} 0 0 ${sentido} ${x2} ${baseline}`;
    };

    const grupoDe = new Map(nos.map((d) => [d.name, d.group]));
    const vizinhos = new Map<string, Set<string>>(nos.map((d) => [d.name, new Set()]));
    arestas.forEach((a) => {
      vizinhos.get(a.source)?.add(a.target);
      vizinhos.get(a.target)?.add(a.source);
    });

    const camadaArcos = svg.append('g').attr('fill', 'none');
    const arcos = camadaArcos
      .selectAll<SVGPathElement, Aresta>('path')
      .data(arestas)
      .join('path')
      .attr('d', arcoPath)
      .attr('stroke', (d) => meta.paletaGrupo[grupoDe.get(d.source) ?? ''] ?? theme.accent)
      .attr('stroke-width', px(2))
      .attr('opacity', OPACIDADE_ARCO)
      .attr('data-interactive', '');

    const camadaNos = svg.append('g');
    const noG = camadaNos
      .selectAll<SVGGElement, No>('g')
      .data(nos)
      .join('g')
      .attr('transform', (d) => `translate(${x(d.name)},${baseline})`)
      .attr('data-interactive', '');

    const circulos = noG
      .append('circle')
      .attr('r', px(7))
      .attr('fill', (d) => meta.paletaGrupo[d.group] ?? theme.accent)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1.5));

    const rotulos = noG
      .append('text')
      .attr('y', px(22))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .attr('fill', theme.ink);
    rotulos.text((d) => d.name);

    // -------------------------------------------------------------- interacao
    const combina = (foco: Foco, nome: string) => {
      if (!foco) return true;
      if ('no' in foco) return nome === foco.no || (vizinhos.get(foco.no)?.has(nome) ?? false);
      return grupoDe.get(nome) === foco.grupo;
    };

    const realcar = (foco: Foco) => {
      arcos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('opacity', (d) => {
          if (!foco) return OPACIDADE_ARCO;
          const tocaFoco =
            'no' in foco
              ? d.source === foco.no || d.target === foco.no
              : grupoDe.get(d.source) === foco.grupo || grupoDe.get(d.target) === foco.grupo;
          return tocaFoco ? 1 : OPACIDADE_ARCO_APAGADO;
        })
        .attr('stroke-width', (d) => {
          if (!foco || !('no' in foco)) return px(2);
          return d.source === foco.no || d.target === foco.no ? px(3.5) : px(2);
        });

      rotulos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('opacity', (d) => (combina(foco, d.name) ? 1 : 0.3));

      circulos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('r', (d) => px(foco && 'no' in foco && d.name === foco.no ? 10 : 7));
    };

    const tooltipNo = (d: No) => {
      const n = vizinhos.get(d.name)?.size ?? 0;
      return `<strong>${d.name}</strong><br>${d.group}<br>${n} conexão(ões)`;
    };

    noG
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(tooltipNo(d), evento))
      .on('pointerleave', () => tooltip.hide());

    arcos
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(`${d.source} &rarr; ${d.target}`, evento))
      .on('pointerleave', () => tooltip.hide());

    // --------------------------------------------------------------- legenda
    // Em HTML, fora do SVG: texto num viewBox que cresce com o dado encolhe
    // junto e fica ilegivel (mesmo defeito ja catalogado pra este grafico no
    // AGENTS.md, agora resolvido de raiz).
    const legendaSel = select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(Object.entries(meta.paletaGrupo))
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html(([grupo, cor]) => `<span class="viz-swatch" style="background:${cor}"></span>${grupo}`)
      .on('focus', (_e, [grupo]) => realcar({ grupo }))
      .on('blur', () => realcar(null));

    // Chave prefixada por tipo (no vs. grupo) pra unificar os tres alvos —
    // clicar num circulo, num arco ou na legenda todos fixam pelo mesmo
    // mecanismo, cada um contribuindo a chave que faz sentido pra si.
    const chaveDoNo = (nome: string) => `no:${nome}`;
    const chaveDoGrupo = (grupo: string) => `grupo:${grupo}`;
    const focoDaChave = (chave: string): Foco =>
      chave.startsWith('no:') ? { no: chave.slice(3) } : { grupo: chave.slice(6) };

    tornarFixavel(
      root,
      [
        { selecao: noG, chaveDe: (d: No) => chaveDoNo(d.name) },
        { selecao: arcos, chaveDe: (d: Aresta) => chaveDoNo(d.source) },
        { selecao: legendaSel, chaveDe: ([grupo]: [string, string]) => chaveDoGrupo(grupo) },
      ],
      (chave) => realcar(focoDaChave(chave)),
      () => realcar(null)
    );

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // Nos entram primeiro, da esquerda pra direita (a ordem que da sentido a
    // tecnica); os arcos desenham por cima depois, tambem escalonados.
    if (animate) {
      circulos
        .attr('r', 0)
        .transition()
        .delay((_d, i) => stagger(i, nos.length, 380))
        .duration(DURATION.base)
        .ease(EASE_ENTER)
        .attr('r', px(7));

      rotulos.attr('opacity', 0).transition().delay(260).duration(DURATION.base).attr('opacity', 1);

      arcos
        .attr('opacity', 0)
        .transition()
        .delay((_d, i) => 420 + stagger(i, arestas.length, 320))
        .duration(DURATION.base)
        .attr('opacity', OPACIDADE_ARCO);

      garantirEstadoFinal(420 + DURATION.base + 320 + 250, () => {
        circulos.interrupt().attr('r', px(7));
        rotulos.interrupt().attr('opacity', 1);
        arcos.interrupt().attr('opacity', OPACIDADE_ARCO);
      });
    }
  },
};

export default chart;
