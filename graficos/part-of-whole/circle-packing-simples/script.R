# Libraries
library(packcircles)
library(ggplot2)

# Dados ficticios: downloads (em milhares) de jogos indie de um catalogo
# ficticio, no lugar dos rotulos genericos ("Group a", "Group b"...) do
# exemplo original -- ver AGENTS.md "Decisoes fechadas"
dados <- data.frame(
  jogo = c(
    "Eco do Vazio", "Pixel Reino", "Furia de Aco", "Sombra Lunar",
    "Ilha Perdida", "Ronda Noturna", "Raizes de Ferro", "Ceu de Vidro",
    "Ultimo Farol", "Trilha Selvagem", "Nevoeiro", "Rota das Estrelas",
    "Terra Partida", "Vento Solto", "Chama Fria", "Deriva",
    "Labirinto de Sal", "Asas de Cobre", "Mares Altas", "Sussurro",
    "Campo Cinza", "Orbita Baixa", "Poeira Dourada", "Fenda"
  ),
  downloads = c(
    210, 95, 340, 60, 155, 28, 410, 72, 190, 45, 130, 260,
    18, 88, 300, 52, 175, 110, 225, 35, 145, 380, 65, 22
  )
)

# Layout: cada circulo recebe area proporcional ao valor, sem sobrepor
packing <- circleProgressiveLayout(dados$downloads, sizetype = "area")
packing$radius <- 0.95 * packing$radius  # respiro entre bolhas vizinhas
dados <- cbind(dados, packing)
dat.gg <- circleLayoutVertices(packing, npoints = 50)

# Paleta trocada em relacao ao original (scale_fill_distiller "Spectral" em
# vez do scale_fill_viridis() padrao do tutorial)
p <- ggplot() +
  geom_polygon(data = dat.gg, aes(x, y, group = id, fill = id), colour = "black", alpha = 0.75) +
  scale_fill_distiller(palette = "Spectral") +
  geom_text(data = dados, aes(x, y, label = jogo, size = downloads), color = "black") +
  scale_size_continuous(range = c(1.9, 4)) +
  theme_void() +
  theme(legend.position = "none") +
  coord_equal()

ggsave("output.png", plot = p, width = 8, height = 8, dpi = 150)

# Versao interativa: mesmo layout, hover mostra o total de downloads
library(ggiraph)

dados$tooltip <- paste0(dados$jogo, "\n", dados$downloads, " mil downloads")

p_int <- ggplot() +
  geom_polygon_interactive(
    data = dat.gg,
    aes(x, y, group = id, fill = id, tooltip = dados$tooltip[id], data_id = id),
    colour = "black", alpha = 0.75
  ) +
  scale_fill_distiller(palette = "Spectral") +
  geom_text(data = dados, aes(x, y, label = jogo, size = downloads), color = "black") +
  scale_size_continuous(range = c(1.9, 4)) +
  theme_void() +
  theme(legend.position = "none", plot.margin = unit(c(0, 0, 0, 0), "cm")) +
  coord_equal()

widget <- girafe(
  ggobj = p_int, width_svg = 8, height_svg = 8,
  options = list(opts_hover(css = "stroke:#222;stroke-width:3px;"))
)

htmlwidgets::saveWidget(widget, file = "widget.html", selfcontained = FALSE)
