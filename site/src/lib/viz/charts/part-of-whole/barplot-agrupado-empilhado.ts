/**
 * Barplot agrupado ↔ empilhado ↔ empilhado 100% — switcher de 3 estados.
 *
 * Ao contrário do barplot clássico (irmão em ranking/), aqui a granularidade
 * nunca muda: as 24 células (gênero × plataforma) existem nos três estados,
 * só sua posição/tamanho muda — a cor identifica a PLATAFORMA (subgrupo), não
 * o gênero, porque o que está em jogo é como um total se decompõe, não o
 * ranking dos gêneros entre si. O empilhamento em si usa `d3.stack()` — com
 * `stackOffsetExpand` no estado percentual — em vez de soma cumulativa feita
 * à mão.
 */

import {
  select,
  scaleBand,
  scaleLinear,
  axisBottom,
  axisLeft,
  stack,
  stackOffsetExpand,
  format,
  type Selection,
  type Transition,
} from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import type { DrawContext, VizChart } from '../../types';

interface Celula {
  genero: string;
  plataforma: string;
  horas: number;
}

interface Dados {
  meta: {
    generos: string[];
    plataformas: string[];
    paletaPlataformas: Record<string, string>;
    nota?: string;
  };
  celulas: Celula[];
}

type EstadoId = 'agrupado' | 'empilhado' | 'percent';

interface Geometria {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ESTADOS: { id: EstadoId; rotulo: string }[] = [
  { id: 'agrupado', rotulo: 'Agrupado' },
  { id: 'empilhado', rotulo: 'Empilhado' },
  { id: 'percent', rotulo: 'Empilhado 100%' },
];

const VB_W = 900;
const VB_H = 560;
const MARGEM = { topo: 24, dir: 24, baixo: 56, esq: 64 };

const chave = (genero: string, plataforma: string) => `${genero}__${plataforma}`;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Barplot com três variações alternáveis — agrupado, empilhado e empilhado 100% — mostrando ' +
    'horas de audição por gênero musical, decompostas por plataforma de streaming.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, celulas } = data as Dados;
    const { generos, plataformas, paletaPlataformas } = meta;

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const porChave = new Map(celulas.map((c) => [chave(c.genero, c.plataforma), c]));
    const totalPorGenero = new Map(
      generos.map((g) => [g, plataformas.reduce((soma, p) => soma + porChave.get(chave(g, p))!.horas, 0)])
    );
    const maxTotal = Math.max(...totalPorGenero.values());

    const linhasWide = generos.map((g) => {
      const linha: Record<string, number | string> = { genero: g };
      plataformas.forEach((p) => (linha[p] = porChave.get(chave(g, p))!.horas));
      return linha;
    });

    const stackAbs = stack<Record<string, number | string>>().keys(plataformas)(linhasWide);
    const stackPct = stack<Record<string, number | string>>().keys(plataformas).offset(stackOffsetExpand)(linhasWide);

    const pilhas = new Map<string, { abs: [number, number]; pct: [number, number] }>();
    plataformas.forEach((p, pi) => {
      generos.forEach((g, gi) => {
        pilhas.set(chave(g, p), {
          abs: [stackAbs[pi][gi][0], stackAbs[pi][gi][1]],
          pct: [stackPct[pi][gi][0], stackPct[pi][gi][1]],
        });
      });
    });

    const xOuter = scaleBand<string>().domain(generos).range([0, larguraUtil]).padding(0.26);
    const xInner = scaleBand<string>().domain(plataformas).range([0, xOuter.bandwidth()]).padding(0.1);
    const yAbs = scaleLinear().domain([0, maxTotal * 1.12]).range([alturaUtil, 0]);
    const yPct = scaleLinear().domain([0, 1]).range([alturaUtil, 0]);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const eixoBaixoSel = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const eixoEsqSel = g.append('g');
    const gBarras = g.append('g');

    let estadoAtual: EstadoId = 'agrupado';
    let realceAtivo: string | null = null;
    const geometria = new Map<string, Geometria>();

    function conteudoTooltip(c: Celula): string {
      const total = totalPorGenero.get(c.genero)!;
      const pct = ((c.horas / total) * 100).toFixed(0);
      return `<strong>${c.genero} · ${c.plataforma}</strong><br>${c.horas.toFixed(1)} milhões de horas (${pct}% do gênero)`;
    }

    function alvoDe(c: Celula, estado: EstadoId): Geometria {
      if (estado === 'agrupado') {
        const x = (xOuter(c.genero) ?? 0) + (xInner(c.plataforma) ?? 0);
        const y = yAbs(c.horas);
        return { x, y, width: xInner.bandwidth(), height: alturaUtil - y };
      }
      const par = pilhas.get(chave(c.genero, c.plataforma))!;
      const [y0, y1] = estado === 'empilhado' ? par.abs : par.pct;
      const escY = estado === 'empilhado' ? yAbs : yPct;
      const x = xOuter(c.genero) ?? 0;
      return { x, y: escY(y1), width: xOuter.bandwidth(), height: escY(y0) - escY(y1) };
    }

    const rects = gBarras
      .selectAll<SVGRectElement, Celula>('rect')
      .data(celulas, (c) => chave(c.genero, c.plataforma))
      .join('rect')
      .attr('data-interactive', '')
      .attr('fill', (c) => paletaPlataformas[c.plataforma] ?? theme.primary)
      .attr('rx', px(2))
      .on('pointerenter', (_evento, c) => realcar(c.plataforma))
      .on('pointermove', (evento: PointerEvent, c: Celula) => tooltip.show(conteudoTooltip(c), evento))
      .on('pointerleave', () => {
        realcar(null);
        tooltip.hide();
      });

    function realcar(plataforma: string | null) {
      realceAtivo = plataforma;
      // Transição nomeada ("realce"): a geometria (x/y/width/height) roda numa
      // transição sem nome própria em aplicarEstado() — sem nomes distintos,
      // uma nova .transition() no mesmo elemento cancela a anterior mesmo
      // mexendo em atributos diferentes, congelando a barra a meio caminho.
      rects
        .transition('realce')
        .duration(DURATION.fast)
        .attr('opacity', (c) => (!realceAtivo || c.plataforma === realceAtivo ? 1 : 0.25));
    }

    function desenharEixos(transicao: boolean, estado: EstadoId) {
      const escY = estado === 'percent' ? yPct : yAbs;
      const eixoY = axisLeft(escY).ticks(6).tickSizeOuter(0);
      if (estado === 'percent') eixoY.tickFormat(format('.0%') as never);

      const esqSel: Selection<SVGGElement, unknown, null, undefined> | Transition<SVGGElement, unknown, null, undefined> =
        transicao ? eixoEsqSel.transition().duration(DURATION.slow).ease(EASE_STATE) : eixoEsqSel;
      esqSel.call(eixoY);
      estilarEixo(eixoEsqSel, theme, px);
    }

    function aplicarEstado(id: EstadoId, transicao: boolean) {
      estadoAtual = id;
      celulas.forEach((c) => geometria.set(chave(c.genero, c.plataforma), alvoDe(c, id)));

      const aplicar = <S extends Selection<SVGRectElement, Celula, SVGGElement, unknown> | Transition<SVGRectElement, Celula, SVGGElement, unknown>>(
        s: S
      ) =>
        s
          .attr('x', (c: Celula) => geometria.get(chave(c.genero, c.plataforma))!.x)
          .attr('y', (c: Celula) => geometria.get(chave(c.genero, c.plataforma))!.y)
          .attr('width', (c: Celula) => geometria.get(chave(c.genero, c.plataforma))!.width)
          .attr('height', (c: Celula) => geometria.get(chave(c.genero, c.plataforma))!.height);

      aplicar(transicao ? rects.transition().duration(DURATION.slow).ease(EASE_STATE) : rects);
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

    estilarEixo(eixoBaixoSel.call(axisBottom(xOuter).tickSizeOuter(0)), theme, px);
    aplicarEstado('agrupado', false);

    const legenda = select(root).append('div').attr('class', 'viz-legenda');
    legenda
      .selectAll('button')
      .data(plataformas)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html(
        (p) => `<span class="viz-swatch" style="background:${paletaPlataformas[p]}"></span>${p}`
      )
      .on('pointerenter', (_e, p) => realcar(p))
      .on('pointerleave', () => realcar(null));

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    if (animate) {
      const yFinal = (c: Celula) => geometria.get(chave(c.genero, c.plataforma))!.y;
      const alturaFinal = (c: Celula) => geometria.get(chave(c.genero, c.plataforma))!.height;
      rects.attr('y', alturaUtil).attr('height', 0);
      rects
        .transition()
        .delay((_c, i) => stagger(i, celulas.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('y', yFinal)
        .attr('height', alturaFinal);

      garantirEstadoFinal(DURATION.enter + 250, () => {
        rects.interrupt().attr('y', yFinal).attr('height', alturaFinal);
      });
    }
  },
};

export default chart;
