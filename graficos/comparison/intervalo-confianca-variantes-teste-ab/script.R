# Libraries
library(ggplot2)
library(jsonlite)

# Dados 100% ficticios: taxa de conversao de 5 variantes de um teste A/B/C/D/E
# num checkout de e-commerce, com erro padrao POR variante (nao um valor
# unico pra todas) -- escrito a mao, nao sorteado, pra desenhar quatro
# historias diferentes ao mesmo tempo: duas variantes indistinguiveis (A e B
# tem intervalos que se sobrepoem), uma claramente melhor (C), uma
# claramente pior (D), e uma com amostra pequena demais pra concluir
# qualquer coisa (E, intervalo larguissimo mesmo com media parecida com A).
# Sem essas quatro historias lado a lado, o grafico so mostraria "medias
# diferentes", sem a licao real que intervalo de confianca ensina: media
# diferente nao e o mesmo que diferenca comprovada.
variantes <- c("A (controle)", "B", "C", "D", "E")
n         <- c(8400, 8150, 8300, 8250, 420)
media     <- c(4.2, 4.5, 5.7, 2.9, 4.9)
erro_padrao <- c(0.22, 0.24, 0.23, 0.20, 1.05)

dados <- data.frame(
  variante = factor(variantes, levels = rev(variantes)),
  n = n,
  media = media,
  erro_padrao = erro_padrao
)
dados$ic_inf <- dados$media - 1.96 * dados$erro_padrao
dados$ic_sup <- dados$media + 1.96 * dados$erro_padrao

baseline <- media[1] # taxa da variante controle -- linha de referencia

# Paleta propria: um azul-petroleo unico pra todos os pontos -- de proposito
# nao colorir por "significativo vs nao", pra nao entregar a resposta antes
# do leitor comparar os intervalos com os proprios olhos, que e o ponto
# pedagogico do grafico.
cor_ponto <- "#1B5E6B"
cor_base  <- "#B23A48"

p <- ggplot(dados, aes(y = variante, x = media)) +
  geom_vline(xintercept = baseline, colour = cor_base, linetype = "dashed", linewidth = 0.5) +
  geom_errorbarh(aes(xmin = ic_inf, xmax = ic_sup), height = 0.18, colour = cor_ponto, linewidth = 0.9) +
  geom_point(size = 3.6, colour = cor_ponto) +
  annotate(
    "text", x = baseline, y = 5.45, label = "controle", colour = cor_base,
    size = 3, family = "sans", hjust = 0.5
  ) +
  scale_x_continuous(labels = function(x) paste0(x, "%")) +
  labs(
    title = "Intervalos de confiança: taxa de conversão por variante de teste A/B",
    subtitle = "Ponto = taxa média observada. Linha = intervalo de confiança de 95%. A tracejada = a variante controle.",
    x = "Taxa de conversão", y = NULL
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold"),
    plot.subtitle = element_text(colour = "grey35", size = 8.6, margin = margin(b = 10)),
    panel.grid.major.y = element_blank(),
    panel.grid.minor.x = element_blank(),
    axis.text.y = element_text(colour = "grey15"),
    plot.margin = margin(t = 10, r = 20, b = 10, l = 10)
  ) +
  coord_cartesian(clip = "off")

ggsave("output.png", plot = p, width = 8.5, height = 5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 desenha o mesmo ponto+intervalo como estado inicial
# (IC 95%, o padrao estatistico mais comum) e acrescenta um segundo modo --
# erro padrao (±1 SE, um intervalo bem mais estreito) -- pra mostrar que a
# leitura de "quem parece diferente de quem" muda dependendo de qual
# convencao de intervalo o leitor escolhe, nao so dos dados. O ponto (a
# media) nunca se move entre os modos -- so o comprimento da linha.
#
# O R exporta media/erro_padrao/n; os dois intervalos (IC95 e erro padrao)
# sao recalculados no D3 a partir do MESMO erro_padrao, pra nunca divergir
# de qual numero gerou qual linha.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    baseline = baseline,
    unidade = "%",
    paleta = list(ponto = cor_ponto, base = cor_base)
  ),
  variantes = lapply(seq_len(nrow(dados)), function(i) {
    list(
      variante = as.character(dados$variante[i]),
      n = dados$n[i],
      media = dados$media[i],
      erroPadrao = dados$erro_padrao[i]
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
