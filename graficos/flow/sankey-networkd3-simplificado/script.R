# Libraries
library(networkD3)
library(htmlwidgets)
library(webshot2)

# Dados ficticios: fluxo simplificado em 3 estagios (3 fontes -> 3 canais ->
# 2 resultados). O exemplo original do R Graph Gallery usa o dataset real
# "energy.json" (~68 nos/links, todos os fluxos de energia mundial), que fica
# poluido/dificil de ler num grafico pequeno -- aqui optamos por um dataset
# bem menor e ficticio, so pra manter o grafico limpo (ver AGENTS.md
# "Decisoes fechadas")
nodes <- data.frame(name = c(
  "Fonte A", "Fonte B", "Fonte C",
  "Canal X", "Canal Y", "Canal Z",
  "Resultado 1", "Resultado 2"
))

set.seed(99)
links <- data.frame(
  source = c(0, 0, 1, 1, 2, 2, 3, 3, 4, 5),
  target = c(3, 4, 3, 5, 4, 5, 6, 7, 6, 7),
  value  = sample(15:60, 10, replace = TRUE)
)

# Sankey com paleta customizada (hex fixos, em vez do schemeCategory20
# padrao do exemplo original) e fonte/espacamento levemente maiores, ja que
# o dataset e bem menor.
# Nota: d3.schemeSet2/schemeSet3 (colorbrewer) NAO existem no build de d3 v4
# que o networkD3 empacota (so tem schemeCategory10/20/20b/20c) -- usar um
# nome de scheme inexistente falha silenciosamente e o grafico cai pro
# preto/cinza padrao, sem erro visivel. Por isso usamos .range() com hex
# explicitos em vez de um nome de scheme, garantindo que funciona sempre.
cores <- c("#e07a5f", "#3d5a80", "#8d99ae", "#e9c46a", "#588157", "#bc6c25", "#6d597a", "#457b9d")
cores_js <- paste0("['", paste(cores, collapse = "','"), "']")
p <- sankeyNetwork(Links = links, Nodes = nodes, Source = "source",
  Target = "target", Value = "value", NodeID = "name",
  units = "unidades", fontSize = 13, nodeWidth = 25, nodePadding = 15,
  colourScale = JS(paste0("d3.scaleOrdinal().range(", cores_js, ");")))

# Salvar o widget interativo na propria pasta do grafico
# (selfcontained = FALSE porque pandoc nao esta instalado -- ver docs/SETUP.md)
saveWidget(p, file = "widget.html", selfcontained = FALSE)

# Gerar thumbnail estatico (output.png) tirando um screenshot do widget,
# ja que sankeyNetwork nao tem equivalente estatico em ggplot2
webshot2::webshot("widget.html", file = "output.png", vwidth = 700, vheight = 450, delay = 1)
