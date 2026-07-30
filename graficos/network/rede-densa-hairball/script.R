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

# O visNetwork nao tem escala continua propria: cada no precisa da cor pronta
# em hex. Esta linha reproduz exatamente a rampa do grafico estatico acima --
# scale_colour_distiller(palette = "OrRd") e, por dentro, um gradiente sobre
# as 7 cores do brewer, entao os dois saem com a mesma cor por grau em vez de
# um laranja unico pra todos os nos
cor_do_no <- scales::gradient_n_pal(RColorBrewer::brewer.pal(7, "OrRd"))(
  scales::rescale(V(g)$grau)
)

nodes_vis <- data.frame(
  id = V(g)$name, label = "", value = V(g)$grau,
  title = paste0("grau: ", V(g)$grau),
  # borda igual ao fundo: no estatico geom_node_point() desenha ponto cheio,
  # sem contorno mais escuro em volta
  color.background = cor_do_no,
  color.border = cor_do_no,
  color.highlight = "#67000d"
)
edges_vis <- data.frame(from = edges_df$from, to = edges_df$to)

wv <- visNetwork(nodes_vis, edges_vis, width = "100%", height = "650px") |>
  visNodes(scaling = list(min = 4, max = 18)) |>
  # mesma cor/opacidade de aresta do estatico (#7f7f7f, alpha 0.12): a teia
  # fica de proposito quase invisivel, e o destaque no hover faz o trabalho
  visEdges(color = list(color = "#7f7f7f", opacity = 0.12), width = 0.5, smooth = FALSE) |>
  visPhysics(solver = "barnesHut", stabilization = list(iterations = 200)) |>
  visInteraction(navigationButtons = TRUE, dragNodes = TRUE, dragView = TRUE) |>
  visOptions(highlightNearest = list(enabled = TRUE, degree = 1, hover = TRUE))

saveWidget(wv, file = "widget.html", selfcontained = FALSE)
