---
title: "Heatmap com clustering hierárquico (heatmaply)"
category: correlation
date: 2026-07-22
source: "https://www.data-to-viz.com/graph/heatmap.html"
interactive: true
---

## Observações

- Versão usada: a com clustering/dendrograma (a página tinha duas variações — básica sem dendrograma e com clustering — e o usuário escolheu a com clustering).
- Dados 100% fictícios: matriz 12x6 (`Produto_01`...`Produto_12` × `Metrica_A`...`Metrica_F`), valores de `rnorm(mean=50, sd=15)` com `set.seed(2026)`. O exemplo original carrega um CSV real de indicadores socioeconômicos por país direto de uma URL externa (GitHub do autor) — aqui geramos a matriz do zero, sem depender de nenhum arquivo/URL externo.
- Paleta trocada em relação ao original: `viridis(256, option = "magma")` (o original não define `colors`, usa a paleta padrão do `heatmaply`).
- Pacotes extras (fora do ambiente padrão): `heatmaply`, `plotly`, `hrbrthemes` (todos CRAN). `heatmaply` traz consigo `dendextend`, `seriation`, `webshot` (antigo) como dependências.
- `dendrogram = "both"` explícito no nosso script (o bloco de clustering original deixava isso implícito/comentado, com `dendrogram = "row"` comentado no meio do código — deixamos explícito pra clareza).
- `library(d3heatmap)` do exemplo original foi omitida: é importada na página mas nunca usada de fato no código (a chamada real é `heatmaply()`), e o pacote nem está no CRAN — dependência morta, sem motivo pra instalar.
- Mesma situação dos outros widgets: `heatmaply()` já gera um htmlwidget (via `plotly`) diretamente, então `output.png` foi gerado com `webshot2::webshot()` sobre o `widget.html`, e `saveWidget(..., selfcontained = FALSE)` porque `pandoc` não está instalado (gera a pasta `widget_files/` ao lado).
