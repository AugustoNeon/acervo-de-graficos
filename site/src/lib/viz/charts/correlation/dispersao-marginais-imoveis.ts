/**
 * Dispersão com histogramas marginais — versão em D3.
 *
 * Três painéis ligados pela mesma escala: o principal (dispersão + linha de
 * regressão) e dois histogramas marginais (distribuição de cada eixo
 * isoladamente). Passar o cursor num ponto realça ele no painel principal E
 * a faixa que ele ocupa nos dois histogramas — mesmo princípio de "realce
 * ligado entre painéis" já usado no dashboard mapa+dispersão+barras deste
 * acervo, aplicado aqui a um layout de eixos compartilhados em vez de
 * painéis independentes.
 *
 * Os bins dos histogramas marginais vêm PRONTOS do R (`hist(..., breaks =
 * <mesmo vetor do geom_histogram>)`) — o D3 só desenha retângulos nos
 * limites que o R já calculou, garantindo os mesmos bins da miniatura
 * estática por construção, não por coincidência de parâmetro.
 */

import { scaleLinear, select } from 'd3';
import { axisBottom, axisLeft } from 'd3';
import { estilarEixo } from '../../shared/cartesiano';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Bairro {
  bairro: string;
  cor: string;
}

interface Ponto {
  id: number;
  bairro: string;
  area: number;
  preco: number;
}

interface Bin {
  x0: number;
  x1: number;
  contagem: number;
}

interface Dados {
  meta: { nota?: string };
  regressao: { intercepto: number; inclinacao: number };
  limites: { area: [number, number]; preco: [number, number] };
  bairros: Bairro[];
  pontos: Ponto[];
  histArea: Bin[];
  histPreco: Bin[];
}

const VB_W = 860;
const VB_H = 720;
const MARGEM = { esq: 66, base: 46, topoHist: 90, direitaHist: 110, gap: 6 };
const OPACIDADE_APAGADA = 0.15;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label: 'Dispersão de preço por área construída de imóveis, colorida por bairro, com histogramas marginais de cada eixo.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, regressao, limites, bairros, pontos, histArea, histPreco } = data as Dados;

    const areaXMax = VB_W - MARGEM.direitaHist;
    const areaYMin = MARGEM.topoHist + MARGEM.gap;

    const x = scaleLinear().domain(limites.area).range([MARGEM.esq, areaXMax]);
    const y = scaleLinear().domain(limites.preco).range([VB_H - MARGEM.base, areaYMin]);

    const maxContagemArea = Math.max(...histArea.map((b) => b.contagem));
    const maxContagemPreco = Math.max(...histPreco.map((b) => b.contagem));
    const yTopo = scaleLinear().domain([0, maxContagemArea]).range([MARGEM.topoHist, 4]);
    const xDireita = scaleLinear().domain([0, maxContagemPreco]).range([areaXMax, VB_W]);

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const corDoBairro = new Map(bairros.map((b) => [b.bairro, b.cor]));

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    // ------------------------------------------------------------------ eixos
    const eixoBaixo = svg
      .append('g')
      .attr('transform', `translate(0,${VB_H - MARGEM.base})`)
      .call(axisBottom(x).ticks(6).tickSizeOuter(0));
    estilarEixo(eixoBaixo, theme, px);

    const eixoEsq = svg
      .append('g')
      .attr('transform', `translate(${MARGEM.esq},0)`)
      .call(axisLeft(y).ticks(6).tickSizeOuter(0));
    estilarEixo(eixoEsq, theme, px);

    svg
      .append('text')
      .attr('x', (MARGEM.esq + areaXMax) / 2)
      .attr('y', VB_H - 8)
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .attr('fill', theme.inkMuted)
      .text('Área construída (m²)');

    svg
      .append('text')
      .attr('transform', `translate(18,${(areaYMin + VB_H - MARGEM.base) / 2}) rotate(-90)`)
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .attr('fill', theme.inkMuted)
      .text('Preço (R$ mil)');

    // -------------------------------------------------------- histograma topo
    const gHistArea = svg.append('g');
    const barrasArea = gHistArea
      .selectAll<SVGRectElement, Bin>('rect')
      .data(histArea)
      .join('rect')
      .attr('x', (d) => x(d.x0) + 0.5)
      .attr('width', (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
      .attr('y', (d) => yTopo(d.contagem))
      .attr('height', (d) => yTopo(0) - yTopo(d.contagem))
      .attr('fill', theme.border);

    // ------------------------------------------------------ histograma direita
    const gHistPreco = svg.append('g');
    const barrasPreco = gHistPreco
      .selectAll<SVGRectElement, Bin>('rect')
      .data(histPreco)
      .join('rect')
      .attr('x', xDireita(0))
      .attr('width', (d) => Math.max(0, xDireita(d.contagem) - xDireita(0)))
      .attr('y', (d) => y(d.x1) + 0.5)
      .attr('height', (d) => Math.max(0, y(d.x0) - y(d.x1) - 1))
      .attr('fill', theme.border);

    // ------------------------------------------------------------------ linha
    const [x0d, x1d] = limites.area;
    svg
      .append('line')
      .attr('x1', x(x0d))
      .attr('x2', x(x1d))
      .attr('y1', y(regressao.intercepto + regressao.inclinacao * x0d))
      .attr('y2', y(regressao.intercepto + regressao.inclinacao * x1d))
      .attr('stroke', theme.inkMuted)
      .attr('stroke-width', px(1.6))
      .attr('stroke-dasharray', `${px(5)} ${px(4)}`);

    // ---------------------------------------------------------------- pontos
    const gPontos = svg.append('g');
    const pontosSel = gPontos
      .selectAll<SVGCircleElement, Ponto>('circle')
      .data(pontos)
      .join('circle')
      .attr('cx', (d) => x(d.area))
      .attr('cy', (d) => y(d.preco))
      .attr('r', px(3.4))
      .attr('fill', (d) => corDoBairro.get(d.bairro) ?? theme.accent)
      .attr('fill-opacity', 0.8)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(0.6))
      .attr('data-interactive', '');

    // -------------------------------------------------------------- legenda
    const gLegenda = svg.append('g').attr('transform', `translate(${areaXMax - 150},${VB_H - MARGEM.base - 140})`);
    gLegenda
      .append('rect')
      .attr('x', -12)
      .attr('y', -22)
      .attr('width', 158)
      .attr('height', bairros.length * 20 + 26)
      .attr('fill', theme.bg)
      .attr('fill-opacity', 0.85)
      .attr('rx', 4);
    gLegenda.append('text').attr('y', -6).attr('font-family', theme.fontBody).attr('font-weight', 700).attr('font-size', px(12)).attr('fill', theme.ink).text('Bairro');
    bairros.forEach((b, i) => {
      const gItem = gLegenda.append('g').attr('transform', `translate(0,${i * 20 + 14})`);
      gItem.append('circle').attr('r', px(4.2)).attr('fill', b.cor);
      gItem
        .append('text')
        .attr('x', 12)
        .attr('dy', '0.32em')
        .attr('font-family', theme.fontBody)
        .attr('font-size', px(11.5))
        .attr('fill', theme.ink)
        .text(b.bairro);
    });

    // -------------------------------------------------------------- interacao
    const binDe = (bins: Bin[], v: number) => bins.findIndex((b) => v >= b.x0 && v <= b.x1);

    const realcar = (chave: string | null) => {
      const alvo = chave === null ? null : pontos.find((p) => String(p.id) === chave) ?? null;
      const binArea = alvo ? binDe(histArea, alvo.area) : -1;
      const binPreco = alvo ? binDe(histPreco, alvo.preco) : -1;

      pontosSel
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('r', (d) => px(alvo && d.id === alvo.id ? 6 : 3.4))
        .attr('fill-opacity', (d) => (alvo === null || d.id === alvo.id ? 0.85 : OPACIDADE_APAGADA))
        .attr('stroke', (d) => (alvo && d.id === alvo.id ? theme.ink : theme.bg))
        .attr('stroke-width', (d) => px(alvo && d.id === alvo.id ? 1.4 : 0.6));

      barrasArea
        .transition()
        .duration(DURATION.fast)
        .attr('fill', (_d, i) => (i === binArea ? theme.primary : theme.border));
      barrasPreco
        .transition()
        .duration(DURATION.fast)
        .attr('fill', (_d, i) => (i === binPreco ? theme.primary : theme.border));
    };

    const tooltipPonto = (d: Ponto) =>
      `<strong>${d.bairro}</strong><br>${d.area.toFixed(0)} m² — R$ ${d.preco.toFixed(0)} mil`;

    pontosSel
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(tooltipPonto(d), evento))
      .on('pointerleave', () => tooltip.hide());

    tornarFixavel(root, { selecao: pontosSel, chaveDe: (d: Ponto) => String(d.id) }, realcar, () => realcar(null));

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // Histogramas marginais aparecem primeiro (moldura estatística), os
    // pontos entram por cima em leve cascata -- acompanha "primeiro a forma
    // geral da distribuição, depois cada observação".
    if (animate) {
      gHistArea.attr('opacity', 0).transition().duration(DURATION.base).attr('opacity', 1);
      gHistPreco.attr('opacity', 0).transition().duration(DURATION.base).attr('opacity', 1);

      pontosSel
        .attr('r', 0)
        .transition()
        .delay((_d, i) => 200 + stagger(i, pontos.length, 480))
        .duration(DURATION.base)
        .ease(EASE_ENTER)
        .attr('r', px(3.4));

      garantirEstadoFinal(200 + 480 + DURATION.base + 250, () => {
        gHistArea.interrupt().attr('opacity', 1);
        gHistPreco.interrupt().attr('opacity', 1);
        pontosSel.interrupt().attr('r', px(3.4));
      });
    }
  },
};

export default chart;
