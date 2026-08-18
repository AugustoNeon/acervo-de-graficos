# Libraries
library(ggplot2)
library(dplyr)
library(forcats)
library(patchwork)
library(RColorBrewer)
library(jsonlite)

# Dados ficticios: horas de audicao (milhoes) por genero musical, quebradas por
# plataforma de streaming -- a granularidade completa (genero x plataforma) so
# e usada nos graficos irmaos (lollipop-streaming, barplot-agrupado-empilhado);
# aqui so a soma por genero importa, mas gerar do mesmo jeito nos 3 scripts
# mantem os numeros consistentes entre as paginas.
set.seed(5817)

generos <- c("Pop", "Rock", "Hip-Hop", "Eletrônica", "Sertanejo", "Jazz")
plataformas <- c("Spotify", "Deezer", "YouTube Music", "Amazon Music")

pesos_base <- list(
  "Pop"        = c(0.45, 0.15, 0.25, 0.15),
  "Rock"       = c(0.20, 0.30, 0.20, 0.30),
  "Hip-Hop"    = c(0.50, 0.10, 0.30, 0.10),
  "Eletrônica" = c(0.35, 0.20, 0.30, 0.15),
  "Sertanejo"  = c(0.15, 0.45, 0.20, 0.20),
  "Jazz"       = c(0.25, 0.25, 0.25, 0.25)
)
total_base <- c("Pop" = 82, "Rock" = 61, "Hip-Hop" = 74, "Eletrônica" = 58, "Sertanejo" = 69, "Jazz" = 34)

dados <- do.call(rbind, lapply(generos, function(g) {
  horas <- total_base[[g]] * pesos_base[[g]] + rnorm(4, 0, 1.2)
  data.frame(genero = g, plataforma = plataformas, horas = round(pmax(horas, 0.4), 1))
}))

# Segundas metricas, so usadas neste grafico (largura variavel / barra de erro)
ouvintes_ativos <- c("Pop" = 18.4, "Rock" = 9.2, "Hip-Hop" = 14.1, "Eletrônica" = 7.6, "Sertanejo" = 16.8, "Jazz" = 3.9)
desvio_semanal  <- c("Pop" = 6.5,  "Rock" = 5.0, "Hip-Hop" = 7.2,  "Eletrônica" = 4.8, "Sertanejo" = 5.5,  "Jazz" = 3.0)

total <- dados %>%
  group_by(genero) %>%
  summarise(horas = round(sum(horas), 1), .groups = "drop") %>%
  mutate(genero = factor(genero, levels = generos))

# Cada genero tem sua propria cor, fixa nas 5 variacoes -- alem de ficar mais
# vivo que uma barra so, a cor constante ajuda a "seguir" o mesmo genero
# quando ele muda de posicao/orientacao entre os paineis (e, na versao
# interativa, entre os estados animados).
paleta_generos <- setNames(brewer.pal(6, "Dark2"), generos)

# ---------------------------------------------------------------------------
# Estatico: poster 2x3 com 5 variacoes do mesmo dado -- cada painel corresponde
# a um dos 5 botoes da versao interativa (ver "Como foi feito" no README).
# ---------------------------------------------------------------------------
tema_poster <- theme_minimal(base_size = 9) +
  theme(axis.text.x = element_text(angle = 30, hjust = 1), plot.title = element_text(face = "bold"))

p1 <- ggplot(total, aes(x = genero, y = horas, fill = genero)) +
  geom_col() +
  scale_fill_manual(values = paleta_generos, guide = "none") +
  labs(title = "Básico", x = NULL, y = "Horas (milhões)") +
  tema_poster

total_ord <- total %>% mutate(genero = fct_reorder(genero, horas, .desc = TRUE))

p2 <- ggplot(total_ord, aes(x = genero, y = horas, fill = genero)) +
  geom_col() +
  scale_fill_manual(values = paleta_generos, guide = "none") +
  labs(title = "Ordenado", x = NULL, y = NULL) +
  tema_poster

p3 <- ggplot(total_ord, aes(x = fct_rev(genero), y = horas, fill = genero)) +
  geom_col() +
  scale_fill_manual(values = paleta_generos, guide = "none") +
  coord_flip() +
  labs(title = "Horizontal", x = NULL, y = "Horas (milhões)") +
  theme_minimal(base_size = 9) +
  theme(plot.title = element_text(face = "bold"))

total_larg <- total_ord %>% mutate(ouvintes = ouvintes_ativos[as.character(genero)])

p4 <- ggplot(total_larg, aes(x = genero, y = horas, width = ouvintes / max(ouvintes) * 0.9, fill = genero)) +
  geom_col() +
  scale_fill_manual(values = paleta_generos, guide = "none") +
  labs(title = "Largura variável", subtitle = "largura = ouvintes ativos", x = NULL, y = "Horas (milhões)") +
  tema_poster

total_erro <- total_ord %>% mutate(desvio = desvio_semanal[as.character(genero)])

p5 <- ggplot(total_erro, aes(x = genero, y = horas, fill = genero)) +
  geom_col() +
  scale_fill_manual(values = paleta_generos, guide = "none") +
  geom_errorbar(aes(ymin = horas - desvio, ymax = horas + desvio), width = 0.25, color = "#2b2b2b") +
  labs(title = "Com barra de erro", x = NULL, y = NULL) +
  tema_poster

poster <- (p1 | p2 | p3) / (p4 | p5 | plot_spacer())
ggsave("output.png", plot = poster, width = 11, height = 7, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3, com uma barra de botoes que anima a transicao entre
# as 5 variacoes acima -- as MESMAS barras (chave = genero) se reorganizam em
# vez de trocar de grafico. O R so exporta o dado bruto por genero; o D3
# recalcula ordenacao/escala/layout de cada estado sozinho.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    paletaGeneros = as.list(paleta_generos),
    nota = "Use os botões acima para alternar a variação; passe o cursor sobre uma barra pra ver os valores exatos."
  ),
  generos = generos,
  dados = lapply(generos, function(g) {
    list(
      genero = g,
      horas = total$horas[as.character(total$genero) == g],
      ouvintes = unname(ouvintes_ativos[[g]]),
      desvio = unname(desvio_semanal[[g]])
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
