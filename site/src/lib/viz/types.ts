import type { VizTheme } from './theme';
import type { Tooltip } from './tooltip';

export interface DrawContext {
  /** Container ja limpo — o modulo desenha do zero aqui a cada draw. */
  root: HTMLElement;
  /** Conteudo do data.json da pasta do grafico. */
  data: unknown;
  /** Largura disponivel em px, medida do container. */
  width: number;
  theme: VizTheme;
  tooltip: Tooltip;
  /**
   * `true` so no primeiro desenho que acontece com o grafico visivel e com
   * movimento permitido. Redesenho por resize vem sempre `false` -- animar de
   * novo a cada arrasto de janela seria ruido, nao informacao.
   */
  animate: boolean;
}

export interface VizChart {
  /**
   * Proporcao largura/altura usada pra reservar espaco antes do desenho,
   * evitando salto de layout enquanto o modulo e o data.json carregam.
   */
  aspectRatio: number;
  /** Descricao curta do grafico pra leitores de tela. */
  label: string;
  draw(ctx: DrawContext): void;
}
