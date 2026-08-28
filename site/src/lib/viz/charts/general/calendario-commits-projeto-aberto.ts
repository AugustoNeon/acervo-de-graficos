/**
 * Calendário de commits: contínuo ↔ faixas.
 *
 * A grade nunca muda de posição — 365 quadrados na mesma malha semana ×
 * dia-da-semana em qualquer modo. O que alterna é só a FUNÇÃO que decide a
 * cor de cada quadrado: uma rampa contínua (mais fiel ao valor exato, dois
 * dias parecidos saem em tons quase iguais) ou 5 degraus fixos (mais fácil
 * de comparar dois pontos distantes da grade, ao custo de perder a
 * diferença fina dentro da mesma faixa). Nenhum quadrado nasce ou morre na
 * troca — só o `fill`.
 */

import { select, interpolateRgb, type Selection } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Dia {
  data: string;
  semana: number;
  diaSemana: number;
  valor: number;
}

interface MesRotulo {
  semana: number;
  rotulo: string;
}

interface Dados {
  meta: {
    ano: number;
    unidade: string;
    paleta: { continua: string[]; faixas: string[]; cortesFaixas: number[] };
    mesesRotulo: MesRotulo[];
  };
  dias: Dia[];
}

type ModoId = 'continua' | 'faixas';

const MODOS: { id: ModoId; rotulo: string }[] = [
  { id: 'continua', rotulo: 'Contínuo' },
  { id: 'faixas', rotulo: 'Faixas' },
];

const VB_W = 1100;
const MARGEM = { topo: 26, dir: 12, baixo: 8, esq: 34 };
// A grade é sempre bem mais larga que alta (53 semanas × 7 dias) — a célula
// acaba limitada pela LARGURA, não pela altura. `VB_H` é calculado pra que
// a altura útil bata exatamente com `7 células de largura`, então a grade
// preenche o viewBox inteiro em vez de sobrar espaço em branco embaixo
// (o que acontecia com uma altura "just because" escolhida antes de fazer
// essa conta).
const SEMANAS_REFERENCIA = 53;
const CEL_REFERENCIA = (VB_W - MARGEM.esq - MARGEM.dir) / SEMANAS_REFERENCIA;
const VB_H = Math.round(CEL_REFERENCIA * 7 + MARGEM.topo + MARGEM.baixo);
const GAP = 0.14; // fração da célula que vira respiro entre quadrados

const NOMES_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const LINHAS_ROTULADAS = new Set([1, 3, 5]); // Seg, Qua, Sex — mesma convenção do output.png

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Calendário de um ano de commits de um projeto de código aberto fictício, com alternância entre ' +
    'escala contínua e faixas fixas de cor.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, dias } = data as Dados;
    const { paleta, mesesRotulo } = meta;

    const escalaPx = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escalaPx;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;
    const numSemanas = Math.max(...dias.map((d) => d.semana)) + 1;
    const cel = Math.min(larguraUtil / numSemanas, alturaUtil / 7);
    const gap = cel * GAP;

    const xDe = (semana: number) => semana * cel;
    const yDe = (diaSemana: number) => diaSemana * cel;

    const maxValor = Math.max(...dias.map((d) => d.valor));

    // Mesma técnica de interpolação RGB por trechos que `colorRampPalette()`
    // usa no R por padrão — usar `interpolateLab`/outro espaço aqui faria a
    // rampa contínua da versão interativa divergir sutilmente da do
    // `output.png` (ver AGENTS.md, "Lições aprendidas" 2026-08-20).
    const paradas = paleta.continua;
    function corContinua(valor: number): string {
      const t = Math.max(0, Math.min(1, valor / maxValor)) * (paradas.length - 1);
      const i = Math.min(Math.floor(t), paradas.length - 2);
      return interpolateRgb(paradas[i], paradas[i + 1])(t - i);
    }

    function corFaixa(valor: number): string {
      let idx = 0;
      for (let i = 0; i < paleta.cortesFaixas.length; i++) {
        if (valor >= paleta.cortesFaixas[i]) idx = i;
      }
      return paleta.faixas[idx];
    }

    const fmtData = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    g.selectAll('text.mes')
      .data(mesesRotulo)
      .join('text')
      .attr('class', 'mes')
      .attr('x', (m: MesRotulo) => xDe(m.semana))
      .attr('y', -10)
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(12))
      .text((m: MesRotulo) => m.rotulo);

    g.selectAll('text.dia')
      .data(NOMES_DIA.filter((_, i) => LINHAS_ROTULADAS.has(i)))
      .join('text')
      .attr('x', -8)
      .attr('y', (_d, i) => {
        // i indexa só as 3 linhas rotuladas — recupera o índice real na
        // lista completa pra cair na linha certa.
        const indices = [...LINHAS_ROTULADAS];
        return yDe(indices[i]) + cel / 2;
      })
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', theme.inkMuted)
      .attr('font-family', theme.fontBody)
      .attr('font-size', px(11))
      .text((d: string) => d);

    const chaveDe = (d: Dia) => d.data;

    const quadrados = g
      .selectAll<SVGRectElement, Dia>('rect')
      .data(dias, chaveDe)
      .join('rect')
      .attr('x', (d) => xDe(d.semana) + gap / 2)
      .attr('y', (d) => yDe(d.diaSemana) + gap / 2)
      .attr('width', cel - gap)
      .attr('height', cel - gap)
      .attr('rx', Math.min(2, cel * 0.12))
      .attr('data-interactive', '')
      .on('pointermove', (evento: PointerEvent, d: Dia) => {
        const data = new Date(`${d.data}T00:00:00Z`);
        const rotuloData = fmtData.format(data);
        tooltip.show(
          `<strong>${rotuloData.charAt(0).toUpperCase()}${rotuloData.slice(1)}</strong><br>` +
            `${d.valor} ${d.valor === 1 ? meta.unidade.replace(/s$/, '') : meta.unidade}`,
          evento
        );
      })
      .on('pointerleave', () => tooltip.hide());

    let modoAtual: ModoId = 'continua';
    let realceData: string | null = null;

    function corDe(d: Dia): string {
      return modoAtual === 'continua' ? corContinua(d.valor) : corFaixa(d.valor);
    }

    function aplicarRealce() {
      quadrados
        .transition('realce')
        .duration(DURATION.fast)
        .attr('opacity', (d) => (realceData && d.data !== realceData ? 0.25 : 1));
    }

    function realcar(chave: string) {
      realceData = chave;
      aplicarRealce();
    }

    function limparRealce() {
      realceData = null;
      aplicarRealce();
    }

    function aplicarModo(modo: ModoId, transicao: boolean) {
      modoAtual = modo;
      const sel = quadrados as unknown as Selection<SVGRectElement, Dia, any, any>;
      const alvo = transicao ? sel.transition().duration(DURATION.base).ease(EASE_STATE) : sel;
      alvo.attr('fill', (d: Dia) => corDe(d));
      botoesModo.attr('aria-pressed', (m) => String(m.id === modo));
    }

    const controles = select(root).append('div').attr('class', 'viz-controles');
    controles.append('span').attr('class', 'viz-controles-rotulo').text('Cor');
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

    aplicarModo('continua', false);

    tornarFixavel(root, { selecao: quadrados, chaveDe: (d: Dia) => d.data }, realcar, limparRealce);

    if (animate) {
      // Entrada com significado: os quadrados nascem sem cor (na cor do
      // "zero") e escurecem até o valor real, escalonados semana a semana —
      // o ano "acontecendo" da esquerda pra direita, na própria ordem em
      // que os commits foram feitos.
      quadrados.attr('fill', paleta.continua[0]);

      quadrados
        .transition()
        .delay((d) => stagger(d.semana, numSemanas, 900))
        .duration(DURATION.base)
        .ease(EASE_ENTER)
        .attr('fill', (d) => corDe(d));

      garantirEstadoFinal(900 + DURATION.base, () => {
        quadrados.interrupt().attr('fill', (d) => corDe(d));
      });
    }
  },
};

export default chart;
