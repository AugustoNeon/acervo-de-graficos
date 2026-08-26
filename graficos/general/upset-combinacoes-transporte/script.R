# Libraries
library(ggplot2)
library(patchwork)
library(jsonlite)

# Dados 100% ficticios: 2400 moradores de uma cidade imaginaria, cada um
# marcando quais meios de transporte usou na ultima semana. Como cada pessoa
# pode marcar varios, o que interessa nao e quantos usam cada meio (isso um
# barplot resolve) e sim quais COMBINACOES de meios aparecem juntas.
#
# O sorteio e condicional de proposito, nao independente: quem usa carro tende
# a nao usar onibus nem metro, e quem usa transporte publico quase sempre
# tambem anda a pe. Sorteios independentes produziriam intersecoes proporcionais
# ao acaso -- justamente o padrao que um UpSet nao teria motivo pra mostrar.
set.seed(20260826)
n <- 2400
carro     <- rbinom(n, 1, 0.45)
onibus    <- rbinom(n, 1, ifelse(carro == 1, 0.15, 0.52))
metro     <- rbinom(n, 1, ifelse(carro == 1, 0.20, 0.46))
a_pe      <- rbinom(n, 1, ifelse(onibus == 1 | metro == 1, 0.78, 0.34))
bicicleta <- rbinom(n, 1, 0.17)

matriz <- data.frame(Carro = carro, Ônibus = onibus, Metrô = metro,
                     `A pé` = a_pe, Bicicleta = bicicleta, check.names = FALSE)

# Quem nao marcou nenhum meio fica de fora: o conjunto vazio nao e uma
# intersecao, e desenha-lo como se fosse infla a leitura.
matriz <- matriz[rowSums(matriz) > 0, ]
conjuntos <- names(matriz)

# Total por conjunto (o que um barplot comum mostraria sozinho). A soma destes
# totais e MAIOR que o numero de pessoas -- e exatamente por isso que empilhar
# ou fatiar esses numeros num grafico de pizza seria errado.
totais <- sort(colSums(matriz), decreasing = TRUE)
ordem_conjuntos <- names(totais)

# Cada linha vira uma assinatura ("10110") e as assinaturas iguais sao contadas
# juntas: e a unica agregacao que o UpSet precisa.
assinatura <- apply(matriz[, ordem_conjuntos], 1, paste, collapse = "")
contagem <- sort(table(assinatura), decreasing = TRUE)

# So as combinacoes mais frequentes entram no grafico: a cauda de combinacoes
# raras (dezenas com 1 ou 2 pessoas) ocuparia metade da largura sem dizer nada.
n_intersecoes <- 12
top <- contagem[seq_len(min(n_intersecoes, length(contagem)))]

intersecoes <- data.frame(
  assinatura = names(top),
  tamanho = as.integer(top),
  stringsAsFactors = FALSE
)
intersecoes$grau <- sapply(strsplit(intersecoes$assinatura, ""), function(b) sum(b == "1"))
intersecoes$ordem <- seq_len(nrow(intersecoes))
intersecoes$rotulo <- sapply(strsplit(intersecoes$assinatura, ""), function(b) {
  paste(ordem_conjuntos[b == "1"], collapse = " + ")
})

# Paleta propria: uma familia azul monocromatica, em que o tom mais escuro
# marca a intersecao (o dado principal) e o medio o total por conjunto (o dado
# de contexto). O cinza claro nao e "outra cor": e a ausencia, e precisa
# recuar visualmente sem sumir.
cor_intersecao <- "#1D3557"
cor_conjunto <- "#457B9D"
cor_vazio <- "#DDE2E8"

# Matriz de pontos: uma linha por par (intersecao, conjunto), marcando presenca.
pontos <- expand.grid(
  ordem = intersecoes$ordem,
  conjunto = factor(ordem_conjuntos, levels = rev(ordem_conjuntos)),
  stringsAsFactors = FALSE
)
pontos$presente <- mapply(function(o, cj) {
  bits <- strsplit(intersecoes$assinatura[intersecoes$ordem == o], "")[[1]]
  bits[match(cj, ordem_conjuntos)] == "1"
}, pontos$ordem, as.character(pontos$conjunto))

# Segmento ligando o primeiro ao ultimo conjunto de cada combinacao. Sem ele
# uma combinacao de 3 conjuntos lê como 3 pontos soltos; com ele, lê como uma
# coisa so.
conexoes <- do.call(rbind, lapply(intersecoes$ordem, function(o) {
  presentes <- pontos[pontos$ordem == o & pontos$presente, ]
  if (nrow(presentes) < 2) return(NULL)
  alturas <- as.integer(presentes$conjunto)
  data.frame(ordem = o, y = min(alturas), yend = max(alturas))
}))

tema_base <- theme_minimal(base_size = 11) +
  theme(
    panel.grid.minor = element_blank(),
    plot.margin = margin(4, 6, 4, 6)
  )

# --- Painel de cima: tamanho de cada combinacao -----------------------------
p_topo <- ggplot(intersecoes, aes(x = ordem, y = tamanho)) +
  geom_col(fill = cor_intersecao, width = 0.62) +
  geom_text(aes(label = tamanho), vjust = -0.45, size = 3, colour = "grey25") +
  scale_x_continuous(limits = c(0.5, nrow(intersecoes) + 0.5), expand = c(0, 0)) +
  scale_y_continuous(expand = expansion(mult = c(0, 0.16))) +
  labs(x = NULL, y = "Moradores na combinação") +
  tema_base +
  theme(
    panel.grid.major.x = element_blank(),
    axis.text.x = element_blank()
  )

# --- Painel de baixo/direita: a matriz de pontos ----------------------------
p_matriz <- ggplot(pontos, aes(x = ordem, y = as.integer(conjunto))) +
  geom_point(aes(colour = presente), size = 3.6) +
  geom_segment(
    data = conexoes, inherit.aes = FALSE,
    aes(x = ordem, xend = ordem, y = y, yend = yend),
    colour = cor_intersecao, linewidth = 1
  ) +
  # Redesenhar so os pontos presentes por cima do segmento: sem isso a linha
  # corta o meio de cada ponto cheio.
  geom_point(data = subset(pontos, presente), colour = cor_intersecao, size = 3.6) +
  scale_colour_manual(values = c(`TRUE` = cor_intersecao, `FALSE` = cor_vazio), guide = "none") +
  scale_x_continuous(limits = c(0.5, nrow(intersecoes) + 0.5), expand = c(0, 0)) +
  scale_y_continuous(
    breaks = seq_along(ordem_conjuntos),
    labels = rev(ordem_conjuntos),
    limits = c(0.5, length(ordem_conjuntos) + 0.5),
    expand = c(0, 0)
  ) +
  labs(x = NULL, y = NULL) +
  tema_base +
  theme(
    panel.grid.major.x = element_blank(),
    panel.grid.major.y = element_line(colour = "grey93"),
    axis.text.x = element_blank(),
    axis.text.y = element_text(colour = "grey15", size = 10)
  )

# --- Painel de baixo/esquerda: total por meio -------------------------------
totais_df <- data.frame(
  conjunto = factor(ordem_conjuntos, levels = rev(ordem_conjuntos)),
  total = as.integer(totais)
)

p_esquerda <- ggplot(totais_df, aes(x = total, y = as.integer(conjunto))) +
  geom_col(fill = cor_conjunto, width = 0.55, orientation = "y") +
  scale_x_reverse(expand = expansion(mult = c(0.14, 0))) +
  scale_y_continuous(limits = c(0.5, length(ordem_conjuntos) + 0.5), expand = c(0, 0)) +
  labs(x = "Total por meio", y = NULL) +
  tema_base +
  theme(
    panel.grid.major.y = element_blank(),
    axis.text.y = element_blank()
  )

vazio <- plot_spacer()

p <- (vazio + p_topo + p_esquerda + p_matriz) +
  plot_layout(ncol = 2, widths = c(1, 3.1), heights = c(2.1, 3)) +
  plot_annotation(
    title = "Combinações de meios de transporte usados na semana",
    subtitle = paste0(
      "Cada coluna é uma combinação, não um meio isolado: os pontos ligados abaixo dizem quais meios ela reúne.\n",
      "Base: ", formatC(nrow(matriz), big.mark = ".", decimal.mark = ",", format = "d"), " moradores que usaram ao menos um meio. Como cada um pode usar vários, ",
      "os totais à esquerda somam mais que essa base."
    ),
    theme = theme(
      plot.title = element_text(face = "bold", size = 13),
      plot.subtitle = element_text(colour = "grey35", size = 9, margin = margin(b = 10))
    )
  )

ggsave("output.png", plot = p, width = 10, height = 6.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: os mesmos tres paineis, desenhados em D3 num SVG so (o que
# resolve o alinhamento entre eles por construcao, sem depender do patchwork).
# O que a versao interativa acrescenta e a leitura CRUZADA, que a imagem
# estatica nao da: passar o cursor num meio de transporte acende todas as
# combinacoes que o incluem, e passar numa combinacao acende os meios dela.
# Mais um seletor de ordenacao das colunas, com reordenacao animada.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    conjuntos = ordem_conjuntos,
    totais = as.list(setNames(as.integer(totais), ordem_conjuntos)),
    respondentes = nrow(matriz),
    paleta = list(
      intersecao = cor_intersecao,
      conjunto = cor_conjunto,
      vazio = cor_vazio
    ),
    nota = paste(
      "Passe o cursor num meio de transporte à esquerda para acender todas as",
      "combinações que o incluem — a leitura que a imagem estática não dá."
    )
  ),
  intersecoes = lapply(seq_len(nrow(intersecoes)), function(i) {
    bits <- strsplit(intersecoes$assinatura[i], "")[[1]]
    list(
      id = intersecoes$assinatura[i],
      rotulo = intersecoes$rotulo[i],
      tamanho = intersecoes$tamanho[i],
      grau = intersecoes$grau[i],
      # `I()` obrigatorio: com `auto_unbox = TRUE`, um vetor de UM elemento
      # sairia como escalar ("Carro") em vez de array (["Carro"]) -- e as
      # combinacoes de grau 1 sao justamente as maiores deste grafico. O D3
      # leria a string caractere a caractere, sem erro nenhum no meio.
      membros = I(ordem_conjuntos[bits == "1"])
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
