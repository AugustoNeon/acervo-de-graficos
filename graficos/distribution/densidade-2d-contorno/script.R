# Libraries
library(ggplot2)
library(jsonlite)

# Dados ficticios: 4 clusters gaussianos (em vez dos 3 do exemplo original),
# medias/desvios e seed diferentes -- ver AGENTS.md "Decisoes fechadas"
set.seed(2026)
n <- 2500
a <- data.frame(x = rnorm(n, 5, 1.3), y = rnorm(n, 5, 1.3))
b <- data.frame(x = rnorm(n, 12, 1.1), y = rnorm(n, 12, 1.1))
c <- data.frame(x = rnorm(n, 6, 1.6), y = rnorm(n, 13, 1.6))
d <- data.frame(x = rnorm(n, 13, 1.4), y = rnorm(n, 6, 1.4))
dados <- do.call(rbind, list(a, b, c, d))

paleta <- "YlOrRd"
niveis_padrao <- 9

# Estatico: bandas de contorno preenchidas (geom="polygon", contour=TRUE) em vez
# do raster suave da versao anterior -- o titulo do grafico promete "linhas de
# contorno", e um raster continuo nao mostra nenhuma. As bandas tambem casam
# com a tecnica da versao interativa: as duas desenham niveis de igual
# densidade, so que cada uma calcula os seus (ver "Como foi feito" no README).
p <- ggplot(dados, aes(x = x, y = y)) +
  stat_density_2d(aes(fill = after_stat(level)), geom = "polygon", contour = TRUE, bins = niveis_padrao) +
  scale_x_continuous(expand = expansion(mult = 0.02)) +
  scale_y_continuous(expand = expansion(mult = 0.02)) +
  scale_fill_distiller(palette = paleta, direction = 1) +
  labs(x = "x", y = "y") +
  theme_minimal(base_size = 13) +
  theme(legend.position = "none", panel.grid = element_blank())

ggsave("output.png", plot = p, width = 8, height = 6, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3, no proprio runtime do site. Em vez de
# exportar a geometria das bandas calculada no R (poligonos com furos, dificil
# de serializar de forma generica), o D3 recalcula suas proprias bandas com
# d3.contourDensity() a partir dos MESMOS pontos brutos -- mesma logica ja
# usada em layouts recalculados do zero (circle packing, dendrograma): a
# paridade visual vem da mesma paleta e da mesma familia de tecnica, nao de
# reimportar geometria exata calculada por outro algoritmo de KDE.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    paleta = paleta,
    niveisInicial = niveis_padrao,
    niveisMax = 16,
    nota = "Passe o cursor pra ler o nível de densidade; o controle deslizante muda o número de níveis."
  ),
  pontos = list(x = round(dados$x, 2), y = round(dados$y, 2))
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
