/**
 * Primitivas compartilhadas de gráfico cartesiano (eixo X/Y, grade, tempo).
 *
 * Não é um "componente de gráfico" pronto — cada gráfico continua desenhando
 * sua própria geometria (linha, área, banda de contorno...) do seu jeito. O
 * que se repetia de um gráfico pro outro era só a parte de moldura: estilizar
 * eixo/grade com as cores do tema, e formatar data respeitando fuso horário.
 * Ver AGENTS.md "Lições aprendidas" 2026-07-21/2026-08-13/2026-08-14 — o bug
 * de fuso horário (`scaleTime` em vez de `scaleUtc`, `toLocaleDateString` sem
 * `timeZone:'UTC'`) já se repetiu em dois gráficos de série temporal
 * diferentes antes desta extração.
 */

import { scaleUtc, type Selection } from 'd3';
import type { VizTheme } from '../theme';

type SelecaoEixo = Selection<SVGGElement, unknown, null, undefined>;

/**
 * Escala temporal seguindo o formato `AAAA-MM-DD` do `data.json`. SEMPRE
 * `scaleUtc`, nunca `scaleTime`: o `Date` vem parseado em meia-noite UTC, e
 * uma escala local recalcula tick/formato no fuso do navegador — fazendo o
 * eixo (e qualquer `bisector` sobre ele) mostrar o dia/mês errado.
 */
export function escalaTemporalUtc(dominio: [Date, Date] | number[], alcance: [number, number]) {
  return scaleUtc().domain(dominio as [Date, Date]).range(alcance);
}

/**
 * Formata uma data em pt-BR com `timeZone: 'UTC'` sempre explícito — mesmo
 * motivo do `escalaTemporalUtc`. Sem isso, `toLocaleDateString` usa o fuso
 * local e pode voltar um dia (ou mês) inteiro.
 */
export function formatarDataUtc(d: Date, opts: Intl.DateTimeFormatOptions = { month: 'short', year: 'numeric' }): string {
  return d.toLocaleDateString('pt-BR', { ...opts, timeZone: 'UTC' });
}

/**
 * Estilo padrão de eixo (linha de domínio + ticks + rótulos), lido do tema —
 * pra que todo gráfico cartesiano do site pareça parte da mesma família em
 * vez de cada um inventar sua própria cor/fonte de eixo. `px` é o conversor
 * de px reais pra unidades do viewBox (ver `mount.ts`/cada módulo de gráfico).
 */
export function estilarEixo(sel: SelecaoEixo, theme: VizTheme, px: (v: number) => number): SelecaoEixo {
  sel.select('.domain').attr('stroke', theme.border);
  sel.selectAll('.tick line').attr('stroke', theme.border);
  sel
    .selectAll('text')
    .attr('fill', theme.inkMuted)
    .attr('font-family', theme.fontMono)
    .attr('font-size', px(11));
  return sel;
}

/**
 * Estilo padrão de grade (linhas de fundo, sem rótulo nem linha de domínio) —
 * espera um eixo já chamado com `.tickSize(-larguraOuAltura).tickFormat(() =>
 * '')`, que é quem desenha as linhas; esta função só aplica a cor do tema.
 */
export function estilarGrade(sel: SelecaoEixo, theme: VizTheme, opacidade = 0.6): SelecaoEixo {
  sel.select('.domain').remove();
  sel.selectAll('.tick line').attr('stroke', theme.border).attr('stroke-opacity', opacidade);
  return sel;
}
