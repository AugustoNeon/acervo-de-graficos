# Libraries
library(ggplot2)
library(jsonlite)

# Dados 100% ficticios: piramide etaria de uma cidade universitaria ficticia
# (~35 mil habitantes), homens x mulheres por faixa de 5 anos.
#
# Escritos a mao, nao sorteados, pra desenhar uma forma que NAO e a piramide
# "livro-texto" (base larga, topo estreito) nem a "urna" de populacao
# envelhecida -- e uma cidade pequena cuja base economica e uma universidade
# publica grande: as faixas de 20-24 e 25-29 têm um EXCESSO de gente que não
# nasceu ali, puxado por matricula + pos-graduacao + gente que fica depois de
# formar. Sem esse inchaco deliberado no meio, o grafico so repetiria a forma
# generica que qualquer piramide etaria de livro didatico ja mostra.
idade <- factor(
  c("0-4", "5-9", "10-14", "15-19", "20-24", "25-29", "30-34", "35-39",
    "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70-74", "75-79", "80+"),
  levels = c("0-4", "5-9", "10-14", "15-19", "20-24", "25-29", "30-34", "35-39",
             "40-44", "45-49", "50-54", "55-59", "60-64", "65-69", "70-74", "75-79", "80+")
)
homens   <- c(1400, 1300, 1250, 2600, 5200, 3100, 1800, 1500, 1450, 1400, 1350, 1250, 1100,  900,  650,  420,  380)
mulheres <- c(1350, 1250, 1200, 2500, 5600, 3300, 1900, 1600, 1500, 1450, 1400, 1300, 1180, 1000,  780,  560,  600)

dados <- data.frame(idade = idade, homens = homens, mulheres = mulheres)

# Formato longo pra desenhar os dois lados com o mesmo geom_col(): um valor
# ASSINADO so pra posicionar a barra (homens negativo, mulheres positivo), e o
# valor real preservado a parte pro rotulo/tooltip -- nunca mostrar um numero
# negativo pro leitor, o sinal e so um truque geometrico deste grafico.
longo <- rbind(
  data.frame(idade = idade, genero = "Homens",   valor = homens,   valor_assinado = -homens),
  data.frame(idade = idade, genero = "Mulheres", valor = mulheres, valor_assinado =  mulheres)
)
longo$genero <- factor(longo$genero, levels = c("Homens", "Mulheres"))

# Paleta propria deste grafico: azul-petroleo x terracota, croma alto nos
# dois, evitando o azul-bebe/rosa-bebe pastel que a maioria dos exemplos de
# piramide etaria usa.
cor_homens   <- "#2E5FA3"
cor_mulheres <- "#D9622B"

limite_eixo <- 6000
marcas <- seq(-limite_eixo, limite_eixo, by = 2000)

p <- ggplot(longo, aes(y = idade, x = valor_assinado, fill = genero)) +
  geom_col(width = 0.82) +
  geom_vline(xintercept = 0, colour = "white", linewidth = 0.6) +
  scale_fill_manual(name = NULL, values = c("Homens" = cor_homens, "Mulheres" = cor_mulheres)) +
  scale_x_continuous(
    breaks = marcas,
    labels = function(x) format(abs(x), big.mark = ".", decimal.mark = ",", scientific = FALSE),
    limits = c(-limite_eixo, limite_eixo)
  ) +
  labs(
    title = "Pirâmide etária de uma cidade universitária fictícia",
    subtitle = "Habitantes por faixa etária e gênero — a faixa 20-24 concentra a população que a universidade atrai",
    x = "Habitantes", y = NULL
  ) +
  theme_minimal(base_size = 11) +
  theme(
    legend.position = "top",
    legend.justification = "left",
    legend.margin = margin(t = 0, b = 4),
    plot.title = element_text(face = "bold"),
    plot.subtitle = element_text(colour = "grey35", size = 8.6, margin = margin(b = 8)),
    panel.grid.major.y = element_blank(),
    panel.grid.minor.x = element_blank(),
    axis.text.y = element_text(colour = "grey15")
  )

ggsave("output.png", plot = p, width = 9, height = 6.4, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 desenha a mesma piramide como estado inicial (valor
# absoluto) e acrescenta um segundo modo -- percentual da populacao total de
# cada genero -- que muda a LEITURA sem mudar a forma dos dados, so a escala.
# Hover destaca a barra e mostra o numero exato + percentual no tooltip.
#
# O R exporta os numeros e a paleta; o D3 recalcula as duas escalas (absoluta
# e percentual) a partir do mesmo array, do mesmo jeito que os outros
# graficos deste acervo com mais de um modo de leitura.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    rotuloHomens = "Homens",
    rotuloMulheres = "Mulheres",
    paleta = list(homens = cor_homens, mulheres = cor_mulheres)
  ),
  faixas = lapply(seq_len(nrow(dados)), function(i) {
    list(
      idade = as.character(dados$idade[i]),
      homens = dados$homens[i],
      mulheres = dados$mulheres[i]
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
