# Libraries
library(rgl)
library(png)
library(htmltools)

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
  col = cores[cafes$torra], type = "s", radius = 0.15,
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

# Versao interativa: converte a cena rgl atual (mesmos pontos/cores) num
# widget WebGL -- da pra girar/dar zoom no navegador. A legenda nativa do
# rgl (legend3d()) tem a mesma limitacao headless do output.png, entao aqui
# a legenda vira uma pequena lista HTML comum ao lado do widget, em vez de
# tentar embuti-la na cena 3D -- mesma logica usada no arc diagram (legenda
# fora do SVG em vez de dentro), ver AGENTS.md "Licoes aprendidas"
widget <- rglwidget()

# O canvas do rglwidget nasce com largura fixa em pixels (nao acompanha o
# container) -- sem isso, o widget estoura a largura da pagina/iframe e gera
# rolagem horizontal em telas mais estreitas que o tamanho original da cena
estilo_responsivo <- tags$style(HTML("
  .rglWebGL { max-width: 100%; }
  .rglWebGL canvas { max-width: 100%; height: auto !important; }
"))

legenda <- tags$div(
  style = "display:flex; gap:20px; margin-top:10px; font-family:sans-serif; font-size:14px;",
  lapply(seq_along(torras), function(i) {
    tags$span(
      style = "display:inline-flex; align-items:center; gap:6px;",
      tags$span(style = sprintf(
        "display:inline-block; width:12px; height:12px; border-radius:50%%; background:%s;",
        cores[i]
      )),
      torras[i]
    )
  })
)

save_html(tagList(estilo_responsivo, widget, legenda), file = "widget.html", libdir = "widget_files")
