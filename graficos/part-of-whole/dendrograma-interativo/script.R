# Libraries
library(dplyr)
library(ggplot2)
library(jsonlite)

# Excecao a decisao padrao do projeto de nunca replicar dado/paleta
# identicos ao original -- pedido explicito do usuario pra este grafico
# especifico: usa o mesmo dataset (`warpbreaks`, embutido no proprio R) e um
# estilo simples, sem paleta por nivel nem dados ficticios.
data(warpbreaks)

# ---------------------------------------------------------------------------
# Versao estatica: so a raiz e o primeiro nivel (wool: A, B), o MESMO estado
# inicial ("fechado") em que o widget antigo comecava -- a miniatura do card
# nunca precisou mostrar a arvore aberta, so sinalizar que existe uma.
# ---------------------------------------------------------------------------
pontos <- data.frame(
  nome = c("warpbreaks", "A", "B"),
  x = c(0, 1, 1),
  y = c(0, 0.6, -0.6),
  raiz = c(TRUE, FALSE, FALSE)
)
curvas <- data.frame(x = 0, y = 0, xend = 1, yend = c(0.6, -0.6))

p <- ggplot() +
  geom_curve(data = curvas, aes(x, y, xend = xend, yend = yend), colour = "grey70", curvature = -0.35) +
  geom_point(data = pontos, aes(x, y, size = raiz, fill = raiz), shape = 21, colour = "black", stroke = 0.8) +
  geom_text(data = pontos, aes(x, y, label = nome), hjust = c(1.25, -0.5, -0.5), size = 4) +
  scale_size_manual(values = c("TRUE" = 6, "FALSE" = 11)) +
  scale_fill_manual(values = c("TRUE" = "white", "FALSE" = "lightsteelblue")) +
  expand_limits(x = c(-0.8, 1.7)) +
  theme_void() +
  theme(legend.position = "none")

ggsave("output.png", plot = p, width = 6, height = 4, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3, com o clique abrindo/fechando cada nivel
# -- a mesma navegacao que o collapsibleTree dava. O script exporta a arvore
# COMPLETA (todos os niveis, nao so o primeiro); quem decide o que fica
# visivel em cada momento e o estado de clique no proprio D3, nao o R.
#
# O pacote agregava internamente cada combinacao unica de wool x tension x
# breaks; aqui isso e feito com count() -- linhas com o mesmo valor de breaks
# dentro do mesmo wool x tension viram um so no-folha, com "lotes" contando
# quantas linhas originais tinham aquele valor.
# ---------------------------------------------------------------------------
folhas <- warpbreaks %>%
  count(wool, tension, breaks, name = "lotes") %>%
  arrange(wool, tension, breaks)

arvore_breaks <- function(bloco) {
  lapply(seq_len(nrow(bloco)), function(i) {
    list(nome = as.character(bloco$breaks[i]), lotes = bloco$lotes[i])
  })
}

arvore_tension <- function(bloco_wool) {
  tensoes <- factor(bloco_wool$tension, levels = unique(bloco_wool$tension))
  unname(lapply(split(bloco_wool, tensoes), function(bloco_tension) {
    list(nome = as.character(bloco_tension$tension[1]), filhos = arvore_breaks(bloco_tension))
  }))
}

arvore <- list(
  nome = "warpbreaks",
  filhos = unname(lapply(split(folhas, folhas$wool), function(bloco_wool) {
    list(nome = as.character(bloco_wool$wool[1]), filhos = arvore_tension(bloco_wool))
  }))
)

viz <- list(
  meta = list(nota = "Clique num nó pra abrir ou fechar os filhos dele."),
  arvore = arvore
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
