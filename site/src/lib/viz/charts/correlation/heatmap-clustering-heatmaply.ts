/**
 * Heatmap com clustering hierárquico — versão interativa.
 *
 * O R já entrega a ordem clusterizada e as duas árvores de agrupamento
 * (convertidas de `hclust$merge` pra uma lista aninhada, com a folha
 * guardando sua POSIÇÃO no clustering, não o índice original) — o D3 só
 * calcula onde cada nó cai no espaço (posição = mesma escala de banda usada
 * pra desenhar a célula; altura = distância do merge) e traça os segmentos
 * em "cotovelo" clássicos de dendrograma. Nenhum clustering é recalculado
 * aqui, ao contrário dos gráficos de densidade/contorno deste acervo — a
 * árvore em si é barata de exportar (ao contrário de um polígono com furos),
 * então a paridade vem de reaproveitar a mesma árvore, não de recalculá-la.
 */

import { select, scaleBand, scaleLinear, scaleSequential, interpolateMagma, pointer } from 'd3';
import { DURATION, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Celula {
  linha: number;
  coluna: number;
  valor: number;
  escalado: number;
}

type NoArvore = { folha: true; posicao: number } | { altura: number; filhos: [NoArvore, NoArvore] };

interface Dados {
  meta: { linhas: string[]; colunas: string[]; dominioEscalado: [number, number]; nota?: string };
  celulas: Celula[];
  dendrogramaLinhas: NoArvore;
  dendrogramaColunas: NoArvore;
}

interface Segmento {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const VB_W = 900;
const VB_H = 620;
const MARGEM = { dendroEsq: 90, labelsDir: 110, dendroTopo: 80, labelsBaixo: 90 };
const GAP = 6;

function alturaMaxima(no: NoArvore): number {
  if ('folha' in no) return 0;
  return no.altura;
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Heatmap de 12 itens por 6 métricas, reordenado por clustering hierárquico, com ' +
    'dendrogramas de linha e coluna e leitura de valor exato por célula.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, celulas, dendrogramaLinhas, dendrogramaColunas } = data as Dados;
    const nLinhas = meta.linhas.length;
    const nColunas = meta.colunas.length;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraGrade = VB_W - MARGEM.dendroEsq - MARGEM.labelsDir;
    const alturaGrade = VB_H - MARGEM.dendroTopo - MARGEM.labelsBaixo;

    const x = scaleBand<number>()
      .domain(Array.from({ length: nColunas }, (_, i) => i))
      .range([0, larguraGrade])
      .padding(0.05);
    const y = scaleBand<number>()
      .domain(Array.from({ length: nLinhas }, (_, i) => i))
      .range([0, alturaGrade])
      .padding(0.05);
    const cor = scaleSequential(interpolateMagma).domain(meta.dominioEscalado);

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    // ------------------------------------------------------------- grade
    const gGrade = svg.append('g').attr('transform', `translate(${MARGEM.dendroEsq},${MARGEM.dendroTopo})`);
    const celulasSel = gGrade
      .selectAll<SVGRectElement, Celula>('rect')
      .data(celulas)
      .join('rect')
      .attr('x', (d) => x(d.coluna)!)
      .attr('y', (d) => y(d.linha)!)
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('fill', (d) => cor(d.escalado))
      .attr('data-interactive', '');

    // ----------------------------------------------------------- rótulos
    const rotulosLinha = svg
      .append('g')
      .attr('transform', `translate(${MARGEM.dendroEsq + larguraGrade + GAP},${MARGEM.dendroTopo})`)
      .selectAll('text')
      .data(meta.linhas)
      .join('text')
      .attr('x', 0)
      .attr('y', (_d, i) => y(i)! + y.bandwidth() / 2)
      .attr('dy', '0.32em')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(11))
      .text((d) => d);

    const rotulosColuna = svg
      .append('g')
      .attr('transform', `translate(${MARGEM.dendroEsq},${MARGEM.dendroTopo + alturaGrade + GAP})`)
      .selectAll('text')
      .data(meta.colunas)
      .join('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '0.7em')
      .attr('text-anchor', 'end')
      .attr('transform', (_d, i) => `translate(${x(i)! + x.bandwidth() / 2},0) rotate(-40)`)
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(11))
      .text((d) => d);

    // -------------------------------------------------------- dendrogramas
    function desenharArvore(
      no: NoArvore,
      posEscala: (i: number) => number,
      bandwidth: number,
      altEscala: (h: number) => number,
      segmentos: Segmento[],
      eixoPosicaoEhX: boolean
    ): { pos: number; prof: number } {
      if ('folha' in no) {
        return { pos: posEscala(no.posicao) + bandwidth / 2, prof: altEscala(0) };
      }
      const [a, b] = no.filhos.map((f) => desenharArvore(f, posEscala, bandwidth, altEscala, segmentos, eixoPosicaoEhX));
      const prof = altEscala(no.altura);
      if (eixoPosicaoEhX) {
        // dendrograma de coluna: posicao no eixo X, profundidade (altura) no eixo Y
        segmentos.push({ x1: a.pos, y1: a.prof, x2: a.pos, y2: prof });
        segmentos.push({ x1: b.pos, y1: b.prof, x2: b.pos, y2: prof });
        segmentos.push({ x1: a.pos, y1: prof, x2: b.pos, y2: prof });
      } else {
        // dendrograma de linha: posicao no eixo Y, profundidade (altura) no eixo X
        segmentos.push({ x1: a.prof, y1: a.pos, x2: prof, y2: a.pos });
        segmentos.push({ x1: b.prof, y1: b.pos, x2: prof, y2: b.pos });
        segmentos.push({ x1: prof, y1: a.pos, x2: prof, y2: b.pos });
      }
      return { pos: (a.pos + b.pos) / 2, prof };
    }

    const alturaEscalaColunas = scaleLinear()
      .domain([0, alturaMaxima(dendrogramaColunas)])
      .range([MARGEM.dendroTopo - GAP, 0]);
    const segmentosColunas: Segmento[] = [];
    desenharArvore(dendrogramaColunas, (i) => x(i)!, x.bandwidth(), (h) => alturaEscalaColunas(h), segmentosColunas, true);

    const alturaEscalaLinhas = scaleLinear()
      .domain([0, alturaMaxima(dendrogramaLinhas)])
      .range([MARGEM.dendroEsq - GAP, 0]);
    const segmentosLinhas: Segmento[] = [];
    desenharArvore(dendrogramaLinhas, (i) => y(i)!, y.bandwidth(), (h) => alturaEscalaLinhas(h), segmentosLinhas, false);

    const gDendroColunas = svg.append('g').attr('transform', `translate(${MARGEM.dendroEsq},0)`).attr('fill', 'none');
    const linhasColunas = gDendroColunas
      .selectAll('line')
      .data(segmentosColunas)
      .join('line')
      .attr('x1', (d) => d.x1)
      .attr('y1', (d) => d.y1)
      .attr('x2', (d) => d.x2)
      .attr('y2', (d) => d.y2)
      .attr('stroke', theme.borderStrong)
      .attr('stroke-width', px(1));

    const gDendroLinhas = svg.append('g').attr('transform', `translate(0,${MARGEM.dendroTopo})`).attr('fill', 'none');
    const linhasLinhas = gDendroLinhas
      .selectAll('line')
      .data(segmentosLinhas)
      .join('line')
      .attr('x1', (d) => d.x1)
      .attr('y1', (d) => d.y1)
      .attr('x2', (d) => d.x2)
      .attr('y2', (d) => d.y2)
      .attr('stroke', theme.borderStrong)
      .attr('stroke-width', px(1));

    // -------------------------------------------------------------- hover
    const OPACIDADE_APAGADA = 0.35;
    const chaveDe = (d: Celula) => `${d.linha}_${d.coluna}`;

    const realcar = (chave: string) => {
      const [linha, coluna] = chave.split('_').map(Number);
      celulasSel.attr('opacity', (o) => (o.linha === linha || o.coluna === coluna ? 1 : OPACIDADE_APAGADA));
      rotulosLinha.attr('font-weight', (_r, i) => (i === linha ? 700 : 400)).attr('fill', (_r, i) => (i === linha ? theme.ink : theme.inkMuted));
      rotulosColuna.attr('font-weight', (_c, i) => (i === coluna ? 700 : 400)).attr('fill', (_c, i) => (i === coluna ? theme.ink : theme.inkMuted));
    };

    const limpar = () => {
      celulasSel.attr('opacity', 1);
      rotulosLinha.attr('font-weight', 400).attr('fill', theme.inkMuted);
      rotulosColuna.attr('font-weight', 400).attr('fill', theme.inkMuted);
    };

    celulasSel
      .on('pointermove', (evento: PointerEvent, d) => {
        tooltip.show(
          `<strong>${meta.linhas[d.linha]}</strong> · ${meta.colunas[d.coluna]}<br>valor: <strong>${d.valor}</strong>`,
          evento
        );
      })
      .on('pointerleave', () => tooltip.hide());

    tornarFixavel(root, { selecao: celulasSel, chaveDe }, realcar, limpar);

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // -------------------------------------------------------------- entrada
    if (animate) {
      celulasSel
        .attr('opacity', 0)
        .transition()
        .delay((_d, i) => stagger(i, celulas.length, 500))
        .duration(DURATION.base)
        .ease(EASE_STATE)
        .attr('opacity', 1);

      [linhasColunas, linhasLinhas].forEach((sel) => {
        sel
          .attr('opacity', 0)
          .transition()
          .delay(200)
          .duration(DURATION.enter)
          .attr('opacity', 1);
      });

      garantirEstadoFinal(DURATION.enter + 500, () => {
        celulasSel.interrupt().attr('opacity', 1);
        linhasColunas.interrupt().attr('opacity', 1);
        linhasLinhas.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
