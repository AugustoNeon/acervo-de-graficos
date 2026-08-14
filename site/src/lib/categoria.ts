/**
 * Cor da categoria.
 *
 * Cada categoria do acervo tem o seu matiz (ver tokens.css) — no mundo do
 * "caderno de campo" ele vira fita washi/carimbo em cima do espécime, nunca
 * um bloco de fundo. Em vez de espalhar `if categoria === 'network'` pelos
 * componentes, cada superfície declara de qual categoria ela é redefinindo
 * `--cat`/`--cat-ink`/`--cat-wash` localmente, e todo o CSS abaixo dela lê
 * essas três. Assim nenhum componente precisa saber quais categorias existem,
 * e acrescentar uma categoria nova é acrescentar três tokens no tokens.css —
 * nada mais.
 */

/** Categorias que já têm matiz próprio em tokens.css. */
const COM_COR = new Set([
  'correlation',
  'distribution',
  'evolution',
  'flow',
  'map',
  'network',
  'part-of-whole',
  'ranking',
]);

/**
 * Style inline que ancora uma superfície na cor da sua categoria.
 * Categoria desconhecida cai no cinza neutro — emprestar o matiz de outra
 * categoria seria pior que não ter cor nenhuma.
 */
export function corDaCategoria(categoria: string): string {
  const base = COM_COR.has(categoria) ? `--cat-${categoria}` : '--cat-fallback';
  return `--cat: var(${base}); --cat-ink: var(${base}-ink); --cat-wash: var(${base}-wash);`;
}
