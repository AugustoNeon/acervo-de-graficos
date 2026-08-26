# Libraries
library(ggplot2)
library(jsonlite)

# Dados 100% ficticios: tempo medio de espera (em dias) por especialidade numa
# rede de clinicas ficticia, medido em dois momentos -- antes e depois de um
# programa de reorganizacao de agendas.
#
# Os valores sao escritos a mao, nao sorteados: o objetivo e que a comparacao
# tenha uma HISTORIA legivel, e ruido aleatorio puro nao produz historia. Aqui
# a maioria das especialidades melhorou (algumas muito), mas tres pioraram --
# e sao justamente as tres em que a demanda cresceu no periodo. Um dumbbell
# com todas as variacoes no mesmo sentido nao mostraria nada que uma tabela
# ordenada nao mostrasse.
especialidades <- c(
  "Dermatologia", "Oftalmologia", "Ortopedia", "Cardiologia",
  "Ginecologia", "Pediatria", "Clínica Geral", "Otorrinolaringologia",
  "Endocrinologia", "Psiquiatria", "Neurologia", "Reumatologia"
)
antes  <- c(42, 38, 35, 29, 26, 18, 12, 24, 31, 27, 33, 30)
depois <- c(21, 19, 22, 18, 17, 12,  8, 21, 30, 33, 41, 44)

dados <- data.frame(
  especialidade = especialidades,
  antes = antes,
  depois = depois,
  stringsAsFactors = FALSE
)
dados$delta <- dados$depois - dados$antes

# Ordem de leitura padrao: maior espera atual no topo. E a mesma ordem inicial
# da versao interativa (que deixa reordenar ao vivo), pra que a imagem estatica
# e o primeiro quadro do grafico interativo sejam a mesma coisa.
dados <- dados[order(dados$depois), ]
dados$especialidade <- factor(dados$especialidade, levels = dados$especialidade)

# Paleta propria deste grafico. Duas familias de cor com papeis diferentes, que
# e o ponto do dumbbell: os dois PONTOS sao o mesmo indicador em dois momentos
# (taupe = antes, teal = depois), enquanto o SINAL da variacao usa um par
# divergente (teal = melhorou, carmim = piorou). O teal aparece nos dois papeis
# de proposito -- "depois" e "melhor" apontam pro mesmo lado da historia.
cor_antes   <- "#B08968"
cor_depois  <- "#0B7A75"
cor_melhora <- "#0B7A75"
cor_piora   <- "#B23A48"

dados$cor_delta <- ifelse(dados$delta <= 0, cor_melhora, cor_piora)
dados$rotulo_delta <- sprintf("%+d", dados$delta)

p <- ggplot(dados, aes(y = especialidade)) +
  geom_segment(
    aes(x = antes, xend = depois, yend = especialidade),
    colour = "#C9CDD2", linewidth = 2.2, lineend = "round"
  ) +
  # shape 21 (circulo com contorno) em vez de shape 19: o `fill` mapeado deixa
  # o ggplot2 montar a legenda dos dois momentos sozinho, e o `colour` fixo
  # branco separa os dois pontos quando a variacao e pequena e eles quase se
  # encostam (Endocrinologia, -1 dia).
  geom_point(aes(x = antes, fill = "2023"), shape = 21, colour = "white", stroke = 0.7, size = 4.6) +
  geom_point(aes(x = depois, fill = "2025"), shape = 21, colour = "white", stroke = 0.7, size = 4.6) +
  geom_text(
    aes(x = 50, label = rotulo_delta, colour = cor_delta),
    hjust = 1, size = 3.4, fontface = "bold", family = "sans"
  ) +
  scale_colour_identity() +
  scale_fill_manual(name = NULL, values = c("2023" = cor_antes, "2025" = cor_depois)) +
  scale_x_continuous(limits = c(0, 51), breaks = seq(0, 45, 15)) +
  labs(
    title = "Espera por especialidade: antes e depois da reorganização de agendas",
    subtitle = "Cada haste liga a espera média de um ano à do outro. À direita, a variação em dias.",
    x = "Tempo médio de espera (dias)", y = NULL
  ) +
  theme_minimal(base_size = 11) +
  theme(
    legend.position = "top",
    legend.justification = "left",
    legend.margin = margin(t = 0, b = 4),
    plot.title = element_text(face = "bold"),
    plot.subtitle = element_text(colour = "grey35", size = 9, margin = margin(b = 8)),
    panel.grid.major.y = element_blank(),
    panel.grid.minor.x = element_blank(),
    axis.text.y = element_text(colour = "grey15")
  )

ggsave("output.png", plot = p, width = 9, height = 6, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 desenha o MESMO dumbbell como estado inicial e
# acrescenta duas outras codificacoes do mesmo par de valores -- inclinacao
# (slope) e barras divergentes -- alternaveis com transicao continua, mais
# reordenacao ao vivo. Nenhuma das duas tem equivalente na imagem estatica, do
# mesmo jeito que os modos de cor do sunburst deste acervo.
#
# O R exporta so os numeros e a paleta; a geometria dos tres estados e
# calculada no D3, porque cada um depende da largura disponivel na pagina.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    rotuloAntes = "2023",
    rotuloDepois = "2025",
    unidade = "dias",
    paleta = list(
      antes = cor_antes,
      depois = cor_depois,
      melhora = cor_melhora,
      piora = cor_piora,
      haste = "#C9CDD2"
    ),
    nota = paste(
      "Alterne entre halteres, inclinação e barras divergentes:",
      "são os mesmos dois números por especialidade, lidos como distância,",
      "como trajetória e como saldo."
    )
  ),
  linhas = lapply(seq_len(nrow(dados)), function(i) {
    list(
      especialidade = as.character(dados$especialidade[i]),
      antes = dados$antes[i],
      depois = dados$depois[i],
      delta = dados$delta[i]
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
