# Libraries
library(ggplot2)
library(dplyr)
library(forcats)
library(patchwork)
library(RColorBrewer)
library(jsonlite)

# Dados ficticios: tempo de resolucao de chamados (horas) por equipe de
# suporte, com tamanho de amostra e distribuicao (mediana/dispersao)
# diferentes por equipe -- rlnorm() gera cauda longa a direita, o formato
# tipico de tempo de resolucao (a maioria resolve rapido, uma minoria demora
# muito), o que da outliers de verdade pro boxplot mostrar.
set.seed(7331)

equipes <- c("Onboarding", "Faturamento", "Infraestrutura", "Conta e Acesso", "Integracoes", "Produto")

parametros <- list(
  "Onboarding"      = list(n = 22, meanlog = 1.10, sdlog = 0.35),
  "Faturamento"     = list(n = 38, meanlog = 0.90, sdlog = 0.50),
  "Infraestrutura"  = list(n = 16, meanlog = 1.60, sdlog = 0.60),
  "Conta e Acesso"  = list(n = 45, meanlog = 0.60, sdlog = 0.40),
  "Integracoes"     = list(n = 12, meanlog = 1.30, sdlog = 0.70),
  "Produto"         = list(n = 29, meanlog = 1.00, sdlog = 0.45)
)

dados <- do.call(rbind, lapply(equipes, function(e) {
  p <- parametros[[e]]
  horas <- rlnorm(p$n, meanlog = p$meanlog, sdlog = p$sdlog)
  data.frame(equipe = e, horas = round(pmax(horas, 0.2), 1))
}))
dados$equipe <- factor(dados$equipe, levels = equipes)

medianas <- dados %>%
  group_by(equipe) %>%
  summarise(mediana = median(horas), .groups = "drop")

# Uma cor por equipe, fixa nas 5 variacoes -- "Set1" ainda nao usada em nenhum
# outro grafico do acervo (ver docs/WORKFLOW.md, "nunca deixar a paleta
# identica ao exemplo").
paleta_equipes <- setNames(brewer.pal(6, "Set1"), equipes)

# ---------------------------------------------------------------------------
# Estatico: poster 2x3 com 5 variacoes do mesmo dado -- cada painel
# corresponde a um dos 5 botoes da versao interativa (ver "Como foi feito" no
# README). Mesmo principio de poster ja usado no barplot-classico deste
# acervo, aplicado as variacoes proprias do boxplot em vez das de barra.
# ---------------------------------------------------------------------------
tema_poster <- theme_minimal(base_size = 9) +
  theme(axis.text.x = element_text(angle = 30, hjust = 1), plot.title = element_text(face = "bold"))

p1 <- ggplot(dados, aes(x = equipe, y = horas, fill = equipe)) +
  geom_boxplot(outlier.size = 0.8) +
  scale_fill_manual(values = paleta_equipes, guide = "none") +
  labs(title = "Básico", x = NULL, y = "Horas até resolução") +
  tema_poster

dados_ord <- dados %>% mutate(equipe = fct_reorder(equipe, horas, .fun = median, .desc = TRUE))

p2 <- ggplot(dados_ord, aes(x = equipe, y = horas, fill = equipe)) +
  geom_boxplot(outlier.size = 0.8) +
  scale_fill_manual(values = paleta_equipes, guide = "none") +
  labs(title = "Ordenado por mediana", x = NULL, y = NULL) +
  tema_poster

p3 <- ggplot(dados_ord, aes(x = equipe, y = horas, fill = equipe)) +
  geom_boxplot(outlier.shape = NA, alpha = 0.55) +
  geom_jitter(width = 0.14, size = 0.7, alpha = 0.6, color = "#2b2b2b") +
  scale_fill_manual(values = paleta_equipes, guide = "none") +
  labs(title = "Com jitter", x = NULL, y = "Horas até resolução") +
  tema_poster

p4 <- ggplot(dados_ord, aes(x = equipe, y = horas, fill = equipe)) +
  geom_boxplot(notch = TRUE, outlier.size = 0.8) +
  scale_fill_manual(values = paleta_equipes, guide = "none") +
  labs(title = "Entalhado (notch)", x = NULL, y = NULL) +
  tema_poster

p5 <- ggplot(dados_ord, aes(x = equipe, y = horas, fill = equipe)) +
  geom_boxplot(varwidth = TRUE, outlier.size = 0.8) +
  scale_fill_manual(values = paleta_equipes, guide = "none") +
  labs(title = "Largura variável", subtitle = "largura = tamanho da amostra", x = NULL, y = "Horas até resolução") +
  tema_poster

poster <- (p1 | p2 | p3) / (p4 | p5 | plot_spacer())
ggsave("output.png", plot = poster, width = 11, height = 7, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3, com uma barra de botoes que anima a transicao entre
# as 5 variacoes acima -- as MESMAS caixas (chave = equipe) se reorganizam em
# vez de trocar de grafico, igual ao principio ja usado no barplot-classico
# deste acervo. O R so exporta os valores BRUTOS de cada equipe; o D3 calcula
# quartis, whiskers, outliers, jitter e notch sozinho a partir deles -- nada
# de estatistica pronta vindo do R, pra caixa/entalhe/whisker responderem a
# QUALQUER reordenacao sem precisar de um novo calculo no servidor.
viz <- list(
  meta = list(
    paletaEquipes = as.list(paleta_equipes),
    nota = "Use os botões acima para alternar a variação; passe o cursor sobre a caixa pra ver os quartis."
  ),
  equipes = equipes,
  dados = lapply(equipes, function(e) {
    list(equipe = e, valores = dados$horas[as.character(dados$equipe) == e])
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
