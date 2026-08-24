# Libraries
library(ggplot2)
library(GGally)
library(patchwork)
library(RColorBrewer)
library(jsonlite)

# Dados 100% ficticios: 90 vinhos ficticios (30 de cada tipo) descritos por
# 5 variaveis numericas -- acidez, corpo, tanino, docura (todas 0-10) e
# preco (R$/garrafa) -- no lugar do dataset iris (petala/sepala) do exemplo
# original -- ver AGENTS.md "Decisoes fechadas". Cada tipo tem um perfil
# sensorial proprio (tinto = corpo/tanino altos, branco = acidez alta e
# tanino baixo, rose = intermediario em quase tudo), pensado pra que as
# linhas se agrupem visualmente por tipo em pelo menos alguns eixos, o
# mesmo padrao de separacao por especie que torna o iris um exemplo classico
# pra coordenadas paralelas.
set.seed(4471)

tipos <- c("Tinto", "Branco", "Rosé")
n_por_tipo <- 30

perfil <- list(
  Tinto  = list(acidez = c(5.3, 0.9), corpo = c(7.8, 0.8), tanino = c(7.3, 1.0), docura = c(2.4, 0.9), preco = c(85, 22)),
  Branco = list(acidez = c(7.4, 0.8), corpo = c(3.6, 0.9), tanino = c(1.6, 0.6), docura = c(4.6, 1.3), preco = c(52, 16)),
  "Rosé" = list(acidez = c(6.6, 0.7), corpo = c(5.0, 0.7), tanino = c(3.6, 0.8), docura = c(5.5, 1.1), preco = c(46, 14))
)

gerar_var <- function(par, minimo = 0, maximo = 10) {
  pmin(pmax(rnorm(n_por_tipo, par[1], par[2]), minimo), maximo)
}

dados <- do.call(rbind, lapply(tipos, function(t) {
  p <- perfil[[t]]
  data.frame(
    tipo = t,
    acidez = round(gerar_var(p$acidez), 1),
    corpo = round(gerar_var(p$corpo), 1),
    tanino = round(gerar_var(p$tanino), 1),
    docura = round(gerar_var(p$docura), 1),
    preco = round(gerar_var(p$preco, minimo = 12, maximo = 220))
  )
}))
dados$tipo <- factor(dados$tipo, levels = tipos)
dados$id <- seq_len(nrow(dados))

colunas <- c("acidez", "corpo", "tanino", "docura", "preco")

# Paleta trocada em relacao ao original (viridis/generica do tutorial)
cores <- setNames(brewer.pal(3, "Dark2"), tipos)

# Painel 1: reescalada por eixo (uniminmax, o padrao de coordenadas
# paralelas) -- cada variavel comprimida pro proprio intervalo 0-1, entao
# todos os 5 eixos ficam comparaveis apesar de unidades bem diferentes
# (0-10 pras variaveis sensoriais, R$ 12-220 pro preco).
p1 <- ggparcoord(
  dados, columns = which(names(dados) %in% colunas), groupColumn = "tipo",
  scale = "uniminmax", alphaLines = 0.55, showPoints = FALSE
) +
  scale_color_manual(values = cores, name = "Tipo") +
  labs(title = "Reescalada por eixo (uniminmax)", x = NULL, y = NULL) +
  theme_minimal(base_size = 11) +
  theme(plot.title = element_text(face = "bold"))

# Painel 2: MESMOS dados, sem reescalar (scale="globalminmax") -- o preco
# (escala de dezenas/centenas) esmaga visualmente os outros 4 eixos
# (escala 0-10), ilustrando por que reescalar por eixo e o padrao, nao um
# detalhe estetico.
p2 <- ggparcoord(
  dados, columns = which(names(dados) %in% colunas), groupColumn = "tipo",
  scale = "globalminmax", alphaLines = 0.55, showPoints = FALSE
) +
  scale_color_manual(values = cores, guide = "none") +
  labs(title = "Sem reescalar (globalminmax)", x = NULL, y = NULL) +
  theme_minimal(base_size = 11) +
  theme(plot.title = element_text(face = "bold"))

poster <- p1 / p2
ggsave("output.png", plot = poster, width = 9, height = 8, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3 (eixo por variavel, uma polyline por
# vinho ligando os 5 eixos) -- sempre na escala reescalada por eixo (o
# painel 1, o padrao correto), a comparacao sem reescalar fica so no
# estatico como ilustracao do problema. O R exporta os dados BRUTOS (nao
# reescalados); o D3 calcula o dominio de cada eixo e desenha a propria
# escala, sem depender de nenhum recalculo do ggparcoord.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    eixos = colunas,
    # as.list() preserva os nomes do vetor como chaves no JSON exportado --
    # um vetor nomeado passado direto vira array simples e PERDE os nomes
    # (ver AGENTS.md "Licoes aprendidas", 2026-08-20)
    rotulosEixo = as.list(c(acidez = "Acidez", corpo = "Corpo", tanino = "Tanino", docura = "Doçura", preco = "Preço (R$)")),
    tipos = tipos,
    paleta = as.list(cores),
    nota = "Passe o cursor numa linha pra destacar aquele vinho nos 5 eixos; clique pra fixar o destaque."
  ),
  vinhos = dados[, c("id", "tipo", colunas)]
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
