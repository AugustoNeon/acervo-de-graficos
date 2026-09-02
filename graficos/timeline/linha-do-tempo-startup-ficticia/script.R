# Libraries
library(ggplot2)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada (titulo, nomes de marco) sai corrompida byte a byte no
# data.json e no proprio PNG. "C.utf8" existe no sistema (locale -a).
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Dados 100% ficticios: marcos de uma startup fictícia ao longo de 6 anos.
# Datas IRREGULARES de propósito (não um marco por ano/trimestre) -- é
# justamente o que diferencia uma linha do tempo de um bar chart de eventos:
# a posição no eixo já mostra o espaçamento real entre os marcos (o salto de
# "MVP lançado" pra "Rodada seed" é mais rápido que o resto), sem precisar de
# nenhum número de dias escrito no gráfico.
eventos <- data.frame(
  data = as.Date(c(
    "2019-03-01", "2019-11-15", "2020-06-01", "2021-02-10",
    "2021-09-20", "2022-08-05", "2023-12-01", "2024-10-15"
  )),
  marco = c(
    "Fundação", "MVP lançado", "Rodada seed (R$ 2 mi)",
    "10 mil usuários ativos", "Rodada série A (R$ 15 mi)",
    "Expansão pra 3 países", "100 mil usuários ativos",
    "Aquisição por concorrente"
  ),
  # Categoria de cada marco -- pedido do usuário pra evoluir este gráfico
  # além de instante+rótulo. As 4 categorias formam a própria narrativa da
  # startup contada em paralelo à data: um funding puxando o próximo produto,
  # que puxa o próximo patamar de usuários.
  categoria = c(
    "Fundação", "Produto", "Financeiro", "Crescimento",
    "Financeiro", "Produto", "Crescimento", "Financeiro"
  )
)
eventos <- eventos[order(eventos$data), ]
# Alterna label acima/abaixo do eixo pra caber sem sobrepor -- índice par
# fica acima, ímpar fica abaixo (nunca sorteado: precisa ser reproduzível
# pra bater com a mesma alternância na versão D3).
eventos$lado <- ifelse(seq_len(nrow(eventos)) %% 2 == 0, 1, -1)

# A cor de cada categoria nasce AQUI, uma única vez -- o data.json exporta os
# mesmos hex, pra estático e interativo nunca discordarem de que cor é cada
# categoria (mesma regra do cronograma de lançamento, aplicada a marco em vez
# de fase). O eixo/espinha continua neutro: cor é atributo do EVENTO, não do
# tempo em si.
cor_categoria <- c(
  "Fundação"    = "#4A7B6D",
  "Produto"     = "#3B6E8F",
  "Financeiro"  = "#C1673A",
  "Crescimento" = "#8B5FA8"
)
eventos$categoria <- factor(eventos$categoria, levels = names(cor_categoria))

cor_eixo   <- "grey55"
cor_texto  <- "grey20"
altura_haste <- 1

p <- ggplot(eventos, aes(x = data, y = 0)) +
  geom_hline(yintercept = 0, colour = cor_eixo, linewidth = 1) +
  geom_segment(aes(xend = data, y = 0, yend = lado * altura_haste, colour = categoria), linewidth = 0.6) +
  geom_point(aes(colour = categoria), size = 3.2) +
  geom_text(
    aes(y = lado * altura_haste * 1.12, label = marco, vjust = ifelse(lado > 0, 0, 1)),
    colour = cor_texto, size = 3.1, lineheight = 0.9, family = "sans"
  ) +
  geom_text(
    aes(y = lado * altura_haste * 0.32, label = format(data, "%b/%Y")),
    colour = "grey45", size = 2.5, family = "mono"
  ) +
  scale_colour_manual(values = cor_categoria, name = NULL) +
  scale_x_date(date_labels = "%Y", date_breaks = "1 year", expand = expansion(mult = 0.1)) +
  scale_y_continuous(limits = c(-altura_haste * 1.65, altura_haste * 1.65)) +
  labs(title = "Linha do tempo: marcos de uma startup fictícia (2019–2024)", x = NULL, y = NULL) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold"),
    axis.text.y = element_blank(),
    axis.title.y = element_blank(),
    panel.grid.major.y = element_blank(),
    panel.grid.minor = element_blank(),
    panel.grid.major.x = element_line(colour = "grey92"),
    legend.position = "top",
    plot.margin = margin(t = 10, r = 16, b = 10, l = 16)
  ) +
  coord_cartesian(clip = "off")

ggsave("output.png", plot = p, width = 10, height = 5.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: mesma linha do tempo, com tooltip por marco. O lado
# (acima/abaixo) precisa ser o MESMO calculado aqui -- nao recalculado no D3
# -- pra estatico e interativo nunca discordarem de qual marco fica de que
# lado (mesma regra de "a cor nasce uma vez" aplicada aqui a layout, nao cor).
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(corEixo = cor_eixo, cores = as.list(cor_categoria)),
  eventos = lapply(seq_len(nrow(eventos)), function(i) {
    list(
      data = format(eventos$data[i], "%Y-%m-%d"),
      marco = eventos$marco[i],
      categoria = as.character(eventos$categoria[i]),
      lado = eventos$lado[i]
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
