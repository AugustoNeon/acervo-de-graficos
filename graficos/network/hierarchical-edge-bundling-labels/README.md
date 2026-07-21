---
title: "Hierarchical Edge Bundling com labels, cores e tamanhos"
category: network
date: 2026-07-21
source: "https://r-graph-gallery.com/311-add-labels-to-hierarchical-edge-bundling.html"
interactive: false
---

## Observações

- Dados 100% fictícios: hierarquia gerada com `set.seed(42)` (8 grupos, 96 subgrupos/folhas) e conexões aleatórias entre folhas via `sample()` — estrutura e seed diferentes do exemplo original (que usa 10x10, seed 1234), pra não sair com os mesmos valores.
- Paleta trocada em relação ao original: bundle das conexões em `YlGnBu` (era `RdPu`), grupos em `Dark2` (era `Paired`) — ver "Decisões fechadas" em [AGENTS.md](../../../AGENTS.md).
- Pacotes: `ggraph`, `igraph`, `tidyverse`, `RColorBrewer` (todos já no ambiente padrão, ver [SETUP.md](../../../docs/SETUP.md)).
- **Bug corrigido**: a geração aleatória de conexões (`sample(..., replace=T)`) pode por acaso criar uma auto-conexão (`from == to`). Isso quebra o cálculo de spline do `geom_conn_bundle` (path degenerado de 1 ponto só), gerando coordenadas absurdas (ex: `1e+252`) que estouram a escala do gráfico inteiro e o deixam com aparência de linha reta esticada em vez de círculo. Corrigido filtrando `connect <- connect[connect$from != connect$to, ]` antes de montar os índices. Detalhe completo em [AGENTS.md](../../../AGENTS.md), seção "Lições aprendidas".
- Adaptação de sintaxe: trocado `aes(colour=..index..)` (sintaxe antiga do ggplot2) por `aes(colour=after_stat(index))`, compatível com o ggplot2 4.x instalado.
- Plot final atribuído a uma variável (`p <- ...`) antes do `ggsave()`, para não gerar `Rplots.pdf` residual.
