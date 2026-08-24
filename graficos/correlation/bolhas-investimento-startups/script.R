# Libraries
library(ggplot2)
library(RColorBrewer)
library(ggrepel)
library(jsonlite)

# Dados 100% ficticios: 50 startups ficticias de 5 setores, cada uma com
# investimento captado (eixo X), crescimento anual de receita (eixo Y) e
# numero de funcionarios (tamanho da bolha) -- no lugar do dataset Gapminder
# real (PIB x expectativa de vida x populacao) do exemplo original -- ver
# AGENTS.md "Decisoes fechadas". Investimento e funcionarios sao gerados
# juntos a partir de um mesmo "porte" latente por empresa (empresa maior
# capta mais E emprega mais gente, nao sao sorteados independentes), mas
# crescimento tem sua PROPRIA aleatoriedade quase independente do porte --
# pra o grafico revelar que "quem captou mais" nao e sempre "quem cresce
# mais rapido", a pergunta que um bubble chart de VC costuma responder.
set.seed(2871)

setores <- c("Fintech", "Healthtech", "Edtech", "Agritech", "Cleantech")
n_por_setor <- c(14, 11, 9, 8, 8) # Fintech e Healthtech dominam a amostra,
# de proposito -- reflete a distribuicao real de investimento em VC por setor

base_setor <- list(
  Fintech    = list(porte = 2.4, crescimento = 55),
  Healthtech = list(porte = 2.0, crescimento = 40),
  Edtech     = list(porte = 1.3, crescimento = 35),
  Agritech   = list(porte = 1.1, crescimento = 22),
  Cleantech  = list(porte = 1.6, crescimento = 48)
)

# Nomes ficticios de empresa gerados por combinacao (prefixo + sufixo tematico
# por setor), em vez de um rotulo generico tipo "Fintech 1" -- garante nome
# unico e minimamente plausivel pras 50 startups sem escrever cada um a mao.
prefixos <- c(
  "Vórtice", "Prisma", "Nexo", "Zenit", "Órbita", "Aurora", "Cipó", "Raiz",
  "Bússola", "Marca", "Ápice", "Fluxo", "Nortear", "Alcance", "Cardume",
  "Semente", "Trilha", "Ponte", "Horizonte", "Lumen"
)
sufixo_setor <- list(
  Fintech = c("Pay", "Vault", "Crédito", "Saldo"), Healthtech = c("Saúde", "Vita", "Salta", "Cura"),
  Edtech = c("Educ", "Ensina", "Mente", "Estudo"), Agritech = c("Verde", "Campo", "Solo", "Colheita"),
  Cleantech = c("Sol", "Eco", "Ventor", "Ciclo")
)

dados <- do.call(rbind, lapply(seq_along(setores), function(i) {
  s <- setores[i]
  n <- n_por_setor[i]
  b <- base_setor[[s]]
  porte <- rlnorm(n, meanlog = b$porte, sdlog = 0.75) # porte latente, cauda longa
  nomes <- paste(sample(prefixos, n), sample(sufixo_setor[[s]], n, replace = TRUE))
  data.frame(
    empresa = make.unique(nomes, sep = " "),
    setor = s,
    investimento_milhoes = round(pmax(porte * runif(n, 0.7, 1.3), 0.4), 1),
    funcionarios = round(pmax(porte * runif(n, 22, 45), 4)),
    crescimento_receita = round(pmax(b$crescimento + rnorm(n, sd = 38), -15), 1)
  )
}))
dados$setor <- factor(dados$setor, levels = setores)

# So as 4 maiores bolhas (mais funcionarios) ganham rotulo no estatico -- o
# resto so aparece no tooltip da versao interativa (rotular as 50 deixaria
# o grafico ilegivel)
maiores <- order(-dados$funcionarios)[1:4]
dados$rotulo <- NA_character_
dados$rotulo[maiores] <- dados$empresa[maiores]

# Paleta trocada em relacao ao original (paleta padrao/generica do tutorial)
cores <- setNames(brewer.pal(5, "Set2"), setores)

p <- ggplot(dados, aes(x = investimento_milhoes, y = crescimento_receita, size = funcionarios, color = setor)) +
  geom_point(alpha = 0.75) +
  geom_text_repel(aes(label = rotulo), size = 3, color = "grey20", fontface = "bold", show.legend = FALSE, na.rm = TRUE) +
  scale_x_log10(labels = scales::dollar_format(prefix = "US$ ", suffix = "M")) +
  scale_size_area(max_size = 16, name = "Funcionários") +
  scale_color_manual(values = cores, name = "Setor") +
  labs(
    title = "Investimento captado x crescimento de receita (dado fictício)",
    x = "Investimento captado (escala log)", y = "Crescimento anual de receita (%)"
  ) +
  guides(color = guide_legend(override.aes = list(size = 4))) +
  theme_minimal(base_size = 12) +
  theme(plot.title = element_text(face = "bold"))

ggsave("output.png", plot = p, width = 9, height = 6.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3, escala de raio por AREA (sqrt), nao por raio linear
# -- boa pratica padrao de bubble chart (raio linear faz a percepcao de
# tamanho exagerar a diferenca real entre valores). Eixo X tambem em escala
# log, espelhando o estatico.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    setores = setores,
    paleta = as.list(cores),
    nota = "Passe o cursor numa bolha pra ver empresa, investimento, crescimento e número de funcionários."
  ),
  startups = dados[, c("empresa", "setor", "investimento_milhoes", "funcionarios", "crescimento_receita")]
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
