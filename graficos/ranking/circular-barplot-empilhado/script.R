# Libraries
library(tidyverse)

# Dados ficticios: filiais de uma rede de livrarias, agrupadas por regiao,
# com receita mensal (R$ mil) em 3 linhas de produto -- no lugar dos "Mister N"
# genericos e das 3 variaveis sem nome do exemplo original
set.seed(1806)
regioes <- c(Norte = 8, Sul = 10, Leste = 6, Oeste = 8)

dados <- data.frame(
  filial = paste0("Filial ", sprintf("%02d", seq(1, sum(regioes)))),
  regiao = factor(rep(names(regioes), times = regioes))
)
dados$ficcao     <- sample(seq(5, 45), nrow(dados), replace = TRUE)
dados$nao_ficcao <- sample(seq(5, 45), nrow(dados), replace = TRUE)
dados$infantil   <- sample(seq(5, 45), nrow(dados), replace = TRUE)

# Formato longo (tidy): uma linha por filial x linha-de-produto
dados <- dados %>%
  pivot_longer(cols = c(ficcao, nao_ficcao, infantil), names_to = "categoria", values_to = "receita")

# Numero de barras "vazias" a acrescentar no fim de cada grupo -- cria o
# respiro entre regioes no circulo (mesma tecnica do exemplo original)
barras_vazias <- 3
n_categorias <- nlevels(as.factor(dados$categoria))
preenchimento <- data.frame(matrix(NA, barras_vazias * nlevels(dados$regiao) * n_categorias, ncol(dados)))
colnames(preenchimento) <- colnames(dados)
preenchimento$regiao <- rep(levels(dados$regiao), each = barras_vazias * n_categorias)
dados <- rbind(dados, preenchimento)
dados <- dados %>% arrange(regiao, filial)
dados$id <- rep(seq(1, nrow(dados) / n_categorias), each = n_categorias)

# Posicao/angulo do rotulo de cada filial (fica no topo da barra empilhada) --
# subtrai 0.5 porque o rotulo deve ficar no CENTRO da barra, nao numa borda
dados_rotulo <- dados %>% group_by(id, filial) %>% summarise(total = sum(receita), .groups = "drop")
n_barras <- nrow(dados_rotulo)
angulo <- 90 - 360 * (dados_rotulo$id - 0.5) / n_barras
dados_rotulo$hjust <- ifelse(angulo < -90, 1, 0)
dados_rotulo$angulo <- ifelse(angulo < -90, angulo + 180, angulo)

# Linha de base por regiao (arco + nome da regiao embaixo das barras)
dados_base <- dados %>%
  group_by(regiao) %>%
  summarise(inicio = min(id), fim = max(id) - barras_vazias) %>%
  rowwise() %>%
  mutate(centro = mean(c(inicio, fim)))

# Linhas de grade (escala de fundo), deslocadas 1 posicao pra nao cortar a
# primeira barra de cada regiao
dados_grade <- dados_base
dados_grade$fim <- dados_grade$fim[c(nrow(dados_grade), 1:nrow(dados_grade) - 1)] + 1
dados_grade$inicio <- dados_grade$inicio - 1
dados_grade <- dados_grade[-1, ]

# Paleta categorica fixa (RColorBrewer) no lugar do scale_fill_viridis() do
# exemplo original -- definida uma vez e reaproveitada pela versao interativa
# no fim do script, pra nao dessincronizar as cores entre as duas
paleta <- RColorBrewer::brewer.pal(3, "Dark2")
names(paleta) <- c("ficcao", "nao_ficcao", "infantil")

p <- ggplot(dados) +

  # Barra empilhada
  geom_bar(aes(x = as.factor(id), y = receita, fill = categoria), stat = "identity", alpha = 0.85) +
  scale_fill_manual(values = paleta) +

  # Linhas de referencia em 0/40/80/120 (antes das barras, pra ficarem por baixo)
  geom_segment(data = dados_grade, aes(x = fim, y = 0, xend = inicio, yend = 0), colour = "grey70", linewidth = 0.3, inherit.aes = FALSE) +
  geom_segment(data = dados_grade, aes(x = fim, y = 40, xend = inicio, yend = 40), colour = "grey70", linewidth = 0.3, inherit.aes = FALSE) +
  geom_segment(data = dados_grade, aes(x = fim, y = 80, xend = inicio, yend = 80), colour = "grey70", linewidth = 0.3, inherit.aes = FALSE) +
  geom_segment(data = dados_grade, aes(x = fim, y = 120, xend = inicio, yend = 120), colour = "grey70", linewidth = 0.3, inherit.aes = FALSE) +

  # Rotulo numerico de cada linha de referencia
  annotate("text", x = rep(max(dados$id), 4), y = c(0, 40, 80, 120), label = c("0", "40", "80", "120"), color = "grey40", size = 4, fontface = "bold", hjust = 1) +

  ylim(-60, max(dados_rotulo$total, na.rm = TRUE) + 20) +
  theme_minimal() +
  theme(
    legend.position = "none",
    axis.text = element_blank(),
    axis.title = element_blank(),
    panel.grid = element_blank(),
    plot.margin = unit(rep(-1, 4), "cm")
  ) +
  coord_polar() +

  # Nome de cada filial no topo da sua barra
  geom_text(data = dados_rotulo, aes(x = id, y = total + 6, label = filial, hjust = hjust), color = "black", fontface = "bold", alpha = 0.7, size = 3, angle = dados_rotulo$angulo, inherit.aes = FALSE) +

  # Arco + nome da regiao por baixo do grupo de barras correspondente
  geom_segment(data = dados_base, aes(x = inicio, y = -4, xend = fim, yend = -4), colour = "black", alpha = 0.8, linewidth = 0.6, inherit.aes = FALSE) +
  geom_text(data = dados_base, aes(x = centro, y = -14, label = regiao), hjust = c(1, 1, 0, 0), colour = "black", alpha = 0.8, size = 3.5, fontface = "bold", inherit.aes = FALSE)

ggsave("output.png", plot = p, width = 9, height = 9, dpi = 150)

# Versao interativa: mesmos dados/paleta, mas via plotly::plot_ly(type =
# "barpolar") nativo em vez de tentar converter o coord_polar() do ggplot2 --
# o ggplotly() nao suporta coordenadas polares (mesma limitacao ja
# documentada no grafico de rosca de alocacao de tempo, que tambem usa uma
# funcao nativa do plotly em vez de ggplotly() por esse motivo)
library(plotly)

# Remove as barras vazias -- so serviam de respiro no estatico, aqui viram
# so um espaco em branco entre regioes se entrarem com receita NA/0
dados_int <- dados %>% filter(!is.na(receita))

# theta categorico na MESMA ordem (por id) do grafico estatico -- senao o
# plotly reordena as filiais em ordem alfabetica e perde o agrupamento
# visual por regiao
dados_int$filial <- factor(dados_int$filial, levels = unique(dados_int$filial[order(dados_int$id)]))

# Rotulo de exibicao pra legenda (o estatico nao mostra legenda, entao o nome
# bruto da coluna nunca apareceu ali -- aqui precisa ficar apresentavel)
rotulo_categoria <- c(ficcao = "Ficção", nao_ficcao = "Não-ficção", infantil = "Infantil")
dados_int$categoria <- factor(rotulo_categoria[dados_int$categoria], levels = rotulo_categoria)
paleta_int <- paleta
names(paleta_int) <- rotulo_categoria[names(paleta)]

widget <- plot_ly(
  dados_int,
  type = "barpolar",
  r = ~receita,
  theta = ~filial,
  color = ~categoria,
  colors = paleta_int,
  hovertemplate = ~paste0("<b>", filial, "</b><br>", regiao, "<br>",
                          categoria, ": R$ ", receita, " mil<extra></extra>")
) %>%
  layout(
    barmode = "stack",
    showlegend = TRUE,
    polar = list(
      radialaxis = list(showticklabels = TRUE, ticksuffix = "", angle = 90),
      angularaxis = list(showticklabels = FALSE, ticks = "")
    )
  )

htmlwidgets::saveWidget(widget, file = "widget.html", selfcontained = FALSE)
