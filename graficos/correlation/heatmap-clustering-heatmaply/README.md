---
title: "Heatmap com clustering hierárquico"
category: correlation
date: 2026-07-22
source: "https://www.data-to-viz.com/graph/heatmap.html"
interactive: true
resumo: "Matriz de valores em cores, com linhas e colunas reordenadas por similaridade e dendrogramas mostrando os agrupamentos."
pacotes: ["pheatmap", "viridis", "jsonlite", "d3"]
dados: "uma matriz numérica (linhas × colunas), com nomes em ambas as dimensões"
nivel: intermediário
tags: ["matriz", "clustering"]
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
- **Dendrogramas nas bordas**: a árvore de agrupamento — linhas à esquerda,
  colunas em cima. Quanto **mais perto da matriz (mais cedo) uma junção
  acontece**, mais parecidos são os itens que ela une; junções que só
  acontecem perto da raiz (mais longe da matriz) ligam grupos bem diferentes
  entre si.
- **Blocos de cor uniforme** são o achado principal: um conjunto de linhas que se
  comporta de modo parecido em um conjunto de colunas.

Passe o mouse sobre qualquer célula para ver linha, coluna e valor exato.

## Como foi feito

`pheatmap()` faz o trabalho pesado no R: calcula as distâncias, roda o
clustering hierárquico (ligação completa, distância euclidiana) nas duas
dimensões, reordena a matriz e desenha o `output.png` direto — sem precisar de
um widget/screenshot no meio, ao contrário da versão anterior deste gráfico.

O mesmo objeto que o `pheatmap()` devolve (`$tree_row`, `$tree_col`) é reaproveitado
pra montar a versão interativa: cada `hclust` é convertido de `merge`/`height`
(o formato interno do R) pra uma árvore aninhada exportada no `data.json`, com
a posição de cada folha já no lugar que ela ocupa depois do clustering — o D3
só calcula onde cada nó cai no espaço e traça os segmentos em "cotovelo" de um
dendrograma, sem recalcular nenhum clustering no navegador. Isso garante que a
ordem e a árvore batem exatamente entre as duas versões, por construção — não
por tentar reproduzir o clustering de uma biblioteca diferente.

A escala de cores usa `viridis(256, option = "magma")` no lado do R e
`d3.interpolateMagma` (mesma rampa, nome equivalente no D3) no lado interativo —
perceptualmente uniforme: diferenças iguais de valor produzem diferenças
visuais iguais, o que nem toda paleta garante. A cor de cada célula reflete o
valor **padronizado por coluna** (`scale = "column"`: cada métrica vira
z-score antes de colorir e agrupar), não o valor bruto — é o que evita que uma
métrica de escala maior domine tanto as cores quanto o clustering; o valor
bruto continua disponível no hover.

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
  clustering faz. **Solução**: desligar o clustering daquela dimensão
  (`cluster_rows = FALSE` ou `cluster_cols = FALSE`) quando a ordem original
  importar.

- **Problema**: o dendrograma fica quase todo "achatado", com galhos de comprimento
  parecido. **Por quê**: quando os itens são pouco diferentes entre si, as alturas
  de junção do clustering ficam todas próximas — o dendrograma não inventa
  estrutura que não existe no dado. **Solução**: não é um bug de desenho; é sinal
  de que a matriz tem pouca variação real entre linhas (ou colunas) pra separar.

## Variações possíveis

- Desligar o clustering (`cluster_rows = FALSE`/`cluster_cols = FALSE`) e manter a
  ordem original, quando ela tiver significado.
- Agrupar só nas linhas, mantendo as colunas na ordem definida por você.
- Trocar a métrica de distância ou o método de ligação
  (`clustering_distance_rows`/`clustering_method`) — o agrupamento muda bastante e
  comparar duas escolhas é revelador.
- Usar uma paleta divergente quando o zero for um ponto de referência real
  (correlações, variações percentuais), para separar visualmente positivo de
  negativo.
- Colorir o dendrograma por "corte" (agrupar em k clusters e dar uma cor por
  grupo aos galhos), destacando visualmente os blocos que a árvore sugere.
