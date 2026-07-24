# Libraries
library(ggraph)
library(igraph)
library(tidyverse)
library(visNetwork)
library(htmlwidgets)

# Rede aleatoria densa (Erdos-Renyi) de proposito, pra ilustrar o "hairball"
# citado como erro comum na pagina original: muitos nos/conexoes sem padrao
# obvio deixam a figura poluida e dificil de ler -- seed propria
set.seed(555)
g <- sample_gnp(n = 70, p = 0.09, directed = FALSE)
V(g)$name <- as.character(seq_len(vcount(g)))
g <- delete_vertices(g, which(degree(g) == 0))
V(g)$grau <- degree(g)

# --- Versão estática (ggraph): sem labels (ilegíveis nessa densidade de
# propósito), tamanho/cor por grau só pra dar alguma leitura de hub ---
p <- ggraph(g, layout = "fr") +
  geom_edge_link(alpha = 0.12, colour = "#7f7f7f", width = 0.3) +
  geom_node_point(aes(size = grau, colour = grau)) +
  scale_colour_distiller(palette = "OrRd", direction = 1, guide = "none") +
  scale_size_continuous(range = c(1, 5), guide = "none") +
  theme_void() +
  theme(plot.margin = unit(c(0.3, 0.3, 0.3, 0.3), "cm"))

ggsave("output.png", plot = p, width = 8, height = 7, dpi = 150)

# --- Versão interativa (visNetwork): física ligada + nós arrastáveis, pra
# permitir "desemaranhar" um pouco a rede na mão ---
edges_df <- igraph::as_data_frame(g, what = "edges")
nodes_vis <- data.frame(
  id = V(g)$name, label = "", value = V(g)$grau,
  title = paste0("grau: ", V(g)$grau)
)
edges_vis <- data.frame(from = edges_df$from, to = edges_df$to)

wv <- visNetwork(nodes_vis, edges_vis, width = "100%", height = "650px") |>
  visNodes(color = list(background = "#e2725b", border = "#8c2f1b", highlight = "#f4a261"),
            scaling = list(min = 4, max = 18)) |>
  visEdges(color = list(color = "#b0b0b0", opacity = 0.35), smooth = FALSE) |>
  visPhysics(solver = "barnesHut", stabilization = list(iterations = 200)) |>
  visInteraction(navigationButtons = TRUE, dragNodes = TRUE, dragView = TRUE) |>
  visOptions(highlightNearest = list(enabled = TRUE, degree = 1, hover = TRUE))

saveWidget(wv, file = "widget.html", selfcontained = FALSE)
