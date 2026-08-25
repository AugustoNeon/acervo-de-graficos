/**
 * Pequenos múltiplos — um painel por categoria, cada um com a própria escala Y.
 *
 * Alternativa ao empilhamento/sobreposição já usado no gráfico de área irmão
 * deste acervo (mesmo dado — receita mensal de um SaaS fictício por
 * categoria). Empilhar ou sobrepor exige comparação por altura relativa, e
 * esconde a evolução de um grupo que não está na base da pilha (a linha de
 * base dele se move); aqui cada categoria ganha seu próprio eixo Y
 * (equivalente ao `scale="free_y"` do `facet_wrap`), então a FORMA da
 * evolução fica legível mesmo quando a magnitude entre categorias é muito
 * diferente — o preço é que os painéis não são diretamente comparáveis em
 * valor absoluto sem olhar o eixo de cada um.
 */

import { select, scaleUtc, scaleLinear, axisBottom, axisLeft } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import type { DrawContext, VizChart } from '../../types';

interface Ponto {
  mes: string;
  receita: number;
}

interface Serie {
  categoria: string;
  pontos: Ponto[];
}

interface Dados {
  meta: { categorias: string[]; paleta: Record<string, string>; nota?: string };
  series: Serie[];
}

const VB_W = 900;
const VB_H = 560;
const COLS = 2;
const GUTTER_X = 28;
const GUTTER_Y = 44;
const MARGEM_PAINEL = { topo: 26, dir: 10, baixo: 22, esq: 44 };

function caminhoArea(xs: number[], ys: number[], baseline: number): string {
  if (xs.length === 0) return '';
  const topo = xs.map((x, i) => `${x},${ys[i]}`).join('L');
  const base = [...xs].reverse().map((x) => `${x},${baseline}`).join('L');
  return `M${topo}L${base}Z`;
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Grade de pequenos múltiplos — um painel por categoria de produto, cada um com sua própria escala vertical, ' +
    'mostrando a evolução mensal de receita de um SaaS fictício ao longo de 24 meses.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, series } = data as Dados;
    const { categorias, paleta } = meta;

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const rows = Math.ceil(categorias.length / COLS);
    const panelW = (VB_W - GUTTER_X * (COLS - 1)) / COLS;
    const panelH = (VB_H - GUTTER_Y * (rows - 1)) / rows;
    const larguraUtil = panelW - MARGEM_PAINEL.esq - MARGEM_PAINEL.dir;
    const alturaUtil = panelH - MARGEM_PAINEL.topo - MARGEM_PAINEL.baixo;

    const meses = series[0].pontos.map((p) => new Date(p.mes));
    const nMeses = meses.length;
    const x = scaleUtc().domain([meses[0], meses[nMeses - 1]]).range([0, larguraUtil]);
    const xs = meses.map((m) => x(m));

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');

    function conteudoTooltip(categoria: string, mesIdx: number, valores: number[]): string {
      const dataFmt = meses[mesIdx].toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      return `<strong>${categoria}</strong><br>${dataFmt} · R$ ${valores[mesIdx].toFixed(1)} mil`;
    }

    series.forEach((s, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const ox = col * (panelW + GUTTER_X);
      const oy = row * (panelH + GUTTER_Y);
      const valores = s.pontos.map((p) => p.receita);
      const maxValor = Math.max(...valores);

      const y = scaleLinear().domain([0, maxValor * 1.15]).range([alturaUtil, 0]);
      const cor = paleta[s.categoria] ?? theme.accent;

      const gPainel = svg.append('g').attr('transform', `translate(${ox},${oy})`);

      gPainel
        .append('text')
        .attr('x', MARGEM_PAINEL.esq)
        .attr('y', px(15))
        .attr('font-family', theme.fontBody)
        .attr('font-weight', 600)
        .attr('font-size', px(13))
        .attr('fill', theme.ink)
        .text(s.categoria);

      const g = gPainel.append('g').attr('transform', `translate(${MARGEM_PAINEL.esq},${MARGEM_PAINEL.topo})`);

      const eixoEsqSel = g.append('g');
      const eixoBaixoSel = g.append('g').attr('transform', `translate(0,${alturaUtil})`);

      estilarEixo(eixoEsqSel.call(axisLeft(y).ticks(4).tickSizeOuter(0)), theme, px);
      estilarEixo(
        eixoBaixoSel.call(
          axisBottom(x)
            .ticks(3)
            .tickSizeOuter(0)
            // Painel estreito (grade 2x2): formato curto ("mai/24"), igual ao
            // eixo do output.png (date_labels="%b/%y") -- o formato pt-BR
            // longo ("mai. de 2024") usado no grafico irmao (um unico painel
            // largo) colidia entre si aqui.
            .tickFormat((d) => (d as Date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace('. de ', '/'))
        ),
        theme,
        px
      );

      const ys = valores.map((v) => y(v));
      const baseline = y(0);

      const area = g
        .append('path')
        .attr('data-interactive', '')
        .attr('fill', cor)
        .attr('fill-opacity', 0.78)
        .attr('stroke', cor)
        .attr('stroke-width', px(1.5));

      const overlay = g
        .append('rect')
        .attr('data-interactive', '')
        .attr('fill', 'transparent')
        .attr('width', larguraUtil)
        .attr('height', alturaUtil)
        .on('pointermove', function (evento: PointerEvent) {
          const ctm = (g.node() as SVGGElement).getScreenCTM();
          if (!ctm) return;
          const pt = new DOMPoint(evento.clientX, evento.clientY).matrixTransform(ctm.inverse());
          const alvo = x.invert(pt.x);
          let melhor = 0;
          let menorDist = Infinity;
          meses.forEach((m, mi) => {
            const dist = Math.abs(m.getTime() - alvo.getTime());
            if (dist < menorDist) {
              menorDist = dist;
              melhor = mi;
            }
          });
          area.attr('fill-opacity', 0.92);
          tooltip.show(conteudoTooltip(s.categoria, melhor, valores), evento);
        })
        .on('pointerleave', () => {
          area.attr('fill-opacity', 0.78);
          tooltip.hide();
        });
      overlay.raise();

      if (animate) {
        area.attr('d', caminhoArea(xs, xs.map(() => baseline), baseline));
        area
          .transition()
          .delay(stagger(i, series.length))
          .duration(DURATION.enter)
          .ease(EASE_ENTER)
          .attr('d', caminhoArea(xs, ys, baseline));

        garantirEstadoFinal(DURATION.enter + stagger(series.length - 1, series.length) + 100, () => {
          area.interrupt().attr('d', caminhoArea(xs, ys, baseline));
        });
      } else {
        area.attr('d', caminhoArea(xs, ys, baseline));
      }
    });

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }
  },
};

export default chart;
