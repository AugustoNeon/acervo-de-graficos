# Libraries
library(ggplot2)
library(ggiraph)
library(tidyverse)
library(htmltools)

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

# --- Versão interativa (girafe): em vez de fixar UM tratamento de CSS,
# geramos as 4 variações de interatividade da página original (mesmo
# `plot`/dados nas 4) e colocamos as 4 no mesmo widget.html, com uma barra
# de botões acima que troca qual delas fica visível -- ver AGENTS.md
# "Decisões fechadas" (pedido do usuário: um gráfico só, com um seletor de
# estilo, em vez de uma pasta por variação) ---

# 1) "Hover simples": preenche de amarelo no hover + clique seleciona em
# vermelho (secao "Change CSS" da pagina original)
estilo_1 <- girafe_options(
  girafe(ggobj = plot, width_svg = 9, height_svg = 6),
  opts_hover(css = "fill:#ffe7a6;stroke:black;cursor:pointer;"),
  opts_selection(type = "single", css = "fill:#e63946;stroke:black;"),
  opts_toolbar(saveaspng = FALSE)
)

# 2) "Destacar + apagar outras": hover destaca uma linha e esmaece/dessatura
# as demais -- util pra despoluir um spaghetti chart (secao "Highlight a
# specific line")
estilo_2 <- girafe_options(
  girafe(ggobj = plot, width_svg = 9, height_svg = 6),
  opts_hover(css = "stroke:#2a9d8f; stroke-width:3px; transition: all 0.3s ease;"),
  opts_hover_inv(css = "opacity:0.15; filter:grayscale(80%); transition: all 0.3s ease;"),
  opts_toolbar(saveaspng = FALSE)
)

# 3) "Hover avançado": preenchimento translucido + traco tracejado + sombra
# com transicao suave (secao "More advanced usage")
estilo_3 <- girafe_options(
  girafe(ggobj = plot, width_svg = 9, height_svg = 6),
  opts_hover(css = "
    fill: #ffe7a6;
    fill-opacity: 0.6;
    stroke: black;
    stroke-width: 4px;
    stroke-dasharray: 5,5;
    transition: fill-opacity 0.4s, stroke-width 0.4s, filter 0.4s;
    filter: drop-shadow(0 0 5px rgba(0,0,0,0.5));
  "),
  opts_toolbar(saveaspng = FALSE)
)

# 4) "Tooltip + zoom": tooltip escuro customizado, ponto cresce no hover,
# selecao multipla, zoom por scroll e botao de exportar PNG (secao "Combine
# CSS with other ggiraph features")
estilo_4 <- girafe_options(
  girafe(ggobj = plot, width_svg = 9, height_svg = 6),
  opts_hover(css = "stroke:black; stroke-width:1px; r:8px; transition: all 0.3s ease;"),
  opts_tooltip(
    css = "background-color:#1d3557; color:#f1faee; padding:8px 10px; border-radius:6px; font-family:'IBM Plex Sans',sans-serif; font-size:13px; box-shadow:0 2px 8px rgba(0,0,0,0.35);",
    use_fill = TRUE
  ),
  opts_selection(type = "multiple", only_shiny = FALSE),
  opts_zoom(min = 0.5, max = 3),
  opts_toolbar(saveaspng = TRUE, position = "topright", pngname = "grafico"),
  opts_sizing(rescale = TRUE)
)

# Barra de botoes (HTML/CSS/JS puro) que mostra/esconde cada painel --
# so um `.estilo-painel` fica visivel por vez, controlado pela classe
# `.ativo` alternada no clique
estilo_css <- tags$style(HTML("
  .estilo-toolbar { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; font-family: 'IBM Plex Sans', sans-serif; }
  .estilo-btn { padding:8px 14px; border:1px solid #d0d0d0; border-radius:6px; background:#f7f7f7; cursor:pointer; font-size:13px; }
  .estilo-btn:hover { background:#eee; }
  .estilo-btn.ativo { background:#1d3557; color:white; border-color:#1d3557; }
  .estilo-painel { display:none; }
  .estilo-painel.ativo { display:block; }
"))

toolbar <- tags$div(
  class = "estilo-toolbar",
  tags$button("1. Hover simples", class = "estilo-btn ativo", `data-target` = "estilo-1"),
  tags$button("2. Destacar + apagar outras", class = "estilo-btn", `data-target` = "estilo-2"),
  tags$button("3. Hover avançado", class = "estilo-btn", `data-target` = "estilo-3"),
  tags$button("4. Tooltip + zoom", class = "estilo-btn", `data-target` = "estilo-4")
)

paineis <- tags$div(
  tags$div(id = "estilo-1", class = "estilo-painel ativo", estilo_1),
  tags$div(id = "estilo-2", class = "estilo-painel", estilo_2),
  tags$div(id = "estilo-3", class = "estilo-painel", estilo_3),
  tags$div(id = "estilo-4", class = "estilo-painel", estilo_4)
)

estilo_js <- tags$script(HTML("
  document.querySelectorAll('.estilo-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.estilo-btn').forEach(function (b) { b.classList.remove('ativo'); });
      document.querySelectorAll('.estilo-painel').forEach(function (p) { p.classList.remove('ativo'); });
      btn.classList.add('ativo');
      document.getElementById(btn.getAttribute('data-target')).classList.add('ativo');
    });
  });
"))

pagina <- tagList(estilo_css, toolbar, paineis, estilo_js)

# Salvar a pagina interativa na propria pasta do grafico -- htmltools::save_html
# (o mesmo usado no tutorial original) aceita uma tagList combinando varios
# widgets htmlwidgets + HTML/CSS/JS customizado, ao contrario de
# htmlwidgets::saveWidget() que so aceita um widget por vez. libdir="widget_files"
# pra bater com a convencao do projeto (ver site/scripts/sync-assets.mjs)
save_html(pagina, file = "widget.html", libdir = "widget_files")
