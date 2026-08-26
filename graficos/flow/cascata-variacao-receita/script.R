# Libraries
library(ggplot2)
library(jsonlite)

# Dados 100% ficticios: a receita anual de uma rede pequena de cafeterias, e as
# seis parcelas que explicam a diferenca entre um ano e o outro. Os valores sao
# escritos a mao, nao sorteados -- uma cascata so tem o que mostrar se as
# parcelas contarem uma historia (aqui: o crescimento vem de expansao e
# delivery, e e parcialmente comido por perda de clientes e pelo fechamento de
# uma loja).
#
# A base foi mantida pequena de proposito (2.140 contra parcelas de ate 860):
# com uma base muito maior que as parcelas, as barras do meio viram tracinhos e
# a cascata perde a razao de existir -- e o mesmo motivo pelo qual muita cascata
# real e desenhada sobre a VARIACAO, nao sobre o valor cheio.
passos <- data.frame(
  rotulo = c(
    "Receita 2024", "Novas lojas", "Delivery", "Reajuste de preços",
    "Perda de clientes", "Loja do Centro fechada", "Queda no almoço", "Receita 2025"
  ),
  tipo = c("total", "aumento", "aumento", "aumento", "reducao", "reducao", "reducao", "total"),
  valor = c(2140, 860, 540, 310, -420, -380, -190, NA),
  stringsAsFactors = FALSE
)

# O ultimo passo nao e um dado independente: e a soma de todos os anteriores.
# Calcular (em vez de digitar) garante que a cascata sempre fecha -- uma cascata
# que nao fecha e o erro classico deste tipo de grafico.
passos$valor[nrow(passos)] <- sum(passos$valor[-nrow(passos)], na.rm = TRUE)

# Cada barra ocupa de `inicio` a `fim`. Barras de total partem do zero; barras
# de parcela flutuam, comecando onde a anterior parou.
acumulado <- 0
passos$inicio <- NA_real_
passos$fim <- NA_real_
for (i in seq_len(nrow(passos))) {
  if (passos$tipo[i] == "total") {
    passos$inicio[i] <- 0
    passos$fim[i] <- passos$valor[i]
    acumulado <- passos$valor[i]
  } else {
    passos$inicio[i] <- acumulado
    acumulado <- acumulado + passos$valor[i]
    passos$fim[i] <- acumulado
  }
}

passos$ordem <- seq_len(nrow(passos))
passos$rotulo <- factor(passos$rotulo, levels = passos$rotulo)

# Paleta propria: um par divergente pro sinal da parcela (verde-musgo pra
# aumento, vinho pra reducao) e um cinza-ardosia pros dois totais, que nao sao
# variacao nenhuma e nao devem competir com as parcelas por atencao.
cor_aumento <- "#3F7D58"
cor_reducao <- "#9E2A2B"
cor_total <- "#2F3E46"
cor_conector <- "#C7CDD3"

paleta <- c(aumento = cor_aumento, reducao = cor_reducao, total = cor_total)

# Conector: liga o fim de uma barra ao inicio da proxima. Sem ele a cascata vira
# uma fileira de barras soltas em alturas arbitrarias, e a ideia de "encadeado"
# -- que e a unica coisa que o grafico tem a mais que um barplot -- desaparece.
conectores <- data.frame(
  x = passos$ordem[-nrow(passos)] + 0.32,
  xend = passos$ordem[-1] - 0.32,
  y = passos$fim[-nrow(passos)]
)

num <- formatC(passos$valor, big.mark = ".", decimal.mark = ",", format = "d")
# O sinal precisa ser colado a mao: `formatC`/`sprintf` ja escrevem o "-" dos
# negativos, mas nenhum flag de `%s` acrescenta o "+" dos positivos -- e numa
# cascata o sinal e a informacao principal de cada parcela, nao decoracao.
passos$rotulo_valor <- ifelse(
  passos$tipo == "total", num,
  ifelse(passos$valor > 0, paste0("+", num), num)
)
# Rotulo de parcela fica sempre do lado de FORA da barra (acima se ela sobe,
# abaixo se ela desce), pra nao depender da altura da barra pra caber.
passos$y_rotulo <- ifelse(
  passos$tipo == "reducao",
  pmin(passos$inicio, passos$fim) - 90,
  pmax(passos$inicio, passos$fim) + 90
)

p <- ggplot(passos) +
  geom_segment(
    data = conectores, aes(x = x, xend = xend, y = y, yend = y),
    colour = cor_conector, linewidth = 0.7
  ) +
  geom_rect(
    aes(xmin = ordem - 0.32, xmax = ordem + 0.32, ymin = inicio, ymax = fim, fill = tipo)
  ) +
  geom_text(aes(x = ordem, y = y_rotulo, label = rotulo_valor, colour = tipo),
            size = 3.1, fontface = "bold", show.legend = FALSE) +
  scale_fill_manual(values = paleta, guide = "none") +
  scale_colour_manual(values = c(aumento = cor_aumento, reducao = cor_reducao, total = "grey25"), guide = "none") +
  scale_x_continuous(breaks = passos$ordem, labels = levels(passos$rotulo), expand = c(0.02, 0)) +
  scale_y_continuous(
    labels = function(v) formatC(v, big.mark = ".", decimal.mark = ",", format = "d"),
    expand = expansion(mult = c(0, 0.08))
  ) +
  labs(
    title = "De 2024 para 2025: o que explica a diferença na receita",
    subtitle = "Cada barra do meio é uma parcela da variação, começando onde a anterior parou. As duas barras escuras são os totais dos dois anos.",
    x = NULL, y = "Receita anual (mil R$)"
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold"),
    plot.subtitle = element_text(colour = "grey35", size = 9, margin = margin(b = 12)),
    panel.grid.major.x = element_blank(),
    panel.grid.minor = element_blank(),
    axis.text.x = element_text(angle = 22, hjust = 1, colour = "grey15")
  )

ggsave("output.png", plot = p, width = 9.5, height = 6, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 desenha a mesma cascata como estado inicial e
# acrescenta duas coisas que a imagem estatica nao tem. (1) Um segundo modo,
# "contribuicoes", em que todas as parcelas partem do zero -- a cascata responde
# "como se chegou ao total", esse modo responde "qual foi a maior alavanca",
# que e uma pergunta diferente e igualmente comum. (2) Reordenar as parcelas por
# impacto em vez da ordem do relato, mantendo os dois totais nas pontas.
#
# O R exporta so os numeros e a paleta; o acumulado e recalculado no D3, porque
# ele MUDA quando a ordem das parcelas muda.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    unidade = "mil R$",
    paleta = list(
      aumento = cor_aumento,
      reducao = cor_reducao,
      total = cor_total,
      conector = cor_conector
    ),
    nota = paste(
      "Reordenar por impacto mantém os dois totais nas pontas e a cascata fecha",
      "no mesmo lugar — a ordem das parcelas muda o caminho, nunca o destino."
    )
  ),
  passos = lapply(seq_len(nrow(passos)), function(i) {
    list(
      rotulo = as.character(passos$rotulo[i]),
      tipo = passos$tipo[i],
      valor = passos$valor[i]
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
