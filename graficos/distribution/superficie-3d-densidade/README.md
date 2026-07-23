---
title: "Superfície 3D de densidade (plotly + MASS::kde2d)"
category: distribution
date: 2026-07-23
source: "https://www.data-to-viz.com/graph/density2d.html"
interactive: true
---

## Observações

- Página tinha 3 variações (scatterplot simples, densidade 2D estática, superfície 3D interativa) — usuário pediu pra fazer as duas últimas como gráficos separados. Este é a superfície 3D (a versão estática 2D está em [graficos/distribution/densidade-2d-contorno](../densidade-2d-contorno), usando o mesmo dataset fictício pra ficarem comparáveis).
- Dados: mesmos 4 clusters gaussianos fictícios do gráfico de densidade 2D irmão (`set.seed(2026)`), estimados via `MASS::kde2d(n=50)`.
- Paleta trocada em relação ao original: `colorscale = "Earth"` no `add_surface()` (o exemplo original não define `colorscale`, usa o padrão do plotly).
- Widget interativo de verdade: dá pra girar/dar zoom na superfície 3D no navegador (testado, sem erros de console). `output.png` é só o thumbnail estático (ângulo de câmera padrão), gerado via `webshot2::webshot()` sobre o `widget.html`.
- Mesma situação de sempre: `saveWidget(..., selfcontained = FALSE)` porque `pandoc` não está instalado (gera a pasta `widget_files/` ao lado, precisa manter junto).
