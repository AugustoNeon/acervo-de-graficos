# Libraries
library(ggplot2)
library(patchwork)
library(jsonlite)

# Dados 100% ficticios: co-ocorrencia de tags num forum de tecnologia -- quantas
# vezes cada par de tags apareceu no mesmo post. E uma rede como qualquer outra
# (16 nos, arestas ponderadas), mas desenhada como MATRIZ em vez de nos e linhas.
#
# Os pesos sao construidos a partir de uma estrutura de comunidade explicita
# (quatro grupos de quatro tags) mais pontes deliberadas entre alguns grupos.
# Sem comunidade nenhuma no dado, a matriz nao teria bloco pra revelar -- e a
# reordenacao, que e a razao de existir deste grafico, nao mostraria nada.
set.seed(4242)

grupos <- list(
  "Front-end" = c("JavaScript", "React", "CSS", "HTML"),
  "Back-end"  = c("Python", "SQL", "Docker", "API REST"),
  "Dados"     = c("Pandas", "Machine Learning", "Estatística", "Jupyter"),
  "Mobile"    = c("Android", "iOS", "Flutter", "Kotlin")
)
tags <- unlist(grupos, use.names = FALSE)
grupo_de <- setNames(rep(names(grupos), lengths(grupos)), tags)
n <- length(tags)

m <- matrix(0L, n, n, dimnames = list(tags, tags))
for (i in seq_len(n - 1)) {
  for (j in seq(i + 1, n)) {
    mesmo <- grupo_de[[tags[i]]] == grupo_de[[tags[j]]]
    v <- as.integer(round(rnorm(1, if (mesmo) 26 else 4, if (mesmo) 7 else 3)))
    v <- max(0L, v)
    m[i, j] <- v
    m[j, i] <- v
  }
}

# Pontes entre grupos, postas a mao: sao elas que impedem a matriz de virar
# quatro blocos perfeitamente isolados (o que seria bonito e irreal). Aqui,
# back-end e dados compartilham muito por causa do Python, e mobile toca o
# back-end pela API -- enquanto front-end fica praticamente fechado em si.
pontes <- list(
  c("Python", "Pandas", 42), c("Python", "Machine Learning", 33),
  c("Python", "Jupyter", 29), c("SQL", "Pandas", 25),
  c("Kotlin", "API REST", 19), c("iOS", "API REST", 16),
  c("JavaScript", "Flutter", 12)
)
for (p in pontes) {
  m[p[1], p[2]] <- as.integer(p[3])
  m[p[2], p[1]] <- as.integer(p[3])
}

# Paleta propria: rampa sequencial ambar -> terracota -> marrom. Uma rampa
# sequencial (nao categorica) porque o peso e uma quantidade ordenada; o tom
# mais claro precisa ser distinguivel do fundo da pagina, senao "poucos posts
# em comum" e "nenhum" viram a mesma celula.
rampa <- colorRampPalette(c("#FBF1E2", "#E8A54B", "#B4531F", "#6E2412"))
cor_zero <- "#F4F1EC"
cor_diagonal <- "#DCD8D2"

peso_max <- max(m)
cor_do_peso <- function(v) {
  if (is.na(v)) return(cor_diagonal)
  if (v == 0) return(cor_zero)
  rampa(101)[round(v / peso_max * 100) + 1]
}

# Formato longo: uma linha por celula. A diagonal fica NA -- a co-ocorrencia de
# uma tag com ela mesma nao e um dado, e preenche-la com o total da tag mudaria
# a escala de cor inteira por causa de valores que nao sao comparaveis aos
# outros.
celulas <- expand.grid(a = tags, b = tags, stringsAsFactors = FALSE)
celulas$peso <- mapply(function(a, b) if (a == b) NA_integer_ else m[a, b], celulas$a, celulas$b)
celulas$cor <- vapply(celulas$peso, cor_do_peso, character(1))

# Ordem por agrupamento: a ordem que revela os blocos, e a que a imagem estatica
# usa. As outras duas (alfabetica, por grau) so existem na versao interativa.
ordem_grupo <- tags
grau <- rowSums(m)

celulas$a <- factor(celulas$a, levels = ordem_grupo)
celulas$b <- factor(celulas$b, levels = rev(ordem_grupo))

# Linhas separando os grupos: sem elas o leitor precisa descobrir sozinho onde
# um bloco termina e o outro comeca.
limites <- cumsum(lengths(grupos))
limites <- limites[-length(limites)]

p <- ggplot(celulas, aes(x = a, y = b)) +
  geom_tile(aes(fill = cor), colour = "white", linewidth = 0.6) +
  scale_fill_identity() +
  geom_vline(xintercept = limites + 0.5, colour = "grey35", linewidth = 0.5) +
  geom_hline(yintercept = n - limites + 0.5, colour = "grey35", linewidth = 0.5) +
  coord_fixed() +
  labs(
    title = "Quais tags aparecem juntas: a mesma rede, desenhada como matriz",
    subtitle = paste(
      "Cada célula é um par de tags; quanto mais escura, mais posts elas dividem.",
      "\nCom as tags agrupadas por afinidade, os quatro blocos escuros na diagonal são as comunidades."
    ),
    x = NULL, y = NULL
  ) +
  theme_minimal(base_size = 10) +
  theme(
    plot.title = element_text(face = "bold", size = 13),
    plot.subtitle = element_text(colour = "grey35", size = 9, margin = margin(b = 10)),
    panel.grid = element_blank(),
    axis.text.x = element_text(angle = 45, hjust = 1, colour = "grey15"),
    axis.text.y = element_text(colour = "grey15")
  )

# Legenda desenhada a mao. `scale_fill_identity()` nao gera legenda nenhuma --
# e trocar por `scale_fill_gradientn()` (que geraria) faria o ggplot2 recalcular
# as cores interpolando em Lab, enquanto o `colorRampPalette` acima interpola em
# RGB: as duas versoes do grafico passariam a ter paletas ligeiramente
# diferentes, exatamente o tipo de divergencia que a checagem do WORKFLOW proibe.
faixa <- data.frame(
  v = seq(0, peso_max, length.out = 60)
)
faixa$cor <- vapply(faixa$v, cor_do_peso, character(1))

p_legenda <- ggplot(faixa, aes(x = v, y = 1, fill = cor)) +
  geom_tile() +
  scale_fill_identity() +
  scale_x_continuous(breaks = c(0, round(peso_max / 2), peso_max), expand = c(0, 0)) +
  labs(x = "posts em comum", y = NULL) +
  theme_minimal(base_size = 10) +
  theme(
    panel.grid = element_blank(),
    axis.text.y = element_blank(),
    axis.text.x = element_text(colour = "grey30", size = 8),
    axis.title.x = element_text(colour = "grey30", size = 8, margin = margin(t = 2)),
    plot.margin = margin(0, 10, 0, 10)
  )

final <- patchwork::wrap_plots(p, p_legenda, ncol = 1, heights = c(24, 1))

ggsave("output.png", plot = final, width = 8.5, height = 8.4, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: a mesma matriz, com o controle que a torna util de verdade.
# Uma matriz de adjacencia nao tem layout pra calcular -- o que ela tem e uma
# ORDEM, e a ordem decide se os blocos aparecem ou nao. Trocar entre agrupada,
# alfabetica e por grau (com as linhas e colunas deslizando) mostra que a rede
# nao mudou: so a ordem em que ela foi escrita.
#
# A cor de cada celula vem pronta daqui, calculada uma unica vez, pra que o
# output.png e a versao interativa nao possam divergir de paleta.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    tags = tags,
    grupos = as.list(grupo_de),
    nomesGrupos = names(grupos),
    grau = as.list(setNames(as.integer(grau), tags)),
    pesoMaximo = as.integer(peso_max),
    paleta = list(
      zero = cor_zero,
      diagonal = cor_diagonal,
      escala = rampa(9)
    ),
    nota = paste(
      "Troque para a ordem alfabética e veja os blocos desaparecerem:",
      "a rede é exatamente a mesma, só a ordem das linhas mudou."
    )
  ),
  celulas = lapply(seq_len(nrow(celulas)), function(i) {
    list(
      a = as.character(celulas$a[i]),
      b = as.character(celulas$b[i]),
      # `NA`, nao `NULL`: um `NULL` dentro de `list()` nao vira `null` no JSON --
      # ele some do elemento e o campo sai como objeto vazio (`{}`), que no D3
      # e um valor "presente" e passa direto por qualquer teste de ausencia.
      # O `na = "null"` do write_json abaixo e quem converte o NA corretamente.
      peso = celulas$peso[i],
      cor = celulas$cor[i]
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA, na = "null")
