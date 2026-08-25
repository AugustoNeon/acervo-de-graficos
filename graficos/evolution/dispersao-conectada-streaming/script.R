# Libraries
library(ggplot2)
library(ggrepel)
library(dplyr)
library(jsonlite)

# Dados 100% ficticios: preco medio da assinatura x numero de assinantes de
# um servico de streaming ficticio, ano a ano (2009-2024). Construidos a mao
# (em vez de so uma tendencia + ruido) pra desenhar uma historia com reversao
# de proposito: uma guerra de precos (2014-2016) que dispara a base de
# assinantes, seguida de alta gradual de preco com a base ainda crescendo, e
# um reajuste forte no fim (2023-2024) que estagna o crescimento -- o tipo de
# relacao no-monotona que um grafico de linha (preco e assinantes cada um no
# seu proprio eixo do tempo) esconde, e que a dispersao conectada revela de
# uma vez só.
anos <- 2009:2024
preco_base <- c(
  14.9, 15.9, 16.9, 17.9, 18.9,      # 2009-2013: alta gradual
  13.9, 10.9, 9.9,                   # 2014-2016: guerra de precos
  11.9, 14.9, 18.9, 22.9, 26.9, 30.9, # 2017-2022: recuperacao gradual
  38.9, 44.9                         # 2023-2024: reajuste forte
)
assinantes_base <- c(
  0.30, 0.45, 0.65, 0.90, 1.20,      # crescimento lento, preco subindo
  2.10, 4.00, 6.80,                  # dispara com o preco mais baixo
  9.20, 11.50, 13.80, 15.60, 17.10, 18.30, # continua crescendo, preco sobe de novo
  18.10, 18.60                       # estagna com o reajuste forte
)

set.seed(3311)
dados <- data.frame(
  ano = anos,
  preco = round(preco_base + rnorm(length(anos), sd = 0.35), 1),
  assinantes = round(assinantes_base + rnorm(length(anos), sd = 0.12), 2)
)

# Anos marcados com rotulo: primeiro, ultimo, e os dois pontos de virada da
# historia (inicio da guerra de precos e inicio do reajuste forte).
anos_rotulados <- c(2009, 2014, 2016, 2023, 2024)
dados$rotulo <- ifelse(dados$ano %in% anos_rotulados, dados$ano, NA)

# Paleta trocada em relacao ao original (o exemplo do gallery usa uma unica
# cor solida) -- gradiente proprio azul->laranja marcando a passagem do
# tempo, em vez de viridis default (ver AGENTS.md "Decisoes fechadas").
cor_inicio <- "#2E5EAA"
cor_fim <- "#E94F37"

p <- ggplot(dados, aes(x = preco, y = assinantes)) +
  geom_path(
    arrow = arrow(length = unit(0.18, "cm"), type = "closed"),
    color = "grey55", linewidth = 0.6
  ) +
  geom_point(aes(color = ano), size = 3) +
  geom_text_repel(aes(label = rotulo), na.rm = TRUE, seed = 42, size = 3.4, fontface = "bold") +
  scale_color_gradient(low = cor_inicio, high = cor_fim, guide = "none") +
  labs(x = "Preço médio da assinatura (R$/mês)", y = "Assinantes (milhões)") +
  theme_minimal(base_size = 12)

ggsave("output.png", plot = p, width = 8, height = 6, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3 desenha o mesmo caminho conectado com o mesmo
# gradiente por ano, animando o traçado na entrada (o caminho "se desenha"
# na ordem cronologica) e tooltip por ano ao passar o cursor.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    corInicio = cor_inicio,
    corFim = cor_fim,
    anosRotulados = anos_rotulados,
    nota = "Passe o cursor sobre um ponto pra ver o ano. Repare como o caminho volta pra trás em 2023-2024 — um reajuste de preço que fez a base de assinantes estagnar."
  ),
  pontos = lapply(seq_len(nrow(dados)), function(i) {
    list(ano = dados$ano[i], preco = dados$preco[i], assinantes = dados$assinantes[i])
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
