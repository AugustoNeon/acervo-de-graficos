# Libraries
library(ggplot2)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- ver AGENTS.md,
# "Licoes aprendidas" de 2026-09-01.
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# 1954: ano do Gojira original. Semente fixa -- o ruido de fundo precisa ser o
# mesmo em toda reexecucao, senao o PNG e o data.json divergem.
set.seed(1954)

# ---------------------------------------------------------------- parametros
# Janela de 660 s decimada em 660 colunas: 1 coluna por segundo, exatamente
# 20 amostras de simulacao por coluna. A decimacao e' pico-a-pico (min/max do
# segundo), que e' como um visualizador de sismograma de verdade desenha uma
# janela longa -- guardar as 13.200 amostras cruas de cada estacao daria um
# data.json 20x maior pra desenhar o MESMO tracado na tela.
DURACAO    <- 660    # s de registro
TAXA_SIM   <- 20     # Hz da simulacao interna
BINS       <- 660    # colunas exportadas (1 s cada)
PASSO      <- 2.8    # s entre pegadas
F_PEGADA   <- 2.1    # Hz da oscilacao gerada por uma pegada
TAU        <- 0.75   # s de decaimento da oscilacao
T_EMERSAO  <- 45     # s -- instante em que a criatura sai da agua
VELOCIDADE <- 0.55 / 60   # km/s (33 km/h)
T_RUGIDO   <- 470    # s -- evento de banda larga que atinge todas as estacoes

# Estacoes reais do corredor Toquio-baia (a rota de desembarque classica do
# genero), pela distancia em km a partir do ponto de emersao. A ultima esta
# longe o bastante pra ainda estar SUBINDO quando o registro termina -- e' o
# que faz o grafico terminar em suspense em vez de em resolucao.
estacoes <- data.frame(
  codigo = c("TKB", "HND", "KMT", "OMR", "OOI", "SGW", "TMC", "SMB"),
  nome   = c("TOKYO-WAN", "HANEDA", "KAMATA", "OMORI",
             "OI", "SHINAGAWA", "TAMACHI", "SHIMBASHI"),
  km     = c(0.0, 0.8, 1.7, 2.6, 3.4, 4.2, 5.1, 6.0),
  # Nenhuma estacao fica EXATAMENTE em cima da rota: o desvio lateral e' o que
  # impede a amplitude de ir ao infinito na passagem mais proxima.
  desvio = c(0.55, 0.30, 0.22, 0.38, 0.30, 0.18, 0.42, 0.35),
  stringsAsFactors = FALSE
)

# ------------------------------------------------------------------ simulacao
t <- seq(0, DURACAO - 1 / TAXA_SIM, by = 1 / TAXA_SIM)
n <- length(t)

# Posicao da criatura na rota (km). Antes de emergir nao existe fonte sismica.
posicao <- pmax(0, (t - T_EMERSAO) * VELOCIDADE)

# Instantes de pegada: uma a cada PASSO segundos, so depois da emersao.
pegadas <- seq(T_EMERSAO, DURACAO, by = PASSO)
pos_pegada <- (pegadas - T_EMERSAO) * VELOCIDADE

# Atenuacao: espalhamento geometrico (1/d) + absorcao anelastica (exp(-alpha*d)),
# o par que descreve como energia sismica perde amplitude com a distancia.
atenuar <- function(d) exp(-0.62 * d) / (d + 0.28)^1.05

tracos <- matrix(0, nrow = n, ncol = nrow(estacoes))

for (i in seq_len(nrow(estacoes))) {
  # Ruido de fundo (microssismo urbano): sempre presente, e' o que faz o
  # traco parecer um registro de verdade em vez de uma linha reta esperando.
  sinal <- rnorm(n, sd = 0.9)

  # Cada pegada e' um impulso amortecido -- a assinatura de um evento sismico
  # impulsivo. A soma delas E' o tracado.
  for (k in seq_along(pegadas)) {
    d <- sqrt((pos_pegada[k] - estacoes$km[i])^2 + estacoes$desvio[i]^2 + 0.04)
    amp <- 1000 * atenuar(d)
    if (amp < 0.4) next  # pegada longe demais pra contribuir com algo visivel

    dt <- t - pegadas[k] - d / 3.2   # d/3.2 = tempo de viagem da onda S (km/s)
    ativo <- dt >= 0 & dt < 6 * TAU
    sinal[ativo] <- sinal[ativo] +
      amp * exp(-dt[ativo] / TAU) * sin(2 * pi * F_PEGADA * dt[ativo])
  }

  # Rugido: evento de banda larga que atinge todas as estacoes quase junto
  # (acoplamento acustico, nao sismico -- por isso atenua muito menos com a
  # distancia que as pegadas).
  d_rugido <- sqrt((VELOCIDADE * (T_RUGIDO - T_EMERSAO) - estacoes$km[i])^2 +
                     estacoes$desvio[i]^2)
  dt_r <- t - T_RUGIDO - d_rugido / 0.34   # 0.34 km/s = velocidade do som
  ativo_r <- dt_r >= 0 & dt_r < 14
  sinal[ativo_r] <- sinal[ativo_r] +
    (980 / (1 + d_rugido)^0.5) * exp(-dt_r[ativo_r] / 3.4) *
    sin(2 * pi * 1.15 * dt_r[ativo_r]) * (1 + 0.5 * rnorm(sum(ativo_r), sd = 0.35))

  tracos[, i] <- sinal
}

# --------------------------------------------------------------- decimacao
# min/max de cada segundo: o par que preserva a ENVOLTORIA real do tracado.
# Guardar so a media apagaria justamente os picos, que sao o dado.
bin <- rep(seq_len(BINS), each = n / BINS)
minimos <- apply(tracos, 2, function(col) as.numeric(tapply(col, bin, min)))
maximos <- apply(tracos, 2, function(col) as.numeric(tapply(col, bin, max)))

# Normaliza pelo maior pico do registro inteiro (nao por estacao!): a altura de
# um traco tem que ser comparavel com a do vizinho, senao a estacao mais calma
# pareceria tao violenta quanto a mais atingida.
pico_global <- max(abs(c(minimos, maximos)))
minimos_n <- minimos / pico_global
maximos_n <- maximos / pico_global

# ------------------------------------------------------------------ metricas
# Escala de intensidade sismica JMA (shindo 0-7), a mesma que a TV japonesa
# estampa em tela durante um terremoto -- aqui derivada do pico de cada estacao.
shindo <- function(p) {
  # A escala JMA termina em 7 -- nao existe shindo 8, por mais forte que seja
  # o evento. O teto e' da escala, nao do dado.
  faixas <- c(0.02, 0.05, 0.11, 0.21, 0.36, 0.55, 0.78)
  min(sum(p >= faixas), 7)
}

picos <- pmax(apply(abs(maximos_n), 2, max), apply(abs(minimos_n), 2, max))
t_pico <- apply(pmax(abs(maximos_n), abs(minimos_n)), 2, which.max) - 1
estacoes$pico <- round(picos, 4)
estacoes$t_pico <- t_pico
estacoes$shindo <- vapply(picos, shindo, numeric(1))
# Pico em mm/s: o registro inteiro escalado pra uma unidade fisica plausivel
# de velocidade de solo (PGV) -- 42 mm/s e' dano estrutural leve.
estacoes$pgv <- round(picos * 42, 2)
estacoes$dist_min <- round(sqrt(pmax(0, estacoes$km -
  max(pos_pegada))^2 + estacoes$desvio^2), 2)

# ------------------------------------------------------------------- paleta
# Tres cores + dois limiares, exportados. O PNG e o D3 aplicam a MESMA regra
# aos MESMOS numeros -- e' mais forte que exportar a cor de cada coluna
# (5.280 strings), porque impede divergencia por construcao em vez de por
# combinacao.
PALETA <- c(calmo = "#3DDCF2", alerta = "#F2B01E", critico = "#FF2E4D")
LIMIARES <- c(alerta = 0.16, critico = 0.46)

cor_de <- function(amp) {
  ifelse(amp >= LIMIARES[["critico"]], PALETA[["critico"]],
    ifelse(amp >= LIMIARES[["alerta"]], PALETA[["alerta"]], PALETA[["calmo"]]))
}

# --------------------------------------------------------------------- PNG
# Cada estacao ocupa uma faixa horizontal propria; o traco e' desenhado como um
# segmento vertical por segundo (min ate max), que e' exatamente o que um
# tambor de sismografo imprime.
GANHO <- 0.44   # altura de um traco em unidades de faixa
long <- do.call(rbind, lapply(seq_len(nrow(estacoes)), function(i) {
  data.frame(
    faixa = nrow(estacoes) - i + 1,
    seg = seq_len(BINS) - 1,
    baixo = minimos_n[, i] * GANHO,
    alto = maximos_n[, i] * GANHO,
    amp = pmax(abs(minimos_n[, i]), abs(maximos_n[, i])),
    stringsAsFactors = FALSE
  )
}))
long$cor <- cor_de(long$amp)

p <- ggplot(long) +
  geom_segment(
    aes(x = seg, xend = seg, y = faixa + baixo, yend = faixa + alto, colour = cor),
    linewidth = 0.22
  ) +
  scale_colour_identity() +
  scale_x_continuous(
    limits = c(0, BINS), expand = c(0, 0),
    breaks = seq(0, BINS, by = 120),
    labels = function(v) sprintf("%02d:%02d", v %/% 60, v %% 60)
  ) +
  scale_y_continuous(
    breaks = nrow(estacoes):1,
    labels = estacoes$nome,
    expand = expansion(add = 0.6)
  ) +
  labs(
    title = "SISMOGRAFO KAIJU  /  REGISTRO 11:00",
    subtitle = "8 estacoes, corredor Tokyo-wan -> Shimbashi. Dado ficticio.",
    x = NULL, y = NULL
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.background = element_rect(fill = "#07090C", colour = NA),
    panel.background = element_rect(fill = "#07090C", colour = NA),
    panel.grid = element_blank(),
    plot.title = element_text(colour = "#F2F5F7", face = "bold", family = "mono", size = 13),
    plot.subtitle = element_text(colour = "#7C8A96", family = "mono", size = 8.5),
    axis.text.x = element_text(colour = "#7C8A96", family = "mono", size = 8),
    axis.text.y = element_text(colour = "#C9D4DC", family = "mono", size = 8.5, hjust = 1),
    axis.ticks = element_blank(),
    plot.margin = margin(t = 14, r = 18, b = 12, l = 10)
  )

ggsave("output.png", plot = p, width = 10, height = 5.6, dpi = 150, bg = "#07090C")

# -------------------------------------------------------------------- JSON
# Amplitudes viram inteiros de -1000 a 1000 e vao num array PLANO e
# intercalado (min,max,min,max...): 660 pares por estacao. Array plano em vez
# de aninhado corta ~20% do arquivo em colchetes, e o desenho le em pares de
# qualquer forma.
achatar <- function(i) {
  as.integer(round(as.vector(rbind(minimos_n[, i], maximos_n[, i])) * 1000))
}

viz <- list(
  meta = list(
    duracao = DURACAO,
    bins = BINS,
    segundosPorBin = DURACAO / BINS,
    escala = 1000,
    unidade = "mm/s",
    pgvMaximo = round(max(estacoes$pgv), 2),
    emersao = T_EMERSAO,
    rugido = T_RUGIDO,
    passo = PASSO,
    paleta = as.list(PALETA),
    limiares = as.list(LIMIARES)
  ),
  # So as pegadas que a rota realmente produziu, pro desenho pulsar no MESMO
  # ritmo do dado em vez de num intervalo inventado no JS.
  pegadas = as.integer(round(pegadas)),
  estacoes = lapply(seq_len(nrow(estacoes)), function(i) {
    list(
      codigo = estacoes$codigo[i],
      nome = estacoes$nome[i],
      km = estacoes$km[i],
      pico = estacoes$pico[i],
      tPico = as.integer(estacoes$t_pico[i]),
      shindo = as.integer(estacoes$shindo[i]),
      pgv = estacoes$pgv[i],
      traco = I(achatar(i))
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)

cat("pico global (unidades cruas):", round(pico_global, 1), "\n")
cat("shindo por estacao:", paste(estacoes$nome, estacoes$shindo, sep = "="), "\n")
cat("pgv max (mm/s):", max(estacoes$pgv), "\n")
