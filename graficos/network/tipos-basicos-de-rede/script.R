# Libraries
library(ggraph)
library(igraph)
library(tidyverse)
library(patchwork)
library(jsonlite)

# Mesmo elenco de pessoas e mesma topologia nos dois paineis -- so a presenca
# (painel A) vs a intensidade (painel B, largura de linha) da conexao muda.
set.seed(8)
pessoas <- c("Ana", "Bruno", "Carla", "Diego", "Elisa", "Felipe", "Gabriela", "Hugo")
edges <- data.frame(
  from = c("Ana", "Ana", "Bruno", "Carla", "Diego", "Elisa", "Felipe", "Gabriela"),
  to   = c("Bruno", "Carla", "Carla", "Diego", "Elisa", "Felipe", "Gabriela", "Hugo"),
  peso = c(4, 1, 2, 5, 1, 3, 2, 1)
)
g <- graph_from_data_frame(edges, directed = FALSE, vertices = pessoas)

COR_A <- "#2a9d8f"   # presenca da conexao
COR_B <- "#e76f51"   # intensidade da conexao
COR_NO <- "#264653"
LARGURA_B <- c(0.5, 3.5)

# UM layout para os dois paineis: a comparacao so funciona se cada pessoa
# estiver no mesmo lugar nos dois lados. `fr` e estocastico, entao ele e
# calculado uma vez aqui e reaproveitado pelos dois ggraph e pelo data.json.
set.seed(101)
lay <- create_layout(g, layout = "fr")

painel <- function(camada_aresta, titulo) {
  ggraph(lay) +
    camada_aresta +
    geom_node_point(size = 5, colour = COR_NO) +
    geom_node_text(aes(label = name), repel = TRUE, size = 3.6,
                   fontface = "bold", colour = COR_NO) +
    scale_x_continuous(expand = expansion(mult = 0.22)) +
    scale_y_continuous(expand = expansion(mult = 0.22)) +
    ggtitle(titulo) +
    theme_void() +
    theme(plot.title = element_text(hjust = 0.5, size = 12, face = "bold"))
}

p_a <- painel(
  geom_edge_link(colour = COR_A, width = 1.1, alpha = 0.85),
  "Não-direcionada e não-ponderada"
)

p_b <- painel(
  list(
    geom_edge_link(aes(width = peso), colour = COR_B, alpha = 0.85),
    scale_edge_width(range = LARGURA_B, guide = "none")
  ),
  "Não-direcionada e ponderada (largura = intensidade)"
)

p <- (p_a | p_b) +
  plot_annotation(
    title = "Dois tipos básicos de rede: presença vs intensidade da conexão",
    theme = theme(plot.title = element_text(hjust = 0.5, size = 14))
  )

ggsave("output.png", plot = p, width = 10, height = 5, dpi = 150)

# --------------------------------------------------------------- data.json
# A escala de largura do painel B e resolvida aqui e exportada pronta: o ggplot
# tem `scale_edge_width` e o D3 nao, e reimplementar a rampa do outro lado e a
# forma mais comum de as duas versoes divergirem (ver AGENTS.md).
largura_b <- scales::rescale(edges$peso, to = LARGURA_B * 1.6)

# Mesma escala nos dois eixos, eixo menor centrado.
rx <- range(lay$x); ry <- range(lay$y)
esc <- max(diff(rx), diff(ry))
px_ <- (lay$x - mean(rx)) / esc + 0.5
py_ <- (lay$y - mean(ry)) / esc + 0.5

viz <- list(
  meta = list(
    raio = c(10, 10),
    aresta = list(cor = COR_A, opacidade = 0.85, largura = 1.8),
    dirigido = FALSE,
    paineis = list(
      # O painel A ignora o peso de proposito: a ausencia dessa pista e
      # justamente o que ele demonstra.
      list(titulo = "Não-direcionada e não-ponderada", layout = "fr",
           aresta = list(cor = COR_A), ignorarPesoDaAresta = TRUE),
      list(titulo = "Ponderada (largura = intensidade)", layout = "fr",
           aresta = list(cor = COR_B))
    ),
    nota = "Os dois painéis são o mesmo grafo, com as pessoas nas mesmas posições — só a codificação da conexão muda. Passe o cursor numa pessoa para destacá-la nos dois lados ao mesmo tempo."
  ),
  nos = lapply(seq_len(vcount(g)), function(i) {
    list(
      id = V(g)$name[i],
      cor = COR_NO,
      t = 1,
      pos = list(fr = c(px_[i], py_[i])),
      rotulo = V(g)$name[i],
      titulo = paste0(V(g)$name[i], " · ", degree(g)[i], " conexões")
    )
  }),
  arestas = lapply(seq_len(nrow(edges)), function(i) {
    list(
      de = edges$from[i],
      para = edges$to[i],
      largura = largura_b[i],
      titulo = paste0(edges$from[i], " – ", edges$to[i], ": intensidade ", edges$peso[i])
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = 5)
