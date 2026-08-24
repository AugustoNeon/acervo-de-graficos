# Libraries
library(ggplot2)
library(sf)
library(rnaturalearthdata)
library(dplyr)
library(RColorBrewer)
library(jsonlite)

# Dados 100% ficticios: percentual de domicilios com internet banda larga
# fixa por estado brasileiro, no lugar do dataset generico (populacao por
# condado dos EUA) do exemplo original -- ver AGENTS.md "Decisoes fechadas".
# Gerado com uma base por REGIAO (Sul/Sudeste mais alta, Norte/Nordeste mais
# baixa -- padrao real de desigualdade de infraestrutura no Brasil) mais
# ruido por estado, pra o mapa ter um padrao geografico plausivel de
# verdade em vez de cores aleatorias sem relacao com vizinhanca.
set.seed(9137)

regiao_por_sigla <- c(
  AC = "Norte", AP = "Norte", AM = "Norte", PA = "Norte", RO = "Norte", RR = "Norte", TO = "Norte",
  AL = "Nordeste", BA = "Nordeste", CE = "Nordeste", MA = "Nordeste", PB = "Nordeste",
  PE = "Nordeste", PI = "Nordeste", RN = "Nordeste", SE = "Nordeste",
  DF = "Centro-Oeste", GO = "Centro-Oeste", MT = "Centro-Oeste", MS = "Centro-Oeste",
  ES = "Sudeste", MG = "Sudeste", RJ = "Sudeste", SP = "Sudeste",
  PR = "Sul", RS = "Sul", SC = "Sul"
)
base_regiao <- c(Norte = 42, Nordeste = 50, "Centro-Oeste" = 63, Sudeste = 78, Sul = 80)

# Contorno + nome + sigla + centroide dos estados -- Natural Earth Admin-1
# (1:50m), embutido no pacote `rnaturalearthdata`, 100% offline (mesma fonte
# ja usada no mapa hexagonal deste acervo).
data(states50, package = "rnaturalearthdata")
estados_sf <- st_as_sf(states50) |>
  filter(admin == "Brazil") |>
  select(nome = name, sigla = postal, lat_rotulo = latitude, lon_rotulo = longitude) |>
  st_make_valid() # Natural Earth 1:50m tem ao menos 1 anel com vertice
# duplicado -- sem isso, operacoes topologicas (nao o desenho em si) falham
# com "Loop 0 is not valid" (ver AGENTS.md "Licoes aprendidas", 2026-08-21).

estados_sf$regiao <- regiao_por_sigla[estados_sf$sigla]
estados_sf$internet_banda_larga <- pmin(pmax(
  base_regiao[estados_sf$regiao] + rnorm(nrow(estados_sf), sd = 7), 18
), 96)
estados_sf$internet_banda_larga <- round(estados_sf$internet_banda_larga, 1)

paleta_nome <- "PuBu"

p <- ggplot(estados_sf) +
  geom_sf(aes(fill = internet_banda_larga), color = "white", linewidth = 0.3) +
  geom_text(aes(x = lon_rotulo, y = lat_rotulo, label = sigla), size = 2.6, fontface = "bold", color = "grey20") +
  scale_fill_distiller(palette = paleta_nome, direction = 1, name = "% domicílios\ncom banda larga") +
  labs(title = "Acesso à internet banda larga por estado (dado fictício)") +
  theme_void(base_size = 12) +
  theme(legend.position = "right", plot.title = element_text(face = "bold", hjust = 0.5))

ggsave("output.png", plot = p, width = 8, height = 8, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3 (d3-geo, geoMercator ajustado ao Brasil + geoPath),
# mesma tecnica ja usada no dashboard mapa+dispersao+barras deste acervo --
# GeoJSON exportado do sf, corrigido no D3 (corrigirEnrolamento(), ver
# shared/mapa.ts) porque o sf/GDAL escreve o enrolamento dos aneis
# inconsistente entre features.
# ---------------------------------------------------------------------------
caminho_geojson <- tempfile(fileext = ".geojson")
st_write(
  estados_sf, caminho_geojson,
  driver = "GeoJSON",
  layer_options = "COORDINATE_PRECISION=4",
  quiet = TRUE
)
mapa_geojson <- jsonlite::fromJSON(caminho_geojson, simplifyVector = FALSE)
unlink(caminho_geojson)

viz <- list(
  meta = list(
    paleta = paleta_nome,
    dominio = c(min(estados_sf$internet_banda_larga), max(estados_sf$internet_banda_larga)),
    nota = "Passe o cursor num estado pra ver o percentual exato."
  ),
  mapa = mapa_geojson
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
