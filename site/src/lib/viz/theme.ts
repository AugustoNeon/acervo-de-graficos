/**
 * Ponte entre o design system do site (tokens.css) e os graficos.
 *
 * Regra de divisao importante: o tema manda na *moldura* do grafico -- eixos,
 * grade, rotulos, tooltip, fundo -- pra que ele pareca parte da pagina, e nao
 * um objeto estrangeiro colado nela. As cores dos *dados* NAO vem daqui: elas
 * vem do `data.json` gerado pelo script.R, senao a versao interativa deixa de
 * bater com o output.png (que e a miniatura do card na galeria).
 *
 * Ler as CSS vars em runtime, em vez de repetir hexadecimais aqui, significa
 * que mudar um token repinta todos os graficos junto com o resto do site.
 */

export interface VizTheme {
  /** Texto principal — rotulos que precisam ser lidos */
  ink: string;
  /** Texto secundario — numeros de escala, legendas de apoio */
  inkMuted: string;
  /** Fundo da pagina, usado como "vazio" (ex: separacao entre fatias) */
  bg: string;
  surface: string;
  /** Linhas de grade e eixos */
  border: string;
  borderStrong: string;
  primary: string;
  accent: string;
  fontBody: string;
  fontMono: string;
  /**
   * Rampa categorica de reserva, so pra grafico que nao trouxer paleta
   * propria no data.json. Derivada dos tokens (cobalto e terracota sao o
   * primeiro e o segundo) e espacada em matiz pra continuar distinguivel.
   */
  categorical: string[];
}

const FALLBACK: VizTheme = {
  ink: '#1a1f24',
  inkMuted: '#5c6672',
  bg: '#ffffff',
  surface: '#f3f5f7',
  border: '#dadfe4',
  borderStrong: '#a8b1ba',
  primary: '#1f6b96',
  accent: '#c25a35',
  fontBody: 'system-ui, sans-serif',
  fontMono: 'ui-monospace, monospace',
  categorical: [
    'oklch(0.47 0.14 232)',
    'oklch(0.55 0.17 35)',
    'oklch(0.52 0.12 160)',
    'oklch(0.50 0.15 300)',
    'oklch(0.60 0.13 85)',
    'oklch(0.45 0.10 200)',
  ],
};

let cached: VizTheme | null = null;

/**
 * Le os tokens do :root. O resultado e memoizado porque `getComputedStyle`
 * forca reflow -- e um grafico redesenha a cada resize.
 */
export function getTheme(): VizTheme {
  if (cached) return cached;
  if (typeof window === 'undefined') return FALLBACK;

  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => {
    const value = css.getPropertyValue(name).trim();
    return value || fallback;
  };

  cached = {
    ink: read('--color-ink', FALLBACK.ink),
    inkMuted: read('--color-ink-muted', FALLBACK.inkMuted),
    bg: read('--color-bg', FALLBACK.bg),
    surface: read('--color-surface', FALLBACK.surface),
    border: read('--color-border', FALLBACK.border),
    borderStrong: read('--color-border-strong', FALLBACK.borderStrong),
    primary: read('--color-primary', FALLBACK.primary),
    accent: read('--color-accent', FALLBACK.accent),
    fontBody: read('--font-body', FALLBACK.fontBody),
    fontMono: read('--font-mono', FALLBACK.fontMono),
    categorical: FALLBACK.categorical,
  };

  return cached;
}

/** So pra teste/hot-reload: proxima chamada de getTheme() le os tokens de novo. */
export function resetTheme(): void {
  cached = null;
}
