# Libraries
library(ggplot2)
library(dplyr)
library(patchwork)
library(RColorBrewer)
library(jsonlite)

# Dados 100% ficticios: receita mensal de um SaaS ficticio por categoria de
# produto, ao longo de 24 meses, em vez do dataset generico (populacao por
# continente) do exemplo original -- ver AGENTS.md "Decisoes fechadas".
# Cada categoria segue uma tendencia propria (uma caindo, duas crescendo em
# ritmos diferentes, uma estavel) mais ruido -- pensado pra que a MISTURA
# (visao percentual) conte uma historia diferente do TOTAL (visao empilhada).
set.seed(5566)
meses <- seq(as.Date("2024-01-01"), by = "month", length.out = 24)
categorias <- c("Assinaturas", "Marketplace", "Consultoria", "Suporte Premium")

tendencia <- function(base, incremento_mensal, n = 24, ruido_sd) {
  pmax(base + incremento_mensal * (0:(n - 1)) + rnorm(n, sd = ruido_sd), 5)
}

dados <- bind_rows(
  data.frame(mes = meses, categoria = "Assinaturas", receita = tendencia(80, 2.6, ruido_sd = 6)),
  data.frame(mes = meses, categoria = "Marketplace", receita = tendencia(12, 4.1, ruido_sd = 4)),
  data.frame(mes = meses, categoria = "Consultoria", receita = tendencia(55, -1.4, ruido_sd = 5)),
  data.frame(mes = meses, categoria = "Suporte Premium", receita = tendencia(20, 0.5, ruido_sd = 3))
)
dados$categoria <- factor(dados$categoria, levels = categorias)
dados$receita <- round(dados$receita, 1)

# Paleta trocada em relacao ao original (paleta padrao/generica do tutorial)
cores <- setNames(brewer.pal(4, "Dark2"), categorias)

tema_poster <- theme_minimal(base_size = 9) +
  theme(legend.position = "none", plot.title = element_text(face = "bold"), axis.title.x = element_blank())

p1 <- ggplot(dados, aes(x = mes, y = receita, fill = categoria)) +
  geom_area(position = "identity", alpha = 0.55, color = "white", linewidth = 0.3) +
  scale_fill_manual(values = cores) +
  guides(fill = guide_legend(override.aes = list(alpha = 1))) +
  labs(title = "Sobreposta", y = "Receita mensal (mil R$)") +
  tema_poster

p2 <- ggplot(dados, aes(x = mes, y = receita, fill = categoria)) +
  geom_area(position = "stack", color = "white", linewidth = 0.3) +
  scale_fill_manual(values = cores) +
  labs(title = "Empilhada", y = NULL) +
  tema_poster

p3 <- ggplot(dados, aes(x = mes, y = receita, fill = categoria)) +
  geom_area(position = "fill", color = "white", linewidth = 0.3) +
  scale_fill_manual(values = cores) +
  scale_y_continuous(labels = scales::percent) +
  labs(title = "Empilhada 100%", y = NULL) +
  tema_poster

poster <- (p1 | p2 | p3) +
  plot_layout(guides = "collect") &
  theme(legend.position = "bottom", legend.title = element_blank())

ggsave("output.png", plot = poster, width = 12, height = 4.6, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3 com um switcher de 3 estados (sobreposta / empilhada
# / percentual) -- as MESMAS 4 areas (chave = categoria) se reorganizam com
# path morphing em vez de trocar de grafico, mesmo principio ja usado no
# barplot agrupado/empilhado/percentual deste acervo, agora com eixo do tempo
# continuo em vez de bandas discretas. O R so exporta a serie BRUTA por
# categoria; o D3 recalcula o empilhamento (d3.stack(), com
# stackOffsetExpand no estado percentual) sozinho.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    categorias = categorias,
    paleta = as.list(cores),
    nota = "Use os botões acima para alternar a variação; passe o cursor sobre uma área pra ver o valor do mês."
  ),
  series = lapply(categorias, function(cat) {
    linha <- dados[dados$categoria == cat, ]
    list(categoria = cat, pontos = lapply(seq_len(nrow(linha)), function(i) {
      list(mes = format(linha$mes[i], "%Y-%m-%d"), receita = linha$receita[i])
    }))
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
