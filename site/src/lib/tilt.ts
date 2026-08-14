/**
 * Inclinação determinística de um espécime preso no mural/página.
 *
 * Nunca aleatória de verdade: precisa dar o mesmo ângulo a cada build (senão
 * o SSR e a hidratação divergem) e o mesmo ângulo pro mesmo gráfico entre uma
 * visita e outra. O "seed" é o id do gráfico (`categoria/slug`) — hash simples
 * só pra espalhar os ângulos, não precisa de distribuição estatística real.
 */
export function tiltFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  // Amplitude pequena — o suficiente pra ler como "preso à mão", não bagunçado.
  const angles = [-2.4, -1.5, -0.7, 0.6, 1.4, 2.2, -1.9, 1.1];
  return angles[Math.abs(hash) % angles.length];
}
