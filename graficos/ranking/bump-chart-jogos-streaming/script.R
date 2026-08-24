# Libraries
library(ggplot2)
library(dplyr)
library(RColorBrewer)
library(jsonlite)

# Dados ficticios: ranking mensal dos 7 jogos mais assistidos numa plataforma
# ficticia de streaming de gameplay, ao longo de 12 meses. Cada jogo tem uma
# pontuacao de popularidade que segue um passeio aleatorio com deriva propria
# (nao um ranking sorteado do zero a cada mes) -- gera trajetorias com
# momento (um jogo em ascensao continua subindo por varios meses), com um
# lancamento no meio do ano que dispara e vira o mais assistido em poucos
# meses, o padrao classico que um bump chart existe pra mostrar.
set.seed(3391)

jogos <- c(
  "Corrida Nebulosa", "Reino de Cristal", "Arena Cyberpunk",
  "Fazenda Encantada", "Batalha Estelar", "Labirinto Quântico", "Vale Sombrio"
)
n_jogos <- length(jogos)
n_meses <- 12
meses_abrev <- c("jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez")

pontuacao <- matrix(NA_real_, nrow = n_jogos, ncol = n_meses, dimnames = list(jogos, NULL))
pontuacao[, 1] <- round(runif(n_jogos, 40, 90))
deriva <- rnorm(n_jogos, mean = 0, sd = 2.2)
for (m in 2:n_meses) {
  passo <- deriva + rnorm(n_jogos, mean = 0, sd = 6)
  pontuacao[, m] <- pmax(5, pontuacao[, m - 1] + passo)
}
# "Vale Sombrio" e o lancamento do meio do ano: comeca baixo e ganha um pico
# de popularidade a partir do mes 6, decaindo devagar depois -- por isso
# escapa do passeio aleatorio geral acima.
pontuacao["Vale Sombrio", ] <- pmax(5, c(
  rep(8, 5),
  c(70, 110, 128, 118, 104, 92, 84)
))

dados_longo <- expand.grid(jogo = jogos, mes = seq_len(n_meses)) |>
  mutate(pontuacao = pontuacao[cbind(match(jogo, jogos), mes)]) |>
  group_by(mes) |>
  mutate(rank = rank(-pontuacao, ties.method = "first")) |>
  ungroup()

# Paleta categorica (uma cor por jogo). Pastel2 (usada numa primeira versao)
# saiu clara demais pra linhas finas de 1.3pt -- baixo contraste contra o
# fundo branco, dificil de distinguir uma linha da outra. "Set1" tem
# contraste bem mais alto (e o proposito dela: ColorBrewer a descreve como
# "printer-friendly, colorblind-friendly"), mas seu amarelo padrao (indice 6)
# e o oposto disso -- quase invisivel no branco. Pulamos o amarelo e o cinza
# (indice 9, se confunde com a grade) e ficamos com os 7 tons mais escuros.
cores <- setNames(brewer.pal(9, "Set1")[c(1, 2, 3, 4, 5, 7, 8)], jogos)

rotulos_pontas <- dados_longo |> filter(mes %in% c(1, n_meses))

p <- ggplot(dados_longo, aes(x = mes, y = rank, group = jogo, color = jogo)) +
  geom_line(linewidth = 1.3) +
  geom_point(size = 2.6, color = "white", fill = NA) +
  geom_point(size = 1.6) +
  geom_text(
    data = filter(rotulos_pontas, mes == 1),
    aes(label = jogo), hjust = 1, nudge_x = -0.3, size = 3.1, fontface = "bold"
  ) +
  geom_text(
    data = filter(rotulos_pontas, mes == n_meses),
    aes(label = jogo), hjust = 0, nudge_x = 0.3, size = 3.1, fontface = "bold"
  ) +
  scale_y_reverse(breaks = 1:n_jogos, labels = paste0(1:n_jogos, "º")) +
  scale_x_continuous(
    breaks = 1:n_meses, labels = meses_abrev,
    limits = c(1 - 2.6, n_meses + 2.6), expand = c(0, 0)
  ) +
  scale_color_manual(values = cores, guide = "none") +
  labs(x = NULL, y = "Posição no ranking") +
  theme_minimal(base_size = 12) +
  theme(
    panel.grid.minor = element_blank(),
    panel.grid.major.x = element_blank()
  )

ggsave("output.png", plot = p, width = 10, height = 6.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3 no proprio runtime do site. O script so
# exporta a serie longa (jogo, mes, rank, pontuacao) e a cor de cada jogo --
# a curva de cada linha e a posicao de cada ponto sao recalculadas no D3 a
# partir das mesmas duas escalas lineares (mes -> x, rank -> y), o mesmo
# principio de "so o dado bruto vem do R" ja usado no resto do acervo.
viz <- list(
  meta = list(nota = "Passe o cursor num jogo ou numa linha pra acompanhar a posição dele em todos os meses."),
  meses = data.frame(mes = seq_len(n_meses), rotulo = meses_abrev),
  jogos = data.frame(jogo = jogos, cor = unname(cores[jogos])),
  pontos = dados_longo |> select(jogo, mes, rank, pontuacao) |> arrange(jogo, mes)
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
