# Libraries
library(ggplot2)
library(ggalluvial)
library(dplyr)
library(RColorBrewer)
library(jsonlite)

# Dados ficticios: 500 eleitores de uma cidade ficticia, acompanhados pelo
# mesmo bloco de voto (Esquerda / Centro / Direita / Abstencao) em tres
# eleicoes seguidas. Cada eleitor sorteia o bloco seguinte a partir do bloco
# anterior via uma matriz de transicao (mais provavel ficar no mesmo bloco do
# que trocar, mas nao determinístico) -- gera fluxos plausiveis entre
# eleicoes em vez de uma tabela puramente aleatoria.
set.seed(8452)

blocos <- c("Esquerda", "Centro", "Direita", "Abstenção")
n <- 500

prob_2016 <- c(0.30, 0.28, 0.24, 0.18)
eleicao_2016 <- sample(blocos, n, replace = TRUE, prob = prob_2016)

# Linha = bloco de origem, coluna = bloco de destino.
trans_16_19 <- rbind(
  c(0.60, 0.18, 0.05, 0.17),
  c(0.15, 0.45, 0.20, 0.20),
  c(0.04, 0.16, 0.65, 0.15),
  c(0.10, 0.15, 0.12, 0.63)
)
rownames(trans_16_19) <- blocos
colnames(trans_16_19) <- blocos

trans_19_22 <- rbind(
  c(0.55, 0.20, 0.08, 0.17),
  c(0.18, 0.42, 0.22, 0.18),
  c(0.06, 0.14, 0.68, 0.12),
  c(0.14, 0.16, 0.14, 0.56)
)
rownames(trans_19_22) <- blocos
colnames(trans_19_22) <- blocos

sortear_proximo <- function(bloco_atual, matriz) {
  vapply(bloco_atual, function(b) sample(blocos, 1, prob = matriz[b, ]), character(1))
}

eleicao_2019 <- sortear_proximo(eleicao_2016, trans_16_19)
eleicao_2022 <- sortear_proximo(eleicao_2019, trans_19_22)

dados <- data.frame(
  eleicao_2016 = factor(eleicao_2016, levels = blocos),
  eleicao_2019 = factor(eleicao_2019, levels = blocos),
  eleicao_2022 = factor(eleicao_2022, levels = blocos)
)

fluxos <- dados |>
  count(eleicao_2016, eleicao_2019, eleicao_2022, name = "freq")

# Paleta categorica (uma cor por bloco de origem em 2016) -- "Pastel1" ainda
# nao usada em nenhum outro grafico do acervo.
cores <- setNames(brewer.pal(length(blocos), "Pastel1"), blocos)

p <- ggplot(
  fluxos,
  aes(axis1 = eleicao_2016, axis2 = eleicao_2019, axis3 = eleicao_2022, y = freq)
) +
  geom_alluvium(aes(fill = eleicao_2016), width = 1 / 8, alpha = 0.85) +
  geom_stratum(width = 1 / 8, fill = "grey93", color = "grey40") +
  geom_text(stat = "stratum", aes(label = after_stat(stratum)), size = 3.1) +
  scale_x_discrete(
    limits = c("Eleição 2016", "Eleição 2019", "Eleição 2022"),
    expand = c(0.1, 0.1)
  ) +
  scale_fill_manual(values = cores, name = "Bloco em 2016") +
  labs(x = NULL, y = "Eleitores") +
  theme_minimal(base_size = 12) +
  theme(
    legend.position = "bottom",
    panel.grid.major.x = element_blank(),
    panel.grid.minor = element_blank()
  )

ggsave("output.png", plot = p, width = 9, height = 6, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3 (mesmo motor `d3-sankey` ja usado no
# sankey deste acervo -- um diagrama aluvial de eixos discretos e, por baixo
# dos panos, um sankey em varias colunas: cada "lode" (grupo de eleitores que
# passou pela mesma sequencia de blocos) vira dois trechos empilhaveis, um por
# par de eleicoes consecutivas). O script so exporta os nos (bloco x eleicao,
# ja com a cor de origem) e os trechos com um `lode` em comum entre os dois
# hops de uma mesma sequencia -- a posicao de cada no na coluna e a espessura
# de cada trecho sao recalculadas no D3.
no_id <- function(bloco, eleicao) paste(bloco, eleicao, sep = "·")

nos <- data.frame(
  id = c(no_id(blocos, "2016"), no_id(blocos, "2019"), no_id(blocos, "2022")),
  bloco = rep(blocos, 3),
  eleicao = rep(c("2016", "2019", "2022"), each = length(blocos)),
  cor = rep(unname(cores[blocos]), 3)
)

fluxos$lode <- seq_len(nrow(fluxos))

trechos <- rbind(
  data.frame(
    lode = fluxos$lode,
    origem = no_id(fluxos$eleicao_2016, "2016"),
    destino = no_id(fluxos$eleicao_2019, "2019"),
    valor = fluxos$freq,
    corOrigem = as.character(fluxos$eleicao_2016)
  ),
  data.frame(
    lode = fluxos$lode,
    origem = no_id(fluxos$eleicao_2019, "2019"),
    destino = no_id(fluxos$eleicao_2022, "2022"),
    valor = fluxos$freq,
    corOrigem = as.character(fluxos$eleicao_2016)
  )
)
trechos$cor <- unname(cores[trechos$corOrigem])
trechos$corOrigem <- NULL

viz <- list(
  meta = list(nota = "Passe o cursor num bloco ou numa fita para acompanhar por onde os mesmos eleitores passaram nas três eleições."),
  colunas = data.frame(
    id = c("2016", "2019", "2022"),
    rotulo = c("Eleição 2016", "Eleição 2019", "Eleição 2022")
  ),
  nos = nos,
  trechos = trechos
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
