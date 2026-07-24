# Libraries
library(ggplot2)
library(ggiraph)
library(tidyverse)

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

# Grafico base: geom_*_interactive() do ggiraph funciona como um geom_*
# normal quando plotado fora do girafe() -- as aes de interatividade
# (tooltip/data_id) sao so ignoradas -- entao o mesmo objeto `plot` serve
# pro output.png (ggsave direto) e pro widget.html (via girafe())
plot <- dados |>
  ggplot(aes(
    x = data, y = indice, color = pais, group = pais,
    tooltip = paste0(pais, "<br>", format(data, "%b/%Y"), "<br>Índice: ", round(indice, 1)),
    data_id = pais
  )) +
  geom_line_interactive(linewidth = 1.1, hover_nearest = TRUE) +
  geom_point_interactive(aes(size = indice), alpha = 0.75) +
  scale_color_brewer(palette = "Set1") +
  scale_size_continuous(range = c(1, 2.2), guide = "none") +
  scale_x_date(expand = expansion(mult = c(0.02, 0.06))) +
  labs(
    title = "Índice de sentimento econômico (dado fictício)",
    subtitle = "Passe o mouse ou clique numa linha para destacá-la",
    x = NULL, y = "Índice", caption = "dado fictício"
  ) +
  theme_minimal(base_size = 13) +
  theme(
    plot.title = element_text(face = "bold", size = 16),
    plot.subtitle = element_text(size = 11, colour = "grey40"),
    legend.position = "none",
    panel.grid.minor = element_blank(),
    plot.margin = margin(t = 10, r = 16, b = 8, l = 8)
  )

ggsave("output.png", plot = plot, width = 9, height = 6, dpi = 150)

# --- Versão interativa (girafe): combina as técnicas de CSS do tutorial
# original num único gráfico -- hover destaca a linha e apaga as outras
# (declutter de spaghetti chart), tooltip estilizado, clique seleciona,
# zoom e botão de salvar como PNG ---
interactive_plot <- girafe(ggobj = plot, width_svg = 9, height_svg = 6)

hover_css <- "stroke:#1d3557; stroke-width:3px; r:6px; transition: all 0.25s ease;"
hover_inv_css <- "opacity:0.15; filter:grayscale(80%); transition: all 0.25s ease;"
tooltip_css <- "background-color:#1d3557; color:#f1faee; padding:8px 10px; border-radius:6px; font-family:'IBM Plex Sans',sans-serif; font-size:13px; box-shadow:0 2px 8px rgba(0,0,0,0.35);"
selected_css <- "stroke:#e63946; stroke-width:3px;"

interactive_plot <- girafe_options(
  interactive_plot,
  opts_hover(css = hover_css),
  opts_hover_inv(css = hover_inv_css),
  opts_tooltip(css = tooltip_css, use_fill = TRUE),
  opts_selection(type = "single", css = selected_css),
  opts_zoom(min = 1, max = 4),
  opts_toolbar(saveaspng = TRUE, position = "topright"),
  opts_sizing(rescale = TRUE)
)

# Salvar o widget interativo na propria pasta do grafico
# (selfcontained = FALSE porque pandoc nao esta instalado -- ver docs/SETUP.md)
htmlwidgets::saveWidget(interactive_plot, file = "widget.html", selfcontained = FALSE)
