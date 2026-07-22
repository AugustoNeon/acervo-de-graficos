---
title: "Streamgraph interativo com legenda/dropdown"
category: evolution
date: 2026-07-22
source: "https://r-graph-gallery.com/156-interactive-streamgraph-with-legend.html"
interactive: true
---

## Observações

- Dados 100% fictícios: 8 categorias ao longo de 25 anos (2000-2024), valores amostrados de uma `rgamma(shape=2, scale=15)` com `set.seed(2024)` — grupos, período, seed e distribuição diferentes do exemplo original (que usa 10 grupos, 1990-2016, `sample()` uniforme).
- Paleta trocada em relação ao original: `sg_fill_brewer("Set2")` — o exemplo do gallery não customiza paleta nenhuma (cores padrão do d3). Ver "Decisões fechadas" em [AGENTS.md](../../../AGENTS.md).
- Pacotes extras (fora do ambiente padrão): `streamgraph` (só no GitHub, `remotes::install_github("hrbrmstr/streamgraph")`, não está no CRAN), `webshot2` + `chromote` (para gerar o thumbnail estático a partir do widget). Ver [SETUP.md](../../../docs/SETUP.md).
- Esse gráfico não tem equivalente estático em `ggplot2` — é puramente um htmlwidget (d3.js). O `output.png` foi gerado tirando um screenshot do próprio `widget.html` via `webshot2::webshot()`, usando o Chrome já instalado na máquina (sem precisar de PhantomJS).
- `saveWidget(..., selfcontained = FALSE)`: o ambiente não tem `pandoc` instalado, e `selfcontained = TRUE` depende dele. Sem `pandoc`, o widget salva normalmente com `selfcontained = FALSE`, só gerando uma pasta `widget_files/` ao lado do HTML com as dependências (jquery, d3, etc.) — precisa manter essa pasta junto do `widget.html` pra ele funcionar.
- Dois warnings inofensivos no `Rscript` (`streamgraph_html returned an object of class 'list'...`, `bindFillRole() only works on htmltools::tag() objects...`): incompatibilidade de versão entre o pacote `streamgraph` (não é mantido há anos) e a versão atual do `htmltools` — não afeta o resultado final, o widget roda normal no navegador (dropdown testado, sem erros no console).
