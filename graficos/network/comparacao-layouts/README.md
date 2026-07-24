---
title: "Comparação de layouts de rede (Fruchterman-Reingold, DrL, Aleatório)"
category: network
date: 2026-07-24
source: "https://www.data-to-viz.com/graph/network.html"
interactive: false
---

## Observações

- Pacote extra usado (além dos já no ambiente): `patchwork`, pra combinar os 3 painéis num único `output.png`.
- Mesmo grafo (preferential attachment via `igraph::sample_pa()`) plotado três vezes com layouts diferentes — `fr`, `drl` e `randomly` do `igraph`, passados direto como string pro argumento `layout` do `ggraph`. Evidencia como o algoritmo de posicionamento muda completamente a leitura visual da mesma rede, mesmo estrutura e mesmos dados.
- Sem versão interativa: o conteúdo é a comparação lado a lado em si, estática por natureza — não faz sentido como widget único navegável.
