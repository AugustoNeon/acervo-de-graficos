# Libraries
library(ggraph)
library(igraph)
library(tidyverse)
library(jsonlite)

# Rede aleatoria densa (Erdos-Renyi) de proposito, pra ilustrar o "hairball":
# muitos nos/conexoes sem padrao obvio deixam a figura poluida e dificil de ler
set.seed(555)
g <- sample_gnp(n = 70, p = 0.09, directed = FALSE)
V(g)$name <- as.character(seq_len(vcount(g)))
g <- delete_vertices(g, which(degree(g) == 0))
V(g)$grau <- degree(g)

# ---------------------------------------------------------------------------
# O layout e calculado UMA vez e reaproveitado.
#
# `fr` (Fruchterman-Reingold) e estocastico: chamar ggraph(g, layout = "fr")
# duas vezes da dois desenhos diferentes. Como a versao interativa precisa ser
# a mesma figura desta imagem, o layout nasce aqui e vai tanto pro ggraph
# quanto pro data.json. Se a versao interativa rodasse a propria simulacao de
# forcas, a rede sairia diferente a cada carga da pagina.
# ---------------------------------------------------------------------------
set.seed(555)
lay <- create_layout(g, layout = "fr")

# Rampa sequencial da casa: do ambar claro ao carmim, mais saturada que a OrRd
# do brewer. Num hairball a cor por grau e a unica leitura que sobra, entao ela
# precisa separar bem os hubs do resto.
rampa <- colorRampPalette(c("#ffd79a", "#f5913c", "#e0472f", "#9c1750"))(100)
cor_do_no <- rampa[round(scales::rescale(V(g)$grau, to = c(1, 100)))]

RAIO <- c(3, 13)

p <- ggraph(lay) +
  geom_edge_link(alpha = 0.12, colour = "#7f7f7f", width = 0.3) +
  geom_node_point(aes(size = grau), colour = cor_do_no) +
  scale_size_continuous(range = c(1, 5), guide = "none") +
  theme_void() +
  theme(plot.margin = unit(c(0.3, 0.3, 0.3, 0.3), "cm"))

ggsave("output.png", plot = p, width = 8, height = 7, dpi = 150)

# --------------------------------------------------------------- data.json
# Posicoes normalizadas em [0,1]. Os dois eixos usam o MESMO divisor (a maior
# das duas amplitudes), e nao cada um a sua: normalizar x e y separadamente
# esticaria o layout ate preencher o quadro, mudando a forma da rede em relacao
# a esta imagem. O eixo menor fica centrado, com folga dos dois lados.
rx <- range(lay$x)
ry <- range(lay$y)
esc <- max(diff(rx), diff(ry))
px <- (lay$x - mean(rx)) / esc + 0.5
py <- (lay$y - mean(ry)) / esc + 0.5

# ggplot mapeia `size` pra AREA, entao o raio cresce com a raiz do grau. O
# mesmo aqui, pra bolha ficar do mesmo tamanho relativo nas duas versoes.
t_rel <- scales::rescale(sqrt(V(g)$grau))

arestas <- igraph::as_data_frame(g, what = "edges")

viz <- list(
  meta = list(
    layouts = list("fr"),
    raio = RAIO,
    aresta = list(cor = "#7f7f7f", opacidade = 0.12, largura = 0.6),
    dirigido = FALSE,
    nota = "Cor e tamanho indicam o grau do nó — quantas conexões ele tem. Passe o cursor para isolar a vizinhança; arraste para desembaraçar um trecho."
  ),
  nos = lapply(seq_len(vcount(g)), function(i) {
    list(
      id = V(g)$name[i],
      cor = cor_do_no[i],
      t = t_rel[i],
      pos = list(fr = c(px[i], py[i])),
      titulo = paste0("Nó ", V(g)$name[i], " · grau ", V(g)$grau[i])
    )
  }),
  arestas = lapply(seq_len(nrow(arestas)), function(i) {
    list(de = as.character(arestas$from[i]), para = as.character(arestas$to[i]))
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = 5)
