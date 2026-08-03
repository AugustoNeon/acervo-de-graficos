# Libraries
library(ggraph)
library(igraph)
library(tidyverse)
library(jsonlite)

# Fluxo direcionado e ponderado ficticio entre cidades brasileiras
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

# O layout `fr` e estocastico: calculado uma vez e reaproveitado pelas duas
# versoes, senao a interativa sairia com a rede em outro lugar (ver AGENTS.md).
set.seed(19)
lay <- create_layout(g, layout = "fr")

# --- Versão estática: setas indicam direção, espessura/opacidade da linha
# indicam o peso ---
p <- ggraph(lay) +
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

# --------------------------------------------------------------- data.json
# As escalas de largura e opacidade sao resolvidas AQUI e exportadas prontas.
# O ggplot tem sistema de escalas (`scale_edge_width`, `scale_edge_alpha`) e o
# D3 nao: reimplementar essas duas rampas do outro lado e a forma mais comum de
# as duas versoes divergirem sem ninguem perceber (ver AGENTS.md, 2026-07-29).
LARGURA <- c(0.3, 2.5) * 1.6   # em px de tela; o fator so compensa a unidade do ggplot
OPACIDADE <- c(0.35, 0.9)

largura_aresta <- scales::rescale(edges$peso, to = LARGURA)
opacidade_aresta <- scales::rescale(edges$peso, to = OPACIDADE)

# Mesma escala nos dois eixos, e o eixo menor centrado: normalizar x e y
# separadamente esticaria o layout ate preencher o quadro, mudando a forma da
# rede em relacao a esta imagem.
rx <- range(lay$x)
ry <- range(lay$y)
esc <- max(diff(rx), diff(ry))
px_ <- (lay$x - mean(rx)) / esc + 0.5
py_ <- (lay$y - mean(ry)) / esc + 0.5

viz <- list(
  meta = list(
    layouts = list("fr"),
    raio = c(9, 9),          # nó de tamanho fixo: aqui o peso está na aresta
    aresta = list(cor = "#3d5a80", opacidade = 0.6, largura = 1),
    dirigido = TRUE,
    nota = "A seta indica o sentido da rota; a espessura e a opacidade da linha indicam o volume. Passe o cursor num nó para isolar suas rotas; arraste para reorganizar."
  ),
  nos = lapply(seq_len(vcount(g)), function(i) {
    list(
      id = V(g)$name[i],
      cor = "#ee6c4d",
      t = 1,
      pos = list(fr = c(px_[i], py_[i])),
      rotulo = V(g)$name[i],
      titulo = paste0(
        V(g)$name[i], " · ",
        sum(edges$from == V(g)$name[i]), " rotas saindo, ",
        sum(edges$to == V(g)$name[i]), " chegando"
      )
    )
  }),
  arestas = lapply(seq_len(nrow(edges)), function(i) {
    list(
      de = edges$from[i],
      para = edges$to[i],
      largura = largura_aresta[i],
      opacidade = opacidade_aresta[i],
      titulo = paste0(edges$from[i], " → ", edges$to[i], ": ", edges$peso[i], " mil/ano")
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = 5)
