# Libraries
library(ggraph)
library(igraph)
library(tidyverse)
library(RColorBrewer)
library(jsonlite)

# create a data frame giving the hierarchical structure of your individuals
# (valores customizados: seed, numero de grupos/subgrupos e paleta diferentes
# do exemplo original do R Graph Gallery -- ver AGENTS.md "Decisoes fechadas")
set.seed(42)
d1 <- data.frame(from="origin", to=paste("group", seq(1,8), sep=""))
d2 <- data.frame(from=rep(d1$to, each=12), to=paste("subgroup", seq(1,96), sep="_"))
edges <- rbind(d1, d2)

# create a dataframe with connection between leaves (individuals)
all_leaves <- paste("subgroup", seq(1,96), sep="_")
connect <- rbind(
  data.frame( from=sample(all_leaves, 90, replace=T) , to=sample(all_leaves, 90, replace=T)),
  data.frame( from=sample(head(all_leaves), 25, replace=T) , to=sample( tail(all_leaves), 25, replace=T)),
  data.frame( from=sample(all_leaves[20:25], 25, replace=T) , to=sample( all_leaves[50:55], 25, replace=T)),
  data.frame( from=sample(all_leaves[70:75], 25, replace=T) , to=sample( all_leaves[50:55], 25, replace=T)) )
# remove auto-conexoes (from == to): geram um path de spline degenerado
# (um unico ponto) em geom_conn_bundle, o que estoura a escala do grafico
# com coordenadas absurdas (ex: 1e+252) -- ver AGENTS.md "Licoes aprendidas"
connect <- connect[connect$from != connect$to, ]
connect$value <- runif(nrow(connect))

# create a vertices data.frame. One line per object of our hierarchy
vertices <- data.frame(
  name = unique(c(as.character(edges$from), as.character(edges$to))) ,
  value = runif(105)
)
# Let's add a column with the group of each name. It will be useful later to color points
vertices$group <- edges$from[ match( vertices$name, edges$to ) ]

# Let's add information concerning the label we are going to add: angle, horizontal adjustement and potential flip
# calculate the ANGLE of the labels
vertices$id <- NA
myleaves <- which(is.na( match(vertices$name, edges$from) ))
nleaves <- length(myleaves)
vertices$id[ myleaves ] <- seq(1:nleaves)
vertices$angle <- 90 - 360 * vertices$id / nleaves

# calculate the alignment of labels: right or left
# If I am on the left part of the plot, my labels have currently an angle < -90
vertices$hjust <- ifelse( vertices$angle < -90, 1, 0)

# flip angle BY to make them readable
vertices$angle <- ifelse(vertices$angle < -90, vertices$angle+180, vertices$angle)

# Create a graph object
mygraph <- igraph::graph_from_data_frame( edges, vertices=vertices )

# The connection object must refer to the ids of the leaves:
from <- match( connect$from, vertices$name)
to <- match( connect$to, vertices$name)

# Plot with labels, colors and sizes
p <- ggraph(mygraph, layout = 'dendrogram', circular = TRUE) +
  geom_conn_bundle(data = get_con(from = from, to = to), alpha=0.2, width=0.9, aes(colour=after_stat(index))) +
  scale_edge_colour_distiller(palette = "YlGnBu") +

  geom_node_text(aes(x = x*1.15, y=y*1.15, filter = leaf, label=name, angle = angle, hjust=hjust, colour=group), size=2, alpha=1) +

  geom_node_point(aes(filter = leaf, x = x*1.07, y=y*1.07, colour=group, size=value, alpha=0.2)) +
  scale_colour_manual(values= rep( brewer.pal(8,"Dark2") , 30)) +
  scale_size_continuous( range = c(0.1,10) ) +

  theme_void() +
  theme(
    legend.position="none",
    plot.margin=unit(c(0,0,0,0),"cm"),
  ) +
  expand_limits(x = c(-1.3, 1.3), y = c(-1.3, 1.3))

ggsave("output.png", plot = p, width = 8, height = 8, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3 (d3.hierarchy + d3.cluster, layout
# circular, bundling via curveBundle) -- mesma regra do resto do acervo pra
# grafico de hierarquia/rede: o layout NAO vem do R (o dendrograma do ggraph
# tambem depende de como o igraph ordena a arvore por baixo dos panos, entao
# nao ha posicao "oficial" pra herdar), o D3 recalcula a partir da mesma
# arvore + lista de conexoes. O que precisa vir do R e so a arvore, as
# conexoes e as paletas (grupo e gradiente), pra manter a MESMA cor dos dois
# lados.
# ---------------------------------------------------------------------------
grupos <- unique(d1$to) # "group1".."group8", na ordem de criacao
paleta_grupo <- setNames(brewer.pal(8, "Dark2"), grupos)

arvore <- list(
  nome = "origin",
  filhos = lapply(grupos, function(g) {
    subs <- d2$to[d2$from == g]
    list(
      nome = g,
      filhos = lapply(subs, function(s) {
        list(nome = s, valor = vertices$value[vertices$name == s])
      })
    )
  })
)

conexoes <- connect %>% transmute(from = as.character(from), to = as.character(to))

# As duas cores extremas da rampa YlGnBu usada no estatico
# (scale_edge_colour_distiller): o D3 nao recalcula a rampa continua, so
# aplica essas duas cores num gradiente por aresta (aproximacao pratica --
# ver AGENTS.md "Licoes aprendidas").
rampa_ylgnbu <- brewer.pal(9, "YlGnBu")

viz <- list(
  meta = list(
    paletaGrupo = as.list(paleta_grupo),
    gradiente = c(rampa_ylgnbu[2], rampa_ylgnbu[8]),
    nota = "Passe o cursor num item pra destacar só as conexões dele."
  ),
  arvore = arvore,
  conexoes = conexoes
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
