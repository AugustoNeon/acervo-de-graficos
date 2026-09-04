# Libraries
library(ggplot2)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Grafico ternario: composicao de 3 partes que somam 100% (aqui, proteina/
# carboidrato/gordura, % das calorias de cada alimento), plotada num
# triangulo por coordenadas baricentricas -- geometria que nenhum outro
# grafico deste acervo usa ainda. `ggtern` (o pacote que o R Graph Gallery
# usa pra isso) nao esta disponivel nem via apt nem via CRAN nesta sessao
# (CRAN bloqueado -- ver SETUP.md), entao a transformacao baricentrica ->
# cartesiana e feita a mao com ggplot2 puro. Isso tem uma vantagem real: a
# MESMA formula (nao um pacote) alimenta a versao D3, garantindo que as
# duas nunca discordem de onde um ponto cai dentro do triangulo.
#
# Vertices do triangulo (equilatero, altura h = sqrt(3)/2):
#   Proteina no topo (0.5, h) | Carboidrato na esquerda (0, 0) | Gordura na direita (1, 0)
# Um ponto com fracoes (a=proteina, b=carboidrato, c=gordura), a+b+c=1, cai em:
#   x = c + a/2
#   y = a * h
h <- sqrt(3) / 2
baricentrica_para_xy <- function(proteina, carboidrato, gordura) {
  total <- proteina + carboidrato + gordura
  a <- proteina / total
  c <- gordura / total
  data.frame(x = c + a / 2, y = a * h)
}

# Dados 100% ficticios: 24 alimentos com composicao de macronutrientes (%
# das calorias) escrita a mao pra cobrir o triangulo inteiro -- alguns bem
# perto de cada vertice (clara de ovo quase 100% proteina, acucar quase
# 100% carboidrato, azeite 100% gordura) e um grupo no meio (equilibrados
# entre os tres), em vez de sorteio puro, que tenderia a amontoar tudo perto
# do centro (soma restrita a 100 nao produz uniformidade no triangulo por
# sorteio ingenuo).
alimentos <- data.frame(
  alimento = c(
    "Clara de ovo", "Peito de frango", "Peito de peru", "Atum em lata",
    "Feijao preto", "Lentilha", "Arroz branco", "Acucar refinado",
    "Banana", "Aveia em flocos", "Pao frances", "Batata frita",
    "Manteiga", "Azeite de oliva", "Bacon", "Queijo cheddar",
    "Abacate", "Amendoas", "Ovo cozido", "Salmao",
    "Iogurte natural integral", "Grao de bico", "Leite integral", "Brocolis"
  ),
  proteina = c(
    88, 62, 68, 70,
    24, 27, 7, 0,
    4, 14, 12, 5,
    1, 0, 28, 24,
    5, 14, 34, 45,
    24, 20, 20, 30
  ),
  carboidrato = c(
    6, 8, 7, 0,
    61, 63, 88, 99,
    91, 66, 78, 50,
    1, 0, 2, 3,
    20, 18, 4, 10,
    38, 47, 43, 58
  ),
  gordura = c(
    6, 30, 25, 30,
    15, 10, 5, 1,
    5, 20, 10, 45,
    98, 100, 70, 73,
    75, 68, 62, 45,
    38, 33, 37, 12
  )
)
stopifnot(all(rowSums(alimentos[, c("proteina", "carboidrato", "gordura")]) == 100))

# Perfil dominante calculado a partir dos proprios dados (nunca escrito a
# mao): 50% ou mais de um macronutriente define o perfil; sem nenhum
# vencedor, o alimento e "Equilibrado". A cor nasce uma unica vez aqui e
# alimenta as duas versoes.
alimentos$perfil <- with(alimentos, ifelse(
  proteina >= 50, "Proteico",
  ifelse(carboidrato >= 50, "Carboidrato",
    ifelse(gordura >= 50, "Gorduroso", "Equilibrado")
  )
))
cor_perfil <- c(
  "Proteico"    = "#3B6E8F",
  "Carboidrato" = "#C9A24B",
  "Gorduroso"   = "#B34747",
  "Equilibrado" = "#4A7B6D"
)
alimentos$perfil <- factor(alimentos$perfil, levels = names(cor_perfil))

pontos <- cbind(alimentos, baricentrica_para_xy(alimentos$proteina, alimentos$carboidrato, alimentos$gordura))

# --------------------------------------------------------------- moldura
# Contorno do triangulo + grade de fundo em 25/50/75% pras 3 familias de
# linha (uma por macronutriente). Formulas derivadas da geometria do
# triangulo (nao de nenhum pacote): a linha de nivel k de um vertice e
# sempre paralela ao lado OPOSTO aquele vertice.
vertices <- data.frame(x = c(0.5, 0, 1), y = c(h, 0, 0))
niveis <- c(0.25, 0.5, 0.75)

grade_proteina <- do.call(rbind, lapply(niveis, function(k) {
  data.frame(x = c(0.5 * k, 1 - 0.5 * k), y = c(h * k, h * k), grupo = paste0("p", k))
}))
grade_carboidrato <- do.call(rbind, lapply(niveis, function(k) {
  data.frame(x = c(1 - k, 0.5 * (1 - k)), y = c(0, h * (1 - k)), grupo = paste0("c", k))
}))
grade_gordura <- do.call(rbind, lapply(niveis, function(k) {
  data.frame(x = c(k, 0.5 + 0.5 * k), y = c(0, h * (1 - k)), grupo = paste0("g", k))
}))
grade <- rbind(grade_proteina, grade_carboidrato, grade_gordura)

rotulos_vertice <- data.frame(
  x = c(0.5, -0.02, 1.02), y = c(h + 0.05, -0.05, -0.05),
  label = c("Proteína", "Carboidrato", "Gordura"),
  hjust = c(0.5, 1, 0), vjust = c(0, 1, 1)
)

p <- ggplot() +
  geom_path(data = grade, aes(x = x, y = y, group = grupo), colour = "grey85", linewidth = 0.4) +
  geom_polygon(data = vertices, aes(x = x, y = y), fill = NA, colour = "grey40", linewidth = 0.8) +
  geom_point(data = pontos, aes(x = x, y = y, colour = perfil), size = 3.4, alpha = 0.9) +
  geom_text(
    data = rotulos_vertice, aes(x = x, y = y, label = label, hjust = hjust, vjust = vjust),
    fontface = "bold", size = 4, colour = "grey30"
  ) +
  scale_colour_manual(values = cor_perfil, name = NULL) +
  coord_fixed(clip = "off") +
  labs(title = "Composição nutricional: proteína x carboidrato x gordura\n(24 alimentos fictícios)") +
  theme_void(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", hjust = 0.5, size = 15, lineheight = 1.2, margin = margin(b = 14)),
    legend.position = "top",
    plot.margin = margin(t = 10, r = 30, b = 20, l = 30)
  )

ggsave("output.png", plot = p, width = 9, height = 8.2, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 recebe so proteina/carboidrato/gordura brutos (nao
# x/y prontos) e recalcula a MESMA transformacao baricentrica -- garantindo
# que um ponto nunca cai num lugar diferente do triangulo entre as duas
# versoes, sem precisar exportar geometria nenhuma.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(cores = as.list(cor_perfil)),
  alimentos = lapply(seq_len(nrow(alimentos)), function(i) {
    list(
      alimento = alimentos$alimento[i],
      proteina = alimentos$proteina[i],
      carboidrato = alimentos$carboidrato[i],
      gordura = alimentos$gordura[i],
      perfil = as.character(alimentos$perfil[i])
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
