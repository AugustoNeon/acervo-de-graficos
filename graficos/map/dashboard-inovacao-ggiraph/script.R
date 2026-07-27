# Libraries
library(ggplot2)
library(ggiraph)
library(patchwork)
library(sf)
library(spData)
library(dplyr)
library(htmltools)

# Dashboard com mapa coropletico + dispersao + barras, ligados por
# interatividade (data_id compartilhado) via ggiraph + patchwork -- a partir
# de r-graph-gallery.com/414-map-multiple-charts-in-ggiraph.html
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

# --- Paineis base com destaque por PAIS (data_id = name_long) ---
mapa_pais <- ggplot(world) +
  geom_sf_interactive(aes(
    fill = investimento_pd, data_id = name_long,
    tooltip = paste0(name_long, "<br/>P&D: US$ ", investimento_pd, " bi")
  ), color = "white", linewidth = 0.1) +
  scale_fill_distiller(palette = paleta, direction = 1, name = "P&D\n(US$ bi)") +
  theme_void(base_size = 11) +
  theme(legend.position = "right")

dispersao_pais <- ggplot(world) +
  geom_point_interactive(aes(
    x = investimento_pd, y = indice_inovacao, data_id = name_long,
    tooltip = paste0(name_long, "<br/>Inovação: ", indice_inovacao)
  ), size = 2.4, alpha = 0.8, color = "#1d3557") +
  labs(x = "Investimento em P&D (US$ bi, fictício)", y = "Índice de inovação (fictício)") +
  theme_minimal(base_size = 11)

barras_pais <- ggplot(top15, aes(
  x = reorder(name_long, indice_inovacao), y = indice_inovacao,
  data_id = name_long, tooltip = paste0(name_long, ": ", indice_inovacao)
)) +
  geom_col_interactive(fill = "#1d3557") +
  coord_flip() +
  labs(x = NULL, y = "Índice de inovação (top 15, fictício)") +
  theme_minimal(base_size = 11)

combo_pais <- mapa_pais / (dispersao_pais + barras_pais) + plot_layout(heights = c(1.3, 1))

# --- Mesmos paineis, mas com destaque por CONTINENTE (data_id = continent) --
# variacao "grouping" da pagina original: passar o mouse num pais destaca
# todos os paises do mesmo continente nos 3 paineis ao mesmo tempo
mapa_continente <- ggplot(world) +
  geom_sf_interactive(aes(
    fill = investimento_pd, data_id = continent, tooltip = continent
  ), color = "white", linewidth = 0.1) +
  scale_fill_distiller(palette = paleta, direction = 1, name = "P&D\n(US$ bi)") +
  theme_void(base_size = 11) +
  theme(legend.position = "right")

dispersao_continente <- ggplot(world) +
  geom_point_interactive(aes(
    x = investimento_pd, y = indice_inovacao, data_id = continent, tooltip = continent
  ), size = 2.4, alpha = 0.8, color = "#1d3557") +
  labs(x = "Investimento em P&D (US$ bi, fictício)", y = "Índice de inovação (fictício)") +
  theme_minimal(base_size = 11)

barras_continente <- ggplot(top15, aes(
  x = reorder(name_long, indice_inovacao), y = indice_inovacao,
  data_id = continent, tooltip = continent
)) +
  geom_col_interactive(fill = "#1d3557") +
  coord_flip() +
  labs(x = NULL, y = "Índice de inovação (top 15, fictício)") +
  theme_minimal(base_size = 11)

combo_continente <- mapa_continente / (dispersao_continente + barras_continente) +
  plot_layout(heights = c(1.3, 1))

# Salvar thumbnail estatico a partir da combinacao por pais (aes de
# interatividade sao ignoradas fora do girafe(), mesmo padrao do grafico de
# linha interativa com ggiraph -- um so `plot`/`combo` serve pras duas saidas)
ggsave("output.png", plot = combo_pais, width = 11, height = 9, dpi = 150)

# --- Versao interativa: 5 variacoes de interatividade da pagina original
# (pulamos a demo introdutoria com mtcars, que nao envolve mapa), cada uma
# no mesmo widget.html com uma barra de botoes pra trocar -- mesmo padrao do
# grafico de linha interativa com ggiraph, ver AGENTS.md "Decisoes fechadas"
# (pedido do usuario: um grafico so, com um seletor de estilo)

# 1) "Por pais": hover simples destaca o pais sob o mouse nos 3 paineis
estilo_1 <- girafe_options(
  girafe(ggobj = combo_pais, width_svg = 11, height_svg = 9),
  opts_hover(css = "fill:#e63946;stroke:#1d3557;cursor:pointer;"),
  opts_toolbar(saveaspng = FALSE)
)

# 2) "Por continente": hover destaca todos os paises do mesmo continente
estilo_2 <- girafe_options(
  girafe(ggobj = combo_continente, width_svg = 11, height_svg = 9),
  opts_hover(css = "fill:#e63946;stroke:#1d3557;cursor:pointer;"),
  opts_toolbar(saveaspng = FALSE)
)

# 3) "CSS customizado": hover com transicao suave + tooltip escuro customizado
estilo_3 <- girafe_options(
  girafe(ggobj = combo_pais, width_svg = 11, height_svg = 9),
  opts_hover(css = "
    fill: #f4a261;
    stroke: #264653;
    stroke-width: 1.5px;
    transition: all 0.3s ease;
  "),
  opts_tooltip(css = "
    background-color:#264653; color:#f1faee; padding:8px 10px;
    border-radius:6px; font-family:sans-serif; font-size:13px;
  "),
  opts_toolbar(saveaspng = FALSE)
)

# 4) "Glow avancado": brilho via filter:drop-shadow + tooltip em gradiente
estilo_4 <- girafe_options(
  girafe(ggobj = combo_pais, width_svg = 11, height_svg = 9),
  opts_hover(css = "
    fill: #ffd60a;
    filter: drop-shadow(0 0 6px #ffd60a) drop-shadow(0 0 12px #ffd60a);
    transition: all 0.4s ease;
  "),
  opts_tooltip(css = "
    background:linear-gradient(135deg,#003566,#001d3d); color:#ffd60a;
    padding:8px 12px; border-radius:8px; font-family:sans-serif;
    box-shadow:0 2px 10px rgba(0,0,0,0.4);
  "),
  opts_toolbar(saveaspng = FALSE)
)

# 5) "Esmaecer nao-selecionado": dessatura/apaga tudo que nao esta sob hover
estilo_5 <- girafe_options(
  girafe(ggobj = combo_pais, width_svg = 11, height_svg = 9),
  opts_hover(css = "fill:#e63946;stroke:#1d3557;"),
  opts_hover_inv(css = "opacity:0.15; filter:grayscale(60%); transition: all 0.3s ease;"),
  opts_toolbar(saveaspng = FALSE)
)

# Barra de botoes (HTML/CSS/JS puro) que mostra/esconde cada painel -- so um
# `.estilo-painel` fica visivel por vez, controlado pela classe `.ativo`
estilo_css <- tags$style(HTML("
  .estilo-toolbar { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; font-family: sans-serif; }
  .estilo-btn { padding:8px 14px; border:1px solid #d0d0d0; border-radius:6px; background:#f7f7f7; cursor:pointer; font-size:13px; }
  .estilo-btn:hover { background:#eee; }
  .estilo-btn.ativo { background:#264653; color:white; border-color:#264653; }
  .estilo-painel { display:none; }
  .estilo-painel.ativo { display:block; }
"))

toolbar <- tags$div(
  class = "estilo-toolbar",
  tags$button("1. Por país", class = "estilo-btn ativo", `data-target` = "estilo-1"),
  tags$button("2. Por continente", class = "estilo-btn", `data-target` = "estilo-2"),
  tags$button("3. CSS customizado", class = "estilo-btn", `data-target` = "estilo-3"),
  tags$button("4. Glow avançado", class = "estilo-btn", `data-target` = "estilo-4"),
  tags$button("5. Esmaecer não-selecionado", class = "estilo-btn", `data-target` = "estilo-5")
)

paineis <- tags$div(
  tags$div(id = "estilo-1", class = "estilo-painel ativo", estilo_1),
  tags$div(id = "estilo-2", class = "estilo-painel", estilo_2),
  tags$div(id = "estilo-3", class = "estilo-painel", estilo_3),
  tags$div(id = "estilo-4", class = "estilo-painel", estilo_4),
  tags$div(id = "estilo-5", class = "estilo-painel", estilo_5)
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

# Salvar a pagina interativa (varios widgets girafe + HTML/CSS/JS custom
# numa tagList so) -- mesmo padrao do grafico de linha interativa ggiraph
save_html(pagina, file = "widget.html", libdir = "widget_files")
