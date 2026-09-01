/**
 * Cronograma de lançamento de um app (Gantt).
 *
 * Complementa o outro gráfico da categoria (linha-do-tempo-startup-ficticia):
 * lá cada marco é um instante único; aqui cada tarefa TEM DURAÇÃO (início e
 * fim), e a sobreposição entre barras de fases vizinhas — design começando
 * antes do planejamento terminar — é justamente o que uma lista datada não
 * mostra e um Gantt mostra de cara. A cor de cada fase nasce uma única vez no
 * R (`meta.cores`) e nunca é recalculada aqui, mesma regra da matriz de
 * adjacência aplicada a fase em vez de tag.
 */

import { select, scaleUtc, scaleBand, axisBottom } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo, estilarGrade, formatarDataUtc } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Tarefa {
  tarefa: string;
  fase: string;
  inicio: string;
  fim: string;
}

interface Dados {
  meta: { cores: Record<string, string> };
  tarefas: Tarefa[];
}

const VB_W = 900;
const VB_H = 560;
const MARGEM = { topo: 16, dir: 24, baixo: 34, esq: 190 };
const RAIO_MARCO = 6;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Cronograma de lançamento de um app entre janeiro e junho de 2024, com tarefas agrupadas em ' +
    'quatro fases e barras mostrando início, fim e sobreposição entre elas.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, tarefas } = data as Dados;
    const linhas = tarefas.map((t) => ({ ...t, dataInicio: new Date(t.inicio), dataFim: new Date(t.fim) }));

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const menorData = new Date(Math.min(...linhas.map((l) => +l.dataInicio)));
    const maiorData = new Date(Math.max(...linhas.map((l) => +l.dataFim)));
    const folga = (+maiorData - +menorData) * 0.02;
    const x = scaleUtc()
      .domain([new Date(+menorData - folga), new Date(+maiorData + folga)])
      .range([0, larguraUtil]);
    const y = scaleBand<string>()
      .domain(linhas.map((l) => l.tarefa))
      .range([0, alturaUtil])
      .padding(0.34);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const gGrade = g.append('g');
    const gEixoX = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const gEixoY = g.append('g');
    const gBarras = g.append('g');

    gGrade.call(
      axisBottom(x)
        .ticks(6)
        .tickSize(-alturaUtil)
        .tickFormat(() => '') as never
    );
    estilarGrade(gGrade, theme);

    gEixoX.call(
      axisBottom(x)
        .ticks(6)
        .tickSizeOuter(0)
        .tickFormat(((d: Date) => formatarDataUtc(d, { day: '2-digit', month: '2-digit' })) as never) as never
    );
    estilarEixo(gEixoX, theme, px);

    gEixoY
      .selectAll('text')
      .data(linhas, (l: unknown) => (l as (typeof linhas)[number]).tarefa)
      .join('text')
      .attr('x', -12)
      .attr('y', (l) => (y(l.tarefa) ?? 0) + y.bandwidth() / 2)
      .attr('dy', '0.32em')
      .attr('text-anchor', 'end')
      .attr('fill', theme.ink)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .text((l) => l.tarefa);

    const chaveDe = (l: (typeof linhas)[number]) => l.tarefa;
    const ehMarco = (l: (typeof linhas)[number]) => +l.dataInicio === +l.dataFim;

    const barras = gBarras
      .selectAll<SVGRectElement, (typeof linhas)[number]>('rect')
      .data(linhas.filter((l) => !ehMarco(l)), chaveDe)
      .join('rect')
      .attr('y', (l) => y(l.tarefa) ?? 0)
      .attr('height', y.bandwidth())
      .attr('rx', px(y.bandwidth() / 2))
      .attr('fill', (l) => meta.cores[l.fase])
      .attr('data-interactive', '');

    const marcos = gBarras
      .selectAll<SVGPathElement, (typeof linhas)[number]>('path')
      .data(linhas.filter(ehMarco), chaveDe)
      .join('path')
      .attr('fill', (l) => meta.cores[l.fase])
      .attr('data-interactive', '');

    function losango(cx: number, cyCentro: number, r: number): string {
      return `M${cx},${cyCentro - r} L${cx + r},${cyCentro} L${cx},${cyCentro + r} L${cx - r},${cyCentro} Z`;
    }

    function posicionar(sel: typeof barras) {
      sel.attr('x', (l) => x(l.dataInicio)).attr('width', (l) => Math.max(1, x(l.dataFim) - x(l.dataInicio)));
    }

    function posicionarMarcos(sel: typeof marcos) {
      sel.attr('d', (l) => losango(x(l.dataInicio), (y(l.tarefa) ?? 0) + y.bandwidth() / 2, px(RAIO_MARCO)));
    }

    posicionar(barras);
    posicionarMarcos(marcos);

    function duracaoEmDias(l: (typeof linhas)[number]): number {
      return Math.round((+l.dataFim - +l.dataInicio) / 86400000);
    }

    function mostrarTooltip(evento: PointerEvent, l: (typeof linhas)[number]) {
      const periodo = ehMarco(l)
        ? formatarDataUtc(l.dataInicio, { day: 'numeric', month: 'long' })
        : `${formatarDataUtc(l.dataInicio, { day: 'numeric', month: 'short' })} – ${formatarDataUtc(l.dataFim, { day: 'numeric', month: 'short' })} · ${duracaoEmDias(l)} dias`;
      tooltip.show(
        `<span class="viz-swatch" style="background:${meta.cores[l.fase]}"></span>` +
          `<strong>${l.tarefa}</strong><br>${l.fase} · ${periodo}`,
        evento
      );
    }

    barras.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());
    marcos.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());

    // -------------------------------------------------------------- realce
    // Apontar/clicar qualquer tarefa OU a legenda acende as tarefas da mesma
    // fase e apaga o resto — a fase é o agrupamento que interessa comparar,
    // não a tarefa isolada.
    function realcar(fase: string) {
      barras.attr('opacity', (l) => (l.fase === fase ? 1 : 0.25));
      marcos.attr('opacity', (l) => (l.fase === fase ? 1 : 0.25));
      legenda.attr('opacity', (f) => (f === fase ? 1 : 0.5));
    }
    function limpar() {
      barras.attr('opacity', 1);
      marcos.attr('opacity', 1);
      legenda.attr('opacity', 1);
    }

    // ------------------------------------------------------------- legenda
    const fases = Object.keys(meta.cores);
    const legenda = select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(fases)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((f) => `<span class="viz-swatch" style="background:${meta.cores[f]}"></span>${f}`);

    tornarFixavel(
      root,
      [
        { selecao: barras, chaveDe: (l: (typeof linhas)[number]) => l.fase },
        { selecao: marcos, chaveDe: (l: (typeof linhas)[number]) => l.fase },
        { selecao: legenda, chaveDe: (f: string) => f },
      ],
      realcar,
      limpar
    );

    // -------------------------------------------------------------- entrada
    // As barras crescem da esquerda pra direita em ordem cronológica de
    // início — a mesma leitura do eixo Y (topo = mais recente, base = mais
    // antigo) reforçada no tempo, não só decoração.
    if (animate) {
      barras.attr('width', 0);
      marcos
        .attr('transform', 'scale(0)')
        .attr('transform-origin', (l) => `${x(l.dataInicio)}px ${(y(l.tarefa) ?? 0) + y.bandwidth() / 2}px`);

      const delay = (_l: (typeof linhas)[number], i: number) => stagger(i, linhas.length);

      barras
        .transition()
        .delay(delay)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('width', (l) => Math.max(1, x(l.dataFim) - x(l.dataInicio)));

      marcos
        .transition()
        .delay(delay)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('transform', 'scale(1)');

      garantirEstadoFinal(DURATION.enter + 250, () => {
        posicionar(barras.interrupt());
        marcos.interrupt().attr('transform', 'scale(1)');
      });
    }
  },
};

export default chart;
