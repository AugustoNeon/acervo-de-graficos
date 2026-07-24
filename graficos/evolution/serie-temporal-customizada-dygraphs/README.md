---
title: "Série temporal interativa customizada (dygraphs)"
category: evolution
date: 2026-07-24
source: "https://r-graph-gallery.com/318-custom-dygraphs-time-series-example.html"
interactive: true
---

## Observações

- Pacotes extras usados (além dos já no ambiente): `dygraphs` (novo), `xts` (já vinha como dependência transitiva), `webshot2` (reaproveitado dos gráficos anteriores).
- Dados 100% fictícios: downloads diários de um app fictício ao longo de 300 dias (`set.seed(1907)`), com tendência de crescimento + sazonalidade semanal (picos no fim de semana) + ruído — no lugar do CSV real de contagem de bicicletas (~300 linhas, hospedado no GitHub do gallery) do exemplo original.
- Paleta trocada: linha/preenchimento verde-azulado `#2a9d8f` no lugar do dourado `#D8AE5A` do original. `rollPeriod` inicial ajustado para 3 dias (era 1).
- `dygraphs` não tem equivalente estático em `ggplot2` — é puro htmlwidget (dygraphs.js). `output.png` gerado via `webshot2::webshot()` sobre o próprio `widget.html`, mesmo padrão já usado nos gráficos de rede/streamgraph. `saveWidget(..., selfcontained = FALSE)` porque `pandoc` não está instalado (gera a pasta `widget_files/` ao lado, mantida junto).
- Mantidas as customizações funcionais do exemplo original: seletor de intervalo (`dyRangeSelector`), crosshair vertical, destaque de série no hover e controle de média móvel (roller).
