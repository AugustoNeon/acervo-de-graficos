---
title: "Dendrograma interativo colapsável"
category: part-of-whole
date: 2026-07-30
source: "https://r-graph-gallery.com/336-interactive-dendrogram-with-collapsibletree.html"
interactive: true
resumo: "Uma árvore hierárquica que começa fechada e se abre por clique, nível por nível, até chegar nas folhas."
pacotes: ["collapsibleTree", "webshot2", "chromote"]
dados: "3 ou mais variáveis categóricas aninhadas (cada linha é um caminho raiz→folha)"
nivel: básico
tags: ["interativo", "hierarquia", "parte-do-todo"]
---

## O que é

Um dendrograma interativo colapsável é uma árvore hierárquica onde cada nó
pode ser clicado pra revelar (ou esconder de novo) os galhos abaixo dele. Em
vez de mostrar a árvore inteira de uma vez — o que fica ilegível quando a
hierarquia tem muitos níveis ou muitos itens por nível —, ela começa fechada,
mostrando só a raiz e o primeiro nível, e cresce sob demanda conforme quem
está vendo clica no que interessa. **Para que serve**: explorar uma estrutura
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

O pacote espera um data frame "largo por linha, longo por nível": cada linha
é um caminho completo (aqui, tipo de lã → nível de tensão → número de
quebras do fio), e a função reconstrói a árvore internamente a partir dessas
combinações — não é preciso montar a estrutura em árvore na mão, só apontar
quais colunas representam a hierarquia e em que ordem.

Dados: o dataset `warpbreaks`, que já vem embutido no R (testes de tecelagem
— tipo de lã, nível de tensão aplicada e número de quebras do fio em cada
lote). Paleta e estrutura mantidas exatamente iguais ao exemplo de
referência para este gráfico, como exceção à regra geral do acervo.

**Sobre o `output.png`**: este gráfico só existe como widget interativo (não
tem uma versão equivalente em `ggplot2`), então a miniatura estática é um
screenshot do próprio widget no seu estado inicial (fechado) — os dois são
sempre visualmente idênticos por construção.

## Possíveis problemas pelo caminho

- **Problema**: a captura do `output.png` sai com o texto dos rótulos em
  cores erradas, como se cada letra tivesse uma cor diferente (nada disso
  aparece no widget de verdade, só no PNG). **Por quê**: em fontes muito
  pequenas (o padrão do pacote é 10px), a suavização de texto do screenshot
  headless pode gerar um efeito de franja colorida por causa do
  anti-aliasing por subpixel. **Solução**: capturar com `zoom` maior que 1
  no `webshot2::webshot()` (aqui, `zoom = 2`) — a super-amostragem elimina a
  franja sem mudar o enquadramento nem o tamanho final combinado com
  `vwidth`/`vheight`.
- **Problema**: a captura do `output.png` sai com nós sobrepostos ou com
  metade da imagem em branco. **Por quê**: o tamanho do "papel" do
  screenshot (`vwidth`/`vheight`) e o tamanho do próprio widget (`width`/
  `height` passados pra função que gera a árvore, quando definidos) precisam
  ser parecidos — um sobrando ou faltando estica ou aperta demais o layout
  calculado pelo D3. **Solução**: ajustar os dois juntos e conferir a
  imagem gerada antes de seguir.

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
