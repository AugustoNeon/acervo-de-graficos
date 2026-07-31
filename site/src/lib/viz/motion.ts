/**
 * Camada de movimento dos graficos.
 *
 * Duas regras que valem pra qualquer grafico daqui:
 *
 * 1. **A animacao de entrada nunca decide se o grafico aparece.** O desenho e
 *    sempre feito no estado final; quem quiser animar chama `enter()`, que
 *    aplica o estado inicial e transiciona de volta pro final no mesmo tick.
 *    Se a animacao nunca rodar (aba oculta, motor sem IntersectionObserver,
 *    `prefers-reduced-motion`), o que ficou na tela e o grafico completo, nao
 *    uma tela vazia esperando um evento.
 * 2. **Movimento tem teto.** Escalonar 96 barras a 40ms cada daria 4s de
 *    espera; `stagger()` comprime o passo pra caber na janela total.
 */

import { easeExpOut, easeCubicOut } from 'd3-ease';

export const DURATION = {
  /** Feedback direto de ponteiro — hover, realce */
  fast: 150,
  /** Mudanca de estado — filtro, troca de serie */
  base: 250,
  /** Entrada do grafico — a unica que pode se dar ao luxo de ser vista */
  enter: 720,
} as const;

/** Mesma curva do `--ease-out-expo` do tokens.css. */
export const EASE_ENTER = easeExpOut;
export const EASE_STATE = easeCubicOut;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Atraso do i-esimo elemento de uma lista escalonada, limitado a `janela` ms
 * no total. Com poucos elementos da o passo cheio; com muitos, comprime.
 */
export function stagger(index: number, total: number, janela = 420): number {
  if (total <= 1) return 0;
  const passo = Math.min(28, janela / (total - 1));
  return index * passo;
}

/**
 * Chama `callback` uma unica vez, quando o elemento entra na viewport.
 * Se o navegador nao tiver IntersectionObserver, chama na hora -- o pior caso
 * e a animacao rodar fora de vista, nunca o grafico ficar em branco.
 */
export function onEnterViewport(
  el: Element,
  callback: () => void,
  { threshold = 0.25 }: { threshold?: number } = {}
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    callback();
    return () => {};
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.disconnect();
        callback();
      }
    },
    { threshold }
  );

  observer.observe(el);
  return () => observer.disconnect();
}
