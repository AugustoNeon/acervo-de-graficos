---
title: "Dendrograma interativo colapsável"
category: part-of-whole
date: 2026-07-30
source: "https://r-graph-gallery.com/336-interactive-dendrogram-with-collapsibletree.html"
interactive: true
resumo: "Uma árvore hierárquica que começa fechada e se abre por clique, nível por nível, até chegar nas folhas."
veredito_uso: "a hierarquia tem profundidade real (3+ níveis) e você quer que quem explora controle o quanto vê de cada vez."
veredito_evita: "a hierarquia é rasa (1-2 níveis), ou o gráfico precisa funcionar sem interação (impresso, PDF, apresentação)."
pacotes: ["dplyr", "ggplot2", "jsonlite", "d3"]
dados: "3 ou mais variáveis categóricas aninhadas (cada linha é um caminho raiz→folha)"
nivel: básico
tags: ["hierarquia", "parte-do-todo"]
---

## O que é

Um dendrograma interativo colapsável é uma árvore hierárquica onde cada nó
pode ser clicado pra revelar (ou esconder de novo) os galhos abaixo dele. Em
vez de mostrar a árvore inteira de uma vez — o que fica ilegível quando a
hierarquia tem muitos níveis ou muitos itens por nível —, ela começa fechada,
mostrando só a raiz e o primeiro nível, e cresce sob demanda conforme quem
está vendo clica no que interessa.

<div class="pull-quote pull-quote-direita clearfix">cresce sob demanda conforme quem está vendo clica no que interessa</div>

**Para que serve**: explorar uma estrutura
em árvore (categorias de um catálogo, estrutura de pastas, qualquer dado que
se desdobra em níveis) sem precisar decidir de antemão até que profundidade
mostrar.

## Quando usar (e quando evitar)

**Use quando** a hierarquia tem profundidade real (3+ níveis) e você quer que
quem está explorando controle o quanto vê de cada vez, em vez de receber tudo
de uma vez só.

**Evite quando** a hierarquia é rasa (1-2 níveis) — aí um treemap ou um
circle packing mostra tudo de uma vez sem precisar de clique nenhum, e é mais
rápido de ler. Evite também se o gráfico final precisa funcionar sem
interação (impresso, PDF, apresentação) — sem clique, só a raiz e o primeiro
nível ficam visíveis.

## Que dados você precisa

- **colunas hierárquicas** (2 ou mais) — cada uma é um nível da árvore, na
  ordem em que aparecem (a primeira é o nível logo abaixo da raiz)

Formato: uma linha por caminho completo da raiz até a folha (uma linha =
uma combinação única das colunas hierárquicas), não uma coluna por nível.

## Como ler o gráfico

- **Posição/ligação**: qual nó é filho de qual — a árvore cresce da esquerda
  pra direita
- **Círculo preenchido vs. vazio**: por padrão, o preenchimento e o tamanho
  do círculo só marcam visualmente folha vs. nó interno, não representam
  nenhum valor numérico
- **Clique**: abre ou fecha os filhos daquele nó

## Como foi feito

A árvore completa é montada a partir de combinações únicas de `wool`/`tension`/
`breaks`: cada linha do dataset vira um caminho raiz→folha, e linhas com o
mesmo valor de quebras dentro do mesmo tipo de lã e tensão colapsam num só
nó-folha (`dplyr::count()`), guardando quantos lotes originais compartilham
aquele valor. O script exporta essa árvore inteira — todos os níveis, não só
o primeiro — num `data.json`; quem decide o que fica visível em cada momento
é o estado de clique no próprio D3, não o R.

A versão interativa é desenhada em D3 (`d3.hierarchy()`+`d3.tree()`), com um
clique em qualquer nó com filhos abrindo ou fechando aquele galho — a mesma
navegação que o `collapsibleTree` dava. Nós fechados (com filhos escondidos)
aparecem preenchidos; nós abertos ou folhas, vazios.

Dados: o dataset `warpbreaks`, que já vem embutido no R (testes de tecelagem
— tipo de lã, nível de tensão aplicada e número de quebras do fio em cada
lote). Paleta e estrutura mantidas simples, sem cor por nível, como exceção
à regra geral do acervo pra este gráfico específico.

**Sobre o `output.png`**: como o gráfico começa fechado (só raiz + primeiro
nível visíveis), a miniatura estática mostra exatamente esse estado inicial
— raiz e os dois nós de `wool` (A, B) — desenhado à mão com `geom_curve()` em
vez de recalcular a árvore inteira só pra descartar quase tudo dela.

## Possíveis problemas pelo caminho

- **Problema**: um valor de quebras que se repete em lotes diferentes vira
  dois nós-folha em vez de um. **Por quê**: agrupar direto por `breaks` sem
  contar quantas linhas caem em cada valor perde a informação de "quantos
  lotes" e, pior, sem `count()` cada linha original viraria sua própria
  folha, duplicando valores repetidos dentro do mesmo grupo. **Solução**:
  `dplyr::count(wool, tension, breaks)` agrega antes de montar a árvore, e o
  `n` resultante (renomeado `lotes`) fica disponível pro tooltip.
- **Problema**: a ordem dos filhos de cada nó muda entre execuções, mesmo com
  os mesmos dados. **Por quê**: `split()` agrupa por ordem alfabética dos
  níveis do fator quando a coluna é convertida sem especificar `levels`
  explicitamente — não pela ordem em que os dados aparecem. **Solução**:
  fixar `levels = unique(x)` no `factor()` antes de dividir, preservando a
  ordem de primeira aparição; a armadilha por trás disso está em "Notas do
  coletor".

## Variações possíveis

- Trocar `collapsed = TRUE` por `collapsed = FALSE` pra a árvore já nascer
  toda aberta (útil quando ela é pequena o suficiente pra caber inteira).
- Colorir por nível: o parâmetro de preenchimento aceita um vetor com uma
  cor por **nó da árvore inteira** (raiz + todo nó interno + toda folha), na
  ordem dos níveis — dá pra calcular quantos nós existem em cada nível a
  partir dos próprios dados e montar essa paleta.
- Variar o tamanho de cada círculo por uma variável numérica (`nodeSize`) e
  mostrar o valor agregado de cada nó no hover (`tooltip = TRUE`), quando o
  dado tiver uma métrica além da própria hierarquia.
- Usar `attribute` com uma função de agregação diferente de soma (`aggFun =
  mean`, por exemplo) quando o número que importa é uma média, não um total.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../circle-packing-hierarquico" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Circle packing hierárquico</span>
    <span class="parecido-razao">O oposto direto quando a hierarquia é pequena o bastante pra mostrar tudo de uma vez: nenhum clique necessário, a estrutura inteira já visível.</span>
  </a>
  <a class="parecido-item" href="../treemap-orcamento-municipal" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Treemap: orçamento municipal por categoria</span>
    <span class="parecido-razao">Outra forma de mostrar hierarquia sem colapsar nada — área proporcional ao valor em vez de um clique revelando cada nível.</span>
  </a>
</div>

## Notas do coletor

A ordem dos filhos de um mesmo nó saía diferente da ordem em que os tipos
de lã e os níveis de tensão apareciam no dataset original — sem nenhuma
mudança nos dados entre uma execução e outra, só reabrindo o script já
bastava pra ver a árvore reorganizada. A causa não estava em nenhuma lógica
de ordenação escrita explicitamente no código: `split()`, usado pra dividir
os dados em galhos da árvore, agrupa pela ordem dos **níveis do fator**, e
quando uma coluna de texto vira fator sem especificar `levels` à mão, o R
ordena esses níveis alfabeticamente por padrão — não pela ordem em que os
valores de fato apareceram na tabela.

Pra a maioria dos usos de `factor()`, essa ordenação alfabética silenciosa
não importa. Aqui importava, porque a ordem dos galhos na árvore é
informação visual: o dataset tinha uma ordem intencional (a sequência em
que os experimentos de tecelagem foram registrados), e a ordenação
alfabética a substituía sem avisar. A correção foi fixar
`levels = unique(x)` no `factor()` antes de qualquer `split()`, capturando
a ordem de primeira aparição em vez de deixar o R escolher uma ordem
"padrão" por conta própria. A lição generaliza: sempre que a ordem de uma
coluna categórica for parte da mensagem de um gráfico — não só um detalhe
de agrupamento —, vale fixar `levels` explicitamente, mesmo quando o código
funciona sem isso.
