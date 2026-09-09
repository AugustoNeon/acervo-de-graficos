# Libraries
library(ggplot2)
library(dplyr)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Candlestick: preco diario (abertura/maxima/minima/fechamento) de uma
# acao ficticia ao longo de 40 pregoes. Sem pacote financeiro nenhum
# (`quantmod`/`TTR` fazem isso pronto, mas nao estao no apt nem no CRAN
# disponivel nesta sessao) -- cada vela e' so DUAS geometrias sobre o
# mesmo eixo X categorico: um `geom_segment` fino (o pavio, maxima ate
# minima) e um `geom_rect` grosso (o corpo, abertura ate fechamento),
# mesma familia de "monta na mao" ja usada no waffle e no mosaico desta
# base. Fica na categoria general (como bullet/manhattan/ternario/upset)
# por ser um tipo de grafico especializado que nao se encaixa nas
# categorias comuns de comparacao/distribuicao/evolucao.
set.seed(9102)

n_pregoes <- 40
preco_abertura_inicial <- 48.5

# Passeio aleatorio com deriva pequena pra cima (tendencia de alta suave,
# nao um ruido puro) -- cada dia comeca onde o anterior fechou, mais um
# "gap" pequeno (a diferenca entre o fechamento de ontem e a abertura de
# hoje, comum em pregoes reais).
fechamentos <- numeric(n_pregoes)
aberturas <- numeric(n_pregoes)
aberturas[1] <- preco_abertura_inicial
variacao_dia <- rnorm(n_pregoes, 0.18, 1.1)
for (i in seq_len(n_pregoes)) {
  fechamentos[i] <- round(aberturas[i] + variacao_dia[i], 2)
  if (i < n_pregoes) aberturas[i + 1] <- round(fechamentos[i] + rnorm(1, 0, 0.25), 2)
}

# Maxima/minima do dia: sempre alem do maior/menor entre abertura e
# fechamento (o pavio nunca fica mais curto que o corpo), com uma extensao
# aleatoria pequena pra cada lado.
corpo_topo <- pmax(aberturas, fechamentos)
corpo_base <- pmin(aberturas, fechamentos)
maximas <- round(corpo_topo + abs(rnorm(n_pregoes, 0.35, 0.25)), 2)
minimas <- round(corpo_base - abs(rnorm(n_pregoes, 0.35, 0.25)), 2)

dados <- data.frame(
  pregao = seq_len(n_pregoes),
  abertura = aberturas, fechamento = fechamentos,
  maxima = maximas, minima = minimas
) %>%
  mutate(direcao = if_else(fechamento >= abertura, "Alta", "Baixa"))

cor_direcao <- c("Alta" = "#2E8B57", "Baixa" = "#C1443C")

p <- ggplot(dados, aes(x = pregao)) +
  geom_segment(aes(xend = pregao, y = minima, yend = maxima, colour = direcao), linewidth = 0.5) +
  geom_rect(
    aes(xmin = pregao - 0.32, xmax = pregao + 0.32, ymin = pmin(abertura, fechamento), ymax = pmax(abertura, fechamento), fill = direcao),
    colour = NA
  ) +
  scale_colour_manual(values = cor_direcao, guide = "none") +
  scale_fill_manual(values = cor_direcao, name = NULL) +
  scale_x_continuous(breaks = seq(5, 40, by = 5)) +
  labs(
    title = "Preço diário de uma ação fictícia (candlestick)",
    subtitle = "40 pregões · corpo = abertura–fechamento · pavio = mínima–máxima do dia",
    x = "Pregão", y = "Preço (R$)"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14),
    plot.subtitle = element_text(colour = "grey40", margin = margin(b = 10), size = 9.5),
    panel.grid.minor = element_blank(),
    legend.position = "top"
  )

ggsave("output.png", plot = p, width = 9.5, height = 5.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 recebe OHLC bruto por pregao -- ele calcula
# posicao do corpo/pavio sozinho, mesmo principio de sempre desta base.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(cores = as.list(cor_direcao)),
  pregoes = lapply(seq_len(nrow(dados)), function(i) {
    list(
      pregao = dados$pregao[i], abertura = dados$abertura[i], fechamento = dados$fechamento[i],
      maxima = dados$maxima[i], minima = dados$minima[i], direcao = dados$direcao[i]
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
