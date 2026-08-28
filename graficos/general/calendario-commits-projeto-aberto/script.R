# Libraries
library(ggplot2)
library(jsonlite)

# Dados 100% ficticios: commits diarios de um projeto de codigo aberto
# ficticio ao longo de um ano (2025). Escritos com duas janelas fixadas a
# mao (nao so ruido aleatorio) pra dar ao calendario uma FORMA especifica:
# um "sprint" de lancamento em marco (tres semanas de atividade bem acima
# do normal, inclusive nos fins de semana) e um "recesso" de meio de ano em
# julho (quase zero, todo santo dia) -- sem essas duas janelas o calendario
# seria so ruido de Poisson sem nada especifico pra apontar.
set.seed(4471)

inicio <- as.Date("2025-01-01")
fim <- as.Date("2025-12-31")
datas <- seq(inicio, fim, by = "day")

dia_semana <- as.integer(format(datas, "%w")) # 0 = domingo .. 6 = sabado
offset <- as.integer(format(inicio, "%w"))
semana <- (as.integer(datas - inicio) + offset) %/% 7

fim_de_semana <- dia_semana %in% c(0, 6)
em_sprint <- datas >= as.Date("2025-03-03") & datas <= as.Date("2025-03-21")
em_recesso <- datas >= as.Date("2025-07-14") & datas <= as.Date("2025-07-25")

lambda <- ifelse(em_recesso, 0.3,
           ifelse(em_sprint, ifelse(fim_de_semana, 5, 14),
             ifelse(fim_de_semana, 0.8, 4)))
valor <- rpois(length(datas), lambda)

nomes_dia <- c("Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb")
dados <- data.frame(
  data = datas,
  semana = semana,
  dia_semana = dia_semana,
  dia_semana_nome = factor(nomes_dia[dia_semana + 1], levels = rev(nomes_dia)),
  valor = valor
)

# Rotulos de mes: um por mes, na semana do dia 1 -- usados nos dois lados
# (eixo do output.png e cabecalho da versao D3), pra nao dessincronizar.
primeiros_dias <- seq(inicio, fim, by = "month")
rotulos_mes <- data.frame(
  semana = semana[match(primeiros_dias, datas)],
  mes = format(primeiros_dias, "%b")
)

# Paleta propria: sequencial de creme quase neutro (zero commits, mesmo
# tratamento do "sem atividade" do original que este acervo nunca copia
# literalmente) ate um vinho-magenta escuro de alto croma -- nunca o verde
# do calendario de contribuicoes que inspirou a tecnica.
rampa <- colorRampPalette(c("#EDEAE3", "#E38AA6", "#B23368", "#5C1140"))
paleta_continua <- rampa(100)

p <- ggplot(dados, aes(x = semana, y = dia_semana_nome, fill = valor)) +
  geom_tile(colour = "#FBFAF7", linewidth = 0.6, width = 0.86, height = 0.86) +
  geom_text(
    data = rotulos_mes, aes(x = semana, y = 7.9, label = mes),
    inherit.aes = FALSE, family = "sans", size = 3.1, colour = "grey35", hjust = 0
  ) +
  scale_fill_gradientn(colours = paleta_continua, name = "Commits") +
  coord_cartesian(clip = "off") +
  labs(
    title = "Um ano de commits de um projeto de código aberto fictício",
    subtitle = "Cada quadrado é um dia — quanto mais escuro, mais commits. Março concentra o sprint de lançamento; julho, o recesso de meio de ano."
  ) +
  theme_void(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold", margin = margin(b = 2)),
    plot.subtitle = element_text(colour = "grey35", size = 8.6, margin = margin(b = 14)),
    plot.margin = margin(t = 10, r = 20, b = 10, l = 10),
    legend.position = "bottom",
    legend.title = element_text(size = 9),
    legend.key.width = unit(1.1, "cm"),
    legend.key.height = unit(0.32, "cm")
  )

ggsave("output.png", plot = p, width = 12, height = 3.2, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 desenha a mesma grade e acrescenta um segundo modo
# de cor -- "Faixas" (5 degraus fixos, como o calendario de contribuicoes que
# inspirou a tecnica) em vez de "Contínuo" (a mesma rampa do output.png,
# interpolada). O contorno de cada dia nunca muda; so a funcao que decide a
# cor de preenchimento troca entre as duas chamadas.
#
# As faixas fixas facilitam comparar dois dias de LONGE (poucos tons
# possiveis); a rampa continua preserva mais informacao (dois dias na mesma
# faixa mas com contagem diferente saem com tons ligeiramente diferentes).
# Nenhuma inventa cor nova: as 5 cores de faixa vem da MESMA rampa do
# output.png, so amostrada em menos pontos -- nunca um hexadecimal novo.
# ---------------------------------------------------------------------------
cores_faixas <- rampa(5)
cortes_faixas <- c(0, 1, 4, 8, 14) # limite INFERIOR de cada faixa; a ultima e "14+"

viz <- list(
  meta = list(
    ano = 2025,
    unidade = "commits",
    paleta = list(
      continua = as.list(paleta_continua[c(1, 25, 50, 75, 100)]),
      faixas = as.list(cores_faixas),
      cortesFaixas = as.list(cortes_faixas)
    )
  ),
  dias = lapply(seq_len(nrow(dados)), function(i) {
    list(
      data = format(dados$data[i], "%Y-%m-%d"),
      semana = dados$semana[i],
      diaSemana = dados$dia_semana[i],
      valor = dados$valor[i]
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
