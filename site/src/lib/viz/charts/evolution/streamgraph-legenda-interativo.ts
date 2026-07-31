/**
 * Streamgraph — versao interativa.
 *
 * As fronteiras entre as faixas ja vem suavizadas do data.json (o script.R
 * resolve a spline uma vez, e as duas versoes so ligam os pontos com reta).
 * Isso e o que garante que esta versao e o output.png sejam a mesma curva, e
 * nao duas interpolacoes parecidas.
 *
 * O que a versao interativa acrescenta: as faixas crescem a partir do eixo
 * central ao entrar na tela, passar o cursor isola uma faixa e le o valor do
 * ano sob o ponteiro, e a legenda destaca uma categoria em toda a serie.
 */

import { select, area, scaleLinear, pointer, bisector } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface Faixa {
  grupo: string;
  x: number[];
  y0: number[];
  y1: number[];
}

interface Dados {
  meta: {
    paleta: Record<string, string>;
    rotulos: Record<string, string>;
    ordem: string[];
    anos: [number, number];
    marcasX: number[];
    yRange: [number, number];
  };
  faixas: Faixa[];
  valores: { grupo: string; anos: number[]; valores: number[] }[];
}

/** Ponto de uma fronteira, ja no formato que o d3.area consome. */
interface Ponto {
  x: number;
  y0: number;
  y1: number;
}

const VB_W = 900;
const VB_H = 460;
const OPACIDADE_APAGADA = 0.14;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Streamgraph: evolução de oito categorias ao longo de 25 anos, com as faixas ' +
    'empilhadas em torno de um eixo central móvel.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, faixas, valores } = data as Dados;
    const { paleta, rotulos, anos, marcasX, yRange } = meta;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    // Margem lateral dimensionada pelo rotulo de ano: ele fica centrado na
    // marca, entao nas pontas metade dele cai fora da area util e sai cortado.
    const margem = { top: px(8), right: px(24), bottom: px(30), left: px(24) };
    const larguraUtil = VB_W - margem.left - margem.right;
    const alturaUtil = VB_H - margem.top - margem.bottom;

    const x = scaleLinear().domain(anos).range([0, larguraUtil]);
    // Sem inverter: num streamgraph o eixo vertical nao tem leitura, entao o
    // sentido e arbitrario -- o que importa e casar com o output.png.
    const y = scaleLinear().domain(yRange).range([alturaUtil, 0]);

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    const g = svg.append('g').attr('transform', `translate(${margem.left},${margem.top})`);

    // ------------------------------------------------------------ grade + eixo
    const grade = g.append('g');
    grade
      .selectAll('line')
      .data(marcasX)
      .join('line')
      .attr('x1', (d) => x(d))
      .attr('x2', (d) => x(d))
      .attr('y1', 0)
      .attr('y2', alturaUtil)
      .attr('stroke', theme.border)
      .attr('stroke-width', px(1));

    g.append('g')
      .selectAll('text')
      .data(marcasX)
      .join('text')
      .attr('x', (d) => x(d))
      .attr('y', alturaUtil + px(20))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(12))
      .attr('fill', theme.inkMuted)
      .text((d) => String(d));

    // ----------------------------------------------------------------- faixas
    const pontos = (f: Faixa): Ponto[] =>
      f.x.map((xi, i) => ({ x: xi, y0: f.y0[i], y1: f.y1[i] }));

    const areaFaixa = area<Ponto>()
      .x((d) => x(d.x))
      .y0((d) => y(d.y0))
      .y1((d) => y(d.y1));

    // Estado colapsado da entrada: toda faixa reduzida ao seu proprio meio, de
    // modo que a pilha inteira nasce como uma linha e se abre.
    const areaColapsada = area<Ponto>()
      .x((d) => x(d.x))
      .y0((d) => y((d.y0 + d.y1) / 2))
      .y1((d) => y((d.y0 + d.y1) / 2));

    const camadas = g
      .append('g')
      .selectAll<SVGPathElement, Faixa>('path')
      .data(faixas)
      .join('path')
      .attr('d', (f) => areaFaixa(pontos(f)))
      .attr('fill', (f) => paleta[f.grupo])
      .attr('data-interactive', '');

    // ---------------------------------------------------------------- destaque
    const realcar = (grupo: string | null) => {
      camadas
        .transition()
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('fill-opacity', (f) => (!grupo || f.grupo === grupo ? 1 : OPACIDADE_APAGADA));
    };

    // Linha vertical que segue o ponteiro — ancora a leitura do ano.
    const cursor = g
      .append('line')
      .attr('y1', 0)
      .attr('y2', alturaUtil)
      .attr('stroke', theme.ink)
      .attr('stroke-width', px(1))
      .attr('stroke-dasharray', `${px(3)} ${px(3)}`)
      .attr('opacity', 0);

    const valoresPorGrupo = new Map(valores.map((v) => [v.grupo, v]));
    const acharAno = bisector((a: number) => a).center;

    camadas
      .on('pointerenter', (_e: PointerEvent, f) => {
        realcar(f.grupo);
        cursor.attr('opacity', 0.45);
      })
      .on('pointermove', function (evento: PointerEvent, f) {
        const [mx] = pointer(evento, g.node());
        const ano = Math.round(x.invert(mx));
        const serie = valoresPorGrupo.get(f.grupo)!;
        const i = acharAno(serie.anos, ano);
        cursor.attr('x1', x(serie.anos[i])).attr('x2', x(serie.anos[i]));
        tooltip.show(
          `<span class="viz-swatch" style="background:${paleta[f.grupo]}"></span>` +
            `<strong>${rotulos[f.grupo]}</strong><br>` +
            `${serie.anos[i]} · <strong>${serie.valores[i]}</strong>`,
          evento
        );
      })
      .on('pointerleave', () => {
        realcar(null);
        cursor.attr('opacity', 0);
        tooltip.hide();
      });

    // ---------------------------------------------------------------- legenda
    select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(meta.ordem)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html(
        (gr) => `<span class="viz-swatch" style="background:${paleta[gr]}"></span>${rotulos[gr]}`
      )
      .on('pointerenter', (_e, gr) => realcar(gr))
      .on('pointerleave', () => realcar(null))
      .on('focus', (_e, gr) => realcar(gr))
      .on('blur', () => realcar(null));

    // ---------------------------------------------------------------- entrada
    // A pilha nasce como uma linha no eixo central e se abre faixa por faixa,
    // de baixo pra cima — a mesma ordem em que ela e empilhada.
    if (animate) {
      camadas
        .attr('d', (f) => areaColapsada(pontos(f)))
        .transition()
        .delay((_f, i) => stagger(i, faixas.length, 260))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attrTween('d', (f) => {
          const ps = pontos(f);
          return (t) =>
            areaFaixa(
              ps.map((p) => {
                const meio = (p.y0 + p.y1) / 2;
                return {
                  x: p.x,
                  y0: meio + (p.y0 - meio) * t,
                  y1: meio + (p.y1 - meio) * t,
                };
              })
            )!;
        });

      // A entrada parte de faixas de altura zero — sem esta garantia, um
      // renderer que nao compoe frames deixaria o grafico em branco.
      garantirEstadoFinal(260 + DURATION.enter * 1.5, () => {
        camadas.interrupt().attr('d', (f) => areaFaixa(pontos(f)));
      });
    }
  },
};

export default chart;
