---
title: "Densidade 2D (stat_density_2d)"
category: distribution
date: 2026-07-23
source: "https://www.data-to-viz.com/graph/density2d.html"
interactive: false
---

## Observações

- Página tinha 3 variações (scatterplot simples, densidade 2D estática, superfície 3D interativa) — usuário pediu pra fazer as duas últimas como gráficos separados. Este é a densidade 2D estática (a superfície 3D está em [graficos/distribution/superficie-3d-densidade](../superficie-3d-densidade)).
- Dados 100% fictícios: 4 clusters gaussianos (`rnorm`, `set.seed(2026)`) — o exemplo original usa 3 clusters com médias/desvios diferentes.
- Paleta trocada em relação ao original: `scale_fill_distiller(palette = "YlOrRd")` (o original usa `scale_fill_viridis()`).
- Adaptação de sintaxe: `aes(fill=after_stat(density))` em vez do `aes(fill = ..density..)` do exemplo (sintaxe antiga do ggplot2).
- Adicionado `theme_ipsum()` (do `hrbrthemes`, já estava entre as bibliotecas carregadas no exemplo original mas não era usado no tema) pra um visual mais limpo.
