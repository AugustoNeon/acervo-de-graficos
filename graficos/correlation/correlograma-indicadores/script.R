# Libraries
library(ggplot2)
library(ggcorrplot)
library(RColorBrewer)
library(jsonlite)

# Dados ficticios: 8 indicadores socioeconomicos de 150 municipios ficticios,
# construidos a partir de um fator latente de "desenvolvimento" (nao
# observado) para gerar uma estrutura de correlacao plausivel entre variaveis
# que fazem sentido correlacionarem na vida real -- em vez de ruido
# independente, que daria um correlograma sem nada pra ler.
set.seed(6203)
n <- 150

desenvolvimento <- rnorm(n)

renda            <- 2200 + 1800 * desenvolvimento + rnorm(n, 0, 700)
escolaridade     <- 7.5  + 3.2  * desenvolvimento + rnorm(n, 0, 1.4)
expectativa_vida <- 72   + 4.5  * desenvolvimento + rnorm(n, 0, 2.2)
saneamento       <- 65   + 22   * desenvolvimento + rnorm(n, 0, 12)
area_verde       <- 8    + 5    * desenvolvimento + rnorm(n, 0, 4)
mortalidade_inf  <- 18   - 7.0  * desenvolvimento + rnorm(n, 0, 4.5)
criminalidade    <- 42   - 11.0 * desenvolvimento + rnorm(n, 0, 12)
deslocamento_min <- 35   - 2.0  * desenvolvimento + rnorm(n, 0, 9)

indicadores <- data.frame(
  renda,
  escolaridade,
  expectativa_vida,
  saneamento,
  area_verde,
  mortalidade_inf,
  criminalidade,
  deslocamento_min
)

nomes_legiveis <- c(
  renda            = "Renda média",
  escolaridade     = "Escolaridade",
  expectativa_vida = "Expectativa de vida",
  saneamento       = "Saneamento básico",
  area_verde       = "Área verde per capita",
  mortalidade_inf  = "Mortalidade infantil",
  criminalidade    = "Criminalidade",
  deslocamento_min = "Deslocamento (min)"
)
colnames(indicadores) <- nomes_legiveis[colnames(indicadores)]

matriz_corr <- cor(indicadores)
teste_signif <- cor_pmat(indicadores)

p <- ggcorrplot(
  matriz_corr,
  hc.order   = TRUE,
  type       = "upper",
  p.mat      = teste_signif,
  insig      = "pch",
  lab        = TRUE,
  lab_size   = 3,
  colors     = brewer.pal(3, "PuOr")[c(1, 2, 3)],
  outline.color = "white",
  legend.title = "Correlação"
) +
  labs(title = "Correlação entre indicadores municipais") +
  theme(
    plot.title = element_text(face = "bold", size = 13),
    axis.text = element_text(size = 9)
  )

ggsave("output.png", plot = p, width = 8, height = 7, dpi = 150)

# Exporta a matriz completa (em ordem original) + p-valores para a versao
# interativa. Mesma ordenacao hierarquica que o ggcorrplot usa por baixo dos panos
# (hc.order = TRUE), exportada explicitamente para a versao D3 nao precisar
# recalcular clustering nenhum -- so seguir a ordem pronta.
hc <- hclust(as.dist(1 - matriz_corr), method = "complete")
ordem_clustering <- hc$labels[hc$order]

labels <- colnames(matriz_corr)
celulas <- do.call(rbind, lapply(seq_along(labels), function(i) {
  do.call(rbind, lapply(seq_along(labels), function(j) {
    data.frame(
      var1 = labels[i],
      var2 = labels[j],
      correlacao = matriz_corr[i, j],
      p_valor = teste_signif[i, j]
    )
  }))
}))

dados_json <- list(
  variaveis = labels,
  ordem = ordem_clustering,
  celulas = celulas
)

write_json(dados_json, "data.json", auto_unbox = TRUE, digits = 4)
