# Libraries
library(ggplot2)
library(patchwork)
library(RColorBrewer)
library(jsonlite)

# Dados ficticios: idade dos participantes de uma corrida de rua de bairro,
# misturando a categoria infantil e a categoria adulta na mesma medicao --
# gera uma distribuicao BIMODAL de proposito (dois grupos etarios bem
# separados), o exemplo classico pra mostrar que a largura do bin muda o que
# o histograma revela: poucos bins fundem os dois grupos numa corcova so,
# bins demais viram ruido, e so uma faixa intermediaria mostra os dois picos
# de verdade.
set.seed(918)

infantil <- pmin(pmax(rnorm(90, mean = 10, sd = 2), 6), 16)
adulto <- pmin(pmax(rnorm(210, mean = 38, sd = 11), 18), 70)
idades <- round(c(infantil, adulto), 1)

cor_barra <- brewer.pal(9, "PuBuGn")[6]

# ---------------------------------------------------------------------------
# Estatico: poster com 3 larguras de bin diferentes sobre o MESMO dado --
# cada painel corresponde a uma posicao do slider da versao interativa (ver
# "Como foi feito" no README).
# ---------------------------------------------------------------------------
tema_poster <- theme_minimal(base_size = 9) + theme(plot.title = element_text(face = "bold"))

p1 <- ggplot(data.frame(idade = idades), aes(x = idade)) +
  geom_histogram(bins = 5, fill = cor_barra, color = "white", linewidth = 0.3) +
  labs(title = "5 bins: esconde os dois grupos", x = "Idade", y = "Participantes") +
  tema_poster

p2 <- ggplot(data.frame(idade = idades), aes(x = idade)) +
  geom_histogram(bins = 18, fill = cor_barra, color = "white", linewidth = 0.3) +
  labs(title = "18 bins: revela os dois grupos", x = "Idade", y = NULL) +
  tema_poster

p3 <- ggplot(data.frame(idade = idades), aes(x = idade)) +
  geom_histogram(bins = 60, fill = cor_barra, color = "white", linewidth = 0.2) +
  labs(title = "60 bins: vira ruído", x = "Idade", y = NULL) +
  tema_poster

poster <- p1 | p2 | p3
ggsave("output.png", plot = poster, width = 11, height = 4.2, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3, com um slider controlando o numero de bins ao vivo
# sobre o MESMO dado -- o R so exporta as idades brutas; o D3 recalcula os
# bins (d3.bin()) a cada posicao do slider e desenha por cima uma curva de
# densidade (KDE gaussiano, ver shared/densidade.ts, a mesma tecnica do
# ridgeline e do violino deste acervo), reescalada pra unidade de contagem
# de acordo com a largura de bin atual -- a curva muda de altura junto com
# o eixo Y a cada posicao do slider, mas a FORMA dela nunca muda, deixando
# visivel que o histograma e so uma discretizacao com perda da mesma
# distribuicao continua por baixo.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    binsPadrao = 18,
    binsMax = 60,
    nota = "Arraste o controle pra mudar o número de bins; a curva mostra a densidade estimada da mesma distribuição."
  ),
  idades = idades
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
