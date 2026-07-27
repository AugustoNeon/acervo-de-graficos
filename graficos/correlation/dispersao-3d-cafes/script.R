# Libraries
library(rgl)
library(png)

# Necessario pra rgl funcionar sem janela real (Rscript nao-interativo,
# sem sessao grafica anexada)
options(rgl.useNULL = TRUE)

# Dados 100% ficticios: avaliacao sensorial de cafes especiais (acidez,
# corpo, docura) por nivel de torra, no lugar do dataset real "iris"
# (medidas de petala/sepala por especie) do exemplo original -- ver
# AGENTS.md "Decisoes fechadas"
set.seed(3005)
torras <- c("Clara", "Media", "Escura")
n_por_torra <- 30

cafes <- data.frame(
  torra  = rep(torras, each = n_por_torra),
  acidez = c(rnorm(n_por_torra, 8.0, 0.6), rnorm(n_por_torra, 6.0, 0.7), rnorm(n_por_torra, 4.0, 0.6)),
  corpo  = c(rnorm(n_por_torra, 3.5, 0.6), rnorm(n_por_torra, 5.5, 0.6), rnorm(n_por_torra, 7.5, 0.6)),
  docura = c(rnorm(n_por_torra, 5.0, 0.8), rnorm(n_por_torra, 6.0, 0.8), rnorm(n_por_torra, 7.0, 0.8))
)

# Paleta trocada em relacao ao original (cores padrao do R) -- gradiente
# marrom inspirado no proprio tema, torra clara -> escura
cores <- c(Clara = "#e8c39e", Media = "#a9714f", Escura = "#3b2417")

open3d(windowRect = c(0, 0, 800, 600))
bg3d("white")
plot3d(
  cafes$acidez, cafes$corpo, cafes$docura,
  col = cores[cafes$torra], size = 9, type = "p",
  xlab = "Acidez", ylab = "Corpo", zlab = "Docura"
)

# legend3d() nao renderiza em modo headless (rgl.useNULL) -- a legenda e
# composta manualmente por cima do snapshot com graficos base do R
cena_tmp <- tempfile(fileext = ".png")
snapshot3d(cena_tmp, fmt = "png", width = 800, height = 600)

png("output.png", width = 800, height = 600)
par(mar = c(0, 0, 0, 0))
plot(0:1, 0:1, type = "n", xlab = "", ylab = "", axes = FALSE)
rasterImage(readPNG(cena_tmp), 0, 0, 1, 1)
legend("topright", legend = torras, pch = 16, col = cores, bty = "n", cex = 1.3, inset = 0.03)
dev.off()
unlink(cena_tmp)
