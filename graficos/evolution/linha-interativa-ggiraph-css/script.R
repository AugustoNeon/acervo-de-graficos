# Libraries
library(ggplot2)
library(tidyverse)
library(jsonlite)

# Dados ficticios: indice de sentimento economico (fake) de 6 paises da
# America do Sul ao longo de 24 meses, gerado via passeio aleatorio --
# no lugar do CSV externo real (~9 paises) do tutorial original, ver
# AGENTS.md "Decisoes fechadas"
set.seed(3311)
paises <- c("Brasil", "Chile", "México", "Peru", "Colômbia", "Uruguai")
meses <- seq(as.Date("2024-01-01"), by = "month", length.out = 24)

dados <- expand_grid(pais = paises, data = meses) |>
  arrange(pais, data) |>
  group_by(pais) |>
  mutate(indice = 50 + cumsum(rnorm(n(), mean = 0, sd = 3))) |>
  ungroup()

paleta <- setNames(RColorBrewer::brewer.pal(length(paises), "Set1"), paises)

p <- dados |>
  ggplot(aes(x = data, y = indice, color = pais, group = pais)) +
  geom_line(linewidth = 1.1) +
  geom_point(aes(size = indice), alpha = 0.75) +
  scale_color_manual(values = paleta) +
  scale_size_continuous(range = c(1, 2.2), guide = "none") +
  scale_x_date(expand = expansion(mult = c(0.02, 0.06))) +
  labs(
    title = "Índice de sentimento econômico (dado fictício)",
    x = NULL, y = "Índice", caption = "dado fictício"
  ) +
  theme_minimal(base_size = 13) +
  theme(
    plot.title = element_text(face = "bold", size = 16),
    legend.position = "none",
    panel.grid.minor = element_blank(),
    plot.margin = margin(t = 10, r = 16, b = 8, l = 8)
  )

ggsave("output.png", plot = p, width = 9, height = 6, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3, no proprio runtime do site. O script
# exporta so o dado (uma serie por pais) e a paleta -- posicao de cada ponto
# e a linha de cada serie sao calculadas no D3.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    paleta = as.list(paleta),
    nota = "Passe o cursor sobre uma linha pra destacá-la e ver os valores."
  ),
  series = dados |> transmute(pais, data = format(data, "%Y-%m-%d"), indice = round(indice, 2))
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
