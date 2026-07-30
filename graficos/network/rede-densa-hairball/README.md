---
title: "Rede densa (hairball)"
category: network
date: 2026-07-24
source: "https://www.data-to-viz.com/graph/network.html"
interactive: true
resumo: "O que acontece quando uma rede tem conexões demais: uma bola de linhas emaranhadas em que nada se distingue."
pacotes: ["ggraph", "igraph", "visNetwork"]
dados: "uma lista de conexões (origem, destino)"
nivel: intermediário
tags: ["interativo", "rede", "armadilha"]
---

## O que é

Este gráfico existe para mostrar um **problema**, não uma solução.

Quando uma rede tem muitos nós e muitas conexões sem estrutura clara, o layout por
forças produz o que se costuma chamar de *hairball* — uma bola de cabelo. Todos os
nós ficam amontoados no centro, as linhas se cruzam em todas as direções, e o
desenho, apesar de tecnicamente correto, não comunica nada.

**Para que serve**: reconhecer o sintoma. É um dos resultados mais comuns em
visualização de redes, e é facilmente confundido com "a rede é complexa" quando na
verdade significa "esta representação não serve para estes dados".

## Quando usar (e quando evitar)

**Evite chegar aqui.** Se o seu gráfico de rede se parece com este, o caminho não é
ajustar cores ou tamanhos — é mudar de abordagem:

- **Filtrar**: manter só as conexões mais fortes, ou os nós acima de um grau mínimo.
- **Agregar**: agrupar nós em comunidades e desenhar a rede das comunidades.
- **Trocar de representação**: uma matriz de adjacência aguenta densidade muito
  maior sem perder legibilidade; um arc diagram funciona bem quando há ordem
  natural.
- **Recortar**: mostrar a vizinhança de um nó de interesse em vez da rede inteira.

O único uso legítimo de um hairball é retórico: ilustrar escala ou caos como
argumento — e, mesmo assim, deixando claro que é esse o ponto.

## Que dados você precisa

- **Uma lista de conexões** — origem e destino.

O que caracteriza o caso não é o formato, e sim o volume e a ausência de estrutura:
muitos nós, muitas arestas distribuídas mais ou menos ao acaso, sem comunidades
para o layout separar.

## Como ler o gráfico

Honestamente: quase não dá.

- **Círculos**: os nós, com cor e tamanho proporcionais ao grau (número de
  conexões).
- **Linhas**: as conexões.
- Não há rótulos — nessa densidade eles seriam ilegíveis e só somariam ruído.

A única leitura possível na versão estática é aproximada, pela cor e pelo tamanho:
quais nós têm mais conexões. Qualquer afirmação sobre pares específicos ou sobre
agrupamentos não se sustenta.

Na versão interativa dá para arrastar nós e "desemaranhar" localmente — o que ajuda
a inspecionar uma vizinhança por vez, e deixa claro por comparação o quanto a visão
geral estava escondendo.

## Como foi feito

A rede é gerada de propósito sem estrutura: `igraph::sample_gnp()` produz um grafo
aleatório em que cada par de nós tem a mesma probabilidade de estar conectado. São
65 nós, sem comunidades — exatamente o pior caso para um layout por forças.

A versão estática vem do `ggraph`; a interativa, do `visNetwork`, com física ligada
e nós arrastáveis.

## Possíveis problemas pelo caminho

- **Problema**: `as_data_frame()` reclama de um argumento desconhecido. **Por quê**:
  o `dplyr` (carregado junto com o `tidyverse`) define uma função de mesmo nome que
  mascara a do `igraph`, e a versão do `dplyr` não aceita o argumento `what=`.
  **Solução**: chamar com o prefixo explícito: `igraph::as_data_frame()`.

- **Problema**: a versão interativa sai com todos os nós da mesma cor, enquanto a
  estática colore cada nó pelo grau. **Por quê**: `visNetwork` não tem escalas
  contínuas como o `ggplot2` — não existe um `scale_colour_*` ali; ele espera a
  cor de cada nó já pronta, em hexadecimal, numa coluna do `data.frame`.
  **Solução**: calcular as cores no R e passar por nó em `color.background`. Para
  bater exatamente com a versão estática, vale saber que
  `scale_colour_distiller(palette = "OrRd")` é, por dentro, um gradiente sobre as
  7 cores do brewer — ou seja,
  `scales::gradient_n_pal(RColorBrewer::brewer.pal(7, "OrRd"))(scales::rescale(x))`
  reproduz a mesma rampa.

- **Problema**: a versão interativa fica lenta ou trava. **Por quê**: a simulação
  de física roda continuamente no navegador e o custo cresce com o número de nós.
  **Solução**: desligar a física depois da estabilização, ou reduzir a rede.

- **Problema**: você ajusta cores, tamanhos e transparência e o gráfico continua
  ilegível. **Por quê**: o problema não é estético, é de densidade de informação.
  **Solução**: filtrar, agregar ou trocar de representação — nenhuma escolha visual
  resolve um hairball.

- **Problema**: os rótulos ativados deixam tudo pior. **Por quê**: com dezenas de
  nós próximos, o texto se sobrepõe e cobre a rede. **Solução**: mostrar rótulo
  apenas no hover, ou só nos nós de maior grau.

## Variações possíveis

- Filtrar por grau mínimo e observar a rede voltar a ficar legível.
- Rodar detecção de comunidades, colorir por comunidade e desenhar a rede agregada
  das comunidades em vez da rede completa.
- Trocar por uma matriz de adjacência, que suporta densidade muito maior.
- Comparar com uma rede de mesmo tamanho **com** estrutura de comunidade, para ver
  o mesmo algoritmo produzir um resultado legível — a diferença está nos dados, não
  no desenho.
