---
title: "Halteres: espera antes e depois por especialidade"
category: comparison
date: 2026-08-26
source: "https://r-graph-gallery.com/303-lollipop-plot-with-2-values.html"
interactive: true
resumo: "O tempo médio de espera de cada especialidade em dois momentos, ligado por uma haste — a distância entre os pontos é a mudança."
pacotes: ["ggplot2"]
dados: "1 variável categórica + 2 numéricas (o mesmo indicador em dois momentos)"
nivel: básico
tags: ["halteres", "antes e depois", "comparação"]
---

## O que é

Um gráfico de halteres (*dumbbell*) desenha, para cada categoria, dois pontos
ligados por uma haste: o valor do mesmo indicador em dois momentos (ou em dois
grupos). **Para que serve**: comparar pares de valores quando o que interessa
não é só quanto cada um vale, mas **o tamanho e a direção da distância entre
eles** — a haste é a mudança, desenhada como comprimento.

É o parente próximo do gráfico de barras agrupadas para o mesmo dado, com uma
diferença decisiva: no barras agrupadas a mudança precisa ser inferida
comparando duas alturas vizinhas; aqui ela é um objeto visual próprio.

## Quando usar (e quando evitar)

**Use quando** você tem uma dúzia de categorias medidas duas vezes e quer
responder, na mesma imagem, "quem está pior hoje?" e "quem mudou mais?".
Funciona especialmente bem quando as mudanças vão em direções diferentes: as
hastes apontam para lados opostos e o contraste salta.

**Evite quando** houver mais de dois momentos — três ou mais pontos por
categoria transformam a haste numa linha do tempo mal desenhada, e um gráfico
de linhas (ou um de inclinação com vários passos) lê melhor. Evite também com
muitas categorias: acima de ~25 hastes o eixo vertical vira uma lista longa e
a comparação entre extremos exige rolagem.

Se **só** a variação importar, e os valores absolutos não, um gráfico de barras
divergentes é mais direto — é justamente por isso que ele aparece como uma das
leituras alternáveis na versão interativa desta página.

## Que dados você precisa

- **variável categórica** — o que ocupa cada linha (aqui, a especialidade)
- **duas variáveis numéricas** — o mesmo indicador medido duas vezes (aqui, a
  espera média em dois anos), na **mesma unidade e na mesma escala**

Formato largo: uma linha por categoria, com uma coluna para cada momento. É o
oposto do formato longo/tidy exigido por um gráfico de área ou de linhas — o
par de valores precisa estar lado a lado para virar uma haste.

A diferença entre as duas colunas não precisa existir no dado de entrada; ela
é calculada (`depois - antes`) e usada para colorir e ordenar.

## Como ler o gráfico

- **Posição horizontal de cada ponto**: o valor daquele momento, na escala
  compartilhada por todas as linhas.
- **Comprimento da haste**: o tamanho da mudança. Hastes longas são mudanças
  grandes, independentemente de em que região da escala aconteceram.
- **Cor dos pontos**: qual dos dois momentos cada ponto representa — não é uma
  escala, são dois rótulos.
- **Cor do número à direita**: o sinal da variação. Aqui, verde para queda na
  espera (melhora) e vermelho para alta.
- **Ordem vertical**: por padrão, a espera atual — maior no topo.

O detalhe que engana: **a posição de uma haste no eixo não diz nada sobre o
tamanho dela**. Uma especialidade pode estar entre as piores em valor absoluto
e ainda assim ter melhorado bastante, e vice-versa. Ler as duas coisas ao mesmo
tempo é exatamente o que o gráfico oferece, e exatamente onde a leitura
apressada erra.

## Como foi feito

A imagem estática é um `ggplot2` com três camadas na mesma altura: um
`geom_segment()` para a haste e dois `geom_point()`, um por momento. O truque
que faz tudo se alinhar é o eixo Y categórico: como os três `geom_*` usam a
mesma variável em `y`, os pontos caem automaticamente sobre a haste, sem
`position_*` nenhum.

Os pontos usam `shape = 21` (círculo com contorno) em vez do círculo cheio
padrão. Isso permite mapear `fill` — o que faz o `ggplot2` montar a legenda dos
dois momentos sozinho — e desenhar um contorno branco fino, que separa os dois
pontos quando eles quase se encostam (uma das especialidades varia apenas um
dia). O número da variação vem de um `geom_text()` numa posição fixa à direita,
colorido por `scale_colour_identity()` a partir de uma coluna de cor calculada
no próprio quadro de dados.

A ordem das linhas é fixada convertendo a categoria em `factor` com os níveis
já ordenados. Sem isso o `ggplot2` ordena alfabeticamente, e a leitura "quem
está pior" se perde.

Dados fictícios: o tempo médio de espera por especialidade numa rede de
clínicas imaginária, em dois anos, escritos à mão em vez de sorteados. Ruído
aleatório puro produziria variações em direções arbitrárias; aqui a maioria das
especialidades melhora e três pioram — o contraste que dá ao gráfico algo para
mostrar.

Na versão interativa, o mesmo par de números ganha outras duas codificações
alternáveis, e a transição entre elas é contínua: nenhum elemento é criado ou
destruído na troca, os mesmos pontos e hastes se movem para as novas posições.
No modo **inclinação**, os dois momentos viram duas colunas e cada categoria
vira uma linha que sobe ou desce. No modo **divergente**, todas as hastes são
transladadas para começar no zero, e o que sobra é só o saldo — a haste engorda
e vira barra. Também dá para reordenar as linhas ao vivo (por espera atual, por
variação ou alfabeticamente) e clicar em qualquer linha para fixar o destaque.

## Possíveis problemas pelo caminho

- **Problema**: os dois pontos se sobrepõem quando a variação é pequena.
  **Por quê**: com uma diferença de um ou dois passos na escala, os círculos
  ficam a menos de um diâmetro de distância e viram uma mancha só.
  **Solução**: use `shape = 21` com contorno branco (`colour = "white"`), que
  mantém a fronteira entre eles visível, ou reduza o `size` dos pontos.
- **Problema**: a ordem das linhas sai alfabética mesmo depois de ordenar o
  quadro de dados. **Por quê**: o `ggplot2` ordena um eixo discreto pelos
  níveis do `factor`, não pela ordem das linhas do `data.frame`.
  **Solução**: recrie o `factor` com `levels =` na ordem desejada depois de
  ordenar, e lembre que o primeiro nível fica **embaixo** num eixo Y.
- **Problema**: a haste é desenhada por cima dos pontos e os corta ao meio.
  **Por quê**: no `ggplot2` a ordem de empilhamento é a ordem em que as camadas
  são somadas. **Solução**: declare o `geom_segment()` antes dos
  `geom_point()`.
- **Problema**: comparar comprimentos de haste entre dois gráficos diferentes.
  **Por quê**: a escala do eixo é ajustada aos dados de cada gráfico, então a
  mesma variação pode ter comprimentos diferentes em cada um. **Solução**: fixe
  os limites com `scale_x_continuous(limits = ...)` quando os gráficos forem
  lidos lado a lado.

## Variações possíveis

- Somar uma seta na ponta da haste (`arrow =` no `geom_segment()`) para tornar
  a direção da mudança explícita sem depender da cor.
- Trocar os dois momentos por dois **grupos** medidos no mesmo instante (homens
  e mulheres, capital e interior) — a técnica é idêntica, muda só a leitura.
- Ordenar pela variação em vez do valor atual, quando a pergunta for "onde a
  mudança foi maior" em vez de "onde está pior hoje".
- Acrescentar um terceiro ponto (um valor de meta, por exemplo) na mesma linha,
  como referência fixa — funciona bem desde que ele seja visualmente distinto e
  não faça parte da haste.
- Facetar por região ou unidade, repetindo o mesmo conjunto de categorias em
  cada painel, quando houver um agrupamento acima da categoria.
