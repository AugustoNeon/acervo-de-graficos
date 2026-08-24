/**
 * Tooltip unico, compartilhado por todos os graficos da pagina.
 *
 * Fica em `position: fixed` no <body> de proposito: dentro do SVG ele seria
 * cortado pelo viewBox, e dentro do container ele seria cortado por qualquer
 * ancestral com `overflow: hidden`. Fixed escapa dos dois.
 */

import { getTheme } from './theme';
import { DURATION } from './motion';

export interface Tooltip {
  show(html: string, event: { clientX: number; clientY: number }): void;
  hide(): void;
  destroy(): void;
}

const MARGEM = 14;

export function createTooltip(): Tooltip {
  const el = document.createElement('div');
  const theme = getTheme();

  el.setAttribute('role', 'tooltip');
  // Nao e conteudo pra leitor de tela: a informacao do tooltip esta duplicada
  // no <title>/aria-label do proprio elemento do grafico.
  el.setAttribute('aria-hidden', 'true');
  Object.assign(el.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: 'var(--z-tooltip, 60)',
    pointerEvents: 'none',
    opacity: '0',
    padding: '0.4rem 0.6rem',
    borderRadius: 'var(--radius-sm, 0.25rem)',
    background: theme.ink,
    color: theme.bg,
    font: `500 0.8125rem/1.35 ${theme.fontBody}`,
    whiteSpace: 'nowrap',
    boxShadow: '0 4px 14px rgb(0 0 0 / 0.18)',
    transition: `opacity ${DURATION.fast}ms ease-out`,
    willChange: 'transform',
  } satisfies Partial<CSSStyleDeclaration>);

  document.body.appendChild(el);

  return {
    show(html, event) {
      el.innerHTML = html;
      el.style.opacity = '1';

      // Mede depois de escrever o conteudo pra saber se cabe a direita/abaixo
      // do cursor; se nao couber, espelha pro outro lado em vez de vazar da tela.
      const { width, height } = el.getBoundingClientRect();
      const x =
        event.clientX + MARGEM + width > window.innerWidth
          ? event.clientX - MARGEM - width
          : event.clientX + MARGEM;
      const y =
        event.clientY + MARGEM + height > window.innerHeight
          ? event.clientY - MARGEM - height
          : event.clientY + MARGEM;

      el.style.transform = `translate(${Math.max(0, x)}px, ${Math.max(0, y)}px)`;
    },
    hide() {
      el.style.opacity = '0';
    },
    destroy() {
      el.remove();
    },
  };
}
