---
title: "Bubble map interativo do Brasil (leaflet)"
category: map
date: 2026-07-27
source: "https://r-graph-gallery.com/19-map-leafletr.html"
interactive: true
---

## Observações

- Primeiro gráfico da categoria `map`. Pacote extra instalado: `leaflet` (CRAN) — trouxe `sf`/`terra`/`s2`/`raster` etc. como dependências transitivas. Ver [SETUP.md](../../../docs/SETUP.md).
- Dados 100% fictícios: vendas mensais fictícias (R$ mil) em 20 capitais/grandes cidades brasileiras, no lugar do dataset embutido `quakes` (terremotos perto de Fiji) do exemplo original — coordenadas das cidades são reais, os valores de venda são gerados com `set.seed(2026)`.
- Mapa recentralizado no Brasil (`setView(lng=-51.93, lat=-14.24, zoom=4)`, era Fiji `lat=-27, lng=170`). Basemap de satélite (`Esri.WorldImagery`) igual ao original — versão anterior tinha trocado para um tile claro (`CartoDB.Positron`), mas o usuário preferiu manter o visual de satélite do exemplo original.
- Paleta trocada para `OrRd` (era `YlOrBr`) — mantida na mesma família "quente" (laranja/vermelho) do original pra ficar parecida em sensação visual, sem copiar a paleta idêntica (ver "Decisões fechadas" em [AGENTS.md](../../../AGENTS.md)); tamanho e cor da bolha continuam representando a mesma métrica (`colorBin` + `addCircleMarkers`), igual ao original.
- `output.png` gerado via `webshot2::webshot()` sobre o `widget.html`, já que `leaflet` não tem equivalente estático em `ggplot2` — mesmo padrão dos outros gráficos puramente htmlwidget do projeto. `saveWidget(..., selfcontained = FALSE)` porque `pandoc` não está instalado (gera a pasta `widget_files/` ao lado, mantida junto).
