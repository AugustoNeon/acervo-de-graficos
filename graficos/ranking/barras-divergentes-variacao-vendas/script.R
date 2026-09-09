# Libraries
library(ggplot2)
library(dplyr)
library(forcats)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Barras divergentes: variacao percentual de vendas por categoria de produto
# em relacao a media da rede de lojas (o "zero" nao e ausencia de venda, e a
# media -- por isso barras pra cima E pra baixo do eixo, nao um ranking
# comum que so cresce a partir de zero real). Primeiro gráfico divergente
# da categoria ranking (as outras entradas -- barplot, lollipop, bump,
# circular -- sao todas rankings de valor absoluto, nunca de desvio a
# partir de uma referencia).
set.seed(2917)

categorias <- c(
  "Eletrônicos", "Vestuário", "Alimentos", "Beleza", "Brinquedos",
  "Livros", "Papelaria", "Móveis", "Esportes", "Pet Shop"
)

# Variacao ficticia (%) em relacao a media da rede no trimestre -- gerada
# com uma tendencia base por categoria (nao puramente aleatoria) pra sair
# um miolo de categorias proximas de zero e caudas nos dois extremos, do
# jeito que um dado real de varejo costuma se comportar.
tendencia <- c(18, 11, -3, 14, -9, -15, -6, 6, 9, -12)
variacao <- round(tendencia + rnorm(length(categorias), 0, 2.4), 1)

dados <- data.frame(categoria = categorias, variacao = variacao) %>%
  mutate(
    sinal = if_else(variacao >= 0, "Acima da média", "Abaixo da média"),
    categoria = fct_reorder(categoria, variacao)
  ) %>%
  arrange(variacao)

cor_sinal <- c("Acima da média" = "#1F7A5C", "Abaixo da média" = "#B5482E")

p <- ggplot(dados, aes(x = categoria, y = variacao, fill = sinal)) +
  geom_col(width = 0.68) +
  geom_hline(yintercept = 0, colour = "grey35", linewidth = 0.5) +
  geom_text(
    aes(
      label = paste0(if_else(variacao >= 0, "+", ""), variacao, "%"),
      hjust = if_else(variacao >= 0, -0.15, 1.15)
    ),
    size = 3.4, fontface = "bold", colour = "grey20"
  ) +
  coord_flip(clip = "off") +
  scale_fill_manual(values = cor_sinal, name = NULL) +
  scale_y_continuous(limits = c(min(dados$variacao) - 6, max(dados$variacao) + 6)) +
  labs(
    title = "Variação de vendas por categoria vs. média da rede",
    subtitle = "Trimestre atual, em % sobre a média de todas as lojas",
    x = NULL, y = "Variação (%)"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14),
    plot.subtitle = element_text(colour = "grey40", margin = margin(b = 10)),
    panel.grid.major.y = element_blank(),
    panel.grid.minor = element_blank(),
    legend.position = "top",
    axis.text.y = element_text(face = "bold", colour = "grey20")
  )

ggsave("output.png", plot = p, width = 8.5, height = 6, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 recebe os valores brutos (categoria + variacao) e
# recalcula a propria escala/ordenacao -- mesmo principio ja usado nos
# outros graficos desta base (nunca exportar posicao/geometria pronta).
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(cores = as.list(cor_sinal)),
  dados = lapply(seq_len(nrow(dados)), function(i) {
    list(
      categoria = as.character(dados$categoria[i]),
      variacao = dados$variacao[i],
      sinal = dados$sinal[i]
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
