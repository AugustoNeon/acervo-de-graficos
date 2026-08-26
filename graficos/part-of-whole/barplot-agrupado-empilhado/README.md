---
title: "Barplot agrupado e empilhado"
category: part-of-whole
date: 2026-08-18
source: "https://r-graph-gallery.com/barplot.html"
interactive: true
resumo: "As mesmas 24 células gênero × plataforma se reorganizando entre agrupado, empilhado e empilhado 100%."
veredito_uso: "cada categoria é soma de subgrupos, e você quer alternar entre comparar totais, subgrupos e proporções sem trocar de gráfico."
veredito_evita: "há mais de 5-6 subgrupos por categoria, ou os subgrupos não somam um total que faça sentido."
pacotes: ["ggplot2", "patchwork", "RColorBrewer", "jsonlite", "d3"]
dados: "2 variáveis categóricas (categoria + subgrupo) + 1 numérica"
nivel: intermediário
tags: ["composição", "animação"]
---

## O que é

O barplot clássico compara uma categoria contra outra. Quando cada categoria
na verdade é a soma de **subgrupos**, três variações respondem perguntas
diferentes sobre a mesma composição: agrupado (comparar os subgrupos entre
si, categoria a categoria), empilhado (comparar os totais, sem perder a
decomposição) e empilhado 100% (comparar só a **proporção** de cada
subgrupo, ignorando o tamanho absoluto do total).

**Para que serve**: decompor um total em partes e escolher, com um clique,
qual das três perguntas você quer que salte aos olhos primeiro.

## Quando usar (e quando evitar)

**Use quando** cada categoria principal for a soma de duas ou mais
subcategorias e você quiser comparar tanto os totais quanto a composição
interna.

**Evite quando** houver muitos subgrupos por categoria (acima de 5–6, o
empilhado vira difícil de ler segmento a segmento — cores demais competindo
por atenção) ou quando os subgrupos não tiverem uma soma que faça sentido
como total (nesse caso, um agrupado simples, sem opção de empilhar, é mais
honesto).

## Que dados você precisa

- **uma variável categórica principal** — os grupos a comparar (aqui,
  gêneros musicais).
- **uma variável categórica de subgrupo** — a decomposição de cada grupo
  (aqui, plataforma de streaming).
- **uma variável numérica** — o valor de cada combinação categoria × subgrupo
  (aqui, horas de audição).

Uma linha por combinação categoria × subgrupo — o formato "longo", não uma
matriz.

## Como ler o gráfico

- **Agrupado**: uma barra por subgrupo, lado a lado dentro do espaço de cada
  categoria — comprimentos comparam diretamente entre subgrupos, mas o total
  da categoria não tem uma única barra que o represente.
- **Empilhado**: os subgrupos empilhados numa única barra por categoria — a
  altura total da barra é o total da categoria; comparar um subgrupo
  específico entre categorias fica mais difícil, porque cada segmento começa
  numa altura diferente.
- **Empilhado 100%**: mesma pilha, mas cada barra normalizada pro mesmo
  tamanho — todas terminam em 100%. Aqui o total desaparece da leitura;
  sobra só a proporção interna de cada subgrupo.
- **Cor**: identifica a **plataforma** (subgrupo) em todos os três estados —
  passe o cursor sobre um item da legenda pra realçar essa plataforma em
  todas as barras ao mesmo tempo.

<div class="pull-quote pull-quote-direita clearfix">o total desaparece da leitura; sobra só a proporção interna de cada subgrupo</div>

## Como foi feito

O `output.png` é um pôster de três painéis via `patchwork`, cada um o mesmo
`ggplot2` com `position_dodge2()`, `position_stack()` e `position_fill()`
respectivamente — a diferença entre os três estados, no `ggplot2`, é
literalmente um argumento de posição.

A versão interativa reproduz essa mesma ideia em D3: as 24 células (gênero ×
plataforma) nunca entram ou saem entre os três botões — só sua posição e
tamanho mudam, com uma chave estável (`genero+plataforma`) garantindo que
cada célula seja "a mesma" célula se movendo, não uma recriada do zero. A
posição empilhada (nos estados "empilhado" e "empilhado 100%") vem de
`d3.stack()`, com `stackOffsetExpand` fazendo a normalização pra 100% — o
mesmo mecanismo por trás de `position_fill()` no lado R, só que calculado de
novo no navegador a partir do dado bruto por célula, não importado pronto.
Passar o cursor sobre uma célula ou sobre um item da legenda aciona a mesma
função de realce: opacidade reduzida em tudo que não for aquela plataforma,
em qualquer um dos três estados.

Dados fictícios: as mesmas seis categorias e a mesma decomposição por
plataforma dos gráficos irmãos [barplot clássico](../../ranking/barplot-classico)
e [lollipop](../../ranking/lollipop-streaming) (mesma seed, mesma lógica de
geração) — aqui a granularidade completa é o próprio assunto do gráfico, não
um detalhe reservado ao hover.

## Possíveis problemas pelo caminho

- **Problema**: no agrupado, é difícil saber qual categoria tem o maior
  total. **Por quê**: nenhuma barra única representa o total — é preciso
  somar visualmente os subgrupos. **Solução**: para essa pergunta
  específica, o estado empilhado (ou o [barplot clássico](../../ranking/barplot-classico))
  responde melhor.
- **Problema**: no empilhado 100%, duas categorias parecem "iguais" mesmo
  tendo totais bem diferentes. **Por quê**: a normalização remove o total de
  propósito, sobrando só a proporção — é o trade-off do estado, não um erro.
  **Solução**: alternar para "empilhado" (absoluto) sempre que o tamanho do
  total também importar pra comparação.
- **Problema**: com muitas categorias e subgrupos, as cores do meio da pilha
  ficam com pouquíssima altura pra segurar um rótulo. **Por quê**: espaço
  vertical finito dividido por muitos segmentos. **Solução**: usar o hover
  (ou, aqui, o realce pela legenda) em vez de depender de rótulo fixo dentro
  de cada segmento.

## Variações possíveis

- Ordenar as categorias por total (do maior pro menor) em vez da ordem
  original, útil quando o ranking entre categorias também importa.
- Facetar por subgrupo em pequenos múltiplos, quando comparar o mesmo
  subgrupo entre categorias for a pergunta principal — em vez de comparar
  subgrupos dentro de uma categoria.
- Adicionar uma quarta variação com os subgrupos ordenados por valor dentro
  de cada pilha (em vez de sempre na mesma ordem), destacando qual subgrupo é
  dominante em cada categoria.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../../ranking/barplot-classico" style="--cat-link: var(--cat-ranking); --cat-link-ink: var(--cat-ranking-ink);">
    <span class="parecido-cat">ranking</span>
    <span class="parecido-titulo">Barplot clássico</span>
    <span class="parecido-razao">O irmão sem decomposição: a mesma pergunta de "qual categoria é maior", sem a segunda camada de subgrupo que este gráfico existe pra mostrar.</span>
  </a>
  <a class="parecido-item" href="../treemap-orcamento-municipal" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Treemap: orçamento municipal por categoria</span>
    <span class="parecido-razao">Outra forma de mostrar composição, mas usando área em vez de altura empilhada — melhor quando o número de subgrupos cresce além do que uma pilha aguenta.</span>
  </a>
</div>

## Notas do coletor

A transição entre os três estados (agrupado, empilhado, empilhado 100%)
tinha um bug que só aparecia numa sequência bem específica: clicar num
botão de estado e, logo em seguida, passar o cursor sobre uma barra — o
resultado era uma barra travada a meio caminho da transição, presa numa
posição ou tamanho errado, sem nenhum erro no console. Reproduzir exigia
testar a sequência exata num navegador de verdade; o preview do editor não
pegava o problema.

A causa: este gráfico tem duas animações concorrentes no mesmo elemento —
o hover (que destaca uma barra ao passar o cursor) e a troca de estado
(que reorganiza todas as barras). O D3 rastreia transições por um par
`(elemento, nome da transição)`, e uma segunda chamada de `.transition()`
sem nome **cancela silenciosamente** a primeira transição em andamento,
mesmo que as duas animem atributos diferentes (uma `opacity`, a outra
`x`/`y`/`width`/`height`). Se o hover disparar no meio da transição de
estado, uma cancela a outra e o elemento congela onde estava.

A correção foi dar nomes distintos às duas transições
(`selection.transition('hover')` para uma, a transição de estado sem nome
para a outra) — assim o D3 as rastreia como independentes e nenhuma
interrompe a outra. O mesmo bug apareceu, com a mesma causa, em dois
outros gráficos deste acervo que compartilham a mesma combinação de hover
animado + troca de estado animada: o [barplot clássico](../../ranking/barplot-classico)
e o [lollipop](../../ranking/lollipop-streaming). A lição generalizou: todo
gráfico D3 novo com hover e mudança de estado animando o mesmo elemento
precisa nascer com nomes de transição distintos, não como correção depois
de encontrar o bug.
