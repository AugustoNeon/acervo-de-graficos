---
title: "Rede interativa com networkD3 (simpleNetwork)"
category: network
date: 2026-07-22
source: "https://r-graph-gallery.com/network-interactive.html"
interactive: true
---

## Observações

- Versão usada: a customizada da página (a página tinha duas variações — básica e customizada — e o usuário escolheu a customizada).
- Dados 100% fictícios: rede aleatória entre 12 nós (`LETTERS[1:12]`), 18 conexões amostradas com `set.seed(77)` — estrutura e seed diferentes da lista fixa de 13 pares do exemplo original. Auto-conexões (`from == to`) removidas antes de plotar, mesmo cuidado do gráfico de hierarchical edge bundling (ver [AGENTS.md](../../../AGENTS.md) "Lições aprendidas").
- Paleta trocada em relação ao original: `nodeColour = "#e07a5f"` / `linkColour = "#8d99ae"` (era `"#69b3a2"` teal / `"#666"` cinza), `fontFamily = "sans-serif"` (era `"serif"`).
- `height`/`width` ajustados pra `"600px"` (o exemplo original usa `"100px"`, pequeno demais pra um thumbnail útil).
- Pacotes extras (fora do ambiente padrão): `networkD3` (CRAN), `webshot2` + `chromote` (já instalados no gráfico de streamgraph, reaproveitados aqui pra gerar o thumbnail estático a partir do widget). Ver [SETUP.md](../../../docs/SETUP.md).
- Mesma situação do streamgraph: `simpleNetwork()` não tem equivalente estático em `ggplot2` — é puro htmlwidget (D3.js). `output.png` gerado via `webshot2::webshot()` sobre o próprio `widget.html`, e `saveWidget(..., selfcontained = FALSE)` porque `pandoc` não está instalado (gera a pasta `widget_files/` ao lado, que precisa ser mantida junto).
