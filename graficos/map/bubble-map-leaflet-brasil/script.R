# Libraries
library(leaflet)
library(htmltools)
library(htmlwidgets)
library(webshot2)

# Dados ficticios: vendas mensais (R$ mil) de 20 capitais/grandes cidades
# brasileiras, no lugar do dataset "quakes" (terremotos perto de Fiji) do
# exemplo original -- ver AGENTS.md "Decisoes fechadas"
cidades <- data.frame(
  cidade = c("Sao Paulo", "Rio de Janeiro", "Belo Horizonte", "Brasilia", "Salvador",
             "Fortaleza", "Recife", "Porto Alegre", "Curitiba", "Manaus",
             "Belem", "Goiania", "Campo Grande", "Florianopolis", "Natal",
             "Vitoria", "Joao Pessoa", "Cuiaba", "Teresina", "Sao Luis"),
  lat = c(-23.55, -22.90, -19.92, -15.79, -12.97,
          -3.73, -8.05, -30.03, -25.43, -3.10,
          -1.46, -16.68, -20.44, -27.60, -5.79,
          -20.32, -7.12, -15.60, -5.09, -2.53),
  lng = c(-46.63, -43.17, -43.94, -47.88, -38.51,
          -38.52, -34.88, -51.23, -49.27, -60.02,
          -48.50, -49.25, -54.65, -48.55, -35.21,
          -40.34, -34.86, -56.10, -42.80, -44.30)
)

set.seed(2026)
cidades$vendas <- round(runif(nrow(cidades), 50, 480), 1) # R$ mil, ficticio

# Paleta trocada em relacao ao original (era "YlOrBr") -- mantida na mesma
# familia "quente" (laranja/vermelho) pra ficar parecida em sensacao visual,
# sem copiar a paleta identica do tutorial
pal <- colorBin("OrRd", domain = cidades$vendas, bins = 6)

labels <- sprintf(
  "<strong>%s</strong><br/>Vendas: R$ %.1f mil",
  cidades$cidade, cidades$vendas
) |> lapply(HTML)

# Mapa centralizado no Brasil (era Fiji, lat=-27/lng=170); basemap de satelite
# igual ao original (Esri.WorldImagery)
p <- leaflet(cidades) |>
  addProviderTiles("Esri.WorldImagery") |>
  setView(lng = -51.93, lat = -14.24, zoom = 4) |>
  addCircleMarkers(
    ~lng, ~lat,
    radius = ~ sqrt(vendas) * 1.6,
    fillColor = ~ pal(vendas),
    fillOpacity = 0.85,
    color = "white", weight = 1, stroke = TRUE,
    label = labels,
    labelOptions = labelOptions(direction = "auto")
  ) |>
  addLegend(
    pal = pal, values = ~vendas, opacity = 0.85,
    title = "Vendas mensais<br/>ficticias (R$ mil)", position = "bottomright"
  )

# Salvar o widget interativo na propria pasta do grafico
# (selfcontained = FALSE porque pandoc nao esta instalado -- ver docs/SETUP.md)
saveWidget(p, file = "widget.html", selfcontained = FALSE)

# Gerar thumbnail estatico (output.png) tirando um screenshot do widget,
# ja que leaflet nao tem equivalente estatico em ggplot2
webshot2::webshot("widget.html", file = "output.png", vwidth = 800, vheight = 700, delay = 1)
