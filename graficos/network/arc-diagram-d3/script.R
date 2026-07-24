# Libraries
library(tidyverse)
library(igraph)
library(ggraph)
library(jsonlite)

# Dados ficticios: 50 nos em 5 grupos (10 por grupo), ordenados por grupo
# (pra evitar o erro comum que o proprio tutorial original alerta -- ordem
# aleatoria deixa o arc diagram ilegivel). Reduzido de 6 grupos/12 por grupo
# pra 5 grupos/10 por grupo a pedido do usuario (72 nos tinha ficado grande
# demais/visualmente poluido) -- ver AGENTS.md "Decisoes fechadas"
set.seed(2027)
n_grupos <- 5
n_por_grupo <- 10
letras_grupo <- LETTERS[1:n_grupos]
labels_grupo <- paste("Grupo", 1:n_grupos)
names(labels_grupo) <- letras_grupo

nodes <- data.frame(
  name = unlist(lapply(letras_grupo, function(g) paste0(g, 1:n_por_grupo))),
  group = rep(labels_grupo, each = n_por_grupo),
  stringsAsFactors = FALSE
)

# Monta a lista de links evitando duplicatas e auto-conexoes (from == to)
# -- mesmo cuidado do grafico de hierarchical edge bundling, ver AGENTS.md
# "Licoes aprendidas"
edge_set <- character(0)
edges <- list()
add_edge <- function(a, b) {
  chave <- paste(sort(c(a, b)), collapse = "||")
  if (a != b && !(chave %in% edge_set)) {
    edge_set[[length(edge_set) + 1]] <<- chave
    edges[[length(edges) + 1]] <<- data.frame(source = a, target = b)
    TRUE
  } else {
    FALSE
  }
}

# anel dentro de cada grupo (garante grupo bem conectado) + algumas cordas extras
for (g in letras_grupo) {
  membros <- paste0(g, 1:n_por_grupo)
  for (i in seq_along(membros)) {
    add_edge(membros[i], membros[(i %% n_por_grupo) + 1])
  }
  extras <- 0
  tentativas <- 0
  while (extras < 3 && tentativas < 50) {
    tentativas <- tentativas + 1
    par <- sample(membros, 2)
    if (add_edge(par[1], par[2])) extras <- extras + 1
  }
}

# pontes entre grupos: 70% priorizando grupos vizinhos (arcos menores),
# 30% entre grupos quaisquer (alguns arcos bem longos, de propósito)
alvo_pontes <- 16
pontes <- 0
tentativas <- 0
while (pontes < alvo_pontes && tentativas < 1000) {
  tentativas <- tentativas + 1
  gi <- sample(seq_len(n_grupos), 1)
  if (runif(1) < 0.7) {
    vizinhos <- c(gi - 1, gi + 1)
    vizinhos <- vizinhos[vizinhos >= 1 & vizinhos <= n_grupos]
    if (length(vizinhos) == 0) next
    gj <- sample(vizinhos, 1)
  } else {
    gj <- sample(setdiff(seq_len(n_grupos), gi), 1)
  }
  a <- paste0(letras_grupo[gi], sample(1:n_por_grupo, 1))
  b <- paste0(letras_grupo[gj], sample(1:n_por_grupo, 1))
  if (add_edge(a, b)) pontes <- pontes + 1
}

links <- do.call(rbind, edges)

mygraph <- graph_from_data_frame(links, vertices = nodes)

# Paleta customizada por grupo (o exemplo original nao tem grupo nenhum, usa
# uma unica cor solida "#69b3a2" pra tudo)
cores_grupo <- c(
  "Grupo 1" = "#e07a5f", "Grupo 2" = "#3d5a80", "Grupo 3" = "#8dbf6d",
  "Grupo 4" = "#f2cc8f", "Grupo 5" = "#81b29a"
)

p <- ggraph(mygraph, layout = "linear") +
  geom_edge_arc(aes(colour = node1.group), alpha = 0.35, width = 0.5) +
  geom_node_point(aes(colour = group), size = 2.4) +
  geom_node_text(aes(label = name, colour = group), angle = 90, hjust = 1, size = 2.2, nudge_y = -0.08) +
  scale_edge_colour_manual(values = cores_grupo) +
  scale_colour_manual(values = cores_grupo) +
  theme_void() +
  theme(
    legend.position = "none",
    plot.margin = unit(c(2, 1, 3, 1), "cm")
  )

ggsave("output.png", plot = p, width = 16, height = 7, dpi = 150)

# Exporta os mesmos dados pro widget.html interativo (D3.js) consumir via
# widget_files/data.js -- fonte unica de verdade, sem duplicar dado a mao
# entre R e JS (ver README.md da pasta)
dir.create("widget_files", showWarnings = FALSE)
data_js <- paste0(
  "// Gerado automaticamente por script.R -- nao editar a mao.\n",
  "const nodes = ", jsonlite::toJSON(nodes, auto_unbox = TRUE), ";\n",
  "const links = ", jsonlite::toJSON(links[, c("source", "target")], auto_unbox = TRUE), ";\n",
  "const groupColor = ", jsonlite::toJSON(as.list(cores_grupo), auto_unbox = TRUE), ";\n"
)
writeLines(data_js, "widget_files/data.js")

cat(sprintf("Gerado: %d nos, %d links\n", nrow(nodes), nrow(links)))
