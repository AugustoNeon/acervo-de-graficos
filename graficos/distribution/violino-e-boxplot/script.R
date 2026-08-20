# Libraries
library(ggplot2)
library(dplyr)
library(forcats)
library(patchwork)
library(RColorBrewer)
library(ggdist)
library(jsonlite)

# Dados ficticios: velocidade de download (Mbps) medida em clientes de 5
# provedores de internet ficticios. Quatro provedores tem distribuicao
# unimodal (uma so tecnologia de conexao); um deles ("ConectaSul") mistura
# clientes de DSL e de fibra na mesma medicao, gerando uma distribuicao
# BIMODAL de proposito -- e o caso classico que um boxplot esconde (ele so
# mostra mediana/quartis, nao teria como avisar que existem dois grupos
# escondidos ali dentro) e um violino revela de cara.
set.seed(2609)

gerar_unimodal <- function(n, media, desvio) {
  pmax(rnorm(n, media, desvio), 5)
}

gerar_bimodal <- function(n, media1, desvio1, media2, desvio2, prop1) {
  n1 <- round(n * prop1)
  n2 <- n - n1
  pmax(c(rnorm(n1, media1, desvio1), rnorm(n2, media2, desvio2)), 5)
}

provedores <- c("FibraMax", "NetVeloz", "ConectaSul", "TurboLink", "OndaCerta")

dados <- rbind(
  data.frame(provedor = "FibraMax",   velocidade = gerar_unimodal(70, 180, 22)),
  data.frame(provedor = "NetVeloz",   velocidade = gerar_unimodal(60, 95, 14)),
  data.frame(provedor = "ConectaSul", velocidade = gerar_bimodal(90, 35, 8, 155, 18, 0.45)),
  data.frame(provedor = "TurboLink",  velocidade = gerar_unimodal(55, 62, 11)),
  data.frame(provedor = "OndaCerta",  velocidade = gerar_unimodal(65, 125, 19))
)
dados$velocidade <- round(dados$velocidade, 1)
dados$provedor <- factor(dados$provedor, levels = provedores)

dados_ord <- dados %>% mutate(provedor = fct_reorder(provedor, velocidade, .fun = median, .desc = TRUE))
ordem <- levels(dados_ord$provedor)

# Uma cor por provedor, fixa nas 3 variacoes -- "Accent" ainda nao usada em
# nenhum outro grafico do acervo.
paleta_provedores <- setNames(brewer.pal(5, "Accent"), provedores)

# ---------------------------------------------------------------------------
# Estatico: poster com as 3 variacoes lado a lado -- cada painel corresponde
# a um dos 3 botoes da versao interativa (ver "Como foi feito" no README).
# ---------------------------------------------------------------------------
tema_poster <- theme_minimal(base_size = 9) +
  theme(axis.text.x = element_text(angle = 30, hjust = 1), plot.title = element_text(face = "bold"))

p1 <- ggplot(dados_ord, aes(x = provedor, y = velocidade, fill = provedor)) +
  geom_violin(scale = "width", trim = TRUE, linewidth = 0.4) +
  scale_fill_manual(values = paleta_provedores, guide = "none") +
  labs(title = "Violino", x = NULL, y = "Velocidade (Mbps)") +
  tema_poster

p2 <- ggplot(dados_ord, aes(x = provedor, y = velocidade, fill = provedor)) +
  geom_violin(scale = "width", trim = TRUE, linewidth = 0.4, alpha = 0.75) +
  geom_boxplot(width = 0.14, outlier.shape = NA, fill = "white", alpha = 0.7) +
  scale_fill_manual(values = paleta_provedores, guide = "none") +
  labs(title = "Violino + caixa", x = NULL, y = NULL) +
  tema_poster

p3 <- ggplot(dados_ord, aes(x = provedor, y = velocidade, fill = provedor)) +
  ggdist::stat_halfeye(adjust = 0.6, width = 0.6, .width = 0, justification = -0.25, point_colour = NA, alpha = 0.85) +
  geom_boxplot(width = 0.1, outlier.shape = NA, alpha = 0.75) +
  geom_jitter(aes(x = as.numeric(provedor) - 0.22), width = 0.08, height = 0, size = 0.5, alpha = 0.35) +
  scale_fill_manual(values = paleta_provedores, guide = "none") +
  labs(title = "Meio violino + pontos", x = NULL, y = "Velocidade (Mbps)") +
  tema_poster

poster <- p1 | p2 | p3
ggsave("output.png", plot = poster, width = 11, height = 5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3, com uma barra de botoes que alterna entre violino
# puro, violino+caixa e meio-violino com pontos (raincloud). O R so exporta
# os valores BRUTOS de cada provedor; o D3 recalcula sua propria estimativa
# de densidade (KDE gaussiano, largura de Silverman -- mesma tecnica do
# ridgeline deste acervo, ver shared/densidade.ts) e os quartis da caixa
# interna, em vez de importar a curva/estatistica pronta do R.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    ordem = ordem,
    paletaProvedores = as.list(paleta_provedores),
    nota = "Use os botões acima para alternar a variação; passe o cursor sobre a forma pra ver os valores."
  ),
  provedores = lapply(provedores, function(p) {
    list(provedor = p, valores = dados$velocidade[as.character(dados$provedor) == p])
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
