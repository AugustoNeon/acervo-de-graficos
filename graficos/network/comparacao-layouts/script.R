# Libraries
library(ggraph)
library(igraph)
library(tidyverse)
library(patchwork)
library(jsonlite)

# Grafo de preferential attachment (Barabasi-Albert): estrutura com poucos
# "hubs" bem conectados, escolhida pra deixar visivel a diferenca entre os
# layouts (num grafo totalmente uniforme os 3 ficariam parecidos demais)
set.seed(2026)
g <- sample_pa(n = 30, power = 1.1, m = 2, directed = FALSE)
V(g)$name <- as.character(seq_len(vcount(g)))
V(g)$grau <- degree(g)

LAYOUTS <- c(fr = "Fruchterman-Reingold", drl = "DrL", randomly = "Aleatório")

# Cada layout e calculado UMA vez e reaproveitado pela imagem e pelo data.json:
# `fr` e `drl` sao estocasticos, entao recalcular do outro lado daria outro
# desenho (ver AGENTS.md).
set.seed(2026)
layouts <- lapply(names(LAYOUTS), function(nome) create_layout(g, layout = nome))
names(layouts) <- names(LAYOUTS)

# Rampa sequencial da casa, mais saturada que a BuPu do brewer: num grafo de
# hubs a cor por grau e a leitura principal, entao ela precisa separar bem.
rampa <- colorRampPalette(c("#cfe3f5", "#5aa2d8", "#3f4fb0", "#2b1a6b"))(100)
cor_do_no <- rampa[round(scales::rescale(V(g)$grau, to = c(1, 100)))]

plot_layout_grafo <- function(lay, titulo) {
  ggraph(lay) +
    geom_edge_link(alpha = 0.35, colour = "#4a4e69", width = 0.5) +
    geom_node_point(aes(size = grau), colour = cor_do_no) +
    scale_size_continuous(range = c(1.5, 6), guide = "none") +
    ggtitle(titulo) +
    theme_void() +
    theme(
      plot.title = element_text(hjust = 0.5, size = 12, face = "bold"),
      plot.margin = unit(c(0.3, 0.3, 0.3, 0.3), "cm")
    )
}

paineis <- Map(plot_layout_grafo, layouts, LAYOUTS)

p <- (paineis[[1]] | paineis[[2]] | paineis[[3]]) +
  plot_annotation(
    title = "Mesmo grafo, três algoritmos de layout diferentes",
    theme = theme(plot.title = element_text(hjust = 0.5, size = 14))
  )

ggsave("output.png", plot = p, width = 12, height = 4.5, dpi = 150)

# --------------------------------------------------------------- data.json
# Mesma escala nos dois eixos e eixo menor centrado, por layout: normalizar x e
# y separadamente esticaria cada desenho ate preencher o quadro, o que apagaria
# justamente a diferenca de forma entre os algoritmos, que e o assunto do
# grafico.
normaliza <- function(lay) {
  rx <- range(lay$x); ry <- range(lay$y)
  esc <- max(diff(rx), diff(ry))
  list(x = (lay$x - mean(rx)) / esc + 0.5,
       y = (lay$y - mean(ry)) / esc + 0.5)
}
pos <- lapply(layouts, normaliza)

# ggplot mapeia `size` pra AREA, entao o raio cresce com a raiz do grau.
t_rel <- scales::rescale(sqrt(V(g)$grau))
arestas <- igraph::as_data_frame(g, what = "edges")

viz <- list(
  meta = list(
    raio = c(4, 15),
    aresta = list(cor = "#4a4e69", opacidade = 0.35, largura = 1),
    dirigido = FALSE,
    paineis = lapply(names(LAYOUTS), function(nome) {
      list(titulo = unname(LAYOUTS[[nome]]), layout = nome)
    }),
    nota = "O mesmo grafo desenhado por três algoritmos. Passe o cursor num nó para vê-lo destacado nos três painéis ao mesmo tempo — é assim que dá para acompanhar onde cada algoritmo o colocou."
  ),
  nos = lapply(seq_len(vcount(g)), function(i) {
    list(
      id = V(g)$name[i],
      cor = cor_do_no[i],
      t = t_rel[i],
      pos = setNames(
        lapply(names(LAYOUTS), function(nome) c(pos[[nome]]$x[i], pos[[nome]]$y[i])),
        names(LAYOUTS)
      ),
      titulo = paste0("Nó ", V(g)$name[i], " · grau ", V(g)$grau[i])
    )
  }),
  arestas = lapply(seq_len(nrow(arestas)), function(i) {
    list(de = as.character(arestas$from[i]), para = as.character(arestas$to[i]))
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = 5)
