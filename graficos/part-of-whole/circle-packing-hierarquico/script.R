# Libraries
library(ggraph)
library(igraph)

# Dados ficticios: catalogo de streaming (midia > genero > titulo), horas
# assistidas/ouvidas num mes ficticio -- no lugar do dataset real "flare"
# (hierarquia de pacotes de software) do exemplo original
dados <- data.frame(
  midia = rep(c("Filmes", "Series", "Musica", "Podcasts"), each = 6),
  genero = c(
    rep(c("Acao", "Comedia", "Drama"), each = 2),
    rep(c("Ficcao Cientifica", "Documentario", "Sitcom"), each = 2),
    rep(c("Pop", "Rock", "MPB"), each = 2),
    rep(c("Noticias", "True Crime", "Educacao"), each = 2)
  ),
  titulo = c(
    "Trovao Final", "Ronda de Aco", "Risada Geral", "Zoeira Nacional", "Lagrimas de Vidro", "Segunda Chance",
    "Orbita Zero", "Simulacro", "Fundo do Mar", "Era Glacial", "Vizinhos Terriveis", "Escritorio Vazio",
    "Verao Sem Fim", "Luz de Neon", "Estrada de Ferro", "Ruido Branco", "Violao e Chuva", "Samba Novo",
    "Resumo do Dia", "Manchetes", "Caso Encerrado", "Arquivo Aberto", "Aprenda Rapido", "Ciencia Simples"
  ),
  horas = c(
    82, 54, 61, 39, 47, 33,
    95, 58, 42, 36, 70, 45,
    120, 88, 66, 40, 58, 44,
    30, 22, 77, 51, 35, 28
  )
)

# Monta a hierarquia como grafo (raiz -> midia -> genero -> titulo). Cada
# nome e unico globalmente (nenhum genero se repete entre midias), entao da
# pra usar os nomes direto como id dos vertices, sem precisar concatenar
# caminho -- ver AGENTS.md "Licoes aprendidas" se isso mudar no futuro
edges <- rbind(
  data.frame(from = "Catalogo", to = unique(dados$midia)),
  setNames(unique(dados[, c("midia", "genero")]), c("from", "to")),
  data.frame(from = dados$genero, to = dados$titulo)
)

# "horas" so existe nas folhas (titulos); nos internos ficam 0 e o layout
# circlepack soma os descendentes sozinho pra definir a area de cada anel
# (0, nao NA -- o layout_igraph_circlepack faz uma comparacao != 0 internamente)
vertices <- data.frame(
  name = c("Catalogo", unique(dados$midia), unique(dados$genero), dados$titulo),
  horas = c(
    0, rep(0, length(unique(dados$midia))), rep(0, length(unique(dados$genero))),
    dados$horas
  )
)

mygraph <- graph_from_data_frame(edges, vertices = vertices)

# Esconde o primeiro nivel (raiz vira branco, some no fundo branco) e colore
# os outros 3 por profundidade -- paleta trocada em relacao ao original
# (viridis) por tons teal/dourado/terracota
p <- ggraph(mygraph, layout = "circlepack", weight = horas) +
  geom_node_circle(aes(fill = as.factor(depth), color = as.factor(depth))) +
  scale_fill_manual(values = c("0" = "white", "1" = "#2a9d8f", "2" = "#e9c46a", "3" = "#e76f51")) +
  scale_color_manual(values = c("0" = "white", "1" = "black", "2" = "black", "3" = "black")) +
  theme_void() +
  theme(legend.position = "none")

ggsave("output.png", plot = p, width = 7, height = 7, dpi = 150)

# Versao interativa: circlepackeR permite clicar pra dar zoom num galho da
# hierarquia (o ggraph estatico so mostra tudo de uma vez, sem navegacao)
library(data.tree)
library(circlepackeR)

# pathString usa os nomes originais (curtos) -- o data.tree aceita nomes
# repetidos em galhos diferentes, entao aqui nem precisaria da unicidade
# global exigida pelo grafo acima; mantida mesmo assim por consistencia
dados$pathString <- paste("Catalogo", dados$midia, dados$genero, dados$titulo, sep = "/")
populacao <- as.Node(dados)

# width/height explicitos (em vez de deixar NULL) -- o widget calcula seu
# proprio diametro como o MENOR entre largura e altura do container
# (ver htmlwidgets/circlepackeR.js), entao uma altura fixa e razoavel evita
# depender do fallback de altura do iframe do site
widget <- circlepackeR(
  populacao,
  size = "horas",
  color_min = "hsl(175,45%,88%)",
  color_max = "hsl(14,65%,35%)",
  width = "100%",
  height = 480
)

htmlwidgets::saveWidget(widget, file = "widget.html", selfcontained = FALSE)
