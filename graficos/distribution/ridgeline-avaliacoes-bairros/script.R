# Libraries
library(ggplot2)
library(ggridges)
library(dplyr)
library(forcats)
library(RColorBrewer)
library(jsonlite)

# Dados ficticios: notas de avaliacao (0-10) de restaurantes em 8 bairros de
# uma cidade ficticia, cada bairro com sua propria media/desvio -- formatos
# de distribuicao bem diferentes de um bairro pro outro (estreita e alta vs.
# larga e achatada), pra ficar visualmente interessante.
set.seed(4127)

bairros <- c(
  "Vila Esperança", "Setor Central", "Jardim das Flores", "Alto do Mirante",
  "Beira-Rio", "Vila Operária", "Novo Horizonte", "Recanto Verde"
)

params <- data.frame(
  bairro = bairros,
  media  = c(6.2, 8.4, 7.1, 5.3, 8.9, 6.8, 7.6, 9.2),
  desvio = c(1.8, 0.9, 1.3, 2.1, 0.6, 1.6, 1.1, 0.5)
)

n_por_bairro <- 260
dados <- do.call(rbind, lapply(seq_len(nrow(params)), function(i) {
  p <- params[i, ]
  nota <- rnorm(n_por_bairro, p$media, p$desvio)
  nota <- pmin(pmax(nota, 0), 10)
  data.frame(bairro = p$bairro, nota = round(nota, 2))
})) %>%
  mutate(bairro = fct_reorder(bairro, nota, .fun = median))

# ---------------------------------------------------------------------------
# Estatico: ridgeline com cor em gradiente pela propria nota (nao por bairro)
# -- combina as tres variacoes progressivas da tecnica original (basica,
# forma histograma, gradiente de cor) na versao mais completa. Paleta
# RColorBrewer diverging em vez do viridis do exemplo original.
# ---------------------------------------------------------------------------
p <- ggplot(dados, aes(x = nota, y = bairro, fill = after_stat(x))) +
  geom_density_ridges_gradient(scale = 2.8, rel_min_height = 0.01, color = "white", linewidth = 0.3) +
  scale_fill_distiller(palette = "RdYlGn", direction = 1, limits = c(0, 10)) +
  scale_x_continuous(limits = c(0, 10), expand = expansion(mult = c(0.01, 0.02))) +
  labs(x = "Nota de avaliação (0–10)", y = NULL) +
  theme_ridges(font_size = 13) +
  theme(legend.position = "none")

ggsave("output.png", plot = p, width = 8, height = 6.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3. Nao existe widget pronto pra ridgeline, entao o R
# so exporta as notas brutas por bairro (mesmo ficticio) -- o D3 recalcula
# sua propria estimativa de densidade (kernel gaussiano, largura de banda de
# Silverman por bairro) e desenha o gradiente de cor com sua propria escala,
# em vez de importar a curva pronta calculada pelo `ggridges`.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    ordem = levels(dados$bairro),
    dominio = c(0, 10),
    nota = "Passe o cursor sobre uma faixa pra ler a nota e a densidade estimada daquele bairro."
  ),
  bairros = lapply(levels(dados$bairro), function(b) {
    list(bairro = b, valores = dados$nota[dados$bairro == b])
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
