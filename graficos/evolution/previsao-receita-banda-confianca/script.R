# Libraries
library(ggplot2)
library(dplyr)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Linha com banda de confianca: receita mensal realizada (12 meses) seguida
# de previsao (mais 12 meses) com uma faixa de incerteza que se ALARGA
# quanto mais longe do presente -- o formato classico de qualquer previsao
# financeira ou de demanda. Primeiro grafico da categoria evolution que
# mostra incerteza explicitamente: os outros (area empilhada, dispersao
# conectada, streamgraph, series customizadas) tratam todo ponto como um
# fato conhecido; aqui parte da linha e' um FATO (o passado) e parte e' uma
# ESTIMATIVA com margem de erro crescente (o futuro) -- diferenca central
# em relacao ao grafico de intervalo de confianca ja existente
# (comparison/intervalo-confianca-variantes-teste-ab), que e' uma unica
# medicao por categoria, nao uma serie ao longo do tempo.
set.seed(8811)

n_realizado <- 12
n_previsto <- 12
meses_abrev <- c("Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez")

# Receita realizada: tendencia de alta suave + sazonalidade + ruido real
# (cada mes um pouco diferente do esperado, porque já aconteceu).
tempo_realizado <- 1:n_realizado
receita_realizada <- round(180 + tempo_realizado * 4.2 + 22 * sin(tempo_realizado / 12 * 2 * pi) + rnorm(n_realizado, 0, 6), 1)

# Previsao: continua a mesma tendencia central (sem o ruido do passado,
# porque ainda nao aconteceu), com uma banda que cresce de forma
# proporcional a raiz do horizonte -- convencao comum em previsao de serie
# temporal (a incerteza acumula com o tempo, mas nao linearmente).
tempo_previsto <- (n_realizado + 1):(n_realizado + n_previsto)
horizonte <- 1:n_previsto
receita_central <- round(180 + tempo_previsto * 4.2 + 22 * sin(tempo_previsto / 12 * 2 * pi), 1)
margem <- round(6 + sqrt(horizonte) * 5.5, 1)

dados_realizado <- data.frame(
  indice = tempo_realizado, mes = meses_abrev[((tempo_realizado - 1) %% 12) + 1],
  fase = "Realizado", receita = receita_realizada, banda_min = NA, banda_max = NA
)
dados_previsto <- data.frame(
  indice = tempo_previsto, mes = meses_abrev[((tempo_previsto - 1) %% 12) + 1],
  fase = "Previsto", receita = receita_central,
  banda_min = round(receita_central - margem, 1), banda_max = round(receita_central + margem, 1)
)

# Ponto de emenda: repete o ultimo mes realizado como primeiro ponto da
# previsao, com a MESMA banda (largura zero) -- sem isso a área da banda
# de confiança nasceria com um degrau no primeiro mês previsto em vez de
# crescer suavemente a partir do fim da linha realizada.
emenda <- dados_realizado[n_realizado, ]
emenda$fase <- "Previsto"
emenda$banda_min <- emenda$receita
emenda$banda_max <- emenda$receita

dados <- rbind(dados_realizado, emenda, dados_previsto)

cor_fase <- c("Realizado" = "#2B5B7A", "Previsto" = "#C9793A")

p <- ggplot(dados, aes(x = indice, y = receita)) +
  geom_ribbon(
    data = subset(dados, fase == "Previsto"),
    aes(ymin = banda_min, ymax = banda_max), fill = cor_fase[["Previsto"]], alpha = 0.16
  ) +
  geom_vline(xintercept = n_realizado, linetype = "dotted", colour = "grey45", linewidth = 0.5) +
  geom_line(data = subset(dados, fase == "Realizado"), colour = cor_fase[["Realizado"]], linewidth = 1.1) +
  geom_line(
    data = subset(dados, fase == "Previsto"), aes(group = 1),
    colour = cor_fase[["Previsto"]], linewidth = 1.1, linetype = "22"
  ) +
  annotate("text", x = n_realizado, y = max(dados$banda_max, na.rm = TRUE) * 1.04, label = "hoje", size = 3.4, colour = "grey35", fontface = "bold") +
  scale_x_continuous(breaks = seq(1, 24, by = 3), labels = dados$mes[seq(1, 24, by = 3)]) +
  scale_y_continuous(labels = function(v) paste0("R$ ", v, "mil")) +
  labs(
    title = "Receita mensal: realizado e previsão",
    subtitle = "Linha sólida = já aconteceu · linha tracejada = previsão · faixa = intervalo de confiança",
    x = NULL, y = NULL
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14),
    plot.subtitle = element_text(colour = "grey40", margin = margin(b = 10), size = 9.5),
    panel.grid.minor = element_blank()
  )

ggsave("output.png", plot = p, width = 9, height = 5.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 recebe os pontos brutos (indice, mes, fase,
# receita, banda_min/max) e desenha a mesma composicao (área + duas linhas
# + marcador "hoje"), nunca coordenadas de tela já calculadas.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(cores = as.list(cor_fase), corteRealizado = n_realizado),
  pontos = lapply(seq_len(nrow(dados)), function(i) {
    list(
      indice = dados$indice[i], mes = dados$mes[i], fase = dados$fase[i],
      receita = dados$receita[i],
      bandaMin = dados$banda_min[i],
      bandaMax = dados$banda_max[i]
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA, na = "null")
