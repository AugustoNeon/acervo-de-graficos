---
title: "Treemap com zoom: orçamento municipal"
category: part-of-whole
date: 2026-08-20
source: "https://r-graph-gallery.com/235-treemap-with-subgroups.html"
interactive: true
resumo: "Orçamento anual de uma prefeitura fictícia dividido em secretaria, programa e ação — clique numa secretaria pra ver os programas dela, e num programa pra ver as ações."
veredito_uso: "hierarquia com dezenas de itens nas folhas, e a comparação de TAMANHO importa mais que a ordem ou a estrutura em árvore."
veredito_evita: "a hierarquia é rasa (1 nível), ou a estrutura da árvore (quem é filho de quem) importa mais que o tamanho — um dendrograma mostra topologia melhor."
pacotes: ["ggplot2", "treemapify", "RColorBrewer", "jsonlite", "d3"]
dados: "hierarquia de 3 níveis (secretaria > programa > ação) + 1 valor numérico nas folhas"
nivel: intermediário
tags: ["hierarquia", "zoom"]
---

## O que é

Um treemap divide um retângulo em blocos aninhados, onde a ÁREA de cada
bloco é proporcional ao valor que ele representa — ao contrário de um
[circle packing](../circle-packing-hierarquico), que usa círculos, o
treemap preenche 100% do espaço disponível, sem vazios entre os blocos.
**Para que serve**: comparar o tamanho relativo de muitos itens organizados
em hierarquia de uma vez só, respondendo "que fatia disso é a maior, e
dentro dela, o que pesa mais?".

<div class="pull-quote pull-quote-direita clearfix">que fatia disso é a maior, e dentro dela, o que pesa mais?</div>

## Quando usar (e quando evitar)

**Use quando** tiver uma hierarquia com muitos itens nas folhas (dezenas ou
mais) e a comparação de TAMANHO importar mais que a ORDEM ou a estrutura em
árvore — orçamento, uso de disco, composição de portfólio, catálogo de
produtos por categoria. O treemap aproveita 100% do espaço, então cabe muito
mais item legível do que um [gráfico de barras](../../ranking/barplot-classico)
com a mesma hierarquia achatada.

**Evite quando** a hierarquia for rasa (1 nível só) — nesse caso um
[circle packing simples](../circle-packing-simples) ou até um
[gráfico de barras](../../ranking/barplot-classico) comunica o mesmo com
menos esforço de leitura. Evite também quando a ESTRUTURA da árvore (quem é
filho de quem, quantos níveis) importar mais que o tamanho — um
[dendrograma](../dendrograma-interativo) mostra a topologia da hierarquia
melhor que um treemap, que enfatiza área.

## Que dados você precisa

- **hierarquia categórica de 2+ níveis** — aqui, secretaria → programa →
  ação.
- **1 variável numérica só nas folhas** — o valor que vira área (aqui,
  orçamento em milhões de reais). Nós internos (secretaria, programa) não
  precisam de valor próprio: o treemap soma os descendentes sozinho.

## Como ler o gráfico

- **Área de cada bloco**: proporcional ao valor — não a largura nem a
  altura isoladas, só a área total do retângulo.
- **Cor**: uma por secretaria, herdada por todos os programas e ações dentro
  dela (opacidade cai um pouco a cada nível mais fundo, só pra dar uma pista
  visual de profundidade).
- **Clique numa secretaria**: dá zoom nela, mostrando os programas como
  blocos grandes.
- **Clique num programa**: dá zoom nele, mostrando as ações.
- **Caminho no topo (breadcrumb)**: clique em qualquer nível anterior pra
  voltar direto pra ele.

Passe o cursor sobre qualquer bloco pra ver o valor exato e, se ele tiver
subdivisões, quantos itens tem dentro.

## Como foi feito

A miniatura estática usa `treemapify::geom_treemap()` com os 3 níveis de
uma vez (`subgroup`/`subgroup2` do pacote), preenchimento por secretaria e
rótulo só nas ações (nível mais fundo).

A versão interativa em D3 calcula o layout do treemap **uma vez só**, pra
árvore inteira — todos os 3 níveis já nascem com coordenadas, cada filho
dentro do retângulo do pai. O "zoom" não recalcula layout nenhum a cada
clique: é só reescalar duas escalas lineares (`x`/`y`) pro retângulo do nó
em foco, uma alternativa ao `transform: scale()` que evita o problema
clássico dessa técnica — ver "Notas do coletor".

Os rótulos usam um `<clipPath>` por bloco, do tamanho exato do retângulo —
texto comprido é cortado na borda do bloco em vez de vazar pro bloco vizinho
(e blocos pequenos demais pra caber um rótulo legível simplesmente não
mostram texto nenhum, só ficam disponíveis via tooltip).

Dados fictícios: orçamento anual de uma prefeitura fictícia (6 secretarias,
2 programas cada, 2–3 ações cada, valores de 0,9 a 28,4 milhões de reais) —
uma faixa de valores bem larga de propósito, pra mostrar a força do
treemap em comparar itens de escalas bem diferentes ao mesmo tempo.

## Possíveis problemas pelo caminho

- **Problema**: `geom_treemap_subgroup_border(linewidth = 2.2)` disparou um
  aviso ("Ignoring unknown parameters: `linewidth`") na miniatura estática.
  **Por quê**: os geoms do `treemapify` ainda não adotaram a migração de
  `size` para `linewidth` que o `ggplot2` fez em versões mais recentes —
  o parâmetro certo pra esses geoms continua sendo `size`. **Solução**:
  aviso inofensivo (o traço só ficou na espessura padrão em vez da
  customizada); se a espessura importar, usar `size=` em vez de
  `linewidth=` nesses geoms específicos.

## Variações possíveis

- Trocar zoom por clique por breadcrumb + busca (campo de texto que realça
  o bloco correspondente em qualquer nível da hierarquia).
- Cor por uma métrica contínua (ex: variação orçamentária ano a ano) em vez
  de categoria — mesmo layout, lendo "quem cresceu/encolheu" junto com
  "quem é grande".
- Layout "fixed" (grade regular) em vez de squarified, quando a comparação
  de proporção exata importa mais que blocos com boa relação
  largura/altura.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../sunburst-catalogo-streaming" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Sunburst zoomável: catálogo de streaming</span>
    <span class="parecido-razao">O mesmo zoom por nível de hierarquia, mas radial: anéis concêntricos em fatias de arco em vez de retângulos que preenchem 100% do espaço.</span>
  </a>
  <a class="parecido-item" href="../circle-packing-hierarquico" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Circle packing hierárquico</span>
    <span class="parecido-razao">O oposto direto no uso do espaço: círculos aninhados que deixam vazio entre um nível e o próximo, contra os retângulos deste treemap que preenchem tudo.</span>
  </a>
</div>

## Notas do coletor

O jeito óbvio de animar um zoom em SVG é `transform: scale()` num `<g>`
que envolve o conteúdo — mas essa técnica tem um problema clássico:
escalar o grupo inteiro escala **tudo** dentro dele, inclusive a
espessura dos traços e o tamanho das fontes. Um bloco ampliado 3x fica com
bordas 3x mais grossas e texto 3x maior do que o resto da interface — nem
sempre visível de cara em capturas de tela estáticas, mas óbvio assim que
o zoom entra em movimento.

A alternativa usada aqui evita o problema pela raiz, não corrigindo depois:
o layout do treemap é calculado **uma única vez**, pra árvore inteira —
todos os retângulos, em todos os 3 níveis, já nascem com coordenadas
absolutas dentro do espaço total, cada filho posicionado dentro do
retângulo do próprio pai por construção do algoritmo. O "zoom" não mexe em
nenhum desses retângulos: são duas escalas lineares (`x`/`y`) cujo domínio
muda pro intervalo do nó em foco. Como os filhos desse nó já têm
coordenadas dentro dele, reescalar o domínio das escalas faz esses
retângulos se espalharem sozinhos até preencher a tela — sem tocar em
nenhum atributo de traço ou fonte, porque nada foi escalado como grupo,
só reprojetado. A lição generaliza: quando um "zoom" é na verdade uma
mudança de enquadramento sobre dados que já têm posição fixa (não uma
ampliação genérica de conteúdo arbitrário), trocar `transform: scale()`
por escalas D3 reprojetadas evita a distorção sem esforço extra.
