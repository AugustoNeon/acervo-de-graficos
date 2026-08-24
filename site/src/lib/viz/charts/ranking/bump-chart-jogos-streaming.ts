/**
 * Bump chart (ranking mensal) — versão em D3.
 *
 * Ao contrário do resto de `ranking` (barplot, lollipop, radar, circular
 * barplot), que são todos um retrato parado de uma posição só, este gráfico
 * acompanha a MESMA posição (1º, 2º, 3º...) mudando de dono mês a mês — cada
 * jogo é uma linha, a altura da linha é a posição no ranking naquele mês. O
 * script.R só exporta a série longa (jogo, mês, posição, pontuação) e a cor
 * de cada jogo; a curva de cada linha e a posição de cada ponto são
 * recalculadas aqui a partir de duas escalas lineares (mês → x, posição → y).
 */

import { axisBottom, axisLeft, curveMonotoneX, line, pointer, range, scaleLinear, select } from 'd3';
import { estilarEixo, estilarGrade } from '../../shared/cartesiano';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Mes {
  mes: number;
  rotulo: string;
}

interface Jogo {
  jogo: string;
  cor: string;
}

interface Ponto {
  jogo: string;
  mes: number;
  rank: number;
  pontuacao: number;
}

interface Dados {
  meta: { nota?: string };
  meses: Mes[];
  jogos: Jogo[];
  pontos: Ponto[];
}

type Serie = [string, Ponto[]];

const VB_W = 900;
const VB_H = 560;
// `esq`/`dir` reservam espaço pro NOME do jogo nas pontas de cada linha (ver
// rotuloTexto abaixo); o eixo numerico (1º, 2º...) fica ainda mais a
// esquerda, em EIXO_Y_X, com folga pra não colidir com esses rótulos.
const MARGEM = { topo: 16, base: 34, esq: 194, dir: 148 };
const EIXO_Y_X = 40;
const OPACIDADE_APAGADA = 0.15;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label: 'Bump chart: posição de 7 jogos no ranking mensal de audiência, ao longo de 12 meses.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, meses, jogos, pontos } = data as Dados;
    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;

    const x = scaleLinear()
      .domain([1, meses.length])
      .range([MARGEM.esq, VB_W - MARGEM.dir]);
    const y = scaleLinear()
      .domain([1, jogos.length])
      .range([MARGEM.topo, VB_H - MARGEM.base]);

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const rotuloMes = new Map(meses.map((m) => [m.mes, m.rotulo]));
    const corDoJogo = new Map(jogos.map((j) => [j.jogo, j.cor]));
    const porJogo = new Map<string, Ponto[]>();
    pontos.forEach((p) => {
      if (!porJogo.has(p.jogo)) porJogo.set(p.jogo, []);
      porJogo.get(p.jogo)!.push(p);
    });
    porJogo.forEach((serie) => serie.sort((a, b) => a.mes - b.mes));
    const series: Serie[] = jogos.map((j) => [j.jogo, porJogo.get(j.jogo) ?? []]);

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    // ------------------------------------------------------------------ grade
    const gGrade = svg.append('g');
    gGrade.call(
      axisLeft(y)
        .tickValues(range(1, jogos.length + 1))
        .tickSize(-larguraUtil)
        .tickFormat(() => '')
    );
    gGrade.attr('transform', `translate(${MARGEM.esq},0)`);
    estilarGrade(gGrade, theme);

    const eixoEsq = svg
      .append('g')
      .attr('transform', `translate(${EIXO_Y_X},0)`)
      .call(
        axisLeft(y)
          .tickValues(range(1, jogos.length + 1))
          .tickFormat((d) => `${d}º`)
          .tickSizeOuter(0)
      );
    estilarEixo(eixoEsq, theme, px);
    eixoEsq.select('.domain').remove();

    svg
      .append('text')
      .attr('transform', `translate(14,${(MARGEM.topo + VB_H - MARGEM.base) / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .attr('fill', theme.inkMuted)
      .text('Posição no ranking');

    const eixoBaixo = svg
      .append('g')
      .attr('transform', `translate(0,${VB_H - MARGEM.base})`)
      .call(
        axisBottom(x)
          .tickValues(meses.map((m) => m.mes))
          .tickFormat((d) => rotuloMes.get(d as number) ?? String(d))
          .tickSizeOuter(0)
      );
    estilarEixo(eixoBaixo, theme, px);

    // ------------------------------------------------------------------ linhas
    const gerarLinha = line<Ponto>()
      .x((d) => x(d.mes))
      .y((d) => y(d.rank))
      .curve(curveMonotoneX);

    const camadaSeries = svg.append('g');
    const seriesG = camadaSeries
      .selectAll<SVGGElement, Serie>('g.serie')
      .data(series)
      .join('g')
      .attr('class', 'serie')
      .attr('data-interactive', '');

    const linhas = seriesG
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', ([jogo]) => corDoJogo.get(jogo) ?? theme.accent)
      .attr('stroke-width', px(3))
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', ([, serie]) => gerarLinha(serie));

    const pontosSel = seriesG
      .selectAll<SVGCircleElement, Ponto>('circle')
      .data(([, serie]) => serie)
      .join('circle')
      .attr('cx', (d) => x(d.mes))
      .attr('cy', (d) => y(d.rank))
      .attr('r', px(4.5))
      .attr('fill', (d) => corDoJogo.get(d.jogo) ?? theme.accent)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1.5));

    const rotuloTexto = (lado: 'esq' | 'dir') => (sel: import('d3').Selection<SVGTextElement, Serie, SVGGElement, unknown>) =>
      sel
        .attr('x', ([, serie]) => x((lado === 'esq' ? serie[0] : serie[serie.length - 1]).mes) + (lado === 'esq' ? -12 : 12))
        .attr('y', ([, serie]) => y((lado === 'esq' ? serie[0] : serie[serie.length - 1]).rank))
        .attr('dy', '0.32em')
        .attr('text-anchor', lado === 'esq' ? 'end' : 'start')
        .attr('font-family', theme.fontBody)
        .attr('font-weight', 700)
        .attr('font-size', px(12.5))
        .attr('fill', ([jogo]) => corDoJogo.get(jogo) ?? theme.ink)
        .text(([jogo]) => jogo);

    const rotulosEsq = seriesG.append('text').call(rotuloTexto('esq'));
    const rotulosDir = seriesG.append('text').call(rotuloTexto('dir'));

    // -------------------------------------------------------------- interacao
    const realcar = (chave: string | null) => {
      linhas
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('stroke-opacity', ([jogo]) => (chave === null || jogo === chave ? 1 : OPACIDADE_APAGADA))
        .attr('stroke-width', ([jogo]) => px(chave !== null && jogo === chave ? 4.5 : 3));

      pontosSel
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('opacity', (d) => (chave === null || d.jogo === chave ? 1 : OPACIDADE_APAGADA));

      [rotulosEsq, rotulosDir].forEach((sel) =>
        sel
          .transition()
          .duration(DURATION.fast)
          .ease(EASE_STATE)
          .attr('opacity', ([jogo]) => (chave === null || jogo === chave ? 1 : OPACIDADE_APAGADA))
      );

      if (chave !== null) {
        seriesG.filter(([jogo]) => jogo === chave).raise();
      }
    };

    const tooltipPonto = (d: Ponto) =>
      `<strong>${d.jogo}</strong><br>${rotuloMes.get(d.mes) ?? d.mes} — ${d.rank}º lugar<br>pontuação ${Math.round(d.pontuacao)}`;

    pontosSel
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(tooltipPonto(d), evento))
      .on('pointerleave', () => tooltip.hide());

    seriesG
      .on('pointermove', function (evento: PointerEvent, [, serie]) {
        const [px0] = pointer(evento, this);
        const mesAlvo = x.invert(px0);
        let maisPerto = serie[0];
        let menorDist = Infinity;
        serie.forEach((p) => {
          const dist = Math.abs(p.mes - mesAlvo);
          if (dist < menorDist) {
            menorDist = dist;
            maisPerto = p;
          }
        });
        tooltip.show(tooltipPonto(maisPerto), evento);
      })
      .on('pointerleave', () => tooltip.hide());

    tornarFixavel(root, { selecao: seriesG, chaveDe: ([jogo]: Serie) => jogo }, realcar, () => realcar(null));

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // Cada linha se desenha da esquerda pra direita (stroke-dasharray), uma
    // depois da outra; pontos e rótulos aparecem por cima ao final de cada
    // linha -- ver a posição "se formar" mês a mês acompanha a leitura
    // natural do gráfico, mesmo espírito da entrada em cascata do Sankey e
    // do aluvial deste acervo.
    if (animate) {
      const atraso = (i: number) => stagger(i, jogos.length, 900);

      linhas.each(function () {
        const total = (this as SVGPathElement).getTotalLength();
        select(this).attr('stroke-dasharray', `${total} ${total}`).attr('stroke-dashoffset', total);
      });

      linhas
        .transition()
        .delay((_d, i) => atraso(i))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('stroke-dashoffset', 0);

      pontosSel
        .attr('opacity', 0)
        .transition()
        .delay((d, i, nodes) => {
          const indiceSerie = series.findIndex(([jogo]) => jogo === d.jogo);
          void i;
          void nodes;
          return atraso(indiceSerie) + DURATION.enter * 0.7;
        })
        .duration(DURATION.base)
        .attr('opacity', 1);

      [rotulosEsq, rotulosDir].forEach((sel) =>
        sel
          .attr('opacity', 0)
          .transition()
          .delay((_d, i) => atraso(i) + DURATION.enter * 0.85)
          .duration(DURATION.base)
          .attr('opacity', 1)
      );

      const duracaoTotal = atraso(jogos.length - 1) + DURATION.enter + DURATION.base;
      garantirEstadoFinal(duracaoTotal, () => {
        linhas.interrupt().attr('stroke-dashoffset', 0);
        pontosSel.interrupt().attr('opacity', 1);
        rotulosEsq.interrupt().attr('opacity', 1);
        rotulosDir.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
