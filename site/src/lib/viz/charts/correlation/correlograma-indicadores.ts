/**
 * Correlograma — versão interativa.
 *
 * A ordem das variáveis (agrupamento hierárquico) já vem pronta do
 * `script.R` (`hclust(as.dist(1 - corr))`, o mesmo cálculo que o
 * `ggcorrplot(hc.order = TRUE)` faz por baixo dos panos) — o D3 só posiciona
 * a grade nessa ordem, sem recalcular clustering nenhum, ao contrário dos
 * gráficos deste acervo cuja geometria é estocástica ou cara de exportar
 * (rede, treemap). Mesmo triângulo superior do `output.png` (sem diagonal),
 * pra não prometer uma leitura que a miniatura estática não mostra.
 */

import { select, scaleBand, scaleDiverging, interpolatePuOr } from 'd3';
import { DURATION, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface Celula {
  var1: string;
  var2: string;
  correlacao: number;
  p_valor: number;
}

interface Dados {
  variaveis: string[];
  ordem: string[];
  celulas: Celula[];
}

const VB = 640;
const MARGEM = { esq: 190, topo: 24, dir: 24, baixo: 190 };
const ALFA = 0.05;

const chart: VizChart = {
  aspectRatio: 1,
  label:
    'Matriz de correlação entre 8 indicadores municipais, reordenada por agrupamento hierárquico, ' +
    'com coeficiente exato e significância por célula ao passar o cursor.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { ordem, celulas } = data as Dados;
    const n = ordem.length;
    const indice = new Map(ordem.map((nome, i) => [nome, i]));

    const porPar = new Map(celulas.map((c) => [`${c.var1}__${c.var2}`, c]));
    const triSuperior: Celula[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const c = porPar.get(`${ordem[i]}__${ordem[j]}`);
        if (c) triSuperior.push(c);
      }
    }

    const escala = VB / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const lado = VB - MARGEM.esq - MARGEM.dir;
    const banda = scaleBand<number>()
      .domain(Array.from({ length: n }, (_, i) => i))
      .range([0, lado])
      .padding(0.06);
    // d3.interpolatePuOr vai de roxo (t=0) a laranja (t=1) -- invertido em
    // relacao ao brewer.pal("PuOr") usado no output.png (laranja no low,
    // roxo no high) -- por isso o interpolador entra invertido aqui.
    const cor = scaleDiverging((t) => interpolatePuOr(1 - t)).domain([-1, 0, 1]);

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB} ${MARGEM.topo + lado + MARGEM.baixo}`)
      .attr('aria-hidden', 'true');

    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const celulasSel = g
      .selectAll<SVGGElement, Celula>('g.celula')
      .data(triSuperior)
      .join('g')
      .attr('class', 'celula')
      .attr('data-interactive', '');

    celulasSel
      .append('rect')
      .attr('x', (d) => banda(indice.get(d.var1)!)!)
      .attr('y', (d) => banda(indice.get(d.var2)!)!)
      .attr('width', banda.bandwidth())
      .attr('height', banda.bandwidth())
      .attr('fill', (d) => cor(d.correlacao))
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(2));

    celulasSel
      .append('text')
      .attr('x', (d) => banda(indice.get(d.var1)!)! + banda.bandwidth() / 2)
      .attr('y', (d) => banda(indice.get(d.var2)!)! + banda.bandwidth() / 2)
      .attr('dy', '0.32em')
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(12))
      .attr('font-weight', 600)
      .attr('fill', (d) => (Math.abs(d.correlacao) > 0.55 ? theme.bg : theme.ink))
      .attr('pointer-events', 'none')
      .text((d) => d.correlacao.toFixed(2));

    celulasSel
      .filter((d) => d.p_valor >= ALFA)
      .append('text')
      .attr('x', (d) => banda(indice.get(d.var1)!)! + banda.bandwidth() / 2)
      .attr('y', (d) => banda(indice.get(d.var2)!)! + banda.bandwidth() - px(9))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(8.5))
      .attr('fill', (d) => (Math.abs(d.correlacao) > 0.55 ? theme.bg : theme.inkMuted))
      .attr('pointer-events', 'none')
      .text('n.s.');

    // ----------------------------------------------------------- rótulos
    const rotulosLinha = svg
      .append('g')
      .attr('transform', `translate(${MARGEM.esq - 10},${MARGEM.topo})`)
      .selectAll('text')
      .data(ordem)
      .join('text')
      .attr('x', 0)
      .attr('y', (_d, i) => banda(i)! + banda.bandwidth() / 2)
      .attr('dy', '0.32em')
      .attr('text-anchor', 'end')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .text((d) => d);

    const rotulosColuna = svg
      .append('g')
      .attr('transform', `translate(${MARGEM.esq},${MARGEM.topo + lado + 10})`)
      .selectAll('text')
      .data(ordem)
      .join('text')
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '0.7em')
      .attr('text-anchor', 'end')
      .attr('transform', (_d, i) => `translate(${banda(i)! + banda.bandwidth() / 2},0) rotate(-40)`)
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .text((d) => d);

    // -------------------------------------------------------------- hover
    const OPACIDADE_APAGADA = 0.25;
    celulasSel
      .on('pointerenter', function (_evento, d) {
        const iVar1 = indice.get(d.var1)!;
        const iVar2 = indice.get(d.var2)!;
        celulasSel.attr('opacity', (o) => {
          const oi = indice.get(o.var1)!;
          const oj = indice.get(o.var2)!;
          const envolvido = oi === iVar1 || oi === iVar2 || oj === iVar1 || oj === iVar2;
          return envolvido ? 1 : OPACIDADE_APAGADA;
        });
        rotulosLinha
          .attr('font-weight', (_r, i) => (i === iVar1 || i === iVar2 ? 700 : 400))
          .attr('fill', (_r, i) => (i === iVar1 || i === iVar2 ? theme.ink : theme.inkMuted));
        rotulosColuna
          .attr('font-weight', (_c, i) => (i === iVar1 || i === iVar2 ? 700 : 400))
          .attr('fill', (_c, i) => (i === iVar1 || i === iVar2 ? theme.ink : theme.inkMuted));
      })
      .on('pointermove', (evento: PointerEvent, d) => {
        const significativo = d.p_valor < ALFA;
        tooltip.show(
          `<strong>${d.var1}</strong> × <strong>${d.var2}</strong><br>` +
            `correlação: <strong>${d.correlacao.toFixed(3)}</strong><br>` +
            (significativo
              ? `p-valor: ${d.p_valor < 0.001 ? '&lt; 0,001' : d.p_valor.toFixed(3)}`
              : `p-valor: ${d.p_valor.toFixed(3)} (não significativo)`),
          evento
        );
      })
      .on('pointerleave', () => {
        celulasSel.attr('opacity', 1);
        rotulosLinha.attr('font-weight', 400).attr('fill', theme.inkMuted);
        rotulosColuna.attr('font-weight', 400).attr('fill', theme.inkMuted);
        tooltip.hide();
      });

    // -------------------------------------------------------------- entrada
    if (animate) {
      celulasSel
        .attr('opacity', 0)
        .transition()
        .delay((_d, i) => stagger(i, triSuperior.length, 500))
        .duration(DURATION.base)
        .ease(EASE_STATE)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.base + 500, () => {
        celulasSel.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
