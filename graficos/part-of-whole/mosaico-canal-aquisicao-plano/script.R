# Libraries
library(ggplot2)
library(dplyr)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Mosaico (Marimekko): canal de aquisicao x plano assinado, numa SaaS
# ficticia. Duas composicoes ao mesmo tempo, uma dentro da outra -- a
# LARGURA de cada coluna e' o tamanho do canal (quantos clientes ele trouxe,
# em relacao ao total), e a ALTURA dentro de cada coluna e' a composicao de
# planos DAQUELE canal especifico (nao do total). Diferenca central pro
# barplot empilhado 100% ja existente nesta base
# (part-of-whole/barplot-agrupado-empilhado): la todas as colunas tem a
# MESMA largura, entao o tamanho de cada canal fica invisivel -- aqui ele
# vira a propria largura da coluna, e as duas perguntas ("quao grande e' o
# canal" e "como ele se divide por plano") aparecem na mesma imagem sem
# precisar de dois graficos separados. Nao existe pacote empacotado no apt
# pra isso (`ggmosaic` nao esta disponivel, so `vcd::mosaic()` em base
# graphics) -- montado a mao com geom_rect, mesma familia de tecnica do
# waffle e do UpSet desta base.
set.seed(6604)

canais <- c("Orgânico", "Pago", "Parceiros", "Indicação")
planos <- c("Free", "Starter", "Pro", "Enterprise")

# Proporcao de planos DENTRO de cada canal, deliberadamente diferente entre
# canais (o ponto do grafico e' mostrar que a composicao muda de canal pra
# canal) -- canal organico traz muito Free, canal pago converte melhor pra
# planos pagos, parceiros trazem clientes maiores (mais Enterprise).
composicao_base <- list(
  "Orgânico"  = c(Free = 0.55, Starter = 0.28, Pro = 0.13, Enterprise = 0.04),
  "Pago"      = c(Free = 0.20, Starter = 0.35, Pro = 0.32, Enterprise = 0.13),
  "Parceiros" = c(Free = 0.10, Starter = 0.22, Pro = 0.38, Enterprise = 0.30),
  "Indicação" = c(Free = 0.30, Starter = 0.30, Pro = 0.28, Enterprise = 0.12)
)
total_canal <- c("Orgânico" = 4200, "Pago" = 3100, "Parceiros" = 1400, "Indicação" = 2300)

celulas <- do.call(rbind, lapply(canais, function(canal) {
  n <- round(total_canal[[canal]] * composicao_base[[canal]])
  data.frame(canal = canal, plano = planos, clientes = as.integer(n))
})) %>%
  mutate(canal = factor(canal, levels = canais), plano = factor(plano, levels = rev(planos)))

# Geometria do mosaico: x0/x1 = largura acumulada dos CANAIS (proporcao do
# total geral); dentro de cada canal, y0/y1 = altura acumulada dos PLANOS
# (proporcao do total DAQUELE canal, nao do total geral) -- e' essa segunda
# normalizacao, recalculada coluna a coluna, que faz a composicao interna
# ficar comparavel entre canais de tamanhos bem diferentes.
total_geral <- sum(celulas$clientes)
larguras <- celulas %>%
  group_by(canal) %>%
  summarise(total = sum(clientes), .groups = "drop") %>%
  mutate(x1 = cumsum(total) / total_geral, x0 = x1 - total / total_geral)

celulas <- celulas %>%
  left_join(larguras, by = "canal") %>%
  group_by(canal) %>%
  arrange(canal, desc(plano)) %>%
  mutate(
    proporcao = clientes / sum(clientes),
    y1 = cumsum(proporcao),
    y0 = y1 - proporcao
  ) %>%
  ungroup()

paleta_plano <- c(
  "Free"       = "#CBD5C0",
  "Starter"    = "#8FB08A",
  "Pro"        = "#4C8557",
  "Enterprise" = "#265C38"
)

rotulos_canal <- larguras %>% mutate(xc = (x0 + x1) / 2, pct = round(total / total_geral * 100))

p <- ggplot(celulas) +
  geom_rect(aes(xmin = x0, xmax = x1, ymin = y0, ymax = y1, fill = plano), colour = "white", linewidth = 0.6) +
  geom_text(
    data = celulas %>% filter(proporcao > 0.06),
    aes(x = (x0 + x1) / 2, y = (y0 + y1) / 2, label = paste0(round(proporcao * 100), "%")),
    colour = "white", size = 3, fontface = "bold"
  ) +
  geom_text(
    data = rotulos_canal,
    aes(x = xc, y = 1.03, label = paste0(canal, "\n(", pct, "% da base)")),
    colour = "grey25", size = 3.3, fontface = "bold", lineheight = 0.9
  ) +
  scale_fill_manual(values = paleta_plano, name = "Plano", breaks = planos) +
  scale_x_continuous(limits = c(0, 1), expand = c(0, 0)) +
  scale_y_continuous(limits = c(0, 1.09), expand = c(0, 0)) +
  labs(
    title = "Composição de planos por canal de aquisição",
    subtitle = "Largura da coluna = tamanho do canal · altura = composição de planos dentro dele"
  ) +
  theme_void(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14, hjust = 0.5),
    plot.subtitle = element_text(colour = "grey40", hjust = 0.5, margin = margin(b = 12)),
    legend.position = "bottom"
  )

ggsave("output.png", plot = p, width = 9, height = 6.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 recebe as CONTAGENS brutas por celula (canal x
# plano), nunca x0/x1/y0/y1 ja calculados -- ele soma os totais e recalcula
# as duas normalizacoes (largura por canal, altura por plano dentro do
# canal) sozinho, mesmo principio de sempre desta base.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(cores = as.list(paleta_plano), canais = canais, planos = planos),
  celulas = lapply(seq_len(nrow(celulas)), function(i) {
    list(canal = as.character(celulas$canal[i]), plano = as.character(celulas$plano[i]), clientes = celulas$clientes[i])
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
