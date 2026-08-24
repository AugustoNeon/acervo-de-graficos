# Libraries
library(ggraph)
library(igraph)
library(jsonlite)

# Dados ficticios: rede aleatoria entre 12 nos
set.seed(77)
nos <- LETTERS[1:12]
n_conexoes <- 18
data <- data.frame(
  from = sample(nos, n_conexoes, replace = TRUE),
  to   = sample(nos, n_conexoes, replace = TRUE)
)
# remove auto-conexoes (from == to) -- mesmo cuidado do hierarchical edge
# bundling, onde elas degeneram o calculo de spline (ver AGENTS.md)
data <- data[data$from != data$to, ]

# Garante que todo no apareca pelo menos uma vez. O no faltante e conectado ao
# no de maior grau (um "hub"), nao a um no periferico: ligar a outro pendente
# criaria uma cadeia que o layout de forcas empurra pra longe do resto do
# grafo, saindo do enquadramento.
nos_faltando <- setdiff(nos, base::union(data$from, data$to)) # base:: explicito -- igraph mascara union()
if (length(nos_faltando) > 0) {
  grau <- table(c(data$from, data$to))
  hubs <- names(sort(grau, decreasing = TRUE))[seq_along(nos_faltando)]
  data <- rbind(data, data.frame(from = nos_faltando, to = hubs))
}

g <- graph_from_data_frame(data, directed = FALSE, vertices = nos)
V(g)$grau <- degree(g)

# Layout calculado uma vez e reaproveitado pelas duas versoes: `fr` e
# estocastico, entao recalcular do outro lado daria outra rede (ver AGENTS.md).
set.seed(77)
lay <- create_layout(g, layout = "fr")

# Paleta propria (o exemplo original usa teal/cinza)
COR_NO <- "#e07a5f"
COR_ARESTA <- "#8d99ae"

p <- ggraph(lay) +
  geom_edge_link(colour = COR_ARESTA, width = 0.8, alpha = 0.75) +
  geom_node_point(size = 7, colour = COR_NO) +
  geom_node_text(aes(label = name), size = 4.2, fontface = "bold",
                 colour = "#2b2b2b", nudge_y = 0.28) +
  scale_x_continuous(expand = expansion(mult = 0.12)) +
  scale_y_continuous(expand = expansion(mult = 0.12)) +
  theme_void() +
  theme(plot.margin = unit(c(0.4, 0.4, 0.4, 0.4), "cm"))

ggsave("output.png", plot = p, width = 7, height = 6.5, dpi = 150)

# --------------------------------------------------------------- data.json
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
    raio = c(11, 11),   # no de tamanho fixo: este grafico nao codifica grau no tamanho
    aresta = list(cor = COR_ARESTA, opacidade = 0.75, largura = 1.3),
    dirigido = FALSE,
    nota = "Passe o cursor num nó para isolar suas conexões; arraste para reorganizar a rede."
  ),
  nos = lapply(seq_len(vcount(g)), function(i) {
    list(
      id = V(g)$name[i],
      cor = COR_NO,
      t = 1,
      pos = list(fr = c(px_[i], py_[i])),
      rotulo = V(g)$name[i],
      titulo = paste0("Nó ", V(g)$name[i], " · ", V(g)$grau[i], " conexões")
    )
  }),
  arestas = lapply(seq_len(nrow(data)), function(i) {
    list(de = data$from[i], para = data$to[i])
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = 5)
