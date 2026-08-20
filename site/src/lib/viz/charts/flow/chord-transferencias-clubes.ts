/**
 * Diagrama de cordas: transferências entre clubes — versão em D3.
 *
 * A miniatura estática vem do `circlize::chordDiagram()`, que já funde cada
 * par de clubes numa única fita com pontas de larguras diferentes (uma pra
 * cada sentido). Aqui a leitura é outra, mais explícita: `d3.chordDirected()`
 * (em `d3-chord`, empacotado dentro do `d3` principal desde a v6 — sem
 * dependência extra) desenha UMA fita por transferência, com seta indicando
 * quem mandou o jogador pra quem. O script.R só exporta a lista de clubes
 * com sua cor e a lista de fluxos não-zero pelo nome (origem, destino,
 * valor); a matriz completa e a geometria de cada arco/fita são recalculadas
 * aqui — mesmo princípio já usado no sankey deste acervo.
 */

import { select, chordDirected, ribbonArrow, arc } from 'd3';
import type { Chord, ChordGroup, ChordSubgroup } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface No {
  name: string;
  cor: string;
}

interface Fluxo {
  origem: string;
  destino: string;
  valor: number;
}

interface Dados {
  meta: { nota?: string };
  nos: No[];
  fluxos: Fluxo[];
}

const VB = 700;
const R_OUT = 220;
const R_IN = 204;
const R_FITA = 200;
const R_ROTULO = 236;
const OPACIDADE_FITA = 0.7;
const OPACIDADE_FITA_APAGADA = 0.05;
const OPACIDADE_ARCO_APAGADA = 0.25;

const chart: VizChart = {
  aspectRatio: 1,
  label:
    'Diagrama de cordas com transferências de jogadores entre 6 clubes fictícios: cada fita é ' +
    'uma transferência, com a seta indicando o clube de destino e a espessura proporcional à ' +
    'quantidade de jogadores.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, nos, fluxos } = data as Dados;

    const nomes = nos.map((d) => d.name);
    const indice = new Map(nomes.map((n, i) => [n, i]));
    const n = nomes.length;

    const matriz: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (const f of fluxos) {
      matriz[indice.get(f.origem)!][indice.get(f.destino)!] += f.valor;
    }

    const gerarChord = chordDirected().padAngle(0.045).sortSubgroups((a, b) => b - a);
    const res = gerarChord(matriz);
    const grupos = res.groups;

    const escala = VB / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB} ${VB}`)
      .attr('aria-hidden', 'true');

    const raiz = svg.append('g').attr('transform', `translate(${VB / 2},${VB / 2})`);

    const camadaFitas = raiz.append('g').attr('fill-rule', 'evenodd');
    const camadaArcos = raiz.append('g');
    const camadaRotulos = raiz.append('g');

    const corDoNo = (i: number) => nos[i]?.cor ?? theme.accent;

    // ------------------------------------------------------------------ arcos
    const arcoGrupo = arc<ChordGroup & { ri: number; ro: number }>()
      .innerRadius((d) => d.ri)
      .outerRadius((d) => d.ro);

    const arcos = camadaArcos
      .selectAll<SVGPathElement, ChordGroup>('path')
      .data(grupos)
      .join('path')
      .attr('d', (d) => arcoGrupo({ ...d, ri: R_IN, ro: R_OUT }))
      .attr('fill', (d) => corDoNo(d.index))
      .attr('data-interactive', '');

    // ------------------------------------------------------------------ fitas
    const gerarFita = ribbonArrow<Chord, ChordSubgroup>().radius(R_FITA).headRadius(6).padAngle(0.01);

    const fitas = camadaFitas
      .selectAll<SVGPathElement, Chord>('path')
      .data(res)
      .join('path')
      .attr('d', (d) => gerarFita(d))
      .attr('fill', (d) => corDoNo(d.source.index))
      .attr('fill-opacity', OPACIDADE_FITA)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(0.6))
      .attr('data-interactive', '');

    // ----------------------------------------------------------------- rotulos
    const rotulos = camadaRotulos
      .selectAll<SVGTextElement, ChordGroup>('text')
      .data(grupos)
      .join('text')
      .attr('transform', (d) => {
        const meio = (d.startAngle + d.endAngle) / 2;
        const graus = (meio * 180) / Math.PI - 90;
        const flip = meio > Math.PI ? 'rotate(180)' : '';
        return `rotate(${graus}) translate(${R_ROTULO},0) ${flip}`;
      })
      .attr('text-anchor', (d) => {
        const meio = (d.startAngle + d.endAngle) / 2;
        return meio > Math.PI ? 'end' : 'start';
      })
      .attr('dominant-baseline', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 600)
      .attr('font-size', px(14))
      .attr('fill', theme.ink)
      .text((d) => nomes[d.index]);

    // -------------------------------------------------------------- interacao
    const tocaNo = (d: Chord, i: number) => d.source.index === i || d.target.index === i;

    const realcarNo = (i: number | null) => {
      fitas
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('fill-opacity', (d) =>
          i === null ? OPACIDADE_FITA : tocaNo(d, i) ? 0.92 : OPACIDADE_FITA_APAGADA
        );
      arcos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('fill-opacity', (d) => (i === null || d.index === i ? 1 : OPACIDADE_ARCO_APAGADA));
      rotulos
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('fill-opacity', (d) => (i === null || d.index === i ? 1 : 0.35));
    };

    const realcarFita = (alvo: Chord | null) => {
      fitas
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('fill-opacity', (d) => (alvo === null ? OPACIDADE_FITA : d === alvo ? 0.92 : OPACIDADE_FITA_APAGADA));
    };

    const totalPorNo = (i: number) => {
      let enviou = 0;
      let recebeu = 0;
      for (const f of fluxos) {
        if (indice.get(f.origem) === i) enviou += f.valor;
        if (indice.get(f.destino) === i) recebeu += f.valor;
      }
      return { enviou, recebeu };
    };

    arcos
      .on('pointerenter', (evento: PointerEvent, d) => {
        realcarNo(d.index);
        const { enviou, recebeu } = totalPorNo(d.index);
        tooltip.show(
          `<strong>${nomes[d.index]}</strong><br>Enviou <strong>${enviou}</strong> · Recebeu <strong>${recebeu}</strong>`,
          evento
        );
      })
      .on('pointermove', (evento: PointerEvent, d) => {
        const { enviou, recebeu } = totalPorNo(d.index);
        tooltip.show(
          `<strong>${nomes[d.index]}</strong><br>Enviou <strong>${enviou}</strong> · Recebeu <strong>${recebeu}</strong>`,
          evento
        );
      })
      .on('pointerleave', () => {
        realcarNo(null);
        tooltip.hide();
      });

    fitas
      .on('pointerenter', function (evento: PointerEvent, d) {
        realcarFita(d);
        tooltip.show(
          `${nomes[d.source.index]} &rarr; ${nomes[d.target.index]}<br><strong>${d.source.value}</strong> jogadores`,
          evento
        );
      })
      .on('pointermove', (evento: PointerEvent, d) => {
        tooltip.show(
          `${nomes[d.source.index]} &rarr; ${nomes[d.target.index]}<br><strong>${d.source.value}</strong> jogadores`,
          evento
        );
      })
      .on('pointerleave', () => {
        realcarFita(null);
        tooltip.hide();
      });

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // Os arcos crescem de dentro pra fora (mesma linguagem do circular
    // barplot deste acervo: elemento radial nasce colapsado no raio interno
    // e se expande); as fitas so aparecem depois, em opacidade, pra nao
    // competir com o arco em formacao.
    if (animate) {
      arcos
        .attr('d', (d) => arcoGrupo({ ...d, ri: R_IN, ro: R_IN }))
        .transition()
        .delay((_d, i) => stagger(i, grupos.length, 260))
        .duration(DURATION.base)
        .ease(EASE_ENTER)
        .attr('d', (d) => arcoGrupo({ ...d, ri: R_IN, ro: R_OUT }));

      rotulos.attr('fill-opacity', 0).transition().delay(220).duration(DURATION.base).attr('fill-opacity', 1);

      fitas
        .attr('fill-opacity', 0)
        .transition()
        .delay((_d, i) => 280 + stagger(i, res.length, 320))
        .duration(DURATION.base)
        .attr('fill-opacity', OPACIDADE_FITA);

      garantirEstadoFinal(280 + DURATION.base + 320 + 250, () => {
        arcos.interrupt().attr('d', (d) => arcoGrupo({ ...d, ri: R_IN, ro: R_OUT }));
        rotulos.interrupt().attr('fill-opacity', 1);
        fitas.interrupt().attr('fill-opacity', OPACIDADE_FITA);
      });
    }
  },
};

export default chart;
