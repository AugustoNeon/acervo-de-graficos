---
title: "Rede direcionada e ponderada (fluxo entre cidades)"
category: network
date: 2026-07-24
source: "https://www.data-to-viz.com/graph/network.html"
interactive: true
resumo: "Rede em que cada conexão tem sentido (setas) e intensidade (espessura da linha) ao mesmo tempo."
pacotes: ["ggraph", "igraph", "jsonlite", "d3"]
dados: "lista de conexões com origem, destino e peso"
nivel: intermediário
tags: ["interativo", "rede", "fluxo"]
---

## O que é

Uma rede que carrega duas informações além da simples existência da conexão:

- **Direção** — a relação tem sentido. A → B não é o mesmo que B → A. Representada
  por setas.
- **Peso** — a relação tem intensidade. Representada pela espessura (e opacidade)
  da linha.

**Para que serve**: representar fluxos reais — pessoas migrando entre cidades,
dinheiro circulando entre contas, tráfego entre servidores. Nesses casos "existe
relação" é uma descrição pobre demais: o que importa é quanto vai, e para que lado.

## Quando usar (e quando evitar)

**Use quando** o sentido mudar a interpretação. Migração, citações, transferências
e dependências são assimétricas por natureza, e ignorar a direção descarta metade
da informação.

**Evite quando** a relação for genuinamente mútua (amizade, coautoria, ocorrência
conjunta): setas nesse caso são ruído, e a rede não-direcionada comunica melhor.

**Cuidado com o acúmulo**: direção e peso ao mesmo tempo já são duas camadas. Somar
cor por categoria e tamanho por métrica costuma passar do ponto — a rede vira um
enigma. Se o fluxo tiver estágios bem definidos, um diagrama de Sankey representa
volume com muito mais precisão do que espessura de aresta.

## Que dados você precisa

- **Origem** e **destino** — e, aqui, a ordem das colunas importa: ela define o
  sentido da seta.
- **Peso** — coluna numérica com a intensidade de cada fluxo.

Vale prestar atenção em pares recíprocos: se existirem A → B e B → A, as duas
arestas precisam aparecer separadamente, cada uma com seu peso.

## Como ler o gráfico

- **Círculos**: os nós (aqui, cidades).
- **Setas**: o sentido do fluxo — da origem para o destino.
- **Espessura e opacidade da linha**: o volume daquele fluxo.
- **Posição**: resultado do layout, sem significado próprio.

Duas leituras interessantes: nós que **recebem** muitas setas grossas são destinos
concentradores; pares ligados por setas nos **dois sentidos** com espessuras muito
diferentes revelam desequilíbrio — muito indo, pouco voltando.

Na versão interativa, arraste os nós para desembaralhar cruzamentos e clique em um
deles para destacar seus vizinhos.

## Como foi feito

As duas versões partem do mesmo conjunto de arestas, gerado uma única vez no
script.

Na estática, o `ggraph` desenha as setas com o argumento `arrow` de
`geom_edge_fan()` — escolhido no lugar de `geom_edge_link()` porque, quando existem
duas arestas entre o mesmo par de nós (ida e volta), ele as separa em curvas
distintas em vez de sobrepô-las. O peso entra por `aes(edge_width = ..., edge_alpha = ...)`.

Na interativa, o `visNetwork` recebe `arrows = "to"` para o sentido e a coluna
`value` para a espessura — nele isso é nativo, sem necessidade de escala manual.

## Possíveis problemas pelo caminho

- **Problema**: as setas de ida e volta entre o mesmo par se sobrepõem e viram uma
  linha só. **Por quê**: arestas paralelas seguem o mesmo caminho reto. **Solução**:
  usar `geom_edge_fan()` (ou arestas curvas) para separá-las visualmente.

- **Problema**: as pontas das setas somem em redes densas. **Por quê**: ficam
  escondidas atrás dos círculos dos nós. **Solução**: reduzir o tamanho dos nós ou
  afastar a ponta com o argumento `end_cap`.

- **Problema**: na versão interativa todas as arestas têm a mesma transparência,
  enquanto na estática as mais fracas aparecem apagadas. **Por quê**: o peso pode
  ser codificado em duas pistas ao mesmo tempo (espessura *e* opacidade), mas o
  `visNetwork` só aceita **um** valor global de opacidade — não existe escala de
  opacidade por aresta como o `scale_edge_alpha()`. **Solução**: embutir a
  transparência na própria cor de cada aresta, passando `rgba(r,g,b,a)` na coluna
  `color.color` do `data.frame` de arestas, com o `a` calculado a partir do peso.

- **Problema**: uma aresta muito grossa domina o desenho. **Por quê**: valor extremo
  nos pesos. **Solução**: limitar o intervalo com `scale_edge_width(range = ...)` ou
  transformar os pesos antes do mapeamento.

- **Problema**: o sentido sai invertido. **Por quê**: as colunas de origem e destino
  foram trocadas — o grafo é construído assumindo que a primeira é a origem.
  **Solução**: conferir a ordem das colunas ao criar o grafo, e checar uma aresta
  conhecida no resultado.

## Variações possíveis

- Mapear o peso para a opacidade em vez da espessura, quando a rede for densa.
- Dimensionar cada nó pelo total que recebe, destacando os destinos principais.
- Colorir as arestas pelo nó de origem, facilitando seguir de onde parte cada fluxo.
- Se os fluxos tiverem estágios sequenciais, migrar para um
  [diagrama de Sankey](../../flow/sankey-networkd3-simplificado), que representa
  volume com muito mais fidelidade.
