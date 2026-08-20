/**
 * Clicar para fixar o realce ("realce ligado" que já existe em quase todo
 * gráfico deste runtime, só que preso ao cursor). Pedido do usuário
 * (2026-08-20): poder destacar um dado e soltar o mouse sem perder o
 * destaque, em vez de precisar manter o cursor em cima o tempo todo.
 *
 * Generaliza por cima do par `realcar(chave)`/`limpar()` que praticamente
 * todo gráfico já define pro hover — não substitui esse par, só decide QUANDO
 * chamar um ou outro: clicar num alvo fixa a chave (realce persiste até um
 * novo clique no mesmo alvo ou um clique fora do gráfico); enquanto nada está
 * fixado, o comportamento continua sendo hover puro, exatamente como antes.
 *
 * Não mexe em tooltip nem em `pointermove` — cada gráfico continua
 * responsável por mostrar/esconder o próprio tooltip no hover, fixar só
 * afeta a camada visual de destaque.
 */

import type { Selection } from 'd3';

export interface AlvoFixavel<Item> {
  selecao: Selection<any, Item, any, any>;
  chaveDe: (d: Item) => string;
}

export function tornarFixavel<Item>(
  raiz: HTMLElement,
  alvos: AlvoFixavel<Item> | AlvoFixavel<Item>[],
  realcar: (chave: string) => void,
  limpar: () => void
): void {
  const lista = Array.isArray(alvos) ? alvos : [alvos];
  let fixado: string | null = null;

  lista.forEach(({ selecao, chaveDe }) => {
    selecao
      .on('pointerenter.fixar', (_evento: PointerEvent, d: Item) => {
        if (fixado === null) realcar(chaveDe(d));
      })
      .on('pointerleave.fixar', () => {
        if (fixado === null) limpar();
      })
      .on('click.fixar', (evento: PointerEvent, d: Item) => {
        evento.stopPropagation();
        const chave = chaveDe(d);
        if (fixado === chave) {
          fixado = null;
          limpar();
        } else {
          fixado = chave;
          realcar(chave);
        }
      });
  });

  raiz.addEventListener('click', () => {
    if (fixado !== null) {
      fixado = null;
      limpar();
    }
  });
}
