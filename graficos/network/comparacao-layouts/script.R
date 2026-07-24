# Libraries
library(ggraph)
library(igraph)
library(tidyverse)
library(patchwork)

# Grafo de preferential attachment (Barabasi-Albert): estrutura com poucos
# "hubs" bem conectados, escolhida pra deixar visivel a diferenca entre os
# layouts (num grafo totalmente uniforme os 3 ficariam parecidos demais)
# -- seed e gerador diferentes do exemplo generico da pagina original
set.seed(2026)
g <- sample_pa(n = 30, power = 1.1, m = 2, directed = FALSE)
V(g)$grau <- degree(g)

plot_layout_grafo <- function(layout_nome, titulo) {
  ggraph(g, layout = layout_nome) +
    geom_edge_link(alpha = 0.35, colour = "#4a4e69", width = 0.5) +
    geom_node_point(aes(size = grau, colour = grau)) +
    scale_colour_distiller(palette = "BuPu", direction = 1) +
    scale_size_continuous(range = c(1.5, 6)) +
    ggtitle(titulo) +
    theme_void() +
    theme(
      legend.position = "none",
      plot.title = element_text(hjust = 0.5, size = 12, face = "bold"),
      plot.margin = unit(c(0.3, 0.3, 0.3, 0.3), "cm")
    )
}

# Tres algoritmos de layout do igraph, mesmo grafo, passados direto como
# string pro argumento `layout` do ggraph (fr = Fruchterman-Reingold)
p1 <- plot_layout_grafo("fr", "Fruchterman-Reingold")
p2 <- plot_layout_grafo("drl", "DrL")
p3 <- plot_layout_grafo("randomly", "Aleatório")

p <- (p1 | p2 | p3) +
  plot_annotation(
    title = "Mesmo grafo, três algoritmos de layout diferentes",
    theme = theme(plot.title = element_text(hjust = 0.5, size = 14))
  )

ggsave("output.png", plot = p, width = 12, height = 4.5, dpi = 150)
