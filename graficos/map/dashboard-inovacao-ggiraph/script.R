# Libraries
library(ggplot2)
library(patchwork)
library(sf)
library(spData)
library(dplyr)
library(jsonlite)

# Dashboard com mapa coropletico + dispersao + barras, ligados por
# interatividade -- a partir de r-graph-gallery.com/414-map-multiple-charts-in-ggiraph.html
#
# Dados 100% ficticios: investimento em P&D (US$ bi) e indice de inovacao
# (0-100) por pais, no lugar do PIB x indice de felicidade reais (dataset
# Gapminder) do tutorial original -- geografia real (spData::world), valores
# inventados -- ver AGENTS.md "Decisoes fechadas"
set.seed(1414)

world <- spData::world |>
  filter(!continent %in% c("Antarctica", "Seven seas (open ocean)"))

continentes <- unique(world$continent)
base_continente <- setNames(runif(length(continentes), 8, 42), continentes)

world$investimento_pd <- pmax(
  round(base_continente[world$continent] + rnorm(nrow(world), 0, 9), 1), 0.5
)
world$indice_inovacao <- round(
  pmin(pmax(25 + 0.9 * world$investimento_pd + rnorm(nrow(world), 0, 11), 4), 98), 1
)

top15 <- world |>
  st_drop_geometry() |>
  arrange(desc(indice_inovacao)) |>
  slice_head(n = 15)

# Paleta trocada em relacao ao original (era um gradiente azul simples) --
# "YlGnBu" reforca o tema "inovacao/tecnologia"
paleta <- "YlGnBu"

# --- Estatico: mapa + dispersao + barras combinados com patchwork ---------
mapa <- ggplot(world) +
  geom_sf(aes(fill = investimento_pd), color = "white", linewidth = 0.1) +
  scale_fill_distiller(palette = paleta, direction = 1, name = "P&D\n(US$ bi)") +
  theme_void(base_size = 11) +
  theme(legend.position = "right")

dispersao <- ggplot(world) +
  geom_point(aes(x = investimento_pd, y = indice_inovacao), size = 2.4, alpha = 0.8, color = "#1d3557") +
  labs(x = "Investimento em P&D (US$ bi, fictício)", y = "Índice de inovação (fictício)") +
  theme_minimal(base_size = 11)

barras <- ggplot(top15, aes(x = reorder(name_long, indice_inovacao), y = indice_inovacao)) +
  geom_col(fill = "#1d3557") +
  coord_flip() +
  labs(x = NULL, y = "Índice de inovação (top 15, fictício)") +
  theme_minimal(base_size = 11)

combo <- mapa / (dispersao + barras) + plot_layout(heights = c(1.3, 1))

ggsave("output.png", plot = combo, width = 11, height = 9, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3, no proprio runtime do site. Os tres
# paineis (mapa, dispersao, barras) continuam separados -- decisao fechada de
# 2026-08-03 (AGENTS.md): varios paineis do mesmo dado nao viram um so com
# seletor, o que a interatividade acrescenta e o REALCE LIGADO entre eles. O
# script exporta só a geometria (simplificada, pra nao pesar o SVG) + os dois
# valores por pais; o D3 deriva a dispersao e o ranking das MESMAS
# propriedades do GeoJSON, sem duplicar o dado em arrays separados.
# ---------------------------------------------------------------------------
world_exportavel <- world |>
  select(nome = name_long, continente = continent, investimento = investimento_pd, inovacao = indice_inovacao) |>
  # Fiji cruza o antimeridiano (~180deg); sem isso o anel salta de +180 pra
  # -180 e desenha uma reta atravessando o mapa inteiro. st_wrap_dateline()
  # corta a geometria em pedacos validos dos dois lados da linha.
  st_wrap_dateline(options = c("WRAPDATELINE=YES", "DATELINEOFFSET=10")) |>
  st_simplify(dTolerance = 0.15, preserveTopology = TRUE)

caminho_geojson <- tempfile(fileext = ".geojson")
st_write(
  world_exportavel, caminho_geojson,
  driver = "GeoJSON",
  layer_options = "COORDINATE_PRECISION=3",
  quiet = TRUE
)
mapa_geojson <- jsonlite::fromJSON(caminho_geojson, simplifyVector = FALSE)
unlink(caminho_geojson)

# Nota: o GeoJSON que o sf/GDAL escreve aqui sai com o enrolamento dos aneis
# INCONSISTENTE entre paises (uns anti-horario, outros horario -- nao existe
# flag do GDAL que resolva isso pra esse dataset, RFC7946=YES incluido, foi
# testado). O d3-geo (client-side) e sensivel a isso pro clipping esferico;
# a correcao mora no proprio modulo D3 (corrigirEnrolamento() em
# dashboard-inovacao-ggiraph.ts), nao aqui -- ver AGENTS.md "Licoes
# aprendidas" 2026-08-14 pro raciocinio completo.

viz <- list(
  meta = list(
    paleta = paleta,
    dominioInvestimento = c(min(world$investimento_pd), max(world$investimento_pd)),
    continentes = continentes,
    nota = "Passe o cursor sobre um país em qualquer painel — mapa, dispersão ou ranking — pra destacá-lo nos outros dois."
  ),
  mapa = mapa_geojson
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
