# Libraries
library(ggplot2)
library(dplyr)
library(forcats)
library(RColorBrewer)
library(jsonlite)

# Mesmo dado (mesma seed, mesma logica de geracao) do grafico irmao
# ranking/barplot-classico -- os numeros por genero batem entre as duas
# paginas de proposito, ver README. Aqui a granularidade por plataforma
# tambem e exportada, pra alimentar o detalhamento no hover da versao
# interativa.
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

total <- dados %>%
  group_by(genero) %>%
  summarise(horas = round(sum(horas), 1), .groups = "drop") %>%
  mutate(genero = factor(genero, levels = generos))

paleta_generos <- setNames(brewer.pal(6, "Dark2"), generos)
genero_topo <- as.character(total$genero[which.max(total$horas)])

# ---------------------------------------------------------------------------
# Estatico: lollipop horizontal ordenado, com o item de maior valor destacado
# por um halo (em vez de so aumentar o ponto) e o valor exato rotulado ao
# lado de cada item.
# ---------------------------------------------------------------------------
total_ord <- total %>% mutate(genero = fct_reorder(genero, horas))

p <- ggplot(total_ord, aes(x = genero, y = horas)) +
  geom_segment(aes(xend = genero, y = 0, yend = horas), color = "#b7b7b7", linewidth = 0.9) +
  geom_point(data = filter(total_ord, genero == genero_topo), aes(color = genero), size = 12, alpha = 0.22) +
  geom_point(aes(color = genero), size = 4.6) +
  geom_text(aes(label = round(horas)), hjust = -0.9, size = 3.4, color = "#3a3a3a", family = "sans") +
  scale_color_manual(values = paleta_generos, guide = "none") +
  scale_y_continuous(expand = expansion(mult = c(0.02, 0.16))) +
  coord_flip() +
  labs(x = NULL, y = "Horas de audição (milhões)") +
  theme_minimal(base_size = 12) +
  theme(panel.grid.minor = element_blank(), panel.grid.major.y = element_blank())

ggsave("output.png", plot = p, width = 7.5, height = 5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3. Mesmo principio de "mesma barra se reorganiza" do
# grafico irmao, aqui so com um toggle de ordem (crescente/decrescente) em
# vez de 5 estados -- e o hover mostra o detalhamento por plataforma que o
# estatico nao tem espaco pra mostrar.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    paletaGeneros = as.list(paleta_generos),
    generoTopo = genero_topo,
    nota = "Passe o cursor sobre um item pra ver o detalhamento por plataforma; use os botões pra inverter a ordem."
  ),
  itens = lapply(generos, function(g) {
    detalhe <- dados[dados$genero == g, c("plataforma", "horas")]
    list(
      genero = g,
      horas = total$horas[as.character(total$genero) == g],
      plataformas = lapply(seq_len(nrow(detalhe)), function(j) {
        list(plataforma = detalhe$plataforma[j], horas = detalhe$horas[j])
      })
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
