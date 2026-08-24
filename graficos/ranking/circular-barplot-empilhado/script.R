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
# exemplo original
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

# ---------------------------------------------------------------------------
# Exporta os mesmos dados e a mesma geometria pra versao interativa (data.json).
#
# A versao interativa desenha o grafico de novo em D3, e a regra do acervo e
# que ela precise sair visualmente igual a este output.png. Por isso o que vai
# pro JSON nao e so o dado bruto: vai tambem o layout ja calculado (posicao de
# cada barra, arcos de grade, extensao de cada regiao) e a paleta. Recalcular
# essa geometria do outro lado seria duplicar a regra em duas linguagens -- na
# primeira edicao de uma delas as duas versoes divergiriam.
# ---------------------------------------------------------------------------

# Rotulos legiveis por categoria -- o nome da coluna (nao_ficcao) serve pro
# codigo, nao pra quem le o grafico. Este arquivo esta em UTF-8.
rotulos_categoria <- list(
  ficcao     = "Ficção",
  nao_ficcao = "Não ficção",
  infantil   = "Infantil"
)

# Ordem de empilhamento de baixo pra cima. O ggplot empilha na ordem inversa
# dos niveis do fator (ficcao, infantil, nao_ficcao, em ordem alfabetica), o
# que poe nao_ficcao na base e ficcao no topo.
ordem_empilhamento <- rev(levels(as.factor(dados$categoria)))

segmentos <- dados %>%
  filter(!is.na(receita)) %>%
  transmute(id, categoria, receita)

# Fora as barras "vazias" do preenchimento: elas existem so pra abrir o respiro
# entre regioes, nao tem filial nem valor pra mostrar.
barras <- dados_rotulo %>%
  left_join(dados %>% distinct(id, regiao), by = "id") %>%
  filter(!is.na(filial)) %>%
  transmute(id, filial, regiao = as.character(regiao), total)

viz <- list(
  meta = list(
    nBarras = n_barras,
    yMin = -60,
    yMax = max(dados_rotulo$total, na.rm = TRUE) + 20,
    grade = c(0, 40, 80, 120),
    yLinhaRegiao = -4,
    yRotuloRegiao = -14,
    paleta = as.list(paleta),
    ordem = ordem_empilhamento,
    rotulos = rotulos_categoria,
    nota = "Passe o cursor por uma barra pra ver os números da filial."
  ),
  barras = barras,
  segmentos = segmentos,
  regioes = dados_base %>% transmute(regiao = as.character(regiao), inicio, fim, centro),
  arcosGrade = dados_grade %>% transmute(inicio, fim)
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
