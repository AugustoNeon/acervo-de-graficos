# Libraries
library(ggraph)
library(igraph)
library(tidyverse)
library(patchwork)

# Mesmo elenco de pessoas e mesma topologia de conexao nos dois paineis --
# so a presenca (painel A) vs a intensidade (painel B, largura de linha)
# da conexao muda. Nomes e estrutura proprios, diferentes do exemplo
# (Tom/Cherelle/Melanie) da pagina original
set.seed(8)
pessoas <- c("Ana", "Bruno", "Carla", "Diego", "Elisa", "Felipe", "Gabriela", "Hugo")
edges <- data.frame(
  from = c("Ana", "Ana", "Bruno", "Carla", "Diego", "Elisa", "Felipe", "Gabriela"),
  to   = c("Bruno", "Carla", "Carla", "Diego", "Elisa", "Felipe", "Gabriela", "Hugo"),
  peso = c(4, 1, 2, 5, 1, 3, 2, 1)
)
g <- graph_from_data_frame(edges, directed = FALSE, vertices = pessoas)

# set.seed repetido antes de cada ggraph(): garante que o layout "fr"
# (estocástico) caia nas mesmas posições nos dois painéis, pra comparação
# ficar direta (mesmo grafo `g`, só a estética da conexão muda)
set.seed(101)
p_a <- ggraph(g, layout = "fr") +
  geom_edge_link(colour = "#2a9d8f", width = 1.1, alpha = 0.85) +
  geom_node_point(size = 5, colour = "#264653") +
  geom_node_text(aes(label = name), repel = TRUE, size = 3.6, fontface = "bold", colour = "#264653") +
  scale_x_continuous(expand = expansion(mult = 0.22)) +
  scale_y_continuous(expand = expansion(mult = 0.22)) +
  ggtitle("Não-direcionada e não-ponderada") +
  theme_void() +
  theme(plot.title = element_text(hjust = 0.5, size = 12, face = "bold"))

set.seed(101)
p_b <- ggraph(g, layout = "fr") +
  geom_edge_link(aes(width = peso), colour = "#e76f51", alpha = 0.85) +
  scale_edge_width(range = c(0.5, 3.5), guide = "none") +
  geom_node_point(size = 5, colour = "#264653") +
  geom_node_text(aes(label = name), repel = TRUE, size = 3.6, fontface = "bold", colour = "#264653") +
  scale_x_continuous(expand = expansion(mult = 0.22)) +
  scale_y_continuous(expand = expansion(mult = 0.22)) +
  ggtitle("Não-direcionada e ponderada (largura = intensidade)") +
  theme_void() +
  theme(plot.title = element_text(hjust = 0.5, size = 12, face = "bold"))

p <- (p_a | p_b) +
  plot_annotation(
    title = "Dois tipos básicos de rede: presença vs intensidade da conexão",
    theme = theme(plot.title = element_text(hjust = 0.5, size = 14))
  )

ggsave("output.png", plot = p, width = 10, height = 5, dpi = 150)
