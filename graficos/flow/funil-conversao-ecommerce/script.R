# Libraries
library(ggplot2)
library(jsonlite)
library(RColorBrewer)

# Dados 100% ficticios: funil de conversao de uma loja online ficticia, em
# vez do funil de vendas B2B generico do exemplo original -- ver AGENTS.md
# "Decisoes fechadas". Cada etapa perde uma fracao aleatoria da anterior
# (queda maior nas primeiras etapas, menor nas ultimas -- perfil tipico de
# funil de e-commerce, onde o maior abandono e logo na entrada).
set.seed(7742)
etapas <- c(
  "Visitantes do site", "Visualizaram um produto", "Adicionaram ao carrinho",
  "Iniciaram o checkout", "Compra concluída"
)
quedas <- c(0.42, 0.55, 0.38, 0.22) # fracao perdida etapa a etapa (4 quedas p/ 5 etapas)
valores <- Reduce(function(anterior, queda) anterior * (1 - queda), quedas, 12480, accumulate = TRUE)
dados <- data.frame(
  etapa  = factor(etapas, levels = etapas),
  visitantes = round(valores)
)
dados$fracao_do_total <- dados$visitantes / dados$visitantes[1]
dados$conversao_etapa <- c(NA, dados$visitantes[-1] / dados$visitantes[-nrow(dados)])

# Paleta trocada em relacao ao original (paleta padrao/generica do tutorial)
# -- sequencial, uma cor por profundidade do funil (nao ha grupo, so ordem)
cores <- setNames(rev(brewer.pal(5, "BuPu")), etapas)

# Funil classico em ggplot2: nao existe geom_funnel() pronto, entao cada
# etapa e um trapezio desenhado a mao com geom_polygon() -- a largura do
# topo do trapezio e o valor da propria etapa, a largura da base e o valor
# da etapa SEGUINTE (a ultima etapa fica com base = topo, sem afunilar mais),
# empilhados de cima pra baixo. E essa combinacao de retas inclinadas (nao
# blocos retos) que da o formato classico de funil/coqueteleira.
n <- nrow(dados)
poligonos <- do.call(rbind, lapply(seq_len(n), function(i) {
  topo <- dados$visitantes[i]
  base <- if (i < n) dados$visitantes[i + 1] else dados$visitantes[i]
  y_topo <- n - i + 1
  y_base <- n - i
  data.frame(
    etapa = dados$etapa[i],
    x = c(-topo, topo, base, -base) / 2,
    y = c(y_topo, y_topo, y_base, y_base)
  )
}))

rotulos <- dados
rotulos$y <- (n:1) - 0.5
rotulos$rotulo <- paste0(
  format(rotulos$visitantes, big.mark = ".", decimal.mark = ",", scientific = FALSE), " · ",
  round(rotulos$fracao_do_total * 100), "%"
)

p <- ggplot() +
  geom_polygon(data = poligonos, aes(x = x, y = y, fill = etapa, group = etapa), color = "white", linewidth = 0.8) +
  # Rotulo como "etiqueta" (fundo branco + texto escuro), nao texto branco
  # direto sobre a cor de preenchimento -- ver "Lições aprendidas" no
  # AGENTS.md: texto quase-branco sobre um poligono ESTREITO sai com
  # caracteres cortados nesta maquina (bug de renderização do device PNG,
  # não falta de espaço), texto escuro sobre etiqueta branca nao tem esse problema.
  geom_label(
    data = rotulos, aes(x = 0, y = y + 0.28, label = etapa),
    color = "grey15", size = 3.3, label.size = 0, fill = "white", alpha = 0.92
  ) +
  geom_label(
    data = rotulos, aes(x = 0, y = y - 0.12, label = rotulo),
    color = "grey15", fontface = "bold", size = 4, label.size = 0, fill = "white", alpha = 0.92
  ) +
  scale_fill_manual(values = cores, guide = "none") +
  scale_y_continuous(expand = expansion(mult = 0.03)) +
  labs(title = "Funil de conversão de uma loja online (dado fictício)") +
  theme_void(base_size = 13) +
  theme(plot.title = element_text(hjust = 0.5, face = "bold", margin = margin(b = 12)))

ggsave("output.png", plot = p, width = 7.5, height = 6, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3 (trapezios desenhados com d3.line()/geom_polygon
# equivalente), mesma regra do resto do acervo -- cada etapa vira um path,
# com o passo-a-passo (queda % vs. etapa anterior) so disponivel no tooltip,
# nao no PNG estatico.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(nota = "Passe o cursor numa etapa pra ver a taxa de conversão em relação à etapa anterior."),
  etapas = dados[, c("etapa", "visitantes", "fracao_do_total", "conversao_etapa")],
  paleta = as.list(cores)
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = 4, na = "null")
