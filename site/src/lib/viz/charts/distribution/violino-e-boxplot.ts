/**
 * Violino + boxplot — três variações da mesma família, um switcher só:
 * violino puro, violino com uma caixa fina por dentro, e meio-violino com
 * pontos individuais (raincloud plot).
 *
 * O R só exporta os valores BRUTOS de cada provedor; o KDE (kernel gaussiano,
 * largura de Silverman) vem de `shared/densidade.ts` — a mesma função do
 * ridgeline deste acervo, extraída de lá quando este gráfico passou a
 * precisar da mesma técnica. Os quartis da caixa interna são recalculados
 * aqui do mesmo jeito que no boxplot-classico (Tukey, sem herdar do R).
 *
 * A forma do violino é SEMPRE a mesma <path> de área (mesma técnica de "não
 * criar/destruir elemento" já usada no boxplot-classico e no chord deste
 * acervo, agora aplicada a uma curva em vez de um polígono): no estado
 * "violino"/"violino + caixa" as duas bordas (esquerda e direita) se afastam
 * do centro pela densidade; no "meio violino" a borda esquerda fica presa no
 * centro (achatada) e só a direita continua curvando — a mesma curva, só que
 * com metade dela grudada numa linha reta, o que faz a transição entre os
 * três estados "derreter" de uma forma pra outra em vez de trocar de figura.
 */

import {
  select,
  scaleBand,
  scaleLinear,
  axisBottom,
  axisLeft,
  quantileSorted,
  area as d3area,
  curveBasis,
  max as d3max,
} from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import { estimarDensidade } from '../../shared/densidade';
import type { DrawContext, VizChart } from '../../types';

interface Provedor {
  provedor: string;
  valores: number[];
}

interface Dados {
  meta: { ordem: string[]; paletaProvedores: Record<string, string>; nota?: string };
  provedores: Provedor[];
}

interface Curva {
  provedor: string;
  n: number;
  pontos: [number, number][]; // [valor, densidade normalizada 0..1]
  q1: number;
  mediana: number;
  q3: number;
  whiskerBaixo: number;
  whiskerAlto: number;
  valores: number[];
}

type EstadoId = 'violino' | 'caixa' | 'raincloud';

const ESTADOS: { id: EstadoId; rotulo: string }[] = [
  { id: 'violino', rotulo: 'Violino' },
  { id: 'caixa', rotulo: 'Violino + caixa' },
  { id: 'raincloud', rotulo: 'Meio violino + pontos' },
];

const VB_W = 900;
const VB_H = 560;
const MARGEM = { topo: 24, dir: 24, baixo: 78, esq: 56 };
const FRACAO_VIOLINO = 0.42;
const FRACAO_CAIXA = 0.11;
const N_AMOSTRAS = 120;

function calcularCurva(provedor: string, valoresBrutos: number[], yMax: number): Curva {
  const valores = [...valoresBrutos].sort((a, b) => a - b);
  const n = valores.length;
  const q1 = quantileSorted(valores, 0.25)!;
  const mediana = quantileSorted(valores, 0.5)!;
  const q3 = quantileSorted(valores, 0.75)!;
  const iqr = q3 - q1;
  const cercaBaixa = q1 - 1.5 * iqr;
  const cercaAlta = q3 + 1.5 * iqr;
  const dentro = valores.filter((v) => v >= cercaBaixa && v <= cercaAlta);
  const whiskerBaixo = dentro.length ? Math.min(...dentro) : q1;
  const whiskerAlto = dentro.length ? Math.max(...dentro) : q3;

  const ys = Array.from({ length: N_AMOSTRAS + 1 }, (_, i) => (i * yMax) / N_AMOSTRAS);
  const bruta = estimarDensidade(valores, ys);
  // scale="width": cada violino normalizado pelo PRÓPRIO pico, não por um
  // pico global -- assim todo provedor ocupa a mesma largura máxima, igual
  // ao `geom_violin(scale = "width")` usado na miniatura estática.
  const picoLocal = d3max(bruta, (d) => d[1]) || 1;
  const pontos: [number, number][] = bruta.map(([v, d]) => [v, d / picoLocal]);

  return { provedor, n, pontos, q1, mediana, q3, whiskerBaixo, whiskerAlto, valores };
}

/** Offset de jitter deterministico por indice -- ver boxplot-classico deste
 * acervo pro motivo (nunca aleatorio de verdade, senao um redesenho por
 * resize reembaralharia a posicao de cada ponto). */
function offsetJitter(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Violino com três variações alternáveis: violino puro, violino com caixa por dentro e meio-violino ' +
    'com pontos (raincloud) — mostrando a velocidade de download de cinco provedores de internet fictícios.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, provedores } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const maxBruto = Math.max(...provedores.flatMap((p) => p.valores));
    const yMax = maxBruto * 1.08;

    const curvas = provedores.map((p) => calcularCurva(p.provedor, p.valores, yMax));

    const xBand = scaleBand<string>().domain(meta.ordem).range([0, larguraUtil]).padding(0.34);
    const yLinear = scaleLinear().domain([0, yMax]).range([alturaUtil, 0]);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const eixoBaixoSel = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const eixoEsqSel = g.append('g');
    const gCurvas = g.append('g');

    let estadoAtual: EstadoId = 'violino';

    function conteudoTooltip(c: Curva): string {
      return (
        `<strong>${c.provedor}</strong> · n=${c.n}<br>` +
        `mediana <strong>${c.mediana.toFixed(0)} Mbps</strong> · Q1 ${c.q1.toFixed(0)} · Q3 ${c.q3.toFixed(0)}`
      );
    }

    const grupos = gCurvas
      .selectAll<SVGGElement, Curva>('g.provedor')
      .data(curvas, (d) => (d as Curva).provedor)
      .join((enter) => {
        const eg = enter
          .append('g')
          .attr('class', 'provedor')
          .attr('data-interactive', '')
          .attr('transform', (d) => `translate(${xBand(d.provedor) ?? 0},0)`);
        eg.append('path').attr('class', 'violino').attr('stroke', theme.ink).attr('stroke-width', px(1.4));
        const caixa = eg.append('g').attr('class', 'caixa-interna').attr('opacity', 0);
        caixa.append('line').attr('class', 'whisker-topo').attr('stroke', theme.ink).attr('stroke-width', px(1.2));
        caixa.append('line').attr('class', 'whisker-base').attr('stroke', theme.ink).attr('stroke-width', px(1.2));
        caixa.append('rect').attr('class', 'caixa-retangulo').attr('stroke', theme.ink).attr('stroke-width', px(1.2)).attr('fill', theme.surface);
        caixa.append('line').attr('class', 'mediana').attr('stroke', theme.ink).attr('stroke-width', px(2));
        eg.append('g').attr('class', 'raincloud').attr('opacity', 0);
        return eg;
      });

    function realcar(foco: string | null) {
      grupos
        .transition('foco')
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('opacity', (d) => (foco === null || d.provedor === foco ? 1 : 0.32));
    }

    grupos
      .on('pointerenter', function (evento: PointerEvent, d) {
        realcar(d.provedor);
        tooltip.show(conteudoTooltip(d), evento);
      })
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(conteudoTooltip(d), evento))
      .on('pointerleave', () => {
        realcar(null);
        tooltip.hide();
      });

    const gerarArea = d3area<[number, number]>().curve(curveBasis);

    function aplicarEstado(id: EstadoId, transicao: boolean) {
      estadoAtual = id;
      const meio = id === 'raincloud';

      grupos.each(function (c) {
        const sel = select(this);
        const bw = xBand.bandwidth();
        const centro = bw / 2;
        const larguraMax = bw * FRACAO_VIOLINO;

        gerarArea
          .y((d) => yLinear(d[0]))
          .x0((d) => (meio ? centro : centro - d[1] * larguraMax))
          .x1((d) => centro + d[1] * larguraMax);

        const violinoSel = sel.select<SVGPathElement>('path.violino');
        const tViolino = transicao ? violinoSel.transition().duration(DURATION.slow).ease(EASE_STATE) : violinoSel;
        tViolino
          .attr('d', gerarArea(c.pontos))
          .attr('fill', meta.paletaProvedores[c.provedor] ?? theme.primary)
          .attr('fill-opacity', id === 'caixa' ? 0.72 : 0.85);

        // ------------------------------------------------------- caixa interna
        const larguraCaixa = bw * FRACAO_CAIXA;
        const x0Caixa = centro - larguraCaixa / 2;
        const yQ1 = yLinear(c.q1);
        const yQ3 = yLinear(c.q3);
        const yMed = yLinear(c.mediana);
        const yWTopo = yLinear(c.whiskerAlto);
        const yWBase = yLinear(c.whiskerBaixo);

        const caixaG = sel.select('g.caixa-interna');
        const tCaixaG = transicao ? caixaG.transition().duration(DURATION.base) : caixaG;
        tCaixaG.attr('opacity', id === 'caixa' ? 1 : 0);

        const aplicarLinha = (seletor: string, x1: number, x2: number, y1: number, y2: number) => {
          const elSel = sel.select<SVGLineElement>(seletor);
          const t = transicao ? elSel.transition().duration(DURATION.slow).ease(EASE_STATE) : elSel;
          t.attr('x1', x1).attr('x2', x2).attr('y1', y1).attr('y2', y2);
        };
        aplicarLinha('line.whisker-topo', centro, centro, yQ3, yWTopo);
        aplicarLinha('line.whisker-base', centro, centro, yQ1, yWBase);
        aplicarLinha('line.mediana', x0Caixa, x0Caixa + larguraCaixa, yMed, yMed);

        const retSel = sel.select<SVGRectElement>('rect.caixa-retangulo');
        const tRet = transicao ? retSel.transition().duration(DURATION.slow).ease(EASE_STATE) : retSel;
        tRet.attr('x', x0Caixa).attr('y', yQ3).attr('width', larguraCaixa).attr('height', Math.max(yQ1 - yQ3, 0.5));

        // ------------------------------------------------------------- raincloud
        const raincloudG = sel.select('g.raincloud');
        const tRaincloudG = transicao ? raincloudG.transition().duration(DURATION.base) : raincloudG;
        tRaincloudG.attr('opacity', id === 'raincloud' ? 1 : 0);

        const pontosSel = raincloudG
          .selectAll<SVGCircleElement, number>('circle')
          .data(c.valores)
          .join(
            (enter) =>
              enter
                .append('circle')
                .attr('r', px(2.2))
                .attr('fill', theme.ink)
                .attr('fill-opacity', 0.5)
                .attr('cx', (_v, i) => centro - bw * 0.06 - offsetJitter(i) * bw * 0.32)
                .attr('cy', (v) => yLinear(v)),
            (update) => update,
            (exit) => exit.remove()
          )
          .on('pointerenter', (evento: PointerEvent, v: number) => {
            tooltip.show(`<strong>${c.provedor}</strong><br>${v.toFixed(1)} Mbps`, evento);
          })
          .on('pointermove', (evento: PointerEvent, v: number) => {
            evento.stopPropagation();
            tooltip.show(`<strong>${c.provedor}</strong><br>${v.toFixed(1)} Mbps`, evento);
          })
          .on('pointerleave', () => tooltip.hide());
        const tPontos = transicao ? pontosSel.transition().duration(DURATION.slow).ease(EASE_STATE) : pontosSel;
        tPontos.attr('cx', (_v, i) => centro - bw * 0.06 - offsetJitter(i) * bw * 0.32).attr('cy', (v) => yLinear(v));
      });

      botoes.attr('aria-pressed', (m) => String(m.id === id));
    }

    function desenharEixo() {
      eixoBaixoSel.call(axisBottom(xBand).tickSizeOuter(0));
      eixoEsqSel.call(axisLeft(yLinear).ticks(6).tickSizeOuter(0));
      estilarEixo(eixoBaixoSel, theme, px);
      estilarEixo(eixoEsqSel, theme, px);
      eixoBaixoSel
        .selectAll('text')
        .attr('transform', 'rotate(-30)')
        .attr('text-anchor', 'end')
        .attr('dx', '-0.6em')
        .attr('dy', '0.2em');
    }
    desenharEixo();

    const controles = select(root).append('div').attr('class', 'viz-controles');
    const botoes = controles
      .selectAll('button')
      .data(ESTADOS)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .attr('aria-pressed', (m) => String(m.id === estadoAtual))
      .text((m) => m.rotulo)
      .on('click', (_e, m) => {
        if (m.id === estadoAtual) return;
        aplicarEstado(m.id, true);
      });

    aplicarEstado('violino', false);

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    if (animate) {
      grupos.attr('opacity', 0);
      grupos
        .transition('entrada')
        .delay((_d, i) => stagger(i, curvas.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + 300, () => {
        grupos.interrupt('entrada').attr('opacity', 1);
      });
    }
  },
};

export default chart;
