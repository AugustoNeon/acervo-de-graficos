---
title: "Tipos básicos de rede (não-ponderada vs ponderada)"
category: network
date: 2026-07-24
source: "https://www.data-to-viz.com/graph/network.html"
interactive: false
---

## Observações

- Pacote extra usado (além dos já no ambiente): `patchwork`, pra combinar os 2 painéis num único `output.png`.
- Mesmo grafo (mesmas 8 pessoas, mesma topologia de conexão) nos dois painéis — só a estética da conexão muda: painel A ignora o peso (todas as linhas com a mesma largura), painel B mapeia `peso` pra largura da linha. `set.seed(101)` repetido antes de cada chamada de `ggraph(..., layout = "fr")` garante que o layout (estocástico) caia nas mesmas posições nos dois painéis, pra comparação lado a lado ficar direta.
- Cobre as duas variações "Undirected" da página original (unweighted/weighted); as duas variações "Directed" ficaram no gráfico [rede-direcionada-ponderada](../rede-direcionada-ponderada).
- Sem versão interativa: o conteúdo é didático (conceito de peso), não precisa de exploração — mesmo raciocínio do gráfico [comparacao-layouts](../comparacao-layouts).
