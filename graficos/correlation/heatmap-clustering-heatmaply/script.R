# Libraries
library(tidyverse)
library(hrbrthemes)
library(viridis)
library(plotly)
library(heatmaply)
library(htmlwidgets)
library(webshot2)

# Dados ficticios: 12 itens x 6 metricas, valores aleatorios (set.seed(2026)).
# O exemplo original do R Graph Gallery/data-to-viz usa um CSV real de
# indicadores socioeconomicos por pais -- aqui geramos uma matriz ficticia
# do zero, sem depender de um CSV externo (ver AGENTS.md "Decisoes fechadas")
set.seed(2026)
itens <- paste0("Produto_", sprintf("%02d", 1:12))
metricas <- c("Metrica_A", "Metrica_B", "Metrica_C", "Metrica_D", "Metrica_E", "Metrica_F")
mat <- matrix(
  round(rnorm(length(itens) * length(metricas), mean = 50, sd = 15)),
  nrow = length(itens), ncol = length(metricas),
  dimnames = list(itens, metricas)
)

# Heatmap com clustering hierarquico (dendrograma nas linhas e colunas) e
# paleta customizada (viridis "magma", em vez da paleta padrao do heatmaply)
p <- heatmaply(mat,
        dendrogram = "both",
        xlab = "", ylab = "",
        main = "",
        scale = "column",
        margins = c(60, 100, 40, 20),
        grid_color = "white",
        grid_width = 0.00001,
        titleX = FALSE,
        hide_colorbar = TRUE,
        branches_lwd = 0.3,
        label_names = c("Item", "Metrica:", "Valor"),
        fontsize_row = 10, fontsize_col = 11,
        labCol = colnames(mat),
        labRow = rownames(mat),
        colors = viridis(256, option = "magma"),
        heatmap_layers = theme(axis.line = element_blank())
        )

# Salvar o widget interativo na propria pasta do grafico
# (selfcontained = FALSE porque pandoc nao esta instalado -- ver docs/SETUP.md)
saveWidget(p, file = "widget.html", selfcontained = FALSE)

# Gerar thumbnail estatico (output.png) tirando um screenshot do widget
webshot2::webshot("widget.html", file = "output.png", vwidth = 800, vheight = 600, delay = 1)
