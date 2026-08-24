# Libraries
library(ggplot2)
library(dplyr)
library(patchwork)
library(RColorBrewer)
library(jsonlite)

# Mesmo dado (mesma seed, mesma logica de geracao) dos graficos irmaos
# ranking/barplot-classico e ranking/lollipop-streaming -- aqui, ao contrario
# deles, a granularidade completa por plataforma e o proprio assunto do
# grafico (composicao de um total), nao so um detalhe de hover.
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
})) %>%
  mutate(genero = factor(genero, levels = generos), plataforma = factor(plataforma, levels = plataformas))

# Cor por PLATAFORMA (nao por genero, como nos dois graficos irmaos) -- aqui
# a cor precisa identificar o subgrupo que compoe cada barra, entao usa uma
# paleta qualitativa a parte da dos outros dois (Dark2), pra nao sugerir que
# codificam a mesma coisa.
paleta_plataformas <- setNames(brewer.pal(4, "Set2"), plataformas)

# ---------------------------------------------------------------------------
# Estatico: 3 paineis lado a lado (agrupado / empilhado / empilhado 100%),
# legenda de plataforma compartilhada -- cada painel corresponde a um dos 3
# botoes da versao interativa (ver "Como foi feito" no README).
# ---------------------------------------------------------------------------
tema_poster <- theme_minimal(base_size = 9) +
  theme(
    axis.text.x = element_text(angle = 35, hjust = 1),
    plot.title = element_text(face = "bold"),
    legend.title = element_blank(),
    legend.position = "bottom"
  )

p1 <- ggplot(dados, aes(x = genero, y = horas, fill = plataforma)) +
  geom_col(position = position_dodge2(preserve = "single")) +
  scale_fill_manual(values = paleta_plataformas) +
  labs(title = "Agrupado", x = NULL, y = "Horas (milhões)") +
  tema_poster

p2 <- ggplot(dados, aes(x = genero, y = horas, fill = plataforma)) +
  geom_col(position = "stack") +
  scale_fill_manual(values = paleta_plataformas) +
  labs(title = "Empilhado", x = NULL, y = NULL) +
  tema_poster

p3 <- ggplot(dados, aes(x = genero, y = horas, fill = plataforma)) +
  geom_col(position = "fill") +
  scale_fill_manual(values = paleta_plataformas) +
  scale_y_continuous(labels = scales::percent) +
  labs(title = "Empilhado 100%", x = NULL, y = NULL) +
  tema_poster

poster <- (p1 | p2 | p3) + plot_layout(guides = "collect") & theme(legend.position = "bottom")
ggsave("output.png", plot = poster, width = 11.5, height = 5.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3. As 24 celulas (genero x plataforma) nunca entram/saem
# entre os 3 estados -- so mudam de x/y/largura/altura, exatamente como as
# barras do barplot classico. A diferenca e que aqui a posicao empilhada usa
# d3.stack() (com offset "expand" pro estado percentual), nao um calculo a
# mao -- o R so exporta o dado bruto por celula, o D3 empilha sozinho.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    generos = generos,
    plataformas = plataformas,
    paletaPlataformas = as.list(paleta_plataformas),
    nota = "Use os botões pra alternar entre agrupado, empilhado e empilhado 100%; passe o cursor numa fatia pra ver o valor, ou sobre a legenda pra realçar uma plataforma."
  ),
  celulas = unname(apply(dados, 1, function(r) {
    list(genero = unname(r[["genero"]]), plataforma = unname(r[["plataforma"]]), horas = as.numeric(r[["horas"]]))
  }))
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
