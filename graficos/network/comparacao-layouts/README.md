---
title: "Comparação de layouts de rede (Fruchterman-Reingold, DrL, Aleatório)"
category: network
date: 2026-07-24
source: "https://www.data-to-viz.com/graph/network.html"
interactive: false
resumo: "A mesma rede, com os mesmos dados, desenhada por três algoritmos de posicionamento diferentes — e três leituras diferentes."
pacotes: ["ggraph", "igraph", "patchwork"]
dados: "uma lista de conexões (origem, destino)"
nivel: intermediário
tags: ["estático", "rede", "comparação"]
---

## O que é

Três painéis mostrando **exatamente o mesmo grafo** — mesmos nós, mesmas conexões,
nenhum dado alterado — desenhado por três algoritmos de layout distintos:

- **Fruchterman-Reingold** (`fr`): simulação de forças, o padrão para redes
  pequenas e médias. Tende a revelar agrupamentos.
- **DrL**: também baseado em forças, mas projetado para redes grandes; separa
  comunidades de forma mais agressiva.
- **Aleatório**: posições sorteadas, sem nenhuma otimização. Serve de controle.

**Para que serve**: demonstrar que **o layout não é detalhe estético — é parte da
análise**. A mesma rede pode parecer organizada, agrupada ou caótica dependendo
apenas de onde os pontos foram colocados.

## Quando usar (e quando evitar)

**Use esta comparação quando** estiver escolhendo como apresentar uma rede: rodar
dois ou três layouts antes de decidir é barato e evita conclusões acidentais.

Na prática do dia a dia, **Fruchterman-Reingold** é a escolha padrão para redes de
até algumas centenas de nós; **DrL** vale quando a rede é grande e o objetivo é
separar comunidades. O **aleatório** não serve para nada além de ilustrar o
contraste — está aqui exatamente para isso.

**Evite** tirar conclusões a partir da posição absoluta dos nós em qualquer layout
de forças: coordenadas não têm significado, só a proximidade relativa tem — e ainda
assim de forma aproximada.

## Que dados você precisa

- **Uma lista de conexões** — origem e destino.

Nada além disso: layouts de rede trabalham só com a topologia. Nenhum dos três
algoritmos usa atributo de nó ou peso de aresta neste exemplo — o que muda entre os
painéis é apenas o algoritmo.

## Como ler o gráfico

Em cada painel:

- **Círculos**: os nós.
- **Linhas**: as conexões.
- **Posição**: definida pelo algoritmo do painel, não pelos dados.

A leitura interessante é a **comparação entre painéis**. Note que:

- em `fr`, nós muito conectados se aproximam e formam regiões visíveis;
- em `drl`, as separações tendem a ficar mais marcadas;
- no aleatório, as mesmas conexões existem, mas nenhum padrão aparece.

Se um agrupamento se mantém visível em mais de um layout, é sinal de que ele
existe na estrutura da rede — e não é artefato do desenho.

## Como foi feito

O grafo é gerado uma vez com `igraph::sample_pa()` (modelo de ligação
preferencial, que produz redes com poucos nós muito conectados) e desenhado três
vezes com `ggraph`, mudando só o argumento `layout`, que aceita os nomes do
`igraph` diretamente como texto: `"fr"`, `"drl"` e `"randomly"`.

Os três painéis são combinados num único arquivo com `patchwork`.

Não há versão interativa: o conteúdo é a comparação lado a lado, que é estática por
natureza — um widget navegável mostraria um layout por vez e destruiria justamente
o efeito.

## Possíveis problemas pelo caminho

- **Problema**: rodar o script duas vezes produz desenhos diferentes. **Por quê**:
  layouts de força partem de posições aleatórias. **Solução**: fixar a semente antes
  de cada chamada, se a reprodutibilidade importar.

- **Problema**: `drl` falha ou devolve resultado estranho em redes muito pequenas.
  **Por quê**: foi projetado para redes grandes e precisa de massa crítica para se
  comportar bem. **Solução**: usar `fr` em redes pequenas.

- **Problema**: você "vê" comunidades que não existem. **Por quê**: algoritmos de
  força criam agrupamentos visuais mesmo em redes sem estrutura real de comunidade.
  **Solução**: confirmar com um algoritmo de detecção de comunidade antes de
  afirmar qualquer coisa — e é exatamente o que o painel aleatório ajuda a
  desconfiar.

- **Problema**: em redes grandes, todos os layouts viram um emaranhado. **Por quê**:
  densidade alta demais. **Solução**: filtrar arestas fracas, agregar nós, ou trocar
  por outra representação — uma matriz de adjacência ou um arc diagram.

## Variações possíveis

- Acrescentar layouts com significado externo (`layout = "circle"`, `"grid"`, ou
  coordenadas geográficas reais), em que a posição passa a ter interpretação.
- Colorir os nós por comunidade detectada e observar se os layouts concordam.
- Dimensionar os nós por grau, tornando os concentradores visíveis nos três painéis
  ao mesmo tempo.
- Repetir a comparação com uma rede que tenha comunidades reais e verificar quais
  algoritmos as revelam melhor.
