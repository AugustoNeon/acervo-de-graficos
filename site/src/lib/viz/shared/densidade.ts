/**
 * Estimativa de densidade por kernel gaussiano (KDE), largura de banda de
 * Silverman — extraído do ridgeline quando o violino (violin-e-boxplot)
 * passou a precisar da mesma técnica. Mesmo motivo da extração de
 * `cartesiano.ts`: o que se repete de um gráfico pro outro vira compartilhado
 * em vez de reimplementado (e potencialmente divergente) em cada um.
 */

import { mean, deviation, bisector } from 'd3';

function kernelGaussiano(bw: number) {
  const c = 1 / (bw * Math.sqrt(2 * Math.PI));
  return (v: number) => c * Math.exp(-0.5 * (v / bw) ** 2);
}

/** Estima a densidade de `valores` nos pontos `xs` via KDE gaussiano, com
 * largura de banda escolhida automaticamente pela regra de Silverman. */
export function estimarDensidade(valores: number[], xs: number[]): [number, number][] {
  const dp = deviation(valores) ?? 1;
  const bw = Math.max(1.06 * dp * valores.length ** -0.2, 0.15);
  const kernel = kernelGaussiano(bw);
  return xs.map((x) => [x, mean(valores, (v) => kernel(x - v)) ?? 0]);
}

const bisectorX = bisector<[number, number], number>((d) => d[0]).left;

/** Interpola linearmente a densidade de uma curva já estimada em qualquer x
 * (não só nos pontos de amostragem originais) — usado no tooltip. */
export function densidadeEm(curva: [number, number][], x: number): number {
  const i = bisectorX(curva, x);
  const a = curva[Math.max(0, i - 1)];
  const b = curva[Math.min(curva.length - 1, i)];
  if (!a || !b || a === b) return b?.[1] ?? 0;
  const t = (x - a[0]) / (b[0] - a[0] || 1);
  return a[1] + (b[1] - a[1]) * t;
}
