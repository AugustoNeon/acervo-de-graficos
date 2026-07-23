# Libraries
library(tidyverse)
library(igraph)
library(ggraph)

# Dados ficticios: 14 nos em 3 grupos, ordenados por grupo (pra evitar o erro
# comum que o proprio tutorial original alerta -- ordem aleatoria deixa o
# arc diagram ilegivel). Edges majoritariamente dentro do grupo + algumas
# pontes entre grupos, escolhidas a mao em vez do exemplo original (5 links
# entre 6 nos, sem grupo/cor nenhuma) -- ver AGENTS.md "Decisoes fechadas"
nodes <- data.frame(
  name = c(paste0("A", 1:5), paste0("B", 1:5), paste0("C", 1:4)),
  group = rep(c("Grupo 1", "Grupo 2", "Grupo 3"), times = c(5, 5, 4))
)

links <- data.frame(
  source = c("A1","A2","A3","A4","A1", "B1","B2","B3","B4","B1", "C1","C2","C3", "A5","B5","A1","A3"),
  target = c("A2","A3","A4","A5","A5", "B2","B3","B4","B5","B3", "C2","C3","C4", "B1","C1","C4","B4")
)

mygraph <- graph_from_data_frame(links, vertices = nodes)

# Paleta customizada por grupo (o exemplo original nao tem grupo nenhum, usa
# uma unica cor solida "#69b3a2" pra tudo)
cores_grupo <- c("Grupo 1" = "#e07a5f", "Grupo 2" = "#3d5a80", "Grupo 3" = "#8dbf6d")

p <- ggraph(mygraph, layout = "linear") +
  geom_edge_arc(aes(colour = node1.group), alpha = 0.6, width = 0.9) +
  geom_node_point(aes(colour = group), size = 5) +
  geom_node_text(aes(label = name, colour = group), repel = FALSE, size = 4, nudge_y = -0.15) +
  scale_edge_colour_manual(values = cores_grupo) +
  scale_colour_manual(values = cores_grupo) +
  theme_void() +
  theme(
    legend.position = "none",
    plot.margin = unit(rep(2, 4), "cm")
  )

ggsave("output.png", plot = p, width = 10, height = 5, dpi = 150)
