/**
 * Pirâmide etária: absoluto ↔ percentual do próprio gênero.
 *
 * As barras espelhadas nunca mudam de forma — o que o modo "Percentual"
 * troca é a ESCALA: cada barra passa a valer sua fração do total daquele
 * gênero, em vez do número bruto de habitantes. É a mesma leitura que
 * comparar dois países de tamanhos bem diferentes precisa: em absoluto a
 * cidade universitária deste gráfico tem números pequenos demais pra
 * generalizar, mas o FORMATO da pirâmide (onde está o inchaço) é comparável
 * com qualquer lugar, e é isso que o percentual revela sem distração de
 * escala.
 */

import { select, scaleLinear, scaleBand, axisBottom, axisLeft, format, type Selection } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo, estilarGrade } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Faixa {
  idade: string;
  homens: number;
  mulheres: number;
}

interface Dados {
  meta: {
    rotuloHomens: string;
    rotuloMulheres: string;
    paleta: { homens: string; mulheres: string };
  };
  faixas: Faixa[];
}

type Genero = 'homens' | 'mulheres';
type ModoId = 'absoluto' | 'percentual';

const MODOS: { id: ModoId; rotulo: string }[] = [
  { id: 'absoluto', rotulo: 'Absoluto' },
  { id: 'percentual', rotulo: 'Percentual' },
];

const VB_W = 900;
const VB_H = 640;
const MARGEM = { topo: 16, dir: 24, baixo: 52, esq: 60 };

// `d3.format(',d')` separa milhar com vírgula (padrão en-US); trocado pelo
// ponto depois, mesma correção já documentada no AGENTS.md ("Lições
// aprendidas", 2026-08-26) pra qualquer eixo/tooltip em português.
const fmtMilharBase = format(',d');
const fmtMilhar = (v: number) => fmtMilharBase(Math.round(v)).replace(/,/g, '.');
const fmtPct = format('.1f');

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Pirâmide etária comparando homens e mulheres por faixa de 5 anos numa cidade universitária ' +
    'fictícia, com alternância entre número absoluto de habitantes e percentual de cada gênero.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, faixas } = data as Dados;
    const { paleta, rotuloHomens, rotuloMulheres } = meta;

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const totalHomens = faixas.reduce((s, f) => s + f.homens, 0);
    const totalMulheres = faixas.reduce((s, f) => s + f.mulheres, 0);
    const totalPorGenero: Record<Genero, number> = { homens: totalHomens, mulheres: totalMulheres };

    // Faixa "0-4" primeiro no domínio, mas com o range invertido: ela cai
    // perto de `alturaUtil` (embaixo na tela) e "80+" perto de 0 (em cima) —
    // mesma convenção do output.png (base da pirâmide embaixo).
    const yCat = scaleBand<string>()
      .domain(faixas.map((f) => f.idade))
      .range([alturaUtil, 0])
      .padding(0.22);

    function valorDe(f: Faixa, genero: Genero, modo: ModoId): number {
      const bruto = f[genero];
      return modo === 'absoluto' ? bruto : (bruto / totalPorGenero[genero]) * 100;
    }

    function maxDominio(modo: ModoId): number {
      let max = 0;
      for (const f of faixas) {
        max = Math.max(max, valorDe(f, 'homens', modo), valorDe(f, 'mulheres', modo));
      }
      return max * 1.12;
    }

    // Domínio simétrico: garante que x=0 caia exatamente no meio do painel
    // nos dois modos, senão o eixo "pula" horizontalmente na transição.
    let xValor = scaleLinear().domain([-maxDominio('absoluto'), maxDominio('absoluto')]).range([0, larguraUtil]);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const gGradeV = g.append('g');
    const gZero = g.append('g');
    const gEixoBaixo = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const gEixoEsq = g.append('g');
    const gDado = g.append('g');

    gZero.append('line').attr('y1', 0).attr('y2', alturaUtil).attr('stroke', theme.borderStrong);

    const chaveDe = (f: Faixa) => f.idade;

    const barrasHomens = gDado
      .selectAll<SVGRectElement, Faixa>('rect.homens')
      .data(faixas, chaveDe)
      .join('rect')
      .attr('class', 'homens')
      .attr('fill', paleta.homens)
      .attr('data-interactive', '');

    const barrasMulheres = gDado
      .selectAll<SVGRectElement, Faixa>('rect.mulheres')
      .data(faixas, chaveDe)
      .join('rect')
      .attr('class', 'mulheres')
      .attr('fill', paleta.mulheres)
      .attr('data-interactive', '');

    function conteudoTooltip(f: Faixa, genero: Genero): string {
      const bruto = f[genero];
      const pct = (bruto / totalPorGenero[genero]) * 100;
      const rotulo = genero === 'homens' ? rotuloHomens : rotuloMulheres;
      const cor = paleta[genero];
      return (
        `<strong>${f.idade} anos</strong><br>` +
        `<span class="viz-swatch" style="background:${cor}"></span>` +
        `${rotulo}: ${fmtMilhar(bruto)} habitantes (${fmtPct(pct)}% d${genero === 'homens' ? 'os' : 'as'} ${rotulo.toLowerCase()})`
      );
    }

    barrasHomens
      .on('pointermove', (evento: PointerEvent, f: Faixa) => tooltip.show(conteudoTooltip(f, 'homens'), evento))
      .on('pointerleave', () => tooltip.hide());
    barrasMulheres
      .on('pointermove', (evento: PointerEvent, f: Faixa) => tooltip.show(conteudoTooltip(f, 'mulheres'), evento))
      .on('pointerleave', () => tooltip.hide());

    let modoAtual: ModoId = 'absoluto';
    let realceIdade: string | null = null;
    let realceGenero: Genero | null = null;

    function aplicarRealce() {
      const opacidade = (f: Faixa, genero: Genero) => {
        if (realceIdade && f.idade !== realceIdade) return 0.15;
        if (realceGenero && genero !== realceGenero) return 0.15;
        return 1;
      };
      const t = <S extends Selection<any, Faixa, any, any>>(s: S) => s.transition('realce').duration(DURATION.fast);
      t(barrasHomens).attr('opacity', (f) => opacidade(f, 'homens'));
      t(barrasMulheres).attr('opacity', (f) => opacidade(f, 'mulheres'));
    }

    function realcar(chave: string) {
      const [tipo, valor] = chave.split(':');
      if (tipo === 'genero') {
        realceGenero = valor as Genero;
        realceIdade = null;
      } else {
        realceIdade = valor;
        realceGenero = null;
      }
      aplicarRealce();
    }

    function limparRealce() {
      realceIdade = null;
      realceGenero = null;
      aplicarRealce();
    }

    // `Selection` e `Transition` não têm supertipo comum com `.attr()`
    // encadeável — numa união dos dois o TypeScript resolve pela sobrecarga
    // de LEITURA (que devolve `string`), e o encadeamento quebra. Mesmo
    // contorno já usado em halteres-espera-especialidades.ts.
    type ComoSelecao = Selection<any, Faixa, any, any>;

    function geometriaBarra(sel: Selection<any, Faixa, any, any>, genero: Genero, transicao: boolean) {
      const t: ComoSelecao = transicao
        ? (sel.transition().duration(DURATION.slow).ease(EASE_STATE) as unknown as ComoSelecao)
        : sel;
      const sinal = genero === 'homens' ? -1 : 1;
      t.attr('x', (f: Faixa) => Math.min(xValor(0), xValor(sinal * valorDe(f, genero, modoAtual))))
        .attr('width', (f: Faixa) => Math.abs(xValor(sinal * valorDe(f, genero, modoAtual)) - xValor(0)))
        .attr('y', (f: Faixa) => yCat(f.idade)!)
        .attr('height', yCat.bandwidth());
    }

    function desenharMoldura(transicao: boolean) {
      const dur = transicao ? DURATION.slow : 0;
      const eixoX = axisBottom(xValor).ticks(6).tickSizeOuter(0).tickFormat(((v: number) =>
        modoAtual === 'absoluto' ? fmtMilhar(Math.abs(v)) : `${fmtPct(Math.abs(v))}%`) as never);
      const gradeX = axisBottom(xValor).ticks(6).tickSize(-alturaUtil).tickFormat(() => '');

      (transicao ? gEixoBaixo.transition().duration(dur).ease(EASE_STATE) : gEixoBaixo).call(eixoX as never);
      (transicao ? gGradeV.transition().duration(dur).ease(EASE_STATE) : gGradeV).call(gradeX as never);
      estilarEixo(gEixoBaixo, theme, px);
      estilarGrade(gGradeV, theme);

      gEixoEsq.call(axisLeft(yCat).tickSizeOuter(0) as never);
      estilarEixo(gEixoEsq, theme, px);
      gEixoEsq.select('.domain').remove();

      const linhaZero = gZero.select<SVGLineElement>('line');
      type ComoSelecaoLinha = Selection<SVGLineElement, unknown, any, any>;
      const tZero: ComoSelecaoLinha = transicao
        ? (linhaZero.transition().duration(dur).ease(EASE_STATE) as unknown as ComoSelecaoLinha)
        : linhaZero;
      tZero.attr('x1', xValor(0)).attr('x2', xValor(0));

      rotuloEixoX.text(modoAtual === 'absoluto' ? 'Habitantes' : 'Percentual da população de cada gênero');
    }

    const rotuloEixoX = g
      .append('text')
      .attr('x', larguraUtil / 2)
      .attr('y', alturaUtil + 42)
      .attr('text-anchor', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12));

    function aplicarModo(modo: ModoId, transicao: boolean) {
      modoAtual = modo;
      xValor = scaleLinear().domain([-maxDominio(modo), maxDominio(modo)]).range([0, larguraUtil]);
      geometriaBarra(barrasHomens, 'homens', transicao);
      geometriaBarra(barrasMulheres, 'mulheres', transicao);
      desenharMoldura(transicao);
      botoesModo.attr('aria-pressed', (m) => String(m.id === modo));
    }

    const controles = select(root).append('div').attr('class', 'viz-controles');
    controles.append('span').attr('class', 'viz-controles-rotulo').text('Leitura');
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

    const legenda = select(root).append('div').attr('class', 'viz-legenda');
    const botoesLegenda = legenda
      .selectAll<HTMLButtonElement, { id: Genero; rotulo: string; cor: string }>('button')
      .data([
        { id: 'homens' as const, rotulo: rotuloHomens, cor: paleta.homens },
        { id: 'mulheres' as const, rotulo: rotuloMulheres, cor: paleta.mulheres },
      ])
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((m) => `<span class="viz-swatch" style="background:${m.cor}"></span>${m.rotulo}`);

    aplicarModo('absoluto', false);
    aplicarRealce();

    tornarFixavel(
      root,
      [
        { selecao: barrasHomens, chaveDe: (f: Faixa) => `idade:${f.idade}` },
        { selecao: barrasMulheres, chaveDe: (f: Faixa) => `idade:${f.idade}` },
        { selecao: botoesLegenda, chaveDe: (m: { id: string }) => `genero:${m.id}` },
      ],
      realcar,
      limparRealce
    );

    if (animate) {
      // Entrada com significado: as duas metades nascem coladas no centro
      // (largura 0) e se abrem até o valor final, escalonadas da base pro
      // topo — a própria pirâmide "crescendo" da faixa mais jovem à mais
      // velha, na ordem em que uma população de verdade se acumula no tempo.
      const centroX = xValor(0);
      barrasHomens.attr('x', centroX).attr('width', 0);
      barrasMulheres.attr('x', centroX).attr('width', 0);

      const ordemEntrada = [...faixas].reverse(); // base (0-4) primeiro

      barrasHomens
        .transition()
        .delay((f) => stagger(ordemEntrada.findIndex((o) => o.idade === f.idade), faixas.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('x', (f) => Math.min(xValor(0), xValor(-valorDe(f, 'homens', 'absoluto'))))
        .attr('width', (f) => Math.abs(xValor(-valorDe(f, 'homens', 'absoluto')) - xValor(0)));

      barrasMulheres
        .transition()
        .delay((f) => stagger(ordemEntrada.findIndex((o) => o.idade === f.idade), faixas.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('x', (f) => Math.min(xValor(0), xValor(valorDe(f, 'mulheres', 'absoluto'))))
        .attr('width', (f) => Math.abs(xValor(valorDe(f, 'mulheres', 'absoluto')) - xValor(0)));

      garantirEstadoFinal(DURATION.enter + 250, () => {
        geometriaBarra(barrasHomens.interrupt(), 'homens', false);
        geometriaBarra(barrasMulheres.interrupt(), 'mulheres', false);
      });
    }
  },
};

export default chart;
