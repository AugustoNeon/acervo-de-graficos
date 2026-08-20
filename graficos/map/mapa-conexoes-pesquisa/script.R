# Libraries
library(ggplot2)
library(sf)
library(geosphere)
library(dplyr)
library(RColorBrewer)
library(jsonlite)

# Dados 100% ficticios: rede de intercambio de pesquisadores entre 10 centros
# de pesquisa em cidades reais (coordenadas reais), com um numero ficticio de
# pesquisadores trocados por ano em cada rota (set.seed(2417)). Ao contrario
# do bubble map deste acervo (pontos isolados) e do dashboard coropletico
# (paises pintados), aqui a geografia serve pra mostrar CONEXOES entre
# lugares -- a pergunta que essas duas tecnicas anteriores nao respondem.
set.seed(2417)

cidades <- data.frame(
  nome    = c("São Paulo", "Cidade do México", "Nova York", "Lisboa", "Londres",
              "Nairóbi", "Joanesburgo", "Singapura", "Tóquio", "Sydney"),
  regiao  = c("América", "América", "América", "Europa", "Europa",
              "África", "África", "Ásia-Pacífico", "Ásia-Pacífico", "Ásia-Pacífico"),
  lon     = c(-46.63, -99.13, -74.01, -9.14, -0.13, 36.82, 28.05, 103.82, 139.69, 151.21),
  lat     = c(-23.55,  19.43,  40.71, 38.72, 51.51, -1.29, -26.20,  1.35,  35.68, -33.87)
)

rotas <- data.frame(
  origem  = c("São Paulo", "São Paulo", "São Paulo", "Cidade do México", "Nova York",
              "Nova York", "Lisboa", "Lisboa", "Londres", "Londres",
              "Nairóbi", "Joanesburgo", "Singapura", "Singapura", "Tóquio",
              "Londres", "São Paulo"),
  destino = c("Lisboa", "Nova York", "Joanesburgo", "Nova York", "Londres",
              "Tóquio", "Nairóbi", "Londres", "Nairóbi", "Singapura",
              "Joanesburgo", "Singapura", "Tóquio", "Sydney", "Sydney",
              "Joanesburgo", "Singapura")
)
rotas$pesquisadores <- sample(8:60, nrow(rotas), replace = TRUE)
rotas$rota_id <- seq_len(nrow(rotas))

# Cada rota vira um caminho de grande circulo (o trajeto mais curto sobre a
# esfera, nao uma reta na projecao) com 50 pontos intermediarios.
# breakAtDateLine corta em dois pedacos as rotas que cruzam o antimeridiano
# (~180 graus) -- sem isso, ex. Tokyo-Sydney desenharia uma linha reta
# atravessando o globo inteiro em vez de contornar o Pacifico.
gerar_pontos_rota <- function(rota) {
  p1 <- unlist(cidades[cidades$nome == rota$origem, c("lon", "lat")])
  p2 <- unlist(cidades[cidades$nome == rota$destino, c("lon", "lat")])
  gc <- gcIntermediate(p1, p2, n = 50, addStartEnd = TRUE, breakAtDateLine = TRUE, sp = FALSE)
  segmentos <- if (is.list(gc)) gc else list(gc)
  do.call(rbind, lapply(seq_along(segmentos), function(i) {
    m <- segmentos[[i]]
    data.frame(
      rota_id = rota$rota_id,
      segmento = i,
      ordem = seq_len(nrow(m)),
      lon = m[, 1],
      lat = m[, 2],
      pesquisadores = rota$pesquisadores,
      regiao_origem = cidades$regiao[cidades$nome == rota$origem]
    )
  }))
}

pontos_rotas <- do.call(rbind, lapply(seq_len(nrow(rotas)), function(i) gerar_pontos_rota(rotas[i, ])))

cidades$total <- sapply(cidades$nome, function(c) {
  sum(rotas$pesquisadores[rotas$origem == c | rotas$destino == c])
})

paleta_regiao <- setNames(
  brewer.pal(length(unique(cidades$regiao)), "Accent"),
  sort(unique(cidades$regiao))
)

world <- sf::st_as_sf(spData::world) |>
  sf::st_simplify(dTolerance = 0.15, preserveTopology = TRUE)

p <- ggplot() +
  geom_sf(data = world, fill = "grey93", color = "grey85", linewidth = 0.15) +
  geom_path(
    data = pontos_rotas,
    aes(lon, lat, group = interaction(rota_id, segmento), color = regiao_origem,
        linewidth = pesquisadores, alpha = pesquisadores)
  ) +
  geom_point(data = cidades, aes(lon, lat, size = total), color = "grey15") +
  geom_text(
    data = cidades, aes(lon, lat, label = nome), color = "grey15",
    size = 2.6, nudge_y = 5.5, fontface = "bold"
  ) +
  scale_color_manual(values = paleta_regiao, name = "Região de origem") +
  scale_linewidth(range = c(0.25, 1.6), guide = "none") +
  scale_alpha(range = c(0.35, 0.9), guide = "none") +
  scale_size(range = c(1, 5), name = "Pesquisadores/ano\n(total na cidade)") +
  coord_sf(ylim = c(-50, 72), expand = FALSE) +
  labs(title = "Intercâmbio de pesquisadores entre centros parceiros") +
  theme_void() +
  theme(
    plot.title = element_text(face = "bold", size = 13, hjust = 0.5, margin = margin(b = 10)),
    legend.position = "bottom",
    legend.title = element_text(size = 9),
    legend.text = element_text(size = 8)
  )

ggsave("output.png", plot = p, width = 10, height = 6.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: mesma tecnica ja usada no dashboard-inovacao-ggiraph
# (mundo simplificado exportado como GeoJSON, corrigido no D3 por causa do
# enrolamento inconsistente que o sf/GDAL produz -- ver AGENTS.md "Licoes
# aprendidas" 2026-08-14) + as rotas, ja calculadas como grande-circulo pelo
# R, exportadas prontas (o D3 so projeta os pontos lon/lat, nunca recalcula
# geometria de rota).
# ---------------------------------------------------------------------------
caminho_geojson <- tempfile(fileext = ".geojson")
sf::st_write(
  sf::st_geometry(world), caminho_geojson,
  driver = "GeoJSON",
  layer_options = "COORDINATE_PRECISION=3",
  quiet = TRUE
)
mapa_geojson <- jsonlite::fromJSON(caminho_geojson, simplifyVector = FALSE)
unlink(caminho_geojson)

rotas_export <- pontos_rotas |>
  group_by(rota_id, segmento) |>
  summarise(
    origem = rotas$origem[rotas$rota_id == first(rota_id)],
    destino = rotas$destino[rotas$rota_id == first(rota_id)],
    pesquisadores = first(pesquisadores),
    regiao_origem = first(regiao_origem),
    pontos = list(cbind(lon, lat)),
    .groups = "drop"
  )

viz <- list(
  meta = list(paleta = as.list(paleta_regiao), dominioTotal = c(min(cidades$total), max(cidades$total))),
  mapa = mapa_geojson,
  cidades = cidades |> select(nome, regiao, lon, lat, total),
  rotas = rotas_export |> select(rota_id, segmento, origem, destino, pesquisadores, regiao_origem, pontos)
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = 3)
