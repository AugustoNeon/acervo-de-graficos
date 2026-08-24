/**
 * Área sobreposta ↔ empilhada ↔ empilhada 100% — switcher de 3 estados.
 *
 * Mesmo princípio do barplot agrupado/empilhado/percentual deste acervo
 * (as MESMAS 4 séries — chave = categoria — se reorganizam com path
 * morphing em vez de trocar de gráfico), aplicado a um eixo do tempo
 * contínuo em vez de bandas discretas. O R só exporta a série bruta por
 * categoria; o `d3.stack()` (com `stackOffsetExpand` no estado percentual)
 * roda aqui, não no R.
 *
 * O morph entre estados interpola as posições em PIXEL (não em unidade de
 * dado), porque cada estado usa uma escala Y com domínio diferente — é
 * assim que uma área que vai de "0 a 130" (sobreposta) consegue virar
 * suavemente uma faixa que vai de "45% a 100%" (percentual) sem pular.
 */

import { select, scaleUtc, scaleLinear, axisBottom, axisLeft, stack, stackOffsetExpand, format, interpolateArray } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
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

type EstadoId = 'sobreposta' | 'empilhada' | 'percent';

interface PontoPx {
  x: number;
  y0: number;
  y1: number;
}

const ESTADOS: { id: EstadoId; rotulo: string }[] = [
  { id: 'sobreposta', rotulo: 'Sobreposta' },
  { id: 'empilhada', rotulo: 'Empilhada' },
  { id: 'percent', rotulo: 'Empilhada 100%' },
];

const VB_W = 900;
const VB_H = 460;
const MARGEM = { topo: 20, dir: 24, baixo: 40, esq: 56 };

function caminhoArea(pontos: PontoPx[]): string {
  if (pontos.length === 0) return '';
  const topo = pontos.map((p) => `${p.x},${p.y1}`).join('L');
  const base = [...pontos].reverse().map((p) => `${p.x},${p.y0}`).join('L');
  return `M${topo}L${base}Z`;
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Gráfico de área com três variações alternáveis — sobreposta, empilhada e empilhada 100% — mostrando ' +
    'a receita mensal de um SaaS fictício, decomposta em 4 categorias de produto ao longo de 24 meses.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, series } = data as Dados;
    const { categorias, paleta } = meta;

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const meses = series[0].pontos.map((p) => new Date(p.mes));
    const nMeses = meses.length;
    const valorPor = new Map<string, number[]>(series.map((s) => [s.categoria, s.pontos.map((p) => p.receita)]));

    const linhasWide = meses.map((_m, i) => {
      const linha: Record<string, number> = {};
      categorias.forEach((c) => (linha[c] = valorPor.get(c)![i]));
      return linha;
    });
    const stackAbs = stack<Record<string, number>>().keys(categorias)(linhasWide);
    const stackPct = stack<Record<string, number>>().keys(categorias).offset(stackOffsetExpand)(linhasWide);

    const maxIndividual = Math.max(...categorias.flatMap((c) => valorPor.get(c)!));
    const maxTotal = Math.max(...linhasWide.map((l) => categorias.reduce((s, c) => s + l[c], 0)));

    const x = scaleUtc().domain([meses[0], meses[nMeses - 1]]).range([0, larguraUtil]);
    const ySobreposta = scaleLinear().domain([0, maxIndividual * 1.12]).range([alturaUtil, 0]);
    const yAbs = scaleLinear().domain([0, maxTotal * 1.08]).range([alturaUtil, 0]);
    const yPct = scaleLinear().domain([0, 1]).range([alturaUtil, 0]);

    function pontosPx(categoria: string, ci: number, estado: EstadoId): PontoPx[] {
      const xs = meses.map((m) => x(m));
      if (estado === 'sobreposta') {
        const vals = valorPor.get(categoria)!;
        return xs.map((xp, i) => ({ x: xp, y0: ySobreposta(0), y1: ySobreposta(vals[i]) }));
      }
      const camada = estado === 'empilhada' ? stackAbs[ci] : stackPct[ci];
      const escY = estado === 'empilhada' ? yAbs : yPct;
      return xs.map((xp, i) => ({ x: xp, y0: escY(camada[i][0]), y1: escY(camada[i][1]) }));
    }

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const eixoBaixoSel = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const eixoEsqSel = g.append('g');
    const gAreas = g.append('g');

    let estadoAtual: EstadoId = 'sobreposta';
    const posicaoAtual = new Map<string, PontoPx[]>();

    const areasSel = gAreas
      .selectAll<SVGPathElement, Serie>('path')
      .data(series, (s) => s.categoria)
      .join('path')
      .attr('data-interactive', '')
      .attr('fill', (s) => paleta[s.categoria] ?? theme.accent)
      .attr('fill-opacity', 0.75)
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1.5));

    function conteudoTooltip(categoria: string, mesIdx: number): string {
      const dataFmt = meses[mesIdx].toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      const valor = valorPor.get(categoria)![mesIdx];
      return `<strong>${categoria}</strong><br>${dataFmt} · R$ ${valor.toFixed(1)} mil`;
    }

    areasSel
      .on('pointermove', function (evento: PointerEvent, s: Serie) {
        const [mx] = d3PonteiroLocal(evento, this as SVGPathElement, g.node() as SVGGElement);
        const alvo = x.invert(mx);
        let melhor = 0;
        let menorDist = Infinity;
        meses.forEach((m, i) => {
          const dist = Math.abs(m.getTime() - alvo.getTime());
          if (dist < menorDist) {
            menorDist = dist;
            melhor = i;
          }
        });
        tooltip.show(conteudoTooltip(s.categoria, melhor), evento);
      })
      .on('pointerleave', () => tooltip.hide());

    // Pega a posicao do ponteiro relativa ao grupo <g> transladado (nao ao
    // SVG inteiro), sem depender de d3.pointer() pra evitar mais uma
    // importacao so pra isso.
    function d3PonteiroLocal(evento: PointerEvent, _alvo: SVGPathElement, refNode: SVGGElement): [number, number] {
      const ctm = refNode.getScreenCTM();
      if (!ctm) return [0, 0];
      const inv = ctm.inverse();
      const pt = new DOMPoint(evento.clientX, evento.clientY).matrixTransform(inv);
      return [pt.x, pt.y];
    }

    function desenharEixos(transicao: boolean, estado: EstadoId) {
      const escY = estado === 'percent' ? yPct : estado === 'empilhada' ? yAbs : ySobreposta;
      const eixoY = axisLeft(escY).ticks(6).tickSizeOuter(0);
      if (estado === 'percent') eixoY.tickFormat(format('.0%') as never);
      const esqSel = transicao ? eixoEsqSel.transition().duration(DURATION.slow).ease(EASE_STATE) : eixoEsqSel;
      esqSel.call(eixoY);
      estilarEixo(eixoEsqSel, theme, px);
    }

    function aplicarEstado(id: EstadoId, transicao: boolean) {
      estadoAtual = id;

      if (transicao) {
        areasSel
          .transition()
          .duration(DURATION.slow)
          .ease(EASE_STATE)
          .attrTween('d', function (s: Serie, ci: number) {
            const antigo = posicaoAtual.get(s.categoria) ?? pontosPx(s.categoria, ci, id);
            const novo = pontosPx(s.categoria, ci, id);
            const interp = interpolateArray(antigo, novo);
            return (t: number) => caminhoArea(interp(t) as PontoPx[]);
          });
      } else {
        areasSel.attr('d', (s: Serie, ci: number) => caminhoArea(pontosPx(s.categoria, ci, id)));
      }

      series.forEach((s, ci) => posicaoAtual.set(s.categoria, pontosPx(s.categoria, ci, id)));
      desenharEixos(transicao, id);
      botoes.attr('aria-pressed', (m) => String(m.id === id));
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

    estilarEixo(
      eixoBaixoSel.call(
        axisBottom(x)
          .ticks(6)
          .tickSizeOuter(0)
          .tickFormat((d) => (d as Date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }))
      ),
      theme,
      px
    );
    aplicarEstado('sobreposta', false);

    const legenda = select(root).append('div').attr('class', 'viz-legenda');
    const legendaBotoes = legenda
      .selectAll('button')
      .data(categorias)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((c) => `<span class="viz-swatch" style="background:${paleta[c]}"></span>${c}`);

    tornarFixavel(
      root,
      [
        { selecao: areasSel, chaveDe: (s: Serie) => s.categoria },
        { selecao: legendaBotoes, chaveDe: (c: string) => c },
      ],
      (categoria) =>
        areasSel
          .transition('realce')
          .duration(DURATION.fast)
          .attr('fill-opacity', (s) => (s.categoria === categoria ? 0.92 : 0.18)),
      () => areasSel.transition('realce').duration(DURATION.fast).attr('fill-opacity', 0.75)
    );

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    if (animate) {
      const alvoFinal = new Map(series.map((s, ci) => [s.categoria, pontosPx(s.categoria, ci, 'sobreposta')]));
      const achatado = (categoria: string) => (alvoFinal.get(categoria) ?? []).map((p) => ({ ...p, y1: p.y0 }));
      areasSel.attr('d', (s) => caminhoArea(achatado(s.categoria)));
      areasSel
        .transition()
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('d', (s) => caminhoArea(alvoFinal.get(s.categoria)!));

      garantirEstadoFinal(DURATION.enter + 100, () => {
        areasSel.interrupt().attr('d', (s) => caminhoArea(alvoFinal.get(s.categoria)!));
      });
    }
  },
};

export default chart;
