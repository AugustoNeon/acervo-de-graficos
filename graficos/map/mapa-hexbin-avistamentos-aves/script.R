# Libraries
library(ggplot2)
library(maps)
library(hexbin)
library(RColorBrewer)
library(jsonlite)
library(sf)

# Dados ficticios: avistamentos de aves migratorias reportados por um app de
# ciencia cidada, espalhados pelo Brasil ao longo de um ano. Nao e uma
# amostra uniforme -- concentra em 5 "pontos quentes" de observacao real
# (areas umidas/estuarios, onde aves migratorias de fato se concentram) mais
# um ruido de fundo mais esparso pelo resto do pais, pra o hexbin ter
# variação real de densidade pra mostrar.
set.seed(6114)

pontos_quentes <- data.frame(
  local = c("Pantanal", "Lagoa dos Patos", "Reentrâncias Maranhenses", "Baixada Santista", "Foz do Amazonas"),
  lon = c(-57.0, -51.2, -44.3, -46.3, -49.5),
  lat = c(-17.0, -31.5, -2.3, -24.0, -1.2),
  n = c(480, 360, 420, 390, 350)
)

avistamentos_quentes <- do.call(rbind, lapply(seq_len(nrow(pontos_quentes)), function(i) {
  data.frame(
    lon = rnorm(pontos_quentes$n[i], pontos_quentes$lon[i], 1.4),
    lat = rnorm(pontos_quentes$n[i], pontos_quentes$lat[i], 1.1)
  )
}))

# Contorno do Brasil -- vem embutido no pacote `maps` (base de dados "world"),
# sem precisar de shapefile/GeoJSON externo nem acesso a internet.
brasil <- map_data("world", region = "Brazil")
brasil_sf <- st_union(st_as_sf(map("world", region = "Brazil", fill = TRUE, plot = FALSE)))

# O ruido de fundo, ao contrario dos pontos-quentes (que podem legitimamente
# cair perto da costa/agua, como observacao de ave em estuario), nao tem
# nenhuma razao geografica pra existir fora do territorio -- gerar direto
# num retangulo (bounding box) espalharia avistamentos pela Bolivia/oceano.
# Sorteia mais candidatos do que o necessario e mantem so os que caem DENTRO
# do poligono do Brasil (teste ponto-em-poligono via sf::st_within).
candidatos_fundo <- data.frame(
  lon = runif(1300, -72, -35),
  lat = runif(1300, -32, 4)
)
dentro <- st_within(
  st_as_sf(candidatos_fundo, coords = c("lon", "lat"), crs = st_crs(brasil_sf)),
  brasil_sf, sparse = FALSE
)[, 1]
avistamentos_fundo <- candidatos_fundo[dentro, ]

avistamentos <- rbind(avistamentos_quentes, avistamentos_fundo)

paleta_nome <- "BuPu"
cor_fundo_mapa <- "#f4f1ec"

p <- ggplot() +
  geom_polygon(
    data = brasil, aes(x = long, y = lat, group = group),
    fill = cor_fundo_mapa, color = "grey70", linewidth = 0.2
  ) +
  geom_hex(
    data = avistamentos, aes(x = lon, y = lat),
    bins = 22, color = "white", linewidth = 0.15, alpha = 0.92
  ) +
  scale_fill_distiller(
    palette = paleta_nome, direction = 1, trans = "sqrt",
    name = "Avistamentos"
  ) +
  coord_quickmap(xlim = range(brasil$long) + c(-1, 1), ylim = range(brasil$lat) + c(-1, 1)) +
  theme_void(base_size = 12) +
  theme(legend.position = "right")

ggsave("output.png", plot = p, width = 8, height = 8, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3. Reaproveitar a MESMA celula hexagonal
# que o ggplot2 desenhou (em vez de o D3 recalcular o binning do zero, que
# arriscaria divergir do estatico) -- lida de volta via ggplot_build(p),
# igual ao padrao ja usado no circle-packing-simples deste acervo pra cor
# resolvida de uma escala continua. `hexbin::hexcoords(dx, dy, n = 1)` conta
# os 6 vertices (deslocamento a partir do centro) de UM hexagono com a mesma
# largura/altura que o ggplot2 usou -- constante pra toda a camada, entao so
# precisa ser exportado uma vez. dx/dy NAO sao width/height direto: e a
# formula exata que o proprio `ggplot2:::GeomHex$draw_group` usa por baixo
# dos panos (`dx <- width/2; dy <- height/sqrt(3)/2`) -- sem o fator 1/sqrt(3)
# no dy, o hexagono sai ~73% mais alto do que deveria (achatado/esticado),
# tessellation quebrada. Confirmado lendo o codigo-fonte instalado do pacote
# (`asNamespace("ggplot2")$GeomHex$draw_group`), nao documentado em nenhum
# ?help -- hexcoords() em si nao tem pagina de ajuda propria.
compilado <- ggplot_build(p)
camada_hex <- compilado$data[[2]] # 1 = contorno do Brasil, 2 = geom_hex

offsets <- hexcoords(camada_hex$width[1] / 2, camada_hex$height[1] / sqrt(3) / 2, n = 1)

viz <- list(
  meta = list(nota = "Passe o cursor num hexágono pra ver quantos avistamentos caíram nele."),
  brasil = split(brasil[, c("long", "lat", "group")], brasil$group),
  hexagonos = data.frame(
    x = camada_hex$x,
    y = camada_hex$y,
    contagem = camada_hex$count,
    cor = camada_hex$fill
  ),
  offsetsHexagono = data.frame(x = offsets$x, y = offsets$y)
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
