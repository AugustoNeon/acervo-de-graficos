# Libraries
library(ggplot2)
library(jsonlite)

# Dados ficticios: evolucao de 8 categorias fake ao longo de 25 anos
# (numero de grupos, periodo, seed e distribuicao diferentes do exemplo
# original do R Graph Gallery -- ver AGENTS.md "Decisoes fechadas")
set.seed(2024)
anos <- 2000:2024
grupos <- paste0("categoria_", 1:8)
dados <- data.frame(
  year = rep(anos, each = length(grupos)),
  name = rep(grupos, length(anos)),
  value = round(rgamma(length(anos) * length(grupos), shape = 2, scale = 15), 1)
)

# ---------------------------------------------------------------------------
# Layout do streamgraph, calculado aqui uma vez so.
#
# Um streamgraph e um grafico de area empilhada com duas diferencas: a pilha e
# centrada em torno de um eixo movel em vez de assentar no zero (offset
# "silhouette"), e as fronteiras entre faixas sao curvas suaves em vez de
# segmentos de reta.
#
# As duas versoes do grafico (esta imagem e a versao interativa em D3) precisam
# sair identicas, entao nenhuma das duas recalcula essa geometria: o R resolve
# as fronteiras ja suavizadas, num numero grande de pontos, e as duas apenas
# ligam os pontos com reta. Deixar cada lado aplicar a propria interpolacao
# (spline do R de um lado, curveBasis do d3 do outro) daria curvas parecidas
# mas nao iguais.
# ---------------------------------------------------------------------------

# Paleta da casa: oito matizes de croma alto, com L e C iguais entre si. Faixa
# de area aguenta -- e pede -- mais saturacao do que texto: aqui a cor nao
# precisa passar em contraste de leitura, precisa e separar faixa vizinha.
paleta <- c(
  "#e8603c", "#d1852a", "#9a9b1f", "#3ea55f",
  "#00a5a1", "#3f97d4", "#8b7fd4", "#d264a6"
)
names(paleta) <- grupos

rotulos <- paste("Categoria", seq_along(grupos))
names(rotulos) <- grupos

# Matriz anos x grupos
m <- matrix(dados$value, nrow = length(anos), byrow = TRUE,
            dimnames = list(anos, grupos))

# Offset "silhouette": a pilha inteira fica centrada em zero a cada ano, o que
# e o que da ao streamgraph o eixo serpenteante em vez de uma base reta.
base <- -rowSums(m) / 2
acumulado <- cbind(base, base + t(apply(m, 1, cumsum)))

# Suaviza cada fronteira ao longo do tempo. Sao 9 fronteiras (8 faixas + a de
# baixo); interpolar cada uma isoladamente preserva o empilhamento, porque a
# ordem entre elas nunca se inverte.
N_PONTOS <- 300
x_suave <- seq(min(anos), max(anos), length.out = N_PONTOS)
fronteiras <- apply(acumulado, 2, function(y) spline(anos, y, xout = x_suave)$y)

faixas <- lapply(seq_along(grupos), function(i) {
  data.frame(
    grupo = grupos[i],
    x = x_suave,
    y0 = fronteiras[, i],
    y1 = fronteiras[, i + 1]
  )
})
poligonos <- do.call(rbind, faixas)

p <- ggplot(poligonos, aes(x = x, fill = grupo)) +
  geom_ribbon(aes(ymin = y0, ymax = y1), colour = NA) +
  scale_fill_manual(values = paleta, labels = rotulos, name = NULL) +
  scale_x_continuous(breaks = seq(2000, 2024, by = 4), expand = c(0, 0)) +
  labs(x = NULL, y = NULL) +
  theme_minimal(base_size = 13) +
  theme(
    # O eixo vertical de um streamgraph nao tem leitura: a pilha flutua em
    # torno de um eixo movel, entao a altura absoluta nao significa nada.
    axis.text.y = element_blank(),
    panel.grid.major.y = element_blank(),
    panel.grid.minor = element_blank(),
    panel.grid.major.x = element_line(colour = "grey88", linewidth = 0.3),
    legend.position = "bottom",
    legend.text = element_text(size = 10),
    legend.key.size = unit(0.9, "lines"),
    plot.margin = margin(12, 16, 8, 16)
  ) +
  # Duas linhas: oito rotulos "Categoria N" numa linha so nao cabem na largura
  # de 9 polegadas e o ultimo sai cortado.
  guides(fill = guide_legend(nrow = 2, override.aes = list(colour = NA)))

ggsave("output.png", plot = p, width = 9, height = 4.8, dpi = 150)

# Exporta a MESMA geometria pra versao interativa.
viz <- list(
  meta = list(
    paleta = as.list(paleta),
    rotulos = as.list(rotulos),
    ordem = grupos,
    anos = range(anos),
    marcasX = seq(2000, 2024, by = 4),
    yRange = c(min(fronteiras), max(fronteiras))
  ),
  # Uma entrada por faixa, com as fronteiras ja suavizadas.
  faixas = lapply(seq_along(grupos), function(i) {
    list(
      grupo = grupos[i],
      x = x_suave,
      y0 = fronteiras[, i],
      y1 = fronteiras[, i + 1]
    )
  }),
  # Valor bruto por ano, so pro tooltip -- o desenho nao usa.
  valores = lapply(seq_along(grupos), function(i) {
    list(grupo = grupos[i], anos = anos, valores = unname(m[, i]))
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = 4)
