---
title: "Heatmap com clustering hierárquico (heatmaply)"
category: correlation
date: 2026-07-22
source: "https://www.data-to-viz.com/graph/heatmap.html"
interactive: true
resumo: "Matriz de valores em cores, com linhas e colunas reordenadas por similaridade e dendrogramas mostrando os agrupamentos."
pacotes: ["heatmaply", "plotly", "hrbrthemes", "webshot2"]
dados: "uma matriz numérica (linhas × colunas), com nomes em ambas as dimensões"
nivel: intermediário
tags: ["interativo", "matriz", "clustering"]
---

## O que é

Um heatmap representa cada célula de uma matriz por uma cor proporcional ao seu
valor. Sozinho, isso já ajuda — mas a ordem das linhas e colunas costuma ser
arbitrária, e padrões ficam escondidos.

A versão com **clustering hierárquico** resolve isso: antes de desenhar, linhas e
colunas são reordenadas de modo que itens parecidos fiquem vizinhos, e os
dendrogramas nas bordas mostram como esses agrupamentos foram formados.

**Para que serve**: descobrir estrutura em uma matriz — quais itens se comportam de
forma parecida, quais métricas andam juntas, se existem blocos naturais nos dados.

## Quando usar (e quando evitar)

**Use quando** tiver uma matriz de tamanho médio e quiser explorar padrões sem
saber de antemão o que procurar. É uma ferramenta de descoberta: o reordenamento
faz os blocos aparecerem sozinhos.

**Evite quando** a ordem das linhas ou colunas tiver significado próprio (meses do
ano, faixas etárias, etapas de um processo) — o clustering vai embaralhar essa
ordem e destruir a leitura. Nesses casos, use um heatmap com ordem fixa.

Cuidado também com a tentação de interpretar demais: o algoritmo **sempre** produz
agrupamentos, mesmo em dados sem estrutura nenhuma. A existência de um dendrograma
não prova que os grupos são reais.

## Que dados você precisa

- **Uma matriz numérica**, com nomes de linha e de coluna (eles viram os rótulos).
- Todas as células preenchidas — valores ausentes atrapalham o cálculo de
  distância entre linhas.

Se as colunas estiverem em unidades muito diferentes (uma em reais, outra em
porcentagem), padronize antes ou use o argumento `scale`, senão a coluna de maior
magnitude domina tanto as cores quanto o agrupamento.

## Como ler o gráfico

- **Cor da célula**: o valor daquela combinação linha × coluna.
- **Ordem das linhas e colunas**: não é a original — é a que o clustering
  produziu. Vizinhança significa similaridade.
- **Dendrogramas nas bordas**: a árvore de agrupamento. Quanto **mais à esquerda
  (ou mais abaixo) o ponto de junção**, mais parecidos são os itens que ele une.
- **Blocos de cor uniforme** são o achado principal: um conjunto de linhas que se
  comporta de modo parecido em um conjunto de colunas.

Passe o mouse sobre qualquer célula para ver linha, coluna e valor exato.

## Como foi feito

`heatmaply()` faz tudo numa chamada: calcula as distâncias, roda o clustering
hierárquico, reordena a matriz, desenha os dendrogramas e devolve um htmlwidget
interativo (construído sobre `plotly`).

O argumento `dendrogram = "both"` pede o agrupamento nas duas dimensões — é
possível pedir só `"row"`, só `"column"` ou `"none"` para desligar e manter a
ordem original.

A escala de cores usa `viridis(256, option = "magma")`, perceptualmente uniforme:
diferenças iguais de valor produzem diferenças visuais iguais, o que nem toda
paleta garante.

Como o resultado já nasce interativo, a miniatura estática veio de uma captura de
tela do widget via `webshot2::webshot()`.

Dados fictícios: matriz 12 × 6 (`Produto_01`…`Produto_12` × `Metrica_A`…`Metrica_F`),
valores de `rnorm(mean = 50, sd = 15)` com `set.seed(2026)`.

## Possíveis problemas pelo caminho

- **Problema**: uma única coluna domina todas as cores e o clustering. **Por quê**:
  as colunas estão em escalas diferentes e a distância euclidiana é dominada pela
  de maior magnitude. **Solução**: padronizar com `scale = "column"` (ou `"row"`,
  conforme a pergunta).

- **Problema**: os agrupamentos parecem convincentes mas não se sustentam.
  **Por quê**: clustering hierárquico sempre devolve uma árvore, inclusive para
  ruído puro. **Solução**: validar com outra abordagem antes de tirar conclusões;
  tratar o dendrograma como hipótese, não resultado.

- **Problema**: a ordem esperada das linhas some. **Por quê**: é exatamente o que o
  clustering faz. **Solução**: usar `dendrogram = "none"` quando a ordem original
  importar.

- **Problema**: salvar o widget falha por falta de `pandoc`. **Solução**: usar
  `selfcontained = FALSE` e manter a pasta `widget_files/` ao lado do HTML.

- **Problema**: a instalação puxa uma quantidade grande de dependências
  (`dendextend`, `seriation`, entre outras). **Por quê**: são exigidas para os
  algoritmos de agrupamento e reordenação. **Solução**: nenhuma — faz parte do
  pacote, só conte com uma instalação mais demorada.

## Variações possíveis

- Desligar o clustering (`dendrogram = "none"`) e manter a ordem original, quando
  ela tiver significado.
- Agrupar só nas linhas, mantendo as colunas na ordem definida por você.
- Trocar a métrica de distância ou o método de ligação (`hclust_method`) — o
  agrupamento muda bastante e comparar duas escolhas é revelador.
- Usar uma paleta divergente quando o zero for um ponto de referência real
  (correlações, variações percentuais), para separar visualmente positivo de
  negativo.
