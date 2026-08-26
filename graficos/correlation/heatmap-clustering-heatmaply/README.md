---
title: "Heatmap com clustering hierárquico"
category: correlation
date: 2026-07-22
source: "https://www.data-to-viz.com/graph/heatmap.html"
interactive: true
resumo: "Matriz de valores em cores, com linhas e colunas reordenadas por similaridade e dendrogramas mostrando os agrupamentos."
veredito_uso: "você tem uma matriz de tamanho médio e quer explorar padrões sem saber de antemão o que procurar."
veredito_evita: "a ordem das linhas/colunas já tem significado próprio (meses, faixas etárias) — o clustering embaralha e destrói a leitura."
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

<div class="pull-quote pull-quote-direita clearfix">a existência de um dendrograma não prova que os grupos são reais</div>

Cuidado com a tentação de interpretar demais: o algoritmo **sempre** produz
agrupamentos, mesmo em dados sem estrutura nenhuma.

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

**Clustering**: `pheatmap()` calcula as distâncias, roda o clustering
hierárquico (ligação completa, distância euclidiana) nas duas dimensões,
reordena a matriz e desenha o `output.png` direto — sem precisar de um
widget/screenshot no meio (a história de por que o gráfico se chama
"heatmaply" mas não usa mais esse pacote está em "Notas do coletor").

**Paridade estático/interativo**: o mesmo objeto que `pheatmap()` devolve
(`$tree_row`, `$tree_col`) é reaproveitado pra montar a versão interativa —
cada `hclust` vira uma árvore aninhada exportada no `data.json`, com a
posição de cada folha já no lugar que ela ocupa depois do clustering. O D3 só
calcula onde cada nó cai no espaço, sem recalcular clustering nenhum: ordem e
árvore batem entre as duas versões por construção, não por tentar reproduzir
o cálculo de uma biblioteca diferente.

**Cor**: `viridis(256, option = "magma")` no R e `d3.interpolateMagma` (mesma
rampa) no D3 — perceptualmente uniforme, diferenças iguais de valor produzem
diferenças visuais iguais. Reflete o valor **padronizado por coluna**
(`scale = "column"`: cada métrica vira z-score antes de colorir e agrupar),
não o valor bruto — evita que uma métrica de escala maior domine cores e
clustering ao mesmo tempo; o valor bruto continua disponível no hover.

**Dado fictício**: matriz 12 × 6 (`Produto_01`…`Produto_12` ×
`Metrica_A`…`Metrica_F`), valores de `rnorm(mean = 50, sd = 15)` com
`set.seed(2026)`.

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

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../part-of-whole/dendrograma-interativo" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Dendrograma interativo colapsável</span>
    <span class="parecido-razao">Mesma técnica de base (clustering hierárquico) isolada e aprofundada — sem a matriz de valores ao lado, só a árvore de agrupamento, colapsável.</span>
  </a>
</div>

## Notas do coletor

Este gráfico se chama "heatmap-clustering-heatmaply" mas não usa mais o
pacote `heatmaply` — o nome ficou de uma versão anterior, e trocar o nome da
pasta quebraria os links já publicados, então ficou. A primeira versão
usava `heatmaply()`, que reordena com "optimal leaf ordering" via um pacote
de dependência (`seriation`) difícil de reproduzir exatamente no D3, e
precisava de `webshot2`/pandoc rodando num navegador headless só pra gerar
o `output.png` — mais uma peça móvel, mais uma coisa pra travar num ambiente
sem GUI.

A troca pra `pheatmap()` resolveu os dois problemas de uma vez, sem ser esse
o plano original. `pheatmap(..., filename = "output.png")` desenha direto
num device PNG, sem widget nem screenshot no meio. E, quase de brinde, a
chamada devolve os próprios objetos `hclust` que ela usou internamente
(`tree_row`/`tree_col`) — reaproveitar esses objetos pra montar a versão
interativa garante que a ordem e a árvore batem exatamente com o
`output.png`, por construção, em vez de precisar reproduzir o clustering do
`seriation` numa segunda linguagem. Às vezes a correção mais simples resolve
um problema que nem era o que se estava tentando resolver.
