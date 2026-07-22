---
title: "Sankey diagram simplificado (networkD3)"
category: flow
date: 2026-07-22
source: "https://r-graph-gallery.com/323-sankey-diagram-with-the-networkd3-library.html"
interactive: true
---

## Observações

- **Pedido explícito do usuário**: o exemplo original usa o dataset real `energy.json` (~68 nós/links, todos os fluxos de energia mundial), que fica poluído/difícil de ler. Substituído por um fluxo fictício bem menor: 3 estágios (`Fonte A/B/C` → `Canal X/Y/Z` → `Resultado 1/2`), 8 nós e 10 links no total, `set.seed(99)`.
- Paleta trocada em relação ao original (`d3.schemeCategory20`): paleta hex customizada via `.range([...])`. **Cuidado detectado**: `d3.schemeSet2`/`schemeSet3` (colorbrewer) não existem no build de d3 v4 que o `networkD3` empacota (só tem `schemeCategory10/20/20b/20c`) — usar um nome de scheme inexistente falha *silenciosamente* (sem erro no console) e o gráfico cai pro preto/cinza padrão. Corrigido usando `.range()` com hex explícitos em vez de um nome de scheme.
- **Detalhe do binding JS do `sankeyNetwork` (`sankeyNetwork.js`, função `color_node`/`color_link`)**: a cor de cada nó/link vem de `color(d.group.replace(/ .*/, ""))` — ou seja, o `colourScale` recebe só a primeira palavra do nome do nó (tudo depois do primeiro espaço é descartado). Como os nomes aqui são `"Fonte A"`, `"Fonte B"`, `"Fonte C"` etc., os 3 nós de cada estágio caem no mesmo grupo (`"Fonte"`, `"Canal"`, `"Resultado"`) e ganham a mesma cor — resultado: 3 cores (uma por estágio) em vez de 8 cores individuais. Isso não foi corrigido de propósito: o visual por-estágio ficou mais limpo e legível do que 8 tons individuais, o que já atendia ao pedido de "menos informação/mais limpo". Pra colorir cada nó individualmente, bastaria usar nomes sem espaço (ex: `"FonteA"`).
- Pacotes: `networkD3`, `webshot2` + `chromote` (já usados nos gráficos anteriores). Mesma situação de sempre: `sankeyNetwork()` não tem equivalente estático em `ggplot2`, `output.png` gerado via `webshot2::webshot()` sobre o `widget.html`, `saveWidget(..., selfcontained = FALSE)` porque `pandoc` não está instalado (gera a pasta `widget_files/` ao lado).
