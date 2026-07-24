# Libraries
library(dygraphs)
library(xts)
library(htmlwidgets)
library(webshot2)

# Dados ficticios: downloads diarios de um app fictício ao longo de ~300 dias,
# com tendencia de crescimento + sazonalidade semanal (picos no fim de semana)
# + ruido -- no lugar do CSV real de contagem de bicicletas (~300 linhas,
# hospedado no GitHub do gallery) do exemplo original, ver AGENTS.md
# "Decisoes fechadas"
set.seed(1907)
n_dias <- 300
datas <- seq(as.Date("2025-01-01"), by = "day", length.out = n_dias)
dia_semana <- as.numeric(format(datas, "%u")) # 1=seg ... 7=dom
tendencia <- seq(0, 60, length.out = n_dias)
sazonalidade <- ifelse(dia_semana %in% c(6, 7), 25, 0)
ruido <- rnorm(n_dias, mean = 0, sd = 8)
downloads <- pmax(round(120 + tendencia + sazonalidade + ruido), 0)

# xts eh o formato que dygraphs espera (serie indexada por data-hora)
don <- xts(x = downloads, order.by = as.POSIXct(datas))

# Grafico interativo: paleta trocada (verde-azulado em vez do dourado
# "#D8AE5A" do original) e rollPeriod inicial de 3 dias em vez de 1 --
# demais customizacoes (range selector, crosshair, highlight) mantidas
# por serem funcionais, nao uma questao de estilo/paleta
p <- dygraph(don, main = "Downloads diários de um app (dado fictício)") %>%
  dyAxis("y", label = "Downloads") %>%
  dyOptions(labelsUTC = TRUE, fillGraph = TRUE, fillAlpha = 0.15, drawGrid = FALSE, colors = "#2a9d8f") %>%
  dyRangeSelector() %>%
  dyCrosshair(direction = "vertical") %>%
  dyHighlight(highlightCircleSize = 5, highlightSeriesBackgroundAlpha = 0.2, hideOnMouseOut = FALSE) %>%
  dyRoller(rollPeriod = 3)

# Salvar o widget interativo na propria pasta do grafico
# (selfcontained = FALSE porque pandoc nao esta instalado -- ver docs/SETUP.md)
saveWidget(p, file = "widget.html", selfcontained = FALSE)

# Gerar thumbnail estatico (output.png) tirando um screenshot do widget,
# ja que dygraphs nao tem equivalente estatico em ggplot2
webshot2::webshot("widget.html", file = "output.png", vwidth = 900, vheight = 600, delay = 1)
