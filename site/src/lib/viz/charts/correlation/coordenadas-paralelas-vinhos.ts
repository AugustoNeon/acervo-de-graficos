/**
 * Coordenadas paralelas: perfil sensorial de 90 vinhos fictícios — D3.
 *
 * Um eixo vertical por variável (posicionados lado a lado), cada vinho uma
 * polilinha ligando seu valor em cada eixo. Ao contrário do `ggparcoord()`
 * (que reescala tudo pra um Y de 0 a 1 compartilhado, sem espaço pra rótulo
 * de unidade por eixo), aqui CADA eixo tem sua própria escala com ticks em
 * unidade real — mais informativo quando o gráfico já é interativo e não
 * precisa caber tudo num só eixo Y impresso.
 *
 * O que a imagem não dá: com 90 linhas sobrepostas, é quase impossível
 * seguir uma única visualmente — passar o cursor numa linha destaca só ela
 * (as outras 89 apagam), e o tooltip mostra os 5 valores daquele vinho.
 * Clicar fixa o destaque.
 */

import { select, scaleLinear, scalePoint, axisLeft, line as d3line } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Vinho {
  id: number;
  tipo: string;
  acidez: number;
  corpo: number;
  tanino: number;
  docura: number;
  preco: number;
  [chave: string]: number | string;
}

interface Dados {
  meta: {
    eixos: string[];
    rotulosEixo: Record<string, string>;
    tipos: string[];
    paleta: Record<string, string>;
    nota?: string;
  };
  vinhos: Vinho[];
}

const VB_W = 820;
const VB_H = 480;
const MARGEM = { topo: 24, dir: 28, baixo: 20, esq: 28 };

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Coordenadas paralelas: 90 vinhos fictícios (tinto, branco, rosé) em 5 eixos — acidez, corpo, tanino, ' +
    'doçura e preço. Passar o cursor numa linha isola aquele vinho entre as outras 89.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, vinhos } = data as Dados;
    const { eixos, rotulosEixo, paleta } = meta;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const xEixo = scalePoint<string>().domain(eixos).range([0, larguraUtil]).padding(0.06);

    const yPorEixo = new Map(
      eixos.map((e) => {
        const valores = vinhos.map((v) => v[e] as number);
        const min = Math.min(...valores);
        const max = Math.max(...valores);
        const folga = (max - min) * 0.08 || 1;
        return [e, scaleLinear().domain([min - folga, max + folga]).range([alturaUtil, 0])];
      })
    );

    function caminhoDoVinho(v: Vinho): string {
      return (
        d3line<string>()
          .x((e) => xEixo(e) ?? 0)
          .y((e) => yPorEixo.get(e)!(v[e] as number))(eixos) ?? ''
      );
    }

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    // -------------------------------------------------------------- eixos
    const gEixos = g.append('g');
    eixos.forEach((e) => {
      const eixoSel = gEixos.append('g').attr('transform', `translate(${xEixo(e)},0)`);
      estilarEixo(eixoSel.call(axisLeft(yPorEixo.get(e)!).ticks(5).tickSizeOuter(0)), theme, px);
      eixoSel
        .append('text')
        .attr('y', -px(8))
        .attr('text-anchor', 'middle')
        .attr('fill', theme.ink)
        .attr('font-family', theme.fontBody)
        .attr('font-weight', 700)
        .attr('font-size', px(12))
        .text(rotulosEixo[e] ?? e);
    });

    // -------------------------------------------------------------- linhas
    const gLinhas = g.append('g').attr('fill', 'none');
    const linhasSel = gLinhas
      .selectAll<SVGPathElement, Vinho>('path')
      .data(vinhos, (d) => d.id)
      .join('path')
      .attr('d', caminhoDoVinho)
      .attr('stroke', (d) => paleta[d.tipo] ?? theme.accent)
      .attr('stroke-width', px(1.2))
      .attr('stroke-opacity', 0.45);

    // Path invisivel bem mais grosso por cima, só pra facilitar clicar/passar
    // o cursor numa linha fina em meio a 90 outras -- a visivel continua
    // fina, só a AREA DE DETECCAO de ponteiro fica generosa.
    const gAlvo = g.append('g').attr('fill', 'none').attr('stroke', 'transparent');
    const alvosSel = gAlvo
      .selectAll<SVGPathElement, Vinho>('path')
      .data(vinhos, (d) => d.id)
      .join('path')
      .attr('d', caminhoDoVinho)
      .attr('stroke-width', px(9))
      .attr('data-interactive', '');

    function conteudoTooltip(d: Vinho): string {
      const linhaValores = eixos.map((e) => `${rotulosEixo[e]}: ${d[e]}`).join(' · ');
      return `<strong>Vinho #${d.id} · ${d.tipo}</strong><br>${linhaValores}`;
    }

    alvosSel
      .on('pointermove', (evento: PointerEvent, d) => tooltip.show(conteudoTooltip(d), evento))
      .on('pointerleave', () => tooltip.hide());

    tornarFixavel(
      root,
      { selecao: alvosSel, chaveDe: (d) => String(d.id) },
      (id) =>
        linhasSel
          .transition('realce')
          .duration(DURATION.fast)
          .ease(EASE_STATE)
          .attr('stroke-opacity', (d) => (String(d.id) === id ? 1 : 0.06))
          .attr('stroke-width', (d) => px(String(d.id) === id ? 2.6 : 1.2)),
      () =>
        linhasSel
          .transition('realce')
          .duration(DURATION.fast)
          .ease(EASE_STATE)
          .attr('stroke-opacity', 0.45)
          .attr('stroke-width', px(1.2))
    );

    // -------------------------------------------------------------- legenda
    // Clicar num tipo isola aquele grupo entre as 90 linhas -- independente
    // do fixar-por-linha acima (chave diferente: tipo, nao id do vinho), por
    // isso usa seu proprio estado local em vez de outra chamada a
    // tornarFixavel() (que so suporta uma unica chave fixada por raiz).
    let tipoFixado: string | null = null;
    const legenda = select(root).append('div').attr('class', 'viz-legenda');
    const botoesLegenda = legenda
      .selectAll<HTMLButtonElement, string>('button')
      .data(meta.tipos)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .attr('aria-pressed', 'false')
      .html((t) => `<span class="viz-swatch" style="background:${paleta[t]}"></span>${t}`)
      .on('click', (_evento, t) => {
        tipoFixado = tipoFixado === t ? null : t;
        botoesLegenda.attr('aria-pressed', (m) => String(m === tipoFixado));
        linhasSel
          .transition('tipo')
          .duration(DURATION.fast)
          .ease(EASE_STATE)
          .attr('stroke-opacity', (d) => (tipoFixado === null ? 0.45 : d.tipo === tipoFixado ? 0.75 : 0.04));
      });

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    if (animate) {
      linhasSel
        .attr('stroke-dasharray', function () {
          const total = (this as SVGPathElement).getTotalLength();
          return `${total} ${total}`;
        })
        .attr('stroke-dashoffset', function () {
          return (this as SVGPathElement).getTotalLength();
        })
        .transition()
        .delay((_d, i) => stagger(i, vinhos.length, 900))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('stroke-dashoffset', 0);

      garantirEstadoFinal(DURATION.enter + stagger(vinhos.length - 1, vinhos.length, 900) + 100, () => {
        linhasSel.interrupt().attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
      });
    }
  },
};

export default chart;
