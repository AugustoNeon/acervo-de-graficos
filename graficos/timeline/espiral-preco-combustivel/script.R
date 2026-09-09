# Libraries
library(ggplot2)
library(dplyr)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Espiral: preco medio da gasolina por mes, cinco anos seguidos. Tecnica
# popularizada pela "climate spiral" de Ed Hawkins -- NAO e' uma espiral
# matematica de verdade (o raio nao cresce monotonicamente com o tempo).
# Cada ano e' um LACO FECHADO completo (angulo = mes, 0 a 360 graus, janeiro
# a dezembro) cujo raio em cada angulo e' o proprio VALOR daquele mes
# (nao a posicao no tempo) -- anos diferentes ocupam a MESMA faixa angular
# mas raios diferentes, e a cor (fria pros anos antigos, quente pros
# recentes) e' o que deixa a tendencia visivel: se o preco sobe ano a ano,
# os lacos mais quentes ficam visivelmente mais pra fora que os frios, e o
# olho le isso como uma espiral se abrindo, mesmo sem ser uma de verdade.
# Extensao natural do calendario circular (mesma categoria timeline): aqui
# o eixo circular e' o mesmo (mes do ano), mas o raio carrega uma variavel
# continua em vez de so marcar posicao, e multiplos anos se sobrepoem no
# mesmo circulo em vez de um so.
set.seed(7420)

anos <- 2021:2025
meses_abrev <- c("Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez")

# Tendencia de alta ano a ano + sazonalidade (mais caro em julho/dezembro,
# picos de viagem) + ruido pequeno -- sem tendencia nenhuma a espiral nao
# teria o que mostrar (os lacos ficariam todos no mesmo raio, so trocando
# de cor).
gerar_ano <- function(ano) {
  base <- 4.6 + (ano - 2021) * 0.32
  sazonal <- 0.18 * sin(((1:12) - 4) / 12 * 2 * pi) + 0.12 * (1:12 %in% c(7, 12))
  preco <- base + sazonal + rnorm(12, 0, 0.05)
  data.frame(ano = ano, mes = 1:12, mes_abrev = meses_abrev, preco = round(preco, 2))
}

dados_base <- do.call(rbind, lapply(anos, gerar_ano))

# Fecha o laço: duplica o ponto de janeiro (mes 1) como um 13o ponto por
# ano, pra geom_path desenhar o segmento de volta de dezembro pra janeiro.
# Sem isso o laço fica ABERTO entre dezembro e janeiro (geom_path só liga
# pontos consecutivos na ordem em que existem, nunca fecha um circulo
# sozinho) -- um corte fino que já bastou pra confundir com ruído de
# desenho numa primeira tentativa.
fechamento <- dados_base %>% filter(mes == 1) %>% mutate(mes = 13, mes_abrev = NA_character_)
dados <- rbind(dados_base, fechamento) %>%
  arrange(ano, mes) %>%
  mutate(ano = factor(ano, levels = anos))

# Paleta sequencial fria->quente escrita a mao (nao viridis/RColorBrewer
# default) -- ano mais antigo em azul acinzentado, mais recente em
# vermelho queimado, com um degrade suave passando por verde-azulado no
# meio.
paleta_ano <- setNames(
  c("#3C6E91", "#4E9B8F", "#8FAE55", "#D19A3E", "#C1502E"),
  as.character(anos)
)

p <- ggplot(dados, aes(x = mes, y = preco, colour = ano, group = ano)) +
  geom_hline(yintercept = seq(4, 6.5, by = 0.5), colour = "grey88", linewidth = 0.3) +
  geom_path(linewidth = 1.1) +
  geom_point(data = subset(dados, mes <= 12), size = 1.6) +
  scale_colour_manual(values = paleta_ano, name = "Ano") +
  # limits = c(1, 13), nao c(1, 12): coord_polar mapeia o RANGE inteiro do
  # eixo em 360 graus -- com limits = c(1, 12) sobra so 11/12 de volta
  # completa, e janeiro (1) e dezembro (12) caem quase no mesmo angulo, os
  # dois rotulos colidindo ("Jan/Dez" grudado). O 13o ponto (a duplicata de
  # janeiro que fecha o laço) preenche exatamente esse 12o/12avo que faltava,
  # cada mes real ocupando sua fatia de 30 graus sem sobreposicao.
  scale_x_continuous(breaks = 1:12, labels = meses_abrev, limits = c(1, 13)) +
  scale_y_continuous(limits = c(0, max(dados$preco) * 1.15)) +
  coord_polar(theta = "x", start = 0) +
  labs(
    title = "Preço médio da gasolina, mês a mês (2021–2025)",
    subtitle = "Cada laço é um ano · o raio é o preço · cores frias = anos antigos, quentes = recentes"
  ) +
  theme_void(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold", hjust = 0.5, size = 14, margin = margin(b = 4)),
    plot.subtitle = element_text(colour = "grey40", hjust = 0.5, size = 9.5, margin = margin(b = 10)),
    legend.position = "bottom",
    axis.text.x = element_text(colour = "grey35", size = 9, face = "bold")
  )

ggsave("output.png", plot = p, width = 8, height = 9, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 recebe so ano/mes/preco por ponto -- ele calcula
# angulo e raio sozinho a partir do mes e do valor, mesmo principio de
# sempre desta base (formula compartilhada, nunca geometria pronta).
# ---------------------------------------------------------------------------
dados_reais <- subset(dados, mes <= 12)
viz <- list(
  meta = list(cores = as.list(paleta_ano), anos = as.character(anos), meses = meses_abrev),
  pontos = lapply(seq_len(nrow(dados_reais)), function(i) {
    list(ano = as.character(dados_reais$ano[i]), mes = dados_reais$mes[i], preco = dados_reais$preco[i])
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
