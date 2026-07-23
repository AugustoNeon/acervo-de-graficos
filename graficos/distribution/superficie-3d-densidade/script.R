# Libraries
library(plotly)
library(MASS)
library(htmlwidgets)
library(webshot2)

# Mesmos dados ficticios do grafico de densidade 2D (4 clusters gaussianos,
# set.seed(2026)) -- ver graficos/distribution/densidade-2d-contorno/script.R
set.seed(2026)
a <- data.frame(x = rnorm(8000, 5, 1.3),  y = rnorm(8000, 5, 1.3),  group = "A")
b <- data.frame(x = rnorm(8000, 12, 1.1), y = rnorm(8000, 12, 1.1), group = "B")
c <- data.frame(x = rnorm(8000, 6, 1.6),  y = rnorm(8000, 13, 1.6), group = "C")
d <- data.frame(x = rnorm(8000, 13, 1.4), y = rnorm(8000, 6, 1.4),  group = "D")
data <- do.call(rbind, list(a, b, c, d))

# Estimativa de densidade kernel 2D
kd <- MASS::kde2d(data$x, data$y, n = 50)

# Superficie 3D interativa com paleta customizada ("Earth", em vez do
# colorscale padrao do plotly no exemplo original)
p <- plot_ly(x = kd$x, y = kd$y, z = kd$z) %>%
  add_surface(colorscale = "Earth") %>%
  layout(
    scene = list(
      xaxis = list(title = "x"),
      yaxis = list(title = "y"),
      zaxis = list(title = "densidade")
    )
  )

# Salvar o widget interativo na propria pasta do grafico
# (selfcontained = FALSE porque pandoc nao esta instalado -- ver docs/SETUP.md)
saveWidget(p, file = "widget.html", selfcontained = FALSE)

# Gerar thumbnail estatico (output.png) tirando um screenshot do widget
webshot2::webshot("widget.html", file = "output.png", vwidth = 800, vheight = 600, delay = 1)
