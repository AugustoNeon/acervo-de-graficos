/**
 * Boxplot clássico — cinco variações da mesma família, um switcher só.
 *
 * Mesmo princípio do barplot-classico deste acervo: as 6 caixas (uma por
 * equipe) nunca entram/saem entre os 5 estados, só mudam de posição, largura
 * e formato — cada equipe vive num único <g> transladado pela escala de
 * banda, com a geometria interna (caixa/whiskers/mediana/pontos) recalculada
 * a cada clique.
 *
 * O R só exporta os valores BRUTOS de cada equipe (`dados[].valores`); todo
 * quartil, whisker, outlier, entalhe (notch) e posição de jitter é calculado
 * aqui — nada de estatística pronta vindo do servidor, pra qualquer
 * reordenação continuar consistente sem precisar de um novo cálculo no R.
 *
 * O entalhe é a parte mais delicada: em vez de trocar de forma (retângulo vs.
 * "ampulheta"), a caixa é SEMPRE um path de 10 pontos fixos — nos estados sem
 * entalhe os 3 pontos de cada lado ficam colineares (entalhe = 0), formando
 * um retângulo comum; ligar o entalhe só afasta o ponto do meio pra dentro.
 * Isso deixa a transição entre "básico" e "entalhado" morphing suave em vez
 * de um corte seco entre duas formas — mesmo princípio de "mesma chave nunca
 * entra/sai" já usado no resto do runtime D3 do site, aplicado ponto a ponto
 * dentro de uma única forma.
 */

import {
  select,
  scaleBand,
  scaleLinear,
  axisBottom,
  axisLeft,
  quantileSorted,
  line as d3line,
  curveLinearClosed,
} from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import type { DrawContext, VizChart } from '../../types';

interface Equipe {
  equipe: string;
  valores: number[];
}

interface Dados {
  meta: { paletaEquipes: Record<string, string>; nota?: string };
  equipes: string[];
  dados: Equipe[];
}

interface Estatisticas {
  equipe: string;
  n: number;
  q1: number;
  mediana: number;
  q3: number;
  whiskerBaixo: number;
  whiskerAlto: number;
  outliers: number[];
  notchMeio: number;
  valores: number[];
}

type EstadoId = 'basico' | 'ordenado' | 'jitter' | 'notch' | 'varwidth';

const ESTADOS: { id: EstadoId; rotulo: string }[] = [
  { id: 'basico', rotulo: 'Básico' },
  { id: 'ordenado', rotulo: 'Ordenado por mediana' },
  { id: 'jitter', rotulo: 'Com jitter' },
  { id: 'notch', rotulo: 'Entalhado (notch)' },
  { id: 'varwidth', rotulo: 'Largura variável' },
];

const VB_W = 900;
const VB_H = 560;
const MARGEM = { topo: 24, dir: 24, baixo: 78, esq: 56 };
const FRACAO_CAIXA = 0.42;
const FRACAO_CAIXA_MIN = 0.14;
const FRACAO_ENTALHE = 0.55;

function calcularEstatisticas(equipe: string, valoresBrutos: number[]): Estatisticas {
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
  const outliers = valores.filter((v) => v < whiskerBaixo || v > whiskerAlto);
  // Formula de McGill (1978) pro entalhe -- a mesma que o notch=TRUE do
  // ggplot2 usa. Deliberadamente SEM travar dentro da caixa: quando a
  // amostra e pequena ou o IQR e estreito, o entalhe estoura pra fora dos
  // limites Q1/Q3 (ver "Possiveis problemas" no README) -- e um sinal
  // estatistico de verdade (a mediana daquele grupo nao tem precisao
  // suficiente pra comparar com confianca), nao um bug pra esconder.
  const notchMeio = 1.58 * (iqr / Math.sqrt(n));
  return { equipe, n, q1, mediana, q3, whiskerBaixo, whiskerAlto, outliers, notchMeio, valores };
}

/** Offset de jitter deterministico por indice -- nunca aleatorio de verdade,
 * senao um redesenho por resize reembaralharia a posicao de cada ponto. */
function offsetJitter(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) - 0.5;
}

const gerarPath = d3line<[number, number]>().curve(curveLinearClosed);

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Boxplot com cinco variações alternáveis: básico, ordenado por mediana, com jitter, entalhado ' +
    'e largura variável — mostrando o tempo de resolução de chamados por equipe de suporte.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, equipes, dados } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const stats = dados.map((d) => calcularEstatisticas(d.equipe, d.valores));
    const statsPorEquipe = new Map(stats.map((s) => [s.equipe, s]));

    const maxValor = Math.max(...stats.flatMap((s) => [s.whiskerAlto, ...s.outliers]));
    const maxN = Math.max(...stats.map((s) => s.n));

    const ordemBasica = equipes;
    const ordemMediana = [...equipes].sort(
      (a, b) => statsPorEquipe.get(b)!.mediana - statsPorEquipe.get(a)!.mediana
    );

    const xBand = scaleBand<string>().range([0, larguraUtil]).padding(0.32);
    const yLinear = scaleLinear().domain([0, maxValor * 1.12]).range([alturaUtil, 0]);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const eixoBaixoSel = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const eixoEsqSel = g.append('g');
    const gCaixas = g.append('g');

    let estadoAtual: EstadoId = 'basico';

    /** Os 10 pontos fixos do contorno da caixa (ver cabeçalho do módulo). */
    function pontosCaixa(s: Estatisticas, x0: number, x1: number, entalhado: boolean): [number, number][] {
      const indent = entalhado ? (x1 - x0) * FRACAO_ENTALHE * 0.5 : 0;
      const yQ1 = yLinear(s.q1);
      const yQ3 = yLinear(s.q3);
      const yNotchAlto = yLinear(s.mediana + s.notchMeio);
      const yNotchBaixo = yLinear(s.mediana - s.notchMeio);
      const yMed = yLinear(s.mediana);
      return [
        [x0, yQ3],
        [x1, yQ3],
        [x1, yNotchAlto],
        [x1 - indent, yMed],
        [x1, yNotchBaixo],
        [x1, yQ1],
        [x0, yQ1],
        [x0, yNotchBaixo],
        [x0 + indent, yMed],
        [x0, yNotchAlto],
      ];
    }

    function larguraCaixa(s: Estatisticas, estado: EstadoId): number {
      const base = xBand.bandwidth() * FRACAO_CAIXA;
      if (estado !== 'varwidth') return base;
      const fator = Math.sqrt(s.n / maxN);
      return Math.max(xBand.bandwidth() * FRACAO_CAIXA_MIN, base * fator);
    }

    function conteudoTooltipCaixa(s: Estatisticas): string {
      const linhaOutlier = s.outliers.length ? `<br>${s.outliers.length} valor(es) atípico(s)` : '';
      return (
        `<strong>${s.equipe}</strong> · n=${s.n}<br>` +
        `mediana <strong>${s.mediana.toFixed(1)}h</strong> · Q1 ${s.q1.toFixed(1)} · Q3 ${s.q3.toFixed(1)}` +
        linhaOutlier
      );
    }

    // ------------------------------------------------------------------ grupos
    const grupos = gCaixas
      .selectAll<SVGGElement, Estatisticas>('g.equipe')
      .data(stats, (d) => (d as Estatisticas).equipe)
      .join((enter) => {
        const eg = enter.append('g').attr('class', 'equipe').attr('data-interactive', '');
        eg.append('path').attr('class', 'caixa').attr('stroke', theme.ink).attr('stroke-width', px(1.4));
        eg.append('line').attr('class', 'mediana').attr('stroke', theme.ink).attr('stroke-width', px(2.4));
        eg.append('line').attr('class', 'whisker-topo').attr('stroke', theme.ink).attr('stroke-width', px(1.4));
        eg.append('line').attr('class', 'cap-topo').attr('stroke', theme.ink).attr('stroke-width', px(1.4));
        eg.append('line').attr('class', 'whisker-base').attr('stroke', theme.ink).attr('stroke-width', px(1.4));
        eg.append('line').attr('class', 'cap-base').attr('stroke', theme.ink).attr('stroke-width', px(1.4));
        eg.append('g').attr('class', 'outliers');
        eg.append('g').attr('class', 'jitter').attr('opacity', 0);
        return eg;
      });

    // -------------------------------------------------------------- interacao
    function realcar(sel: typeof grupos, foco: string | null) {
      sel
        .transition('foco')
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('opacity', (d) => (foco === null || d.equipe === foco ? 1 : 0.32));
    }

    grupos
      .on('pointerenter', function (evento: PointerEvent, d) {
        realcar(grupos, d.equipe);
        tooltip.show(conteudoTooltipCaixa(d), evento);
      })
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(conteudoTooltipCaixa(d), evento))
      .on('pointerleave', () => {
        realcar(grupos, null);
        tooltip.hide();
      });

    // --------------------------------------------------------------- desenho
    function aplicarEstado(id: EstadoId, transicao: boolean) {
      estadoAtual = id;
      const ordem = id === 'basico' ? ordemBasica : ordemMediana;
      xBand.domain(ordem);

      const tGrupo = transicao ? grupos.transition().duration(DURATION.slow).ease(EASE_STATE) : grupos;
      tGrupo.attr('transform', (d) => `translate(${xBand(d.equipe) ?? 0},0)`);

      grupos.each(function (s) {
        const sel = select(this);
        const bw = xBand.bandwidth();
        const meia = larguraCaixa(s, id) / 2;
        const centro = bw / 2;
        const x0 = centro - meia;
        const x1 = centro + meia;
        const entalhado = id === 'notch';
        const pontos = pontosCaixa(s, x0, x1, entalhado);

        const caixaSel = sel.select<SVGPathElement>('path.caixa');
        const tCaixa = transicao ? caixaSel.transition().duration(DURATION.slow).ease(EASE_STATE) : caixaSel;
        tCaixa
          .attr('d', gerarPath(pontos))
          .attr('fill', meta.paletaEquipes[s.equipe] ?? theme.primary)
          .attr('fill-opacity', id === 'jitter' ? 0.5 : 0.85);

        const yMed = yLinear(s.mediana);
        const medSel = sel.select<SVGLineElement>('line.mediana');
        const tMed = transicao ? medSel.transition().duration(DURATION.slow).ease(EASE_STATE) : medSel;
        tMed.attr('x1', x0).attr('x2', x1).attr('y1', yMed).attr('y2', yMed);

        const capW = meia * 0.6;
        const yWTopo = yLinear(s.whiskerAlto);
        const yWBase = yLinear(s.whiskerBaixo);
        const yQ3 = yLinear(s.q3);
        const yQ1 = yLinear(s.q1);

        const linhas: [string, number, number, number, number][] = [
          ['line.whisker-topo', centro, centro, yQ3, yWTopo],
          ['line.cap-topo', centro - capW, centro + capW, yWTopo, yWTopo],
          ['line.whisker-base', centro, centro, yQ1, yWBase],
          ['line.cap-base', centro - capW, centro + capW, yWBase, yWBase],
        ];
        for (const [seletor, xx1, xx2, yy1, yy2] of linhas) {
          const elSel = sel.select<SVGLineElement>(seletor);
          const t = transicao ? elSel.transition().duration(DURATION.slow).ease(EASE_STATE) : elSel;
          t.attr('x1', xx1).attr('x2', xx2).attr('y1', yy1).attr('y2', yy2);
        }

        // -------------------------------------------------------- outliers
        const outSel = sel
          .select('g.outliers')
          .selectAll<SVGCircleElement, number>('circle')
          .data(id === 'jitter' ? [] : s.outliers)
          .join(
            (enter) => enter.append('circle').attr('r', px(3)).attr('cx', centro).attr('cy', (v) => yLinear(v)),
            (update) => update,
            (exit) => exit.remove()
          )
          .attr('fill', meta.paletaEquipes[s.equipe] ?? theme.primary)
          .attr('stroke', theme.ink)
          .attr('stroke-width', px(0.8))
          .on('pointerenter', (evento: PointerEvent, v: number) => {
            tooltip.show(`<strong>${s.equipe}</strong><br>${v.toFixed(1)}h (atípico)`, evento);
          })
          // stopPropagation: pointermove borbulha (ao contrario de
          // pointerenter/pointerleave) -- sem isso o handler do <g> pai
          // tambem dispara pra cima e troca o tooltip de volta pro resumo
          // da caixa a cada movimento sobre o ponto.
          .on('pointermove', (evento: PointerEvent, v: number) => {
            evento.stopPropagation();
            tooltip.show(`<strong>${s.equipe}</strong><br>${v.toFixed(1)}h (atípico)`, evento);
          })
          .on('pointerleave', () => tooltip.hide());
        const tOut = transicao ? outSel.transition().duration(DURATION.slow).ease(EASE_STATE) : outSel;
        tOut.attr('cx', centro).attr('cy', (v) => yLinear(v));

        // ---------------------------------------------------------- jitter
        const jitterG = sel.select('g.jitter');
        const jitterSel = jitterG
          .selectAll<SVGCircleElement, number>('circle')
          .data(s.valores)
          .join(
            (enter) =>
              enter
                .append('circle')
                .attr('r', px(2.4))
                .attr('cx', (_v, i) => centro + offsetJitter(i) * bw * 0.68)
                .attr('cy', (v) => yLinear(v)),
            (update) => update,
            (exit) => exit.remove()
          )
          .attr('fill', theme.ink)
          .attr('fill-opacity', 0.55)
          .on('pointerenter', (evento: PointerEvent, v: number) => {
            tooltip.show(`<strong>${s.equipe}</strong><br>${v.toFixed(1)}h`, evento);
          })
          .on('pointermove', (evento: PointerEvent, v: number) => {
            evento.stopPropagation();
            tooltip.show(`<strong>${s.equipe}</strong><br>${v.toFixed(1)}h`, evento);
          })
          .on('pointerleave', () => tooltip.hide());
        const tJitter = transicao ? jitterSel.transition().duration(DURATION.slow).ease(EASE_STATE) : jitterSel;
        tJitter.attr('cx', (_v, i) => centro + offsetJitter(i) * bw * 0.68).attr('cy', (v) => yLinear(v));

        const tJitterG = transicao ? jitterG.transition().duration(DURATION.base) : jitterG;
        tJitterG.attr('opacity', id === 'jitter' ? 1 : 0);
      });

      desenharEixo(transicao);
      botoes.attr('aria-pressed', (m) => String(m.id === id));
    }

    function desenharEixo(transicao: boolean) {
      const baixoSel = transicao ? eixoBaixoSel.transition().duration(DURATION.slow).ease(EASE_STATE) : eixoBaixoSel;
      baixoSel.call(axisBottom(xBand).tickSizeOuter(0));
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

    aplicarEstado('basico', false);

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // So o <g> de cada equipe entra em opacidade, escalonado -- a geometria
    // interna (caixa/whiskers/mediana) ja nasce no estado final "basico",
    // calculada por aplicarEstado() acima. Transicao NOMEADA ('entrada') pra
    // nao colidir com a transicao sem nome que aplicarEstado() dispara se o
    // usuario clicar num botao de estado antes dela terminar (ver AGENTS.md,
    // licao sobre transicoes D3 nomeadas).
    if (animate) {
      grupos.attr('opacity', 0);
      grupos
        .transition('entrada')
        .delay((_d, i) => stagger(i, stats.length))
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
