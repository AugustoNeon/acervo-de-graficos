# Libraries
library(ggplot2)
library(jsonlite)

# Dados ficticios: downloads diarios de um app fictício ao longo de ~300 dias,
# com tendencia de crescimento + sazonalidade semanal (picos no fim de semana)
# + ruido -- no lugar do CSV real de contagem de bicicletas (~300 linhas,
# hospedado no GitHub do gallery) do exemplo original, ver AGENTS.md
# "Decisoes fechadas"
set.seed(1907)
n_dias <- 300
datas <- seq(as.Date("2025-01-01"), by = "day", length.out = n_dias)
dia_semana <- as.numeric(format(datas, "%u")) # 1=seg ... 7=dom
tendencia <- seq(0, 60, length.out = n_dias)
sazonalidade <- ifelse(dia_semana %in% c(6, 7), 25, 0)
ruido <- rnorm(n_dias, mean = 0, sd = 8)
downloads <- pmax(round(120 + tendencia + sazonalidade + ruido), 0)

dados <- data.frame(data = datas, downloads = downloads)
cor <- "#2a9d8f"

# Estatico: a mesma serie completa, sem media movel nem recorte -- e o estado
# em que a versao interativa nasce, antes de qualquer interacao com o
# controle deslizante ou a faixa de selecao.
p <- ggplot(dados, aes(x = data, y = downloads)) +
  geom_area(fill = cor, alpha = 0.15) +
  geom_line(color = cor, linewidth = 0.9) +
  scale_x_date(date_labels = "%b/%y", expand = expansion(mult = c(0.01, 0.03))) +
  labs(
    title = "Downloads diários de um app (dado fictício)",
    x = NULL, y = "Downloads"
  ) +
  theme_minimal(base_size = 13) +
  theme(
    plot.title = element_text(face = "bold", size = 16),
    panel.grid.minor = element_blank(),
    plot.margin = margin(t = 10, r = 16, b = 8, l = 8)
  )

ggsave("output.png", plot = p, width = 9, height = 5.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3, no proprio runtime do site. Ao contrario
# do widget dygraphs (que ja vem com seletor de intervalo, media movel e
# crosshair prontos), aqui as tres interacoes sao recalculadas no navegador --
# o script exporta so a serie bruta, a media movel inicial fica por conta do
# D3.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    cor = cor,
    unidade = "downloads",
    rollInicial = 3,
    rollMax = 21,
    nota = "Arraste as bordas da faixa inferior pra recortar um período; o controle deslizante ajusta a média móvel em tempo real."
  ),
  serie = data.frame(data = format(dados$data, "%Y-%m-%d"), valor = dados$downloads)
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
