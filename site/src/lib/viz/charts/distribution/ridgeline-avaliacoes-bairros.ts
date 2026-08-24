/**
 * Ridgeline plot (joyplot) — avaliações por bairro, cor em gradiente pela
 * própria nota.
 *
 * Não existe widget R pronto pra ridgeline, então o R só exporta as notas
 * brutas por bairro (mesmas que geraram o `output.png`) — o D3 recalcula sua
 * própria estimativa de densidade (kernel gaussiano, largura de banda de
 * Silverman por bairro, ver `shared/densidade.ts`) em vez de importar a curva
 * já calculada pelo `ggridges`. A paridade visual vem da mesma família de
 * técnica (KDE + gradiente de cor pela nota), não de reimportar a curva
 * exata.
 *
 * Cada faixa é desenhada em coordenadas absolutas (sem `<g transform>` por
 * linha) de propósito: o gradiente horizontal usa `gradientUnits="userSpaceOnUse"`
 * alinhado à mesma escala X de todas as faixas, e um transform por linha
 * exigiria realinhar o gradiente a cada uma.
 */

import { select, scaleLinear, scaleBand, scaleSequential, interpolateRdYlGn, axisBottom, axisLeft, area, curveBasis } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE } from '../../motion';
import { estilarEixo, estilarGrade } from '../../shared/cartesiano';
import { estimarDensidade, densidadeEm } from '../../shared/densidade';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Bairro {
  bairro: string;
  valores: number[];
}

interface Dados {
  meta: { ordem: string[]; dominio: [number, number]; nota?: string };
  bairros: Bairro[];
}

const VB_W = 900;
const VB_H = 640;
const MARGEM = { topo: 50, dir: 24, baixo: 44, esq: 148 };
const OVERLAP = 2.3;
const N_AMOSTRAS = 200;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Ridgeline plot: distribuição das notas de avaliação em oito bairros fictícios, coloridas ' +
    'em gradiente pela própria nota, do vermelho (nota baixa) ao verde (nota alta).',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, bairros } = data as Dados;
    const [notaMin, notaMax] = meta.dominio;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const xs = Array.from({ length: N_AMOSTRAS + 1 }, (_, i) => notaMin + (i * (notaMax - notaMin)) / N_AMOSTRAS);
    const porBairro = new Map(bairros.map((b) => [b.bairro, b]));
    const curvas = new Map(bairros.map((b) => [b.bairro, estimarDensidade(b.valores, xs)]));
    const maxDensidade = Math.max(...[...curvas.values()].flatMap((c) => c.map((p) => p[1])));

    const x = scaleLinear().domain([notaMin, notaMax]).range([0, larguraUtil]);
    // Domínio invertido: ordem[0] (menor mediana) precisa cair no fim do
    // range (embaixo), ordem[último] (maior mediana) no início (em cima).
    const yBand = scaleBand<string>().domain([...meta.ordem].reverse()).range([0, alturaUtil]);
    const peakScale = (yBand.bandwidth() * OVERLAP) / maxDensidade;
    const baseline = (bairro: string) => (yBand(bairro) ?? 0) + yBand.bandwidth() / 2;

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const defs = svg.append('defs');
    const NOTA_STOPS = 12;
    const cor = scaleSequential(interpolateRdYlGn).domain([notaMin, notaMax]);
    defs
      .append('linearGradient')
      .attr('id', 'ridge-gradiente-nota')
      .attr('gradientUnits', 'userSpaceOnUse')
      .attr('x1', x(notaMin))
      .attr('x2', x(notaMax))
      .attr('y1', 0)
      .attr('y2', 0)
      .selectAll('stop')
      .data(Array.from({ length: NOTA_STOPS + 1 }, (_, i) => i / NOTA_STOPS))
      .join('stop')
      .attr('offset', (t) => `${t * 100}%`)
      .attr('stop-color', (t) => cor(notaMin + t * (notaMax - notaMin)));

    // Grade vertical de fundo, atrás das faixas.
    estilarGrade(
      g.append('g').call(axisBottom(x).ticks(6).tickSize(-alturaUtil).tickFormat(() => '')),
      theme
    );

    const gFaixas = g.append('g');

    const gerarArea = area<[number, number]>()
      .x((d) => x(d[0]))
      .y0(0)
      .y1((d) => -d[1] * peakScale)
      .curve(curveBasis);

    // Desenha de trás (maior mediana, topo) pra frente (menor mediana,
    // embaixo) — a faixa de baixo fica por cima da de cima onde os picos se
    // encostam, o efeito clássico de ridgeline.
    const ordemDesenho = [...meta.ordem].reverse();
    const faixas = gFaixas
      .selectAll<SVGGElement, string>('g.faixa')
      .data(ordemDesenho, (b) => b)
      .join('g')
      .attr('class', 'faixa')
      .attr('data-interactive', '')
      .attr('transform', (b) => `translate(0,${baseline(b)})`);

    faixas
      .append('path')
      .attr('fill', 'url(#ridge-gradiente-nota)')
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1.4))
      .attr('d', (b) => gerarArea(curvas.get(b)!));

    function conteudoTooltip(bairro: string, notaCursor: number): string {
      const d = densidadeEm(curvas.get(bairro)!, notaCursor);
      return `<strong>${bairro}</strong><br>nota ≈ ${notaCursor.toFixed(1)} · densidade ≈ ${d.toFixed(3)}`;
    }

    function realcar(foco: string) {
      faixas.transition('realce').duration(DURATION.fast).attr('opacity', (b) => (b === foco ? 1 : 0.4));
      faixas.filter((b) => b === foco).raise();
      faixas.selectAll('path').transition('realce-traco').duration(DURATION.fast).attr('stroke', (b) => (b === foco ? theme.ink : theme.bg));
    }
    function limpar() {
      faixas.transition('realce').duration(DURATION.fast).attr('opacity', 1);
      faixas.selectAll('path').transition('realce-traco').duration(DURATION.fast).attr('stroke', theme.bg);
    }

    faixas
      .on('pointermove', function (evento: PointerEvent, bairro: string) {
        const rectSvg = (svg.node() as SVGSVGElement).getBoundingClientRect();
        const xLocal = ((evento.clientX - rectSvg.left) / rectSvg.width) * VB_W - MARGEM.esq;
        const notaCursor = Math.min(notaMax, Math.max(notaMin, x.invert(xLocal)));
        tooltip.show(conteudoTooltip(bairro, notaCursor), evento);
      })
      .on('pointerleave', () => tooltip.hide());

    tornarFixavel(root, { selecao: faixas, chaveDe: (b: string) => b }, realcar, limpar);

    estilarEixo(g.append('g').attr('transform', `translate(0,${alturaUtil})`).call(axisBottom(x).ticks(6).tickSizeOuter(0)), theme, px);

    const eixoEsq = g.append('g').call(axisLeft(yBand).tickSize(0));
    eixoEsq.select('.domain').remove();
    estilarEixo(eixoEsq, theme, px);

    g.append('text')
      .attr('x', larguraUtil / 2)
      .attr('y', alturaUtil + px(36))
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(12))
      .text('Nota de avaliação (0–10)');

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    if (animate) {
      faixas.attr('opacity', 0).attr('transform', (b) => `translate(0,${baseline(b) + 10})`);
      faixas
        .transition()
        .delay((_b, i) => i * 60)
        .duration(DURATION.enter * 0.7)
        .ease(EASE_ENTER)
        .attr('opacity', 1)
        .attr('transform', (b) => `translate(0,${baseline(b)})`);
    }
  },
};

export default chart;
