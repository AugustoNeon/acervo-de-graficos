---
title: "Rede densa (hairball)"
category: network
date: 2026-07-24
source: "https://www.data-to-viz.com/graph/network.html"
interactive: true
resumo: "O que acontece quando uma rede tem conexões demais: uma bola de linhas emaranhadas em que nada se distingue."
veredito_uso: "você quer ilustrar, de propósito, o que acontece quando uma rede fica densa demais para qualquer layout resolver."
veredito_evita: "sempre que possível — se este é o resultado real do seu gráfico, o problema é a técnica, não os dados; filtre, agregue ou troque de representação."
pacotes: ["ggraph", "igraph", "jsonlite", "d3"]
dados: "uma lista de conexões (origem, destino)"
nivel: intermediário
tags: ["rede", "armadilha"]
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

<div class="pull-quote pull-quote-direita clearfix">esta representação não serve para estes dados</div>

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
  **Solução**: calcular as cores no R e passar por nó em `color.background` —
  a fórmula exata e como o desvio foi flagrado estão em "Notas do coletor".

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

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../matriz-adjacencia-tags" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Matriz de adjacência: tags que aparecem juntas</span>
    <span class="parecido-razao">O oposto direto: o mesmo tipo de dado (nós e arestas), mas exatamente o cenário em que a matriz vence e o diagrama de nós perde — muitas arestas, layout ilegível.</span>
  </a>
  <a class="parecido-item" href="../arc-diagram-d3" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Arc diagram</span>
    <span class="parecido-razao">Outra saída pra densidade alta: nós alinhados numa ordem com significado em vez de posicionados por força — funciona onde existe uma ordem natural pra impor.</span>
  </a>
  <a class="parecido-item" href="../comparacao-layouts" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Comparação de layouts de rede (Fruchterman-Reingold, DrL, Aleatório)</span>
    <span class="parecido-razao">Mostra o mesmo limite por outro ângulo: nenhum dos três algoritmos de força escapa do emaranhado quando a rede é densa demais — o problema é estrutural, não do algoritmo escolhido.</span>
  </a>
</div>

## Notas do coletor

A cor de cada nó divergia entre a miniatura estática e o widget — e não foi
a única vez. Este gráfico, junto com outros dois deste acervo (uma rede
dirigida e ponderada, e um circle packing hierárquico), teve exatamente a
mesma reclamação simultaneamente numa sessão de revisão: a versão
interativa mostrava uma cor visivelmente diferente da imagem estática ao
lado, mesmo os dois desenhando o mesmo dado.

A causa era sempre a mesma: pacotes de widget (`visNetwork`, e os
equivalentes em D3 usados nos outros dois) não têm o sistema de escalas do
`ggplot2` embutido — não existe um `scale_colour_distiller()` ali, cor
tem que chegar pronta, em hexadecimal, por nó. A tentação é reconstruir a
rampa "de olho", escolhendo uma paleta parecida — e é exatamente aí que a
cor diverge, porque "parecida" não é "a mesma função".

A solução que generalizou pros três gráficos foi abrir o que
`scale_colour_distiller(palette = P)` faz por dentro: é um gradiente
contínuo interpolado sobre as N cores discretas de uma paleta do
`RColorBrewer`. Ou seja,
`scales::gradient_n_pal(RColorBrewer::brewer.pal(n, P))(scales::rescale(x))`
reproduz a mesma rampa, cor a cor, calculável no R e exportável como
hexadecimal pronto pro widget consumir — sem depender de nenhuma
aproximação visual.

A lição que ficou não é só a fórmula, é o método de verificação: o desvio
só apareceu comparando um screenshot real do widget (`webshot2::webshot()`
sobre o `widget.html` publicado) lado a lado com o `output.png`, pixel
contra pixel — ler o código do widget ou inspecionar a cor no DOM não
bastava, porque o bug estava na escolha da paleta, não em nenhum erro de
execução. Desde então, comparar widget e PNG lado a lado virou parte do
checklist antes de fechar qualquer gráfico de rede novo.
