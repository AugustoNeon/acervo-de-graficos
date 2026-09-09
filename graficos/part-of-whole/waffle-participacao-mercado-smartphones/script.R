# Libraries
library(ggplot2)
library(dplyr)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Waffle chart: participacao de mercado de fabricantes de smartphone, 100
# quadrados = 100%, um quadrado por ponto percentual. Primeiro gráfico de
# part-of-whole que usa AREA DISCRETA CONTADA em vez de area/angulo
# continuo (pizza, rosca, treemap, circle packing e sunburst desta mesma
# categoria codificam proporcao por angulo ou area continua -- aqui cada
# unidade e' um quadrado inteiro, contavel, o que troca precisao de leitura
# por facilidade de contagem, sem pacote especifico (montado a mao com
# geom_tile, mesma logica de "sem widget pronto -> desenha na mao" ja usada
# no ternario e no upset desta base).
set.seed(3301)

fabricante <- c("Vertex", "Nébula", "Aeris", "Kaion", "Ovex", "Outras marcas")
participacao <- c(28, 22, 18, 12, 9, 11)
stopifnot(sum(participacao) == 100)

dados <- data.frame(fabricante = fabricante, participacao = participacao) %>%
  mutate(fabricante = factor(fabricante, levels = fabricante))

# Uma linha por PONTO PERCENTUAL (100 linhas no total) -- repete o nome do
# fabricante `participacao` vezes, na ordem, e preenche uma grade 10x10 lendo
# da esquerda pra direita e de cima pra baixo (ordem de leitura ocidental,
# igual texto). "index" e' a posicao de preenchimento (1 a 100); linha/coluna
# saem dele via divisao inteira e resto.
LADO <- 10
unidades <- dados %>%
  tidyr::uncount(participacao) %>%
  mutate(
    indice = row_number() - 1,
    coluna = indice %% LADO,
    linha = LADO - 1 - (indice %/% LADO) # inverte pra crescer de baixo pra cima
  )

paleta_fabricante <- c(
  "Vertex"        = "#2E6E8E",
  "Nébula"        = "#3F9C6E",
  "Aeris"         = "#D4A537",
  "Kaion"         = "#C15A3E",
  "Ovex"          = "#8A5FB0",
  "Outras marcas" = "#B7BDC6"
)

rotulos_legenda <- setNames(paste0(dados$fabricante, " — ", dados$participacao, "%"), dados$fabricante)

p <- ggplot(unidades, aes(x = coluna, y = linha, fill = fabricante)) +
  geom_tile(colour = "white", linewidth = 1.1, width = 0.9, height = 0.9) +
  scale_fill_manual(values = paleta_fabricante, labels = rotulos_legenda, name = NULL) +
  coord_equal() +
  labs(
    title = "Participação de mercado de fabricantes de smartphone",
    subtitle = "Cada quadrado = 1 ponto percentual · 100 quadrados = 100% do mercado"
  ) +
  theme_void(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14, hjust = 0.5),
    plot.subtitle = element_text(colour = "grey40", hjust = 0.5, margin = margin(b = 10)),
    legend.position = "bottom",
    legend.text = element_text(size = 9)
  )

ggsave("output.png", plot = p, width = 7.5, height = 8.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 recebe so a lista fabricante+participacao (nao a
# grade ja preenchida) -- ele monta as 100 unidades e a leitura em
# serpentina sozinho, mesmo principio ja usado nos outros graficos desta
# base (formula compartilhada, nunca geometria pronta).
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(cores = as.list(paleta_fabricante), lado = LADO),
  dados = lapply(seq_len(nrow(dados)), function(i) {
    list(fabricante = as.character(dados$fabricante[i]), participacao = dados$participacao[i])
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
