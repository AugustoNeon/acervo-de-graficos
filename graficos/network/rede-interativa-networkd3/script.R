# Libraries
library(igraph)
library(networkD3)
library(htmlwidgets)
library(webshot2)

# Dados ficticios: rede aleatoria entre 12 nos, seed e estrutura diferentes
# do exemplo original do R Graph Gallery (que usa uma lista fixa de 13 pares
# entre letras A-K/M/Z) -- ver AGENTS.md "Decisoes fechadas"
set.seed(77)
nos <- LETTERS[1:12]
n_conexoes <- 18
data <- data.frame(
  from = sample(nos, n_conexoes, replace = TRUE),
  to   = sample(nos, n_conexoes, replace = TRUE)
)
# remove auto-conexoes (from == to), mesmo cuidado do grafico de hierarchical
# edge bundling -- ver AGENTS.md "Licoes aprendidas"
data <- data[data$from != data$to, ]

# Rede interativa com customizacoes (paleta trocada em relacao ao original:
# nodeColour/linkColour diferentes do teal/cinza do tutorial)
p <- simpleNetwork(data, height = "600px", width = "600px",
  Source = 1, Target = 2, linkDistance = 120, charge = -400,
  fontSize = 16, fontFamily = "sans-serif", linkColour = "#8d99ae",
  nodeColour = "#e07a5f", opacity = 0.95, zoom = TRUE)

# Salvar o widget interativo na propria pasta do grafico
# (selfcontained = FALSE porque pandoc nao esta instalado -- ver docs/SETUP.md)
saveWidget(p, file = "widget.html", selfcontained = FALSE)

# Gerar thumbnail estatico (output.png) tirando um screenshot do widget,
# ja que simpleNetwork nao tem equivalente estatico em ggplot2
webshot2::webshot("widget.html", file = "output.png", vwidth = 650, vheight = 650, delay = 1)
