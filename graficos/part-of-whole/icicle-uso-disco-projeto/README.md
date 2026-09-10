---
title: "Icicle chart: uso de disco de um projeto"
category: part-of-whole
date: 2026-09-10
source: "https://r-graph-gallery.com/hierarchical-icicle-plot.html"
interactive: true
resumo: "A estrutura de pastas de um projeto de software fictício, três linhas de cima pra baixo — projeto, categoria, subpasta — com a largura de cada bloco proporcional ao tamanho em disco."
veredito_uso: "sua hierarquia tem poucos níveis (2-4) e você quer comparar o tamanho de nós em níveis DIFERENTES olhando só a largura, sem precisar comparar anéis de raio diferente."
veredito_evita: "a hierarquia tem muitos níveis de profundidade — cada nível vira uma linha inteira, e a partir de uns 5-6 níveis as linhas de baixo ficam finas demais pra rotular."
pacotes: ["ggplot2", "dplyr"]
dados: "2+ variáveis categóricas aninhadas (categoria → subcategoria → ...) + 1 numérica (o tamanho de cada folha)"
nivel: intermediário
tags: ["icicle", "hierarquia", "disco"]
---

## O que é

Um icicle chart desenha uma hierarquia como uma pilha de linhas horizontais,
uma por nível — a raiz ocupa a linha do topo (largura inteira), e cada nível
abaixo dela divide a largura entre os filhos, proporcional ao tamanho de
cada um, sempre alinhados embaixo do próprio pai. **Para que serve**:
mostrar composição de um todo em vários níveis ao mesmo tempo, com a
profundidade virando uma direção espacial só dela (a vertical) — diferente
de um sunburst (profundidade = anel) ou de um treemap (profundidade =
aninhamento livre em 2D).

## Quando usar (e quando evitar)

**Use quando** a hierarquia tiver poucos níveis (2 a 4 costuma ser o ponto
doce) e a pergunta envolver comparar nós de **níveis diferentes** — "essa
subpasta sozinha é maior que aquela categoria inteira?" é uma leitura direta
de largura contra largura, sem precisar julgar ângulo ou área de anéis
concêntricos como um [sunburst](../sunburst-catalogo-streaming) exigiria.

**Evite quando** a hierarquia for muito profunda: cada nível vira uma linha
inteira da altura do gráfico, e a partir de uns 5-6 níveis as linhas de baixo
(com muito mais nós, cada um mais fino) ficam estreitas demais pra rotular —
nesse caso um [treemap](../treemap-orcamento-municipal) aproveita melhor o
espaço 2D, ou um [circle packing](../circle-packing-hierarquico) com zoom
por clique evita mostrar tudo de uma vez.

## Como ler o gráfico

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#8B5FA8"></span> node_modules</div>
  <div><span class="swatch" style="background:#4A9A6A"></span> assets</div>
  <div><span class="swatch" style="background:#3B6E8F"></span> src</div>
</div>

- **Linha (posição vertical)**: o nível da hierarquia — projeto no topo,
  categoria de pasta no meio, subpasta embaixo.
- **Largura do bloco**: o tamanho em disco daquele nó, proporcional à linha
  inteira (a raiz) ou à fatia do pai (os níveis abaixo).
- **Posição horizontal de um bloco**: sempre dentro do intervalo horizontal
  do próprio pai — nunca se estende além dele, é assim que a hierarquia
  fica visível sem precisar de linha nenhuma ligando pai e filho.
- **Cor**: a categoria de pasta (nível do meio) — as subpastas herdam a cor
  da própria categoria, só variando a posição.

## Como foi feito

**Sem pacote pronto**: `ggraph`/`igraph` (já usados em outros gráficos de
hierarquia desta base) desenham dendrograma, treemap ou circle packing, mas
não icicle — a partição foi montada à mão com `geom_rect()`, mesma família
de "sem widget, desenha na mão" do [waffle](../waffle-participacao-mercado-smartphones)
e do [mosaico](../mosaico-canal-aquisicao-plano) desta base.

**Partição aninhada**: a largura de cada categoria (nível do meio) vem da
proporção do seu total sobre o total geral — igual ao mosaico. A diferença
é que aqui as subpastas (nível de baixo) não reocupam o eixo inteiro: a
largura de cada uma é calculada como proporção do total da PRÓPRIA
categoria e depois reescalada para caber dentro do intervalo `[x0, x1]`
específico daquela categoria — é essa reescala que faz o filho ficar
literalmente embaixo do próprio pai, nunca embaixo de um pai vizinho.

**Dado fictício**: a estrutura de pastas de um projeto de software (`src`,
`node_modules`, `assets`, `build`, `docs`, `tests`), com tamanhos em MB
escritos à mão para dar variação real de escala entre categorias (algumas
com várias subpastas pequenas, outras — `docs`, `tests` — sem subdivisão
nenhuma, folhas do próprio nível 1).

**Na versão interativa**: o `data.json` carrega só a lista achatada
categoria+subpasta+tamanho — o D3 monta a mesma partição aninhada sozinho,
nunca a partir de coordenadas já prontas. Passar o mouse (ou clicar) numa
categoria ou na legenda acende aquela categoria e todas as suas subpastas
juntas.

## Possíveis problemas pelo caminho

- **Problema**: uma subpasta aparece deslocada, fora do intervalo horizontal
  da própria categoria. **Por quê**: calcular a largura da subpasta como
  proporção do total GERAL (em vez do total da categoria) e não reescalar
  pro intervalo do pai — sem a reescala, cada nível volta a ocupar o eixo
  inteiro como se fossem colunas independentes (o comportamento do mosaico,
  não de um icicle). **Solução**: sempre normalizar pela soma do PRÓPRIO
  pai, depois multiplicar pela largura `(x1 - x0)` do pai antes de somar
  ao `x0` dele.

## Variações possíveis

- Inverter a ordem (folha no topo, raiz embaixo) ou orientar na horizontal
  (profundidade da esquerda pra direita, típico de exploradores de arquivo)
  — a lógica de partição é a mesma, só troca qual eixo carrega qual papel.
- Ordenar as categorias alfabeticamente em vez de por tamanho, quando o
  objetivo for localizar uma pasta específica em vez de comparar tamanhos.
- Adicionar um quarto nível (arquivo dentro de subpasta) quando a
  hierarquia real tiver essa profundidade e ainda couber sem virar fatias
  finas demais.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../treemap-orcamento-municipal" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Treemap com zoom: orçamento municipal</span>
    <span class="parecido-razao">Mesma pergunta de hierarquia por área proporcional, mas aninhada livremente em 2D em vez de uma linha por nível — melhor uso de espaço, pior para comparar níveis diferentes.</span>
  </a>
  <a class="parecido-item" href="../mosaico-canal-aquisicao-plano" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Mosaico: canal de aquisição x plano assinado</span>
    <span class="parecido-razao">Mesma técnica de largura acumulada proporcional ao pai, mas as colunas do mosaico são independentes entre si — aqui elas são genuinamente aninhadas, uma hierarquia real.</span>
  </a>
</div>
