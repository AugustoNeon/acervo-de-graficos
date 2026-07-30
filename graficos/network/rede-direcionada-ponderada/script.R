# Libraries
library(ggraph)
library(igraph)
library(tidyverse)
library(visNetwork)
library(htmlwidgets)

# Fluxo direcionado e ponderado ficticio entre cidades brasileiras (dado
# inspirado no exemplo de migracao entre paises da pagina original, mas com
# cidades/pesos proprios) -- seed e estrutura diferentes do generico da
# pagina original
set.seed(19)
cidades <- c("Recife", "Salvador", "Belém", "Manaus", "Curitiba", "Porto Alegre", "Goiânia", "Fortaleza")
n_rotas <- 14
edges <- data.frame(
  from = sample(cidades, n_rotas, replace = TRUE),
  to   = sample(cidades, n_rotas, replace = TRUE)
)
# remove auto-conexoes e rotas duplicadas
edges <- edges[edges$from != edges$to, ]
edges <- distinct(edges, from, to, .keep_all = TRUE)
edges$peso <- sample(5:120, nrow(edges), replace = TRUE)

g <- graph_from_data_frame(edges, directed = TRUE)

# --- Versão estática (ggraph): setas indicam direção, espessura/opacidade
# da linha indica o peso ---
p <- ggraph(g, layout = "fr") +
  geom_edge_fan(
    aes(edge_width = peso, edge_alpha = peso),
    arrow = arrow(length = unit(2.5, "mm"), type = "closed"),
    end_cap = circle(4, "mm"),
    colour = "#3d5a80"
  ) +
  scale_edge_width(range = c(0.3, 2.5), guide = "none") +
  scale_edge_alpha(range = c(0.35, 0.9), guide = "none") +
  geom_node_point(size = 6, colour = "#ee6c4d") +
  geom_node_text(aes(label = name), repel = TRUE, size = 4, fontface = "bold") +
  theme_void() +
  theme(plot.margin = unit(c(0.5, 0.5, 0.5, 0.5), "cm"))

ggsave("output.png", plot = p, width = 8, height = 6.5, dpi = 150)

# --- Versão interativa (visNetwork): mesmos dados, setas nativas + arrastar
# nós + espessura de linha por peso (`value`) ---
nodes_vis <- data.frame(
  id = V(g)$name, label = V(g)$name,
  font.size = 20, font.color = "#1a1a1a"
)

# No estatico o peso aparece em DUAS pistas: espessura e opacidade da linha
# (scale_edge_alpha(range = c(0.35, 0.9))). O visNetwork nao tem escala de
# opacidade por aresta, so um valor global -- entao a opacidade entra embutida
# na propria cor de cada aresta, em rgba(), pra rota fraca ficar apagada e
# rota forte ficar cheia igual ao grafico estatico
alpha_aresta <- scales::rescale(edges$peso, to = c(0.35, 0.9))

edges_vis <- data.frame(
  from = edges$from, to = edges$to, value = edges$peso,
  title = paste0(edges$peso, " pessoas/ano"), arrows = "to",
  color.color = sprintf("rgba(61,90,128,%.2f)", alpha_aresta),  # #3d5a80
  color.highlight = "#c1440e"
)

wv <- visNetwork(nodes_vis, edges_vis, width = "100%", height = "600px") |>
  visEdges(smooth = TRUE, scaling = list(min = 1, max = 8)) |>
  # borda igual ao fundo: no estatico geom_node_point() nao desenha contorno
  visNodes(size = 12, color = list(background = "#ee6c4d", border = "#ee6c4d",
                                    highlight = "#f4a261")) |>
  visOptions(highlightNearest = TRUE) |>
  visPhysics(solver = "forceAtlas2Based", stabilization = TRUE) |>
  visInteraction(navigationButtons = TRUE, dragNodes = TRUE)

saveWidget(wv, file = "widget.html", selfcontained = FALSE)
