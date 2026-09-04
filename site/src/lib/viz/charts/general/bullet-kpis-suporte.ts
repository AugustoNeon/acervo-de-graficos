/**
 * Bullet chart (Stephen Few): painel de KPIs de um time de suporte.
 *
 * Cada KPI desenha sua PRÓPRIA escala (nunca compartilhada com as outras
 * linhas) -- é isso que permite comparar métricas de unidades diferentes
 * (porcentagem, nota, contagem) lado a lado sem distorcer nenhuma. Três
 * camadas por linha: faixas de fundo em tons de cinza (contexto
 * qualitativo ruim/médio/bom), uma barra fina (o valor real) e um traço
 * vertical (a meta) -- a leitura é "a barra passou do traço?".
 */

import { select, scaleLinear, axisBottom } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import type { DrawContext, VizChart } from '../../types';

interface Kpi {
  kpi: string;
  valor: number;
  meta: number;
  fimRuim: number;
  fimMedio: number;
  fimBom: number;
}

interface Dados {
  meta_cores: { ruim: string; medio: string; bom: string; barra: string; meta: string };
  kpis: Kpi[];
}

const VB_W = 900;
const VB_H = 680;
const MARGEM = { topo: 20, baixo: 10 };
const GAP_LINHA = 14; // unidades de viewBox -- respiro entre as linhas
const FONTE_ROTULO = 12; // px reais

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Painel de 6 KPIs de um time de suporte fictício, cada um mostrado como um bullet chart: barra ' +
    'de valor atual sobre faixas de contexto qualitativo, com um traço marcando a meta.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta_cores: cores, kpis } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    // Margem esquerda medida pela largura real do maior rótulo de KPI --
    // nunca um número fixo de viewBox (ver AGENTS.md "Lições aprendidas").
    const svgMedicao = select(root).append('svg').attr('opacity', 0).attr('aria-hidden', 'true');
    const nosMedicao = svgMedicao
      .append('g')
      .selectAll<SVGTextElement, string>('text')
      .data(kpis.map((k) => k.kpi))
      .join('text')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('font-size', px(FONTE_ROTULO))
      .text((d) => d)
      .nodes();
    const larguraRotulo = Math.max(...nosMedicao.map((n) => n.getComputedTextLength()));
    svgMedicao.remove();
    // +10px de folga além da largura medida: a fonte da página pode não ter
    // terminado de carregar no instante exato da medição (a medição roda
    // sync logo após montar o elemento), e nesse caso o navegador mede a
    // largura com a fonte de fallback -- mais estreita que a fonte real que
    // acaba renderizando --, então uma folga pequena (2-3px, o bastante só
    // pra arredondamento sub-pixel) não é suficiente. Generosa o bastante
    // pra absorver essa diferença sem precisar sincronizar com
    // `document.fonts.ready`.
    const MARGEM_ESQ = larguraRotulo + px(16) + px(10);
    const MARGEM_DIR = px(20);

    const larguraUtil = VB_W - MARGEM_ESQ - MARGEM_DIR;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;
    const alturaLinha = (alturaUtil - (kpis.length - 1) * GAP_LINHA) / kpis.length;
    const passoLinha = alturaLinha + GAP_LINHA;

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const gRaiz = svg.append('g').attr('transform', `translate(${MARGEM_ESQ},${MARGEM.topo})`);

    kpis.forEach((k, i) => {
      const g = gRaiz.append('g').attr('transform', `translate(0,${i * passoLinha})`);

      const maiorValor = Math.max(k.fimBom, k.valor, k.meta) * 1.02;
      const x = scaleLinear().domain([0, maiorValor]).range([0, larguraUtil]);
      const centroY = alturaLinha * 0.42;

      g.append('text')
        .attr('x', -px(16))
        .attr('y', centroY)
        .attr('dy', '0.32em')
        .attr('text-anchor', 'end')
        .attr('font-family', theme.fontBody)
        .attr('font-weight', 700)
        .attr('font-size', px(FONTE_ROTULO))
        .attr('fill', theme.ink)
        .text(k.kpi);

      const faixas: { de: number; ate: number; cor: string }[] = [
        { de: 0, ate: k.fimRuim, cor: cores.ruim },
        { de: k.fimRuim, ate: k.fimMedio, cor: cores.medio },
        { de: k.fimMedio, ate: k.fimBom, cor: cores.bom },
      ];
      const gFundo = g
        .selectAll('rect.faixa')
        .data(faixas)
        .join('rect')
        .attr('class', 'faixa')
        .attr('x', (d) => x(d.de))
        .attr('width', (d) => x(d.ate) - x(d.de))
        .attr('y', centroY - alturaLinha * 0.32)
        .attr('height', alturaLinha * 0.64)
        .attr('fill', (d) => d.cor);

      const barra = g
        .append('rect')
        .attr('x', 0)
        .attr('width', x(k.valor))
        .attr('y', centroY - alturaLinha * 0.1)
        .attr('height', alturaLinha * 0.2)
        .attr('fill', cores.barra)
        .attr('data-interactive', '');

      const traco = g
        .append('line')
        .attr('x1', x(k.meta))
        .attr('x2', x(k.meta))
        .attr('y1', centroY - alturaLinha * 0.4)
        .attr('y2', centroY + alturaLinha * 0.4)
        .attr('stroke', cores.meta)
        .attr('stroke-width', px(2.6));

      const gEixo = g.append('g').attr('transform', `translate(0,${centroY + alturaLinha * 0.32 + px(4)})`);
      estilarEixo(gEixo.call(axisBottom(x).ticks(5).tickSizeOuter(0)) as never, theme, px);

      function mostrarTooltip(evento: PointerEvent) {
        const diferenca = k.valor - k.meta;
        const seta = diferenca >= 0 ? '▲' : '▼';
        tooltip.show(
          `<strong>${k.kpi}</strong><br>${k.valor} (meta ${k.meta}) ` +
            `<span style="opacity:.8">${seta} ${Math.abs(diferenca).toFixed(1)}</span>`,
          evento
        );
      }
      barra.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());
      gFundo.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());

      if (animate) {
        const delay = stagger(i, kpis.length);
        barra.attr('width', 0);
        barra.transition().delay(delay).duration(DURATION.enter).ease(EASE_ENTER).attr('width', x(k.valor));

        traco.attr('opacity', 0);
        traco
          .transition()
          .delay(delay + DURATION.enter * 0.6)
          .duration(DURATION.base)
          .attr('opacity', 1);

        garantirEstadoFinal(DURATION.enter + 250, () => {
          barra.interrupt().attr('width', x(k.valor));
          traco.interrupt().attr('opacity', 1);
        });
      }
    });
  },
};

export default chart;
