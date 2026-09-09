# Libraries
library(ggplot2)
library(dplyr)
library(forcats)
library(ggbeeswarm)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Enxame (beeswarm): distribuicao de salario por nivel de senioridade, um
# ponto por pessoa. Primeiro gráfico da categoria distribution que mostra
# TODOS os pontos brutos em vez de um resumo estatistico -- as outras
# entradas (boxplot, violino, ridgeline, densidade) sao formas comprimidas
# da mesma pergunta; aqui nada e' agregado, o formato da nuvem de pontos E'
# o grafico. `linha-do-tempo-densa-releases` (categoria timeline) usa uma
# tecnica de empacotamento parecida sobre um eixo de TEMPO -- aqui o eixo
# continuo e' salario, e o empacotamento acontece dentro de cada categoria.
set.seed(4110)

niveis <- c("Estagiário", "Júnior", "Pleno", "Sênior", "Especialista")
n_por_nivel <- c(24, 42, 46, 34, 18)

# Faixas com sobreposicao proposital entre niveis vizinhos (um estagiario
# de destaque pode ganhar quase o mesmo que um junior iniciante) -- sem
# sobreposicao nenhuma o grafico so confirmaria o obvio (que salario sobe
# com senioridade), e a sobreposicao e' justamente o que um enxame mostra
# bem e um boxplot esconde (ele so revela quartis, nao a extensao real
# onde as caudas de dois niveis se cruzam).
parametros <- list(
  "Estagiário"    = list(media = 2200, desvio = 320),
  "Júnior"        = list(media = 5100, desvio = 950),
  "Pleno"         = list(media = 8600, desvio = 1500),
  "Sênior"        = list(media = 13800, desvio = 2400),
  "Especialista"  = list(media = 21500, desvio = 3600)
)

dados <- do.call(rbind, lapply(seq_along(niveis), function(i) {
  nivel <- niveis[i]
  p <- parametros[[nivel]]
  salario <- pmax(rnorm(n_por_nivel[i], p$media, p$desvio), 1500)
  data.frame(nivel = nivel, salario = round(salario, -1))
})) %>%
  mutate(nivel = factor(nivel, levels = niveis))

paleta_nivel <- c(
  "Estagiário"   = "#D8C2E8",
  "Júnior"       = "#B594D0",
  "Pleno"        = "#8F68B5",
  "Sênior"       = "#6B4596",
  "Especialista" = "#472C6B"
)

medianas <- dados %>%
  group_by(nivel) %>%
  summarise(mediana = median(salario), .groups = "drop")

p <- ggplot(dados, aes(x = nivel, y = salario, colour = nivel)) +
  geom_beeswarm(cex = 2.6, size = 2.2, alpha = 0.85) +
  geom_crossbar(
    data = medianas, aes(x = nivel, y = mediana, ymin = mediana, ymax = mediana),
    colour = "grey25", linewidth = 0.6, width = 0.55, inherit.aes = FALSE
  ) +
  scale_colour_manual(values = paleta_nivel, guide = "none") +
  scale_y_continuous(labels = function(v) paste0("R$ ", format(v, big.mark = ".", scientific = FALSE))) +
  labs(
    title = "Distribuição de salário por nível de senioridade",
    subtitle = "Cada ponto é uma pessoa · traço cinza = mediana do nível",
    x = NULL, y = "Salário mensal"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14),
    plot.subtitle = element_text(colour = "grey40", margin = margin(b = 10)),
    panel.grid.major.x = element_blank(),
    panel.grid.minor = element_blank(),
    axis.text.x = element_text(face = "bold", colour = "grey20", size = 11)
  )

ggsave("output.png", plot = p, width = 9, height = 6, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 recebe so categoria/valor por pessoa (nunca a
# posicao X do enxame ja calculada) -- ele roda o proprio algoritmo de
# empacotamento pra virar pontos, mesmo principio ja usado nos outros
# graficos desta base (formula compartilhada, nunca geometria pronta).
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(cores = as.list(paleta_nivel), niveis = niveis),
  pontos = lapply(seq_len(nrow(dados)), function(i) {
    list(nivel = as.character(dados$nivel[i]), salario = dados$salario[i])
  }),
  medianas = lapply(seq_len(nrow(medianas)), function(i) {
    list(nivel = as.character(medianas$nivel[i]), mediana = medianas$mediana[i])
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
