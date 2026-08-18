# Libraries
library(ggplot2)
library(RColorBrewer)
library(jsonlite)

# Dados 100% ficticios: 12 planetas fictícios agrupados em 4 setores
# galacticos, acompanhados ao longo de 20 anos ficticios -- no lugar do
# dataset real do Gapminder (paises/continentes/PIB/expectativa de vida real)
# do exemplo original. Mesma FORMA (grupo -> item -> serie temporal com
# duas variaveis numericas + populacao), dado inteiramente inventado.
set.seed(2094)

setores <- c("Órion", "Perseu", "Cygnus", "Sagitário")
paleta <- setNames(RColorBrewer::brewer.pal(4, "Set1"), setores)

nomes_planetas <- c(
  "Aurin", "Bellara", "Cassio", "Dresk", "Elyra", "Fenrik",
  "Gavos", "Hyrus", "Ilyra", "Jotan", "Kelvara", "Luxor"
)
planeta_setor <- rep(setores, each = 3)
anos <- 1:20

# Ponto de partida e taxa de crescimento tecnologico variam por setor --
# cria trajetorias visualmente diferentes entre grupos, igual a continentes
# reais tem padroes de crescimento tipicos diferentes
taxa_setor <- setNames(c(1.09, 1.05, 1.12, 1.07), setores)
base_setor <- setNames(c(8, 20, 4, 12), setores)

planetas <- lapply(seq_along(nomes_planetas), function(i) {
  nome  <- nomes_planetas[i]
  setor <- planeta_setor[i]

  tec0        <- base_setor[[setor]] * runif(1, 0.75, 1.25)
  taxa_tec    <- taxa_setor[[setor]] * runif(1, 0.97, 1.03)
  vida0       <- runif(1, 45, 60)
  ganho_vida  <- runif(1, 0.6, 1.4)
  pop0        <- runif(1, 5, 80)
  taxa_pop    <- runif(1, 1.01, 1.04)

  # Crescimento composto + um pequeno passeio aleatorio acumulado -- da o
  # "tremor" organico de uma trajetoria real sem deixar de ser suave o
  # bastante pra bolha se mover de forma continua entre anos, nao aos saltos
  tecnologia  <- tec0 * taxa_tec ^ (anos - 1) * exp(cumsum(rnorm(length(anos), 0, 0.03)))
  expectativa <- pmin(88, vida0 + ganho_vida * (anos - 1) + cumsum(rnorm(length(anos), 0, 0.4)))
  populacao   <- pop0 * taxa_pop ^ (anos - 1) * exp(cumsum(rnorm(length(anos), 0, 0.02)))

  serie <- Map(
    function(a, t, v, p) list(ano = a, tecnologia = round(t, 2), expectativa = round(v, 1), populacao = round(p, 1)),
    anos, tecnologia, expectativa, populacao
  )
  names(serie) <- NULL

  list(nome = nome, setor = setor, serie = serie)
})

# ---------------------------------------------------------------------------
# Estatico: small multiples por ano (6 quadros amostrados), no lugar de
# congelar um unico ano -- uma imagem parada de um grafico animado perde a
# ideia de "evolucao" se mostrar so um instante. Reaproveita a mesma tecnica
# de pequenos multiplos do segundo exemplo original (que faceta por
# continente em vez de por ano).
# ---------------------------------------------------------------------------
linhas <- do.call(rbind, lapply(planetas, function(p) {
  do.call(rbind, lapply(p$serie, function(s) {
    data.frame(nome = p$nome, setor = p$setor, ano = s$ano,
               tecnologia = s$tecnologia, expectativa = s$expectativa, populacao = s$populacao)
  }))
}))

anos_mostrados <- c(1, 5, 9, 13, 17, 20)
dados_static <- linhas[linhas$ano %in% anos_mostrados, ]
dados_static$ano_rotulo <- factor(paste("Ano", dados_static$ano), levels = paste("Ano", anos_mostrados))

p <- ggplot(dados_static, aes(x = tecnologia, y = expectativa, size = populacao, color = setor)) +
  geom_point(alpha = 0.8) +
  scale_x_log10() +
  scale_size(range = c(1.5, 10), guide = "none") +
  scale_color_manual(values = paleta, name = "Setor") +
  facet_wrap(~ ano_rotulo, nrow = 2) +
  labs(x = "Índice tecnológico", y = "Expectativa de vida dos colonos") +
  theme_bw() +
  theme(legend.position = "bottom")

ggsave("output.png", plot = p, width = 10, height = 7, dpi = 150)

# ---------------------------------------------------------------------------
# Interativo: exporta so o dado bruto (serie completa por planeta) -- o D3
# recalcula escalas/eixos sozinho e anima a transicao entre anos, algo que
# uma imagem (mesmo em pequenos multiplos) nao pode mostrar.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    setores = as.list(setores),
    paleta = as.list(paleta),
    anos = as.list(anos),
    dominioTecnologia = c(min(linhas$tecnologia), max(linhas$tecnologia)),
    dominioExpectativa = c(min(linhas$expectativa), max(linhas$expectativa)),
    dominioPopulacao = c(min(linhas$populacao), max(linhas$populacao)),
    nota = "Clique em play ou arraste a régua pra mudar de ano. Passe o cursor num planeta pro valor exato."
  ),
  planetas = lapply(planetas, function(p) list(nome = p$nome, setor = p$setor, serie = p$serie))
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
