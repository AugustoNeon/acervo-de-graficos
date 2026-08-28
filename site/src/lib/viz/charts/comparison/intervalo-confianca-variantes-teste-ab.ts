/**
 * Intervalo de confiança: IC 95% ↔ erro padrão.
 *
 * O ponto (a média observada) nunca se move — só o comprimento da linha ao
 * redor dele muda entre os dois modos. É o mesmo `erroPadrao` por trás dos
 * dois: IC 95% multiplica por 1,96, erro padrão usa o valor cru. A escala do
 * eixo X é calculada uma vez a partir do intervalo mais LARGO (IC 95%) e
 * nunca muda entre os modos — trocar de modo encolhe as linhas, nunca
 * reposiciona o eixo (mesma lição da pirâmide etária: um ponto de
 * referência visual compartilhado entre estados precisa de domínio fixo).
 */

import { select, scaleLinear, scaleBand, axisBottom, format, type Selection } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo, estilarGrade } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Variante {
  variante: string;
  n: number;
  media: number;
  erroPadrao: number;
}

interface Dados {
  meta: {
    baseline: number;
    unidade: string;
    paleta: { ponto: string; base: string };
  };
  variantes: Variante[];
}

type ModoId = 'ic95' | 'se';

const MODOS: { id: ModoId; rotulo: string; fator: number }[] = [
  { id: 'ic95', rotulo: 'IC 95%', fator: 1.96 },
  { id: 'se', rotulo: 'Erro padrão', fator: 1 },
];

const VB_W = 900;
const VB_H = 420;
const MARGEM = { topo: 30, dir: 24, baixo: 46, esq: 130 };
const CAP = 8; // meia-altura do "T" nas pontas do intervalo

const fmtPct = format('.1f');
const fmtMilhar = (v: number) => format(',d')(v).replace(/,/g, '.');

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Intervalos de confiança da taxa de conversão de 5 variantes de um teste A/B, com alternância ' +
    'entre intervalo de confiança de 95% e erro padrão.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, variantes } = data as Dados;
    const { paleta, baseline, unidade } = meta;

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    // Domínio fixo: sempre a partir do IC 95% (o mais largo dos dois modos),
    // com uma margem — assim o eixo nunca precisa se mover ao trocar de modo.
    const maiorFator = Math.max(...MODOS.map((m) => m.fator));
    const todosLimites = variantes.flatMap((v) => [
      v.media - maiorFator * v.erroPadrao,
      v.media + maiorFator * v.erroPadrao,
    ]);
    const domMin = Math.min(...todosLimites, baseline);
    const domMax = Math.max(...todosLimites, baseline);
    const folga = (domMax - domMin) * 0.08;
    const xValor = scaleLinear().domain([domMin - folga, domMax + folga]).range([0, larguraUtil]);

    const yCat = scaleBand<string>()
      .domain(variantes.map((v) => v.variante))
      .range([0, alturaUtil])
      .padding(0.42);
    const centro = (v: Variante) => (yCat(v.variante) ?? 0) + yCat.bandwidth() / 2;

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const gGradeV = g.append('g');
    const gEixoBaixo = g.append('g').attr('transform', `translate(0,${alturaUtil})`);

    const eixoX = axisBottom(xValor).ticks(6).tickSizeOuter(0).tickFormat(((v: number) => `${fmtPct(v)}${unidade}`) as never);
    const gradeX = axisBottom(xValor).ticks(6).tickSize(-alturaUtil).tickFormat(() => '');
    gEixoBaixo.call(eixoX as never);
    gGradeV.call(gradeX as never);
    estilarEixo(gEixoBaixo, theme, px);
    estilarGrade(gGradeV, theme);

    // Eixo Y manual (nomes de variante) — scaleBand não precisa de d3-axis
    // aqui porque não há ticks numéricos, só o rótulo de cada linha.
    g.selectAll('text.rotulo-variante')
      .data(variantes)
      .join('text')
      .attr('class', 'rotulo-variante')
      .attr('x', -12)
      .attr('y', (v) => centro(v))
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', theme.ink)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .text((v) => v.variante);

    const linhaBase = g
      .append('line')
      .attr('x1', xValor(baseline))
      .attr('x2', xValor(baseline))
      .attr('y1', 0)
      .attr('y2', alturaUtil)
      .attr('stroke', paleta.base)
      .attr('stroke-dasharray', '5 4')
      .attr('stroke-width', 1.4);

    g.append('text')
      .attr('x', xValor(baseline))
      .attr('y', -12)
      .attr('text-anchor', 'middle')
      .attr('fill', paleta.base)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(11))
      .text('controle');

    const chaveDe = (v: Variante) => v.variante;

    const linhas = g
      .selectAll<SVGLineElement, Variante>('line.intervalo')
      .data(variantes, chaveDe)
      .join('line')
      .attr('class', 'intervalo')
      .attr('stroke', paleta.ponto)
      .attr('stroke-width', 2.4)
      .attr('stroke-linecap', 'butt')
      .attr('data-interactive', '');

    const capsSup = g
      .selectAll<SVGLineElement, Variante>('line.cap-sup')
      .data(variantes, chaveDe)
      .join('line')
      .attr('class', 'cap-sup')
      .attr('stroke', paleta.ponto)
      .attr('stroke-width', 2)
      .attr('y1', (v) => centro(v) - CAP)
      .attr('y2', (v) => centro(v) + CAP);

    const capsInf = g
      .selectAll<SVGLineElement, Variante>('line.cap-inf')
      .data(variantes, chaveDe)
      .join('line')
      .attr('class', 'cap-inf')
      .attr('stroke', paleta.ponto)
      .attr('stroke-width', 2)
      .attr('y1', (v) => centro(v) - CAP)
      .attr('y2', (v) => centro(v) + CAP);

    const pontos = g
      .selectAll<SVGCircleElement, Variante>('circle')
      .data(variantes, chaveDe)
      .join('circle')
      .attr('cy', (v) => centro(v))
      .attr('r', 6.5)
      .attr('fill', paleta.ponto)
      .attr('stroke', theme.bg)
      .attr('stroke-width', 1.5)
      .attr('data-interactive', '');

    let modoAtual: ModoId = 'ic95';
    let realceVariante: string | null = null;

    function limites(v: Variante, modo: ModoId): [number, number] {
      const fator = MODOS.find((m) => m.id === modo)!.fator;
      return [v.media - fator * v.erroPadrao, v.media + fator * v.erroPadrao];
    }

    function conteudoTooltip(v: Variante): string {
      const [inf, sup] = limites(v, modoAtual);
      const modoRotulo = MODOS.find((m) => m.id === modoAtual)!.rotulo;
      return (
        `<strong>${v.variante}</strong><br>` +
        `${fmtPct(v.media)}${unidade} (n=${fmtMilhar(v.n)})<br>` +
        `${modoRotulo}: ${fmtPct(inf)}${unidade} – ${fmtPct(sup)}${unidade}`
      );
    }

    pontos
      .on('pointermove', (evento: PointerEvent, v: Variante) => tooltip.show(conteudoTooltip(v), evento))
      .on('pointerleave', () => tooltip.hide());
    linhas
      .on('pointermove', (evento: PointerEvent, v: Variante) => tooltip.show(conteudoTooltip(v), evento))
      .on('pointerleave', () => tooltip.hide());

    function aplicarRealce() {
      const opacidade = (v: Variante) => (realceVariante && v.variante !== realceVariante ? 0.22 : 1);
      const t = <S extends Selection<any, Variante, any, any>>(s: S) => s.transition('realce').duration(DURATION.fast);
      t(linhas).attr('opacity', opacidade);
      t(capsSup).attr('opacity', opacidade);
      t(capsInf).attr('opacity', opacidade);
      t(pontos).attr('opacity', opacidade);
    }

    function realcar(chave: string) {
      realceVariante = chave;
      aplicarRealce();
    }

    function limparRealce() {
      realceVariante = null;
      aplicarRealce();
    }

    function aplicarModo(modo: ModoId, transicao: boolean) {
      modoAtual = modo;
      type ComoSelecao = Selection<any, Variante, any, any>;
      const t = (s: ComoSelecao): ComoSelecao =>
        transicao ? (s.transition().duration(DURATION.base).ease(EASE_STATE) as unknown as ComoSelecao) : s;

      t(linhas)
        .attr('x1', (v: Variante) => xValor(limites(v, modo)[0]))
        .attr('x2', (v: Variante) => xValor(limites(v, modo)[1]))
        .attr('y1', (v: Variante) => centro(v))
        .attr('y2', (v: Variante) => centro(v));
      t(capsSup).attr('x1', (v: Variante) => xValor(limites(v, modo)[0])).attr('x2', (v: Variante) => xValor(limites(v, modo)[0]));
      t(capsInf).attr('x1', (v: Variante) => xValor(limites(v, modo)[1])).attr('x2', (v: Variante) => xValor(limites(v, modo)[1]));

      botoesModo.attr('aria-pressed', (m) => String(m.id === modo));
    }

    const controles = select(root).append('div').attr('class', 'viz-controles');
    controles.append('span').attr('class', 'viz-controles-rotulo').text('Intervalo');
    const botoesModo = controles
      .selectAll<HTMLButtonElement, (typeof MODOS)[number]>('button.modo')
      .data(MODOS)
      .join('button')
      .attr('class', 'modo')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .text((m) => m.rotulo)
      .on('click', (_ev, m) => {
        if (m.id === modoAtual) return;
        aplicarModo(m.id, true);
      });

    pontos.attr('cx', (v) => xValor(v.media));

    aplicarModo('ic95', false);

    tornarFixavel(root, { selecao: pontos, chaveDe: (v: Variante) => v.variante }, realcar, limparRealce);

    if (animate) {
      // Entrada com significado: o intervalo nasce fechado no ponto (largura
      // zero) e se abre até o IC 95% real, escalonado de cima pra baixo — a
      // incerteza "se revelando" uma variante de cada vez.
      const xBase = xValor(baseline);
      linhas.attr('x1', xBase).attr('x2', xBase);
      capsSup.attr('x1', xBase).attr('x2', xBase);
      capsInf.attr('x1', xBase).attr('x2', xBase);
      pontos.attr('r', 0);
      linhaBase.attr('opacity', 0);

      const delay = (_v: Variante, i: number) => stagger(i, variantes.length);

      linhas
        .transition()
        .delay(delay)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('x1', (v) => xValor(limites(v, 'ic95')[0]))
        .attr('x2', (v) => xValor(limites(v, 'ic95')[1]));
      capsSup
        .transition()
        .delay(delay)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('x1', (v) => xValor(limites(v, 'ic95')[0]))
        .attr('x2', (v) => xValor(limites(v, 'ic95')[0]));
      capsInf
        .transition()
        .delay(delay)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('x1', (v) => xValor(limites(v, 'ic95')[1]))
        .attr('x2', (v) => xValor(limites(v, 'ic95')[1]));
      pontos
        .transition()
        .delay(delay)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('r', 6.5);
      linhaBase.transition().delay(DURATION.base).duration(DURATION.base).attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + DURATION.base + 250, () => {
        linhas
          .interrupt()
          .attr('x1', (v) => xValor(limites(v, 'ic95')[0]))
          .attr('x2', (v) => xValor(limites(v, 'ic95')[1]));
        capsSup
          .interrupt()
          .attr('x1', (v) => xValor(limites(v, 'ic95')[0]))
          .attr('x2', (v) => xValor(limites(v, 'ic95')[0]));
        capsInf
          .interrupt()
          .attr('x1', (v) => xValor(limites(v, 'ic95')[1]))
          .attr('x2', (v) => xValor(limites(v, 'ic95')[1]));
        pontos.interrupt().attr('r', 6.5);
        linhaBase.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
