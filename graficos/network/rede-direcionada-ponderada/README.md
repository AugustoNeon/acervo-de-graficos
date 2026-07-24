---
title: "Rede direcionada e ponderada (fluxo entre cidades)"
category: network
date: 2026-07-24
source: "https://www.data-to-viz.com/graph/network.html"
interactive: true
---

## Observações

- Pacote extra usado (além dos já no ambiente): `visNetwork` (widget interativo).
- Direção representada por setas (`arrow=` no `geom_edge_fan` / `arrows="to"` no `visNetwork`), peso representado por espessura + opacidade da linha (`edge_width`/`edge_alpha` no ggraph, `value` no visNetwork) — os dois tipos de input "Directed" da página original (com e sem peso) combinados num único grafo direcionado e ponderado.
- Mesmos dados nas duas versões (`edges` gerado uma vez no `script.R`); `output.png` vem do `ggraph`, `widget.html` do `visNetwork` (nós arrastáveis, física ligada, destaque dos vizinhos ao clicar num nó).
