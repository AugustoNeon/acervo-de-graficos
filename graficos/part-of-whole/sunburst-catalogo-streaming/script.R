# Libraries
library(ggplot2)
library(dplyr)
library(colorspace)
library(jsonlite)

# Dados 100% ficticios: horas assistidas de um catalogo de streaming
# ficticio, em 3 niveis -- genero > subgenero > titulo. Construido a mao
# (nao so tendencia + ruido) pra dar contraste de tamanho entre os ramos:
# alguns generos dominam o catalogo, outros sao nicho, o tipo de assimetria
# que faz um sunburst valer mais a pena que uma lista plana.
dados <- tribble(
  ~genero, ~subgenero, ~titulo, ~horas,
  "Ação", "Super-herói", "Guardiões do Amanhã", 420,
  "Ação", "Super-herói", "Vórtice de Aço", 310,
  "Ação", "Super-herói", "Legado Carmesim", 275,
  "Ação", "Espionagem", "Código Zero", 260,
  "Ação", "Espionagem", "Sombra Dupla", 190,
  "Drama", "Família", "Raízes de Vidro", 300,
  "Drama", "Família", "Entre Paredes", 220,
  "Drama", "Família", "Segunda Chance", 180,
  "Drama", "Época", "Ventos do Sul", 240,
  "Drama", "Época", "A Última Colheita", 150,
  "Comédia", "Romântica", "Amor em Reformas", 280,
  "Comédia", "Romântica", "Trapalhões do Amor", 200,
  "Comédia", "Sátira", "Escritório Improvável", 260,
  "Comédia", "Sátira", "Política de Corredor", 140,
  "Documentário", "Natureza", "Oceanos Profundos", 330,
  "Documentário", "Natureza", "Selva Viva", 210,
  "Documentário", "True crime", "Arquivo Confidencial", 290,
  "Documentário", "True crime", "Pistas Frias", 175,
  "Ficção Científica", "Espaço", "Órbita Perdida", 350,
  "Ficção Científica", "Espaço", "Colônia Vermelha", 295,
  "Ficção Científica", "Espaço", "Constelação Zero", 180,
  "Ficção Científica", "Distopia", "Última Cidade", 310,
  "Ficção Científica", "Distopia", "Silêncio Digital", 225
)

generos <- c("Ação", "Drama", "Comédia", "Documentário", "Ficção Científica")
dados$genero <- factor(dados$genero, levels = generos)
dados <- dados %>% arrange(genero, subgenero, titulo)

# Paleta trocada em relacao ao original (o exemplo do gallery usa uma paleta
# categorica generica) -- vivida, uma cor-base por genero; sub-genero e
# titulo usam a MESMA cor-base clareada em dois passos (colorspace::lighten),
# em vez de cores escolhidas a esmo por nivel -- e o que deixa visualmente
# obvio que um anel inteiro pertence ao mesmo genero do anel de dentro.
cores_base <- setNames(c("#E4572E", "#2E5EAA", "#F2B134", "#17A398", "#7B2D8B"), generos)

total_geral <- sum(dados$horas)

# --- particao angular (equivalente ao d3.partition(), calculado a mao) -----
titulos <- dados %>%
  mutate(
    x1 = cumsum(horas) / total_geral,
    x0 = x1 - horas / total_geral,
    nivel = 3,
    cor = lighten(cores_base[as.character(genero)], amount = 0.55)
  )

subgeneros <- titulos %>%
  group_by(genero, subgenero) %>%
  summarise(horas = sum(horas), x0 = min(x0), x1 = max(x1), .groups = "drop") %>%
  mutate(nivel = 2, cor = lighten(cores_base[as.character(genero)], amount = 0.3))

niveis_genero <- titulos %>%
  group_by(genero) %>%
  summarise(horas = sum(horas), x0 = min(x0), x1 = max(x1), .groups = "drop") %>%
  mutate(nivel = 1, cor = cores_base[as.character(genero)])

# Rotulo (so no anel de genero -- os de dentro nao tem espaco pra texto)
n1 <- niveis_genero
n1_angulo <- 90 - 360 * (n1$x0 + n1$x1) / 2
n1$hjust <- ifelse(n1_angulo < -90, 1, 0)
n1$angulo <- ifelse(n1_angulo < -90, n1_angulo + 180, n1_angulo)

rects <- bind_rows(
  niveis_genero %>% select(nivel, x0, x1, cor),
  subgeneros %>% select(nivel, x0, x1, cor),
  titulos %>% select(nivel, x0, x1, cor)
) %>%
  mutate(ymin = nivel, ymax = nivel + 1)

p <- ggplot() +
  geom_rect(data = rects, aes(xmin = x0, xmax = x1, ymin = ymin, ymax = ymax, fill = cor), color = "white", linewidth = 0.25) +
  geom_text(
    data = n1, aes(x = (x0 + x1) / 2, y = 1.5, label = genero, angle = angulo, hjust = hjust),
    color = "white", fontface = "bold", size = 3.4
  ) +
  scale_fill_identity() +
  scale_x_continuous(limits = c(0, 1)) +
  scale_y_continuous(limits = c(0, 4.4)) +
  coord_polar(theta = "x") +
  theme_void()

ggsave("output.png", plot = p, width = 7.5, height = 7.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3 monta a MESMA arvore com d3.hierarchy()+d3.partition()
# (nao precisa da particao calculada a mao acima, so da estrutura aninhada) e
# permite zoom clicando numa fatia (transicao de arco animada, tecnica
# classica de "zoomable sunburst"), alem de um seletor pra recolorir ao vivo
# por categoria/profundidade/valor -- as cores por CATEGORIA vem prontas do
# R (mesma logica acima), os outros dois modos sao calculados no D3 a partir
# do value/depth de cada no, sem equivalente estatico (recurso so da versao
# interativa).
# ---------------------------------------------------------------------------
construir_arvore <- function() {
  list(
    nome = "catálogo",
    cor = "#ffffff",
    filhos = lapply(generos, function(g) {
      subs <- unique(dados$subgenero[dados$genero == g])
      list(
        nome = g,
        cor = unname(cores_base[g]),
        filhos = lapply(subs, function(s) {
          folhas <- dados %>% filter(genero == g, subgenero == s)
          list(
            nome = s,
            cor = unname(lighten(cores_base[g], amount = 0.3)),
            filhos = lapply(seq_len(nrow(folhas)), function(i) {
              list(nome = folhas$titulo[i], valor = folhas$horas[i], cor = unname(lighten(cores_base[g], amount = 0.55)))
            })
          )
        })
      )
    })
  )
}

viz <- list(
  meta = list(nota = "Clique numa fatia pra dar zoom nela; clique no centro pra voltar. Use os botões acima pra trocar como as cores são atribuídas."),
  arvore = construir_arvore()
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
