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

# Proporcao 3:2 (em vez de quadrada) para o grafico caber na tela sem barra
# de rolagem -- coord_equal() garante que os circulos continuam redondos,
# so sobra mais respiro nas laterais em vez de esticar por cima/baixo
ggsave("output.png", plot = p, width = 9, height = 6, dpi = 150)

# ---------------------------------------------------------------------------
# Exporta os mesmos dados e a mesma geometria pra versao interativa (data.json),
# desenhada em D3 -- mesmo padrao usado no resto do acervo (ver AGENTS.md).
#
# A cor de cada bolha (fill = id, um gradiente continuo do scale_fill_distiller)
# nao tem formula fechada simples de reproduzir: em vez de recalcular a rampa
# na mao, lemos a cor que o proprio ggplot_build() resolveu pra cada grupo --
# garante paridade exata com o output.png por construcao, sem duplicar a regra
# de escala em duas linguagens.
# ---------------------------------------------------------------------------
poligonos <- ggplot_build(p)$data[[1]]
cor_por_id <- poligonos[!duplicated(poligonos$group), c("group", "fill")]
cor_por_id <- setNames(cor_por_id$fill, cor_por_id$group)

dados$id <- seq_len(nrow(dados))
dados$cor <- cor_por_id[as.character(dados$id)]

viz <- list(
  meta = list(
    downloadsMin = min(dados$downloads),
    downloadsMax = max(dados$downloads),
    nota = "Passe o cursor por uma bolha pra ver o total de downloads."
  ),
  circulos = dados[, c("id", "jogo", "downloads", "x", "y", "radius", "cor")]
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
