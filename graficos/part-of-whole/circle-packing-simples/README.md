---
title: "Circle packing simples (packcircles + ggiraph)"
category: part-of-whole
date: 2026-07-29
source: "https://r-graph-gallery.com/307-add-space-in-circle-packing.html"
interactive: true
resumo: "Bolhas de tamanhos proporcionais a um valor, compactadas sem sobreposição num único nível, sem hierarquia entre elas."
pacotes: ["packcircles", "ggplot2", "ggiraph"]
dados: "1 variável categórica + 1 variável numérica (uma bolha por categoria, sem agrupamento)"
nivel: básico
tags: ["interativo", "parte-do-todo", "proporção"]
---

## O que é

Circle packing (empacotamento circular) representa cada categoria como um
círculo, com a **área** do círculo — não o raio — proporcional ao valor,
compactados uns ao lado dos outros o mais próximo possível sem se sobrepor.
**Para que serve**: comparar a magnitude de várias categorias ao mesmo tempo,
num layout mais orgânico e compacto do que uma grade de retângulos, quando não
existe uma ordem ou eixo natural entre elas.

## Quando usar (e quando evitar)

**Use quando** houver muitas categorias (dezenas) sem hierarquia entre si, e a
mensagem for "comparar tamanhos relativos de forma compacta e visualmente
agradável", sem precisar de um eixo numérico exato.

**Evite quando** a comparação exigir precisão: o olho humano julga área pior do
que julga comprimento, então duas bolhas com valores próximos parecem quase
idênticas mesmo não sendo. Evite também quando os valores forem muito
parecidos entre si — a técnica só compensa quando há variação real de
tamanho para mostrar. Nesses casos, um gráfico de barras ordenado comunica os
mesmos números com muito mais precisão de leitura.

## Que dados você precisa

- **Uma variável categórica** — o nome/rótulo de cada bolha.
- **Uma variável numérica positiva** — o valor que vira a área de cada bolha.

Formato simples: uma linha por categoria (dado longo/tidy), sem agrupamento
nem hierarquia — é isso que diferencia esta versão da variante hierárquica de
circle packing deste acervo, com várias camadas de agrupamento.

## Como ler o gráfico

- **Área de cada círculo**: o valor da categoria. Compare áreas, não o
  diâmetro — um círculo com o dobro do diâmetro tem quatro vezes a área.
- **Cor**: sem significado próprio aqui — cada bolha recebe uma cor diferente
  só para diferenciação visual, não representa nenhuma variável dos dados.
- **Posição**: definida pelo algoritmo de empacotamento (cada bolha nova tenta
  ficar o mais perto possível do centro de massa das que já foram
  posicionadas), não por nenhuma variável — não leia posição como informação.

## Como foi feito

A camada de layout vem do pacote `packcircles`: `circleProgressiveLayout()`
calcula a posição (x, y) e o raio de cada círculo a partir dos valores,
evitando sobreposição; `circleLayoutVertices()` converte esse layout num
polígono de N pontos por bolha, pronto para `geom_polygon()`. Multiplicar o
raio por 0,95 antes de gerar os vértices abre um pequeno respiro entre bolhas
vizinhas — sem isso, elas saem coladas umas nas outras.

A versão interativa troca `geom_polygon()` por `geom_polygon_interactive()`
(do `ggiraph`), que aceita `tooltip` e `data_id` como aesthetics adicionais —
o resto do código de layout é idêntico ao da versão estática. `girafe()`
transforma esse `ggplot` num widget HTML com hover nativo, sem precisar
escrever JavaScript.

Dados fictícios: número de downloads (em milhares) de 24 jogos indie
inventados, no lugar dos rótulos genéricos do exemplo original.

## Possíveis problemas pelo caminho

- **Problema**: os rótulos de bolhas pequenas ficam cortados ou vazam pra fora
  do círculo. **Por quê**: `geom_text()` não sabe o tamanho do círculo em que
  está desenhando — ele só recebe uma posição e um tamanho de fonte, sem
  quebra de linha automática. **Solução**: reduzir o `range` de
  `scale_size_continuous()`, encurtar os rótulos, ou esconder o texto das
  bolhas menores com um filtro condicional no `label`.
- **Problema**: todas as bolhas saem do mesmo tamanho, ignorando os valores.
  **Por quê**: usar `sizetype = "radius"` em vez de `"area"` (ou esquecer o
  parâmetro) faz o algoritmo tratar o valor como raio, distorcendo a
  proporção visual — a diferença de área entre as bolhas fica maior do que
  deveria. **Solução**: conferir `sizetype = "area"` em
  `circleProgressiveLayout()`.
- **Problema**: bolhas coladas umas nas outras, sem respiro entre elas.
  **Por quê**: o raio calculado por `circleProgressiveLayout()` já vem no
  limite exato do encaixe, sem margem. **Solução**: multiplicar
  `packing$radius` por um fator menor que 1 (ex: 0,95) antes de gerar os
  vértices.
- **Problema**: no widget interativo, o tooltip mostra o texto errado. **Por
  quê**: `dat.gg` tem várias linhas por bolha (uma por vértice do polígono),
  todas compartilhando o mesmo `id` — indexar `dados$tooltip[id]` depende de
  `id` bater exatamente com a ordem das linhas de `dados`. **Solução**: não
  reordenar `dados` depois de rodar `circleProgressiveLayout()`.

## Variações possíveis

- Mapear a cor para uma variável categórica real (ex: um grupo/família de
  cada item), em vez de uma cor arbitrária por bolha.
- Ordenar os dados por valor antes do layout, o que deixa a disposição das
  bolhas maiores mais previsível.
- Aumentar `npoints` em `circleLayoutVertices()` para bordas mais suaves em
  círculos grandes (custa mais pontos por polígono).
- Esconder o rótulo de texto das bolhas menores e depender só do tooltip
  (versão interativa) para os detalhes de cada uma.
