# Libraries
library(ggplot2)
library(jsonlite)

# Dados 100% ficticios: alocacao de tempo (horas) num dia ficticio de 24h,
# no lugar dos rotulos genericos ("A","B","C"...) do exemplo original -- ver
# AGENTS.md "Decisoes fechadas"
dados <- data.frame(
  categoria = c("Trabalho", "Sono", "Lazer", "Estudo", "Outros"),
  horas     = c(8.5, 7.5, 3.5, 2.5, 2)
)

# Paleta trocada em relacao ao original (paleta padrao/generica do tutorial)
cores <- c(
  Trabalho = "#4361ee", Sono = "#3a0ca3", Lazer = "#2ec4b6",
  Estudo = "#ff9f1c", Outros = "#adb5bd"
)

# Tecnica classica de rosca em ggplot2: geom_rect() + coord_polar(theta="y"),
# com xlim controlando a espessura do anel -- nao existe um geom_donut()
# pronto no ggplot2
dados$fracao <- dados$horas / sum(dados$horas)
dados$ymax <- cumsum(dados$fracao)
dados$ymin <- c(0, head(dados$ymax, -1))
dados$posicao_label <- (dados$ymax + dados$ymin) / 2
dados$label <- paste0(dados$categoria, "\n", dados$horas, "h")

p <- ggplot(dados, aes(ymax = ymax, ymin = ymin, xmax = 4, xmin = 3, fill = categoria)) +
  geom_rect(color = "white", linewidth = 1) +
  geom_label(
    x = 3.5, aes(y = posicao_label, label = label),
    size = 3.4, fill = "white", linewidth = 0, show.legend = FALSE
  ) +
  scale_fill_manual(values = cores) +
  coord_polar(theta = "y") +
  xlim(c(2, 4)) +
  labs(title = "Alocação de tempo em um dia (dado fictício)") +
  theme_void(base_size = 13) +
  theme(
    legend.position = "none",
    plot.title = element_text(hjust = 0.5, face = "bold")
  )

ggsave("output.png", plot = p, width = 7, height = 7, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3 (d3.pie()+d3.arc()), no proprio runtime
# do site -- mesma regra do resto do acervo. Antes usava o plotly (funcao
# nativa de pizza, hole>0), porque ggplotly() nao converte bem coord_polar();
# esse problema nao existe mais no D3, que desenha a rosca do zero.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(nota = "Passe o cursor numa fatia pra ver o percentual exato."),
  fatias = dados[, c("categoria", "horas")],
  paleta = as.list(cores)
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
