/**
 * Lollipop chart — mesma família do barplot clássico, ângulo próprio.
 *
 * Só dois estados (ordem crescente/decrescente), sempre horizontal — o forte
 * aqui não é o número de variações, é o hover: cada item revela o
 * detalhamento por plataforma que nem o `output.png` nem o resto da família
 * (barplot clássico, agrupado/empilhado) mostra em nenhum estado. O item de
 * maior valor (`meta.generoTopo`) ganha um halo e rótulo em negrito, igual
 * ao estático — destaque fixo por dado, não por posição na tela.
 */

import { select, scaleBand, scaleLinear, axisBottom, axisLeft, type Selection, type Transition } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo, estilarGrade } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Plataforma {
  plataforma: string;
  horas: number;
}

interface Item {
  genero: string;
  horas: number;
  plataformas: Plataforma[];
}

interface Dados {
  meta: { paletaGeneros: Record<string, string>; generoTopo: string; nota?: string };
  itens: Item[];
}

type Ordem = 'desc' | 'asc';

interface Geometria {
  cx: number;
  cy: number;
  r: number;
}

const RAIO = 8;
const RAIO_TOPO = 12;

const VB_W = 760;
const VB_H = 440;
const MARGEM = { topo: 20, dir: 72, baixo: 46, esq: 128 };

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Lollipop chart ordenável mostrando horas de audição por gênero musical; passe o cursor ' +
    'sobre um item para ver o detalhamento por plataforma de streaming.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, itens } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const maxHoras = Math.max(...itens.map((d) => d.horas));
    const xLinear = scaleLinear().domain([0, maxHoras * 1.12]).range([0, larguraUtil]);
    const yBand = scaleBand<string>().range([0, alturaUtil]).padding(0.35);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const eixoBaixoSel = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const eixoGradeSel = g.append('g');
    const eixoEsqSel = g.append('g');

    let ordemAtual: Ordem = 'desc';
    const geometria = new Map<string, Geometria>();

    function conteudoTooltip(d: Item): string {
      const linhas = [...d.plataformas]
        .sort((a, b) => b.horas - a.horas)
        .map((p) => `${p.plataforma}: ${p.horas.toFixed(1)}`)
        .join('<br>');
      return `<strong>${d.genero}</strong> — ${d.horas.toFixed(1)} milhões de horas<br><span style="opacity:.7">${linhas}</span>`;
    }

    // Grade vertical de fundo (linhas do eixo numérico), atrás de tudo.
    estilarGrade(
      eixoGradeSel.call(axisBottom(xLinear).ticks(5).tickSize(-alturaUtil).tickFormat(() => '')),
      theme
    );

    const linhas = g
      .append('g')
      .selectAll<SVGLineElement, Item>('line')
      .data(itens, (d) => d.genero)
      .join('line')
      .attr('x1', 0)
      .attr('stroke', theme.borderStrong)
      .attr('stroke-width', px(2.2))
      .attr('stroke-linecap', 'round');

    const halo = g
      .append('circle')
      .attr('fill', meta.paletaGeneros[meta.generoTopo] ?? theme.accent)
      .attr('opacity', 0.18)
      .attr('r', px(RAIO_TOPO * 1.9));

    const pontos = g
      .append('g')
      .selectAll<SVGCircleElement, Item>('circle.ponto')
      .data(itens, (d) => d.genero)
      .join('circle')
      .attr('class', 'ponto')
      .attr('data-interactive', '')
      .attr('fill', (d) => meta.paletaGeneros[d.genero] ?? theme.primary)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1.5));

    const rotulos = g
      .append('g')
      .selectAll<SVGTextElement, Item>('text')
      .data(itens, (d) => d.genero)
      .join('text')
      .attr('fill', theme.ink)
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(13))
      .attr('dominant-baseline', 'middle')
      .attr('font-weight', (d) => (d.genero === meta.generoTopo ? 700 : 500))
      .text((d) => d.horas.toFixed(0));

    function conteudoHover(sel: Selection<SVGCircleElement, Item, SVGGElement, unknown>) {
      sel
        .on('pointermove', (evento: PointerEvent, d: Item) => tooltip.show(conteudoTooltip(d), evento))
        .on('pointerleave', () => tooltip.hide());
    }
    conteudoHover(pontos);

    // Transições nomeadas ("hover"): aplicarOrdem() anima cx/cy/r e y1/y2/x2
    // numa transição sem nome — sem nomes distintos, uma nova .transition()
    // no mesmo elemento cancela a anterior mesmo em atributos diferentes, e
    // o item congela a meio caminho do reordenar.
    function realcarPonto(foco: string) {
      pontos
        .transition('hover')
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('r', (d) => {
          const geo = geometria.get(d.genero);
          if (!geo) return 0;
          return d.genero === foco ? geo.r + px(3) : geo.r;
        });
      pontos.filter((d) => d.genero === foco).raise();
      linhas
        .transition('hover')
        .duration(DURATION.fast)
        .attr('stroke-width', (d) => (d.genero === foco ? px(3.6) : px(2.2)));
    }

    function limparPontos() {
      pontos
        .transition('hover')
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('r', (d) => geometria.get(d.genero)?.r ?? 0);
      linhas.transition('hover').duration(DURATION.fast).attr('stroke-width', px(2.2));
    }

    tornarFixavel(root, { selecao: pontos, chaveDe: (d: Item) => d.genero }, realcarPonto, limparPontos);

    function desenharEixoY(transicao: boolean) {
      const sel = transicao ? eixoEsqSel.transition().duration(DURATION.slow).ease(EASE_STATE) : eixoEsqSel;
      sel.call(axisLeft(yBand).tickSizeOuter(0));
      estilarEixo(eixoEsqSel, theme, px);
      eixoEsqSel.select('.domain').remove();
    }

    function aplicarOrdem(nova: Ordem, transicao: boolean) {
      ordemAtual = nova;
      // Mesma cautela do barplot classico: cancela a transicao 'hover' (raio
      // do ponto fixado por clique) em voo antes de reordenar, senao as duas
      // transicoes disputam o mesmo atributo 'r' e o ponto pode ficar preso
      // a meio caminho quando a reordenacao acontece logo depois de fixar.
      pontos.interrupt('hover');
      const lista = [...itens].sort((a, b) => (nova === 'desc' ? b.horas - a.horas : a.horas - b.horas));
      yBand.domain(lista.map((d) => d.genero));

      itens.forEach((d) => {
        const cy = (yBand(d.genero) ?? 0) + yBand.bandwidth() / 2;
        const cx = xLinear(d.horas);
        const r = px(d.genero === meta.generoTopo ? RAIO_TOPO : RAIO);
        geometria.set(d.genero, { cx, cy, r });
      });

      const aplicarL = <S extends Selection<SVGLineElement, Item, SVGGElement, unknown> | Transition<SVGLineElement, Item, SVGGElement, unknown>>(
        s: S
      ) =>
        s
          .attr('y1', (d: Item) => geometria.get(d.genero)!.cy)
          .attr('y2', (d: Item) => geometria.get(d.genero)!.cy)
          .attr('x2', (d: Item) => geometria.get(d.genero)!.cx);

      const aplicarC = <S extends Selection<SVGCircleElement, Item, SVGGElement, unknown> | Transition<SVGCircleElement, Item, SVGGElement, unknown>>(
        s: S
      ) =>
        s
          .attr('cx', (d: Item) => geometria.get(d.genero)!.cx)
          .attr('cy', (d: Item) => geometria.get(d.genero)!.cy)
          .attr('r', (d: Item) => geometria.get(d.genero)!.r);

      const aplicarT = <S extends Selection<SVGTextElement, Item, SVGGElement, unknown> | Transition<SVGTextElement, Item, SVGGElement, unknown>>(
        s: S
      ) =>
        s
          .attr('x', (d: Item) => geometria.get(d.genero)!.cx + geometria.get(d.genero)!.r + px(8))
          .attr('y', (d: Item) => geometria.get(d.genero)!.cy);

      aplicarL(transicao ? linhas.transition().duration(DURATION.slow).ease(EASE_STATE) : linhas);
      aplicarC(transicao ? pontos.transition().duration(DURATION.slow).ease(EASE_STATE) : pontos);
      aplicarT(transicao ? rotulos.transition().duration(DURATION.slow).ease(EASE_STATE) : rotulos);

      const geoTopo = geometria.get(meta.generoTopo)!;
      (transicao ? halo.transition().duration(DURATION.slow).ease(EASE_STATE) : halo)
        .attr('cx', geoTopo.cx)
        .attr('cy', geoTopo.cy);

      desenharEixoY(transicao);
      botoes.attr('aria-pressed', (m) => String(m.id === nova));
    }

    const ESTADOS: { id: Ordem; rotulo: string }[] = [
      { id: 'desc', rotulo: 'Maior primeiro' },
      { id: 'asc', rotulo: 'Menor primeiro' },
    ];

    const controles = select(root).append('div').attr('class', 'viz-controles');
    const botoes = controles
      .selectAll('button')
      .data(ESTADOS)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .attr('aria-pressed', (m) => String(m.id === ordemAtual))
      .text((m) => m.rotulo)
      .on('click', (_e, m) => {
        if (m.id === ordemAtual) return;
        aplicarOrdem(m.id, true);
      });

    estilarEixo(eixoBaixoSel.call(axisBottom(xLinear).ticks(5).tickSizeOuter(0)), theme, px);
    aplicarOrdem('desc', false);

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    if (animate) {
      const cxFinal = (d: Item) => geometria.get(d.genero)!.cx;
      const rFinal = (d: Item) => geometria.get(d.genero)!.r;

      linhas.attr('x2', 0);
      pontos.attr('cx', 0).attr('r', 0);
      rotulos.attr('opacity', 0);
      halo.attr('opacity', 0);

      linhas
        .transition()
        .delay((_d, i) => stagger(i, itens.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('x2', cxFinal);
      pontos
        .transition()
        .delay((_d, i) => stagger(i, itens.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('cx', cxFinal)
        .attr('r', rFinal);
      rotulos
        .transition()
        .delay((_d, i) => stagger(i, itens.length) + DURATION.enter * 0.4)
        .duration(DURATION.base)
        .attr('opacity', 1);
      halo.transition().delay(DURATION.enter * 0.5).duration(DURATION.base).attr('opacity', 0.18);

      garantirEstadoFinal(DURATION.enter + 300, () => {
        linhas.interrupt().attr('x2', cxFinal);
        pontos.interrupt().attr('cx', cxFinal).attr('r', rFinal);
        rotulos.interrupt().attr('opacity', 1);
        halo.interrupt().attr('opacity', 0.18);
      });
    }
  },
};

export default chart;
