# Libraries
library(ggplot2)
library(maps)
library(hexbin)
library(RColorBrewer)
library(jsonlite)
library(sf)
library(rnaturalearthdata)
library(dplyr)

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

# Contorno dos ESTADOS -- pedido do usuario, depois de publicado o mapa sem
# nenhuma referencia de "em qual estado eu estou olhando". `maps` só tem
# fronteira de PAÍS pra a maioria do mundo (só EUA/França/Itália/Nova
# Zelândia têm nível estadual embutido); os limites estaduais do Brasil vêm
# do `rnaturalearthdata::states50` (Natural Earth 1:50m Admin-1), que já
# inclui nome, sigla ("postal") e centroide (latitude/longitude) prontos --
# sem precisar calcular centroide nem baixar shapefile.
data(states50, package = "rnaturalearthdata")
estados_sf <- st_as_sf(states50) |>
  filter(admin == "Brazil") |>
  select(name, sigla = postal, lat_rotulo = latitude, lon_rotulo = longitude) |>
  st_make_valid() # o dado Natural Earth de 1:50m tem pelo menos 1 anel com
# vertice duplicado (self-intersection) -- sem isso, st_join() mais abaixo
# falha com "Loop 0 is not valid" (o motor esferico s2 e mais estrito que o
# plano usado so pra desenhar).

# sf::st_coordinates() devolve X/Y + colunas de agrupamento (L1 = anel dentro
# da peça, L2 = peça do multipoligono -- ilha/porção separada -- L3 = estado)
# -- convertida pro mesmo formato "long/lat/group" já usado pro contorno do
# país (vindo do pacote `maps`), pra reaproveitar o mesmo `geom_polygon()` e
# a mesma exportação pro D3.
coords_estados <- st_coordinates(estados_sf)
estados_linhas <- data.frame(
  long = coords_estados[, "X"],
  lat = coords_estados[, "Y"],
  group = paste(coords_estados[, "L3"], coords_estados[, "L2"], sep = "_"),
  estado = estados_sf$name[coords_estados[, "L3"]]
)

paleta_nome <- "BuPu"
cor_fundo_mapa <- "#f4f1ec"

p <- ggplot() +
  geom_polygon(
    data = brasil, aes(x = long, y = lat, group = group),
    fill = cor_fundo_mapa, color = NA
  ) +
  geom_polygon(
    data = estados_linhas, aes(x = long, y = lat, group = group),
    fill = NA, color = "grey65", linewidth = 0.2
  ) +
  geom_hex(
    data = avistamentos, aes(x = lon, y = lat),
    bins = 22, color = "white", linewidth = 0.15, alpha = 0.92
  ) +
  geom_polygon(
    data = brasil, aes(x = long, y = lat, group = group),
    fill = NA, color = "grey40", linewidth = 0.3
  ) +
  geom_text(
    data = estados_sf, aes(x = lon_rotulo, y = lat_rotulo, label = sigla),
    color = "grey20", size = 2.5, fontface = "bold"
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
camada_hex <- compilado$data[[3]] # 1 = país (fundo), 2 = estados, 3 = geom_hex, 4 = país (contorno), 5 = texto

offsets <- hexcoords(camada_hex$width[1] / 2, camada_hex$height[1] / sqrt(3) / 2, n = 1)

# Em qual estado cada hexágono cai -- junção espacial ponto-em-polígono uma
# vez só aqui no R (`sf::st_join`), pra a versão interativa só EXIBIR o
# resultado no tooltip em vez de repetir o teste no navegador a cada hover.
hex_pontos <- st_as_sf(
  data.frame(x = camada_hex$x, y = camada_hex$y),
  coords = c("x", "y"), crs = st_crs(estados_sf), remove = FALSE
)
hex_estado <- st_join(hex_pontos, estados_sf["sigla"])$sigla

viz <- list(
  meta = list(nota = "Passe o cursor num hexágono pra ver quantos avistamentos caíram nele e em qual estado."),
  brasil = split(brasil[, c("long", "lat", "group")], brasil$group),
  estados = split(estados_linhas[, c("long", "lat", "group")], estados_linhas$group),
  rotulosEstado = estados_sf |>
    st_drop_geometry() |>
    transmute(sigla, x = lon_rotulo, y = lat_rotulo),
  hexagonos = data.frame(
    x = camada_hex$x,
    y = camada_hex$y,
    contagem = camada_hex$count,
    cor = camada_hex$fill,
    estado = hex_estado
  ),
  offsetsHexagono = data.frame(x = offsets$x, y = offsets$y)
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
