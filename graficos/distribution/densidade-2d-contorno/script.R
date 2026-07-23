# Libraries
library(tidyverse)
library(hrbrthemes)

# Dados ficticios: 4 clusters gaussianos (em vez dos 3 do exemplo original),
# medias/desvios e seed diferentes -- ver AGENTS.md "Decisoes fechadas"
set.seed(2026)
a <- data.frame(x = rnorm(8000, 5, 1.3),  y = rnorm(8000, 5, 1.3),  group = "A")
b <- data.frame(x = rnorm(8000, 12, 1.1), y = rnorm(8000, 12, 1.1), group = "B")
c <- data.frame(x = rnorm(8000, 6, 1.6),  y = rnorm(8000, 13, 1.6), group = "C")
d <- data.frame(x = rnorm(8000, 13, 1.4), y = rnorm(8000, 6, 1.4),  group = "D")
data <- do.call(rbind, list(a, b, c, d))

# Densidade 2D com paleta customizada (scale_fill_distiller "YlOrRd", em vez
# do scale_fill_viridis() padrao do exemplo original)
p <- ggplot(data, aes(x = x, y = y)) +
  stat_density_2d(aes(fill = after_stat(density)), geom = "raster", contour = FALSE) +
  scale_x_continuous(expand = c(0, 0)) +
  scale_y_continuous(expand = c(0, 0)) +
  scale_fill_distiller(palette = "YlOrRd", direction = 1) +
  theme_ipsum() +
  theme(legend.position = "none")

ggsave("output.png", plot = p, width = 8, height = 6, dpi = 150)
