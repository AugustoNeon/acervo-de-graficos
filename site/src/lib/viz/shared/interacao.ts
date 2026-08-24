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

// `any` de proposito: os alvos de um mesmo grafico costumam vir de selecoes
// com tipos de elemento SVG diferentes (path de pais, circulo de cidade,
// retangulo de barra...) sobre o mesmo dado logico — forcar um generico unico
// aqui so atrapalharia o chamador sem ganhar nada em seguranca de tipo real
// (a chave de fixar sempre vira string de qualquer forma).
export interface AlvoFixavel<Item = any> {
  selecao: Selection<any, Item, any, any>;
  chaveDe: (d: Item) => string;
}

// O runtime redesenha um grafico no lugar em resize (`mount.ts`: mesmo
// `root`, `canvas.replaceChildren()` só troca o CONTEUDO) — sem essa
// limpeza, cada redesenho empilharia mais um listener de documento preso ao
// fechamento (closure) do desenho anterior, cada um com seu proprio estado
// `fixado` desatualizado apontando pra elementos ja removidos do DOM.
const limpezaPorRaiz = new WeakMap<HTMLElement, () => void>();

export function tornarFixavel(
  raiz: HTMLElement,
  alvos: AlvoFixavel | AlvoFixavel[],
  realcar: (chave: string) => void,
  limpar: () => void
): void {
  limpezaPorRaiz.get(raiz)?.();

  const lista = Array.isArray(alvos) ? alvos : [alvos];
  let fixado: string | null = null;

  lista.forEach(({ selecao, chaveDe }) => {
    selecao
      .on('pointerenter.fixar', (_evento: PointerEvent, d: unknown) => {
        if (fixado === null) realcar(chaveDe(d));
      })
      .on('pointerleave.fixar', () => {
        if (fixado === null) limpar();
      })
      .on('click.fixar', (evento: PointerEvent, d: unknown) => {
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

  // No documento inteiro, nao so dentro do grafico: um clique em qualquer
  // lugar da pagina que nao seja num alvo fixavel (esses ja pararam a
  // propagacao acima) desfixa. Clicar num espaco vazio DENTRO do grafico
  // tambem cai aqui, ja que o evento sobe ate o documento do mesmo jeito.
  const aoClicarFora = () => {
    if (fixado !== null) {
      fixado = null;
      limpar();
    }
  };
  document.addEventListener('click', aoClicarFora);
  limpezaPorRaiz.set(raiz, () => document.removeEventListener('click', aoClicarFora));
}
