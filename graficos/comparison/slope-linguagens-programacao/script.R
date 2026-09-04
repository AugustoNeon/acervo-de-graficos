# Libraries
library(ggplot2)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Slope chart: cada categoria vira UMA linha ligando dois instantes no
# tempo -- tecnica que nenhum outro grafico de `comparison` deste acervo
# usa ainda (os 4 existentes sao halteres/pirambide/pequenos-multiplos/
# intervalo de confianca). O que um slope chart mostra de cara que uma
# barra lado a lado nao mostra: a INCLINACAO da linha e' o proprio dado --
# sobe, desce, ou cruza outra linha -- sem precisar calcular a diferenca
# de cabeca.
set.seed(2409)

linguagens <- data.frame(
  linguagem = c("Python", "JavaScript", "Java", "C++", "TypeScript",
                "Go", "Rust", "PHP", "Ruby", "C#"),
  ano_2020 = c(44, 63, 40, 21, 18, 9, 6, 26, 5, 27),
  ano_2024 = c(52, 61, 30, 15, 38, 17, 21, 16, 5, 28)
)
# Dado 100% ficticio (% de desenvolvedores que reportam usar a linguagem
# com regularidade, numa pesquisa ficticia -- nao precisa somar 100, cada
# linguagem e' independente). A narrativa foi escrita a mao, nao sorteada:
# TypeScript e Rust sobem rapido o bastante pra CRUZAR C++/PHP/Go -- e'
# esse cruzamento, o momento em que uma linha ultrapassa outra, que e' o
# ponto central de qualquer slope chart e nao aconteceria por acaso com
# valores aleatorios independentes.

# Cor por linguagem nasce uma unica vez aqui -- paleta com 10 tons bem
# distintos (RColorBrewer "Paired"), nunca recalculada na versao D3.
paleta <- c(
  "#1F78B4", "#33A02C", "#E31A1C", "#FF7F00", "#6A3D9A",
  "#B15928", "#A6CEE3", "#B2DF8A", "#FB9A99", "#CAB2D6"
)
cor_linguagem <- setNames(paleta, linguagens$linguagem)

# `label` combina nome + valor pra cada ponta -- e' a propria legenda do
# grafico (slope chart classico nao usa legenda separada: o rotulo MORA
# do lado do ponto que ele descreve).
linguagens$rotulo_2020 <- sprintf("%s (%d%%)", linguagens$linguagem, linguagens$ano_2020)
linguagens$rotulo_2024 <- sprintf("%s (%d%%)", linguagens$linguagem, linguagens$ano_2024)

p <- ggplot(linguagens) +
  geom_segment(
    aes(x = 2020, xend = 2024, y = ano_2020, yend = ano_2024, colour = linguagem),
    linewidth = 1.1
  ) +
  geom_point(aes(x = 2020, y = ano_2020, colour = linguagem), size = 2.6) +
  geom_point(aes(x = 2024, y = ano_2024, colour = linguagem), size = 2.6) +
  geom_text(
    aes(x = 2020, y = ano_2020, label = rotulo_2020, colour = linguagem),
    hjust = 1, nudge_x = -0.12, size = 3.3, fontface = "bold"
  ) +
  geom_text(
    aes(x = 2024, y = ano_2024, label = rotulo_2024, colour = linguagem),
    hjust = 0, nudge_x = 0.12, size = 3.3, fontface = "bold"
  ) +
  scale_colour_manual(values = cor_linguagem, guide = "none") +
  scale_x_continuous(breaks = c(2020, 2024), labels = c("2020", "2024"), limits = c(2018, 2026)) +
  labs(
    title = "Uso de linguagens de programação: 2020 x 2024",
    subtitle = "% de desenvolvedores que reportam uso regular (pesquisa fictícia)",
    x = NULL, y = NULL
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold"),
    plot.subtitle = element_text(colour = "grey40", margin = margin(b = 12)),
    axis.text.y = element_blank(),
    axis.text.x = element_text(face = "bold", size = 12),
    panel.grid.minor = element_blank(),
    panel.grid.major.y = element_blank(),
    panel.grid.major.x = element_line(colour = "grey90"),
    plot.margin = margin(t = 10, r = 10, b = 10, l = 10)
  )

ggsave("output.png", plot = p, width = 9, height = 8, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: mesmas linhas, com destaque por linguagem ao apontar
# qualquer trecho dela (linha, ponto ou rotulo) -- sem legenda separada,
# porque o rotulo ao lado de cada ponta ja cumpre esse papel.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(cores = as.list(cor_linguagem)),
  linguagens = lapply(seq_len(nrow(linguagens)), function(i) {
    list(
      linguagem = linguagens$linguagem[i],
      ano2020 = linguagens$ano_2020[i],
      ano2024 = linguagens$ano_2024[i]
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
