# Libraries
library(fmsb)
library(RColorBrewer)
library(scales)
library(jsonlite)

# Dados ficticios: ficha de atributos de 3 personagens de RPG (Guerreiro, Mago,
# Ladino) em 5 atributos -- no lugar dos "mister-a/b/c" genericos e das
# variaveis sem nome (math/english/biology/music/R-coding) do exemplo original.
# Valores autorais (nao amostrados), pensados pra cada personagem ter um
# perfil reconhecivel: guerreiro forte e resistente mas pouco inteligente,
# mago o oposto, ladino equilibrado com pico em destreza/carisma.
eixos <- c("Força", "Inteligência", "Destreza", "Vitalidade", "Carisma")

dados <- data.frame(
  Força         = c(18, 5, 10),
  Inteligência  = c(6, 19, 9),
  Destreza      = c(10, 8, 18),
  Vitalidade    = c(17, 9, 11),
  Carisma       = c(9, 12, 15)
)
rownames(dados) <- c("Guerreiro", "Mago", "Ladino")

# fmsb::radarchart() exige as duas primeiras linhas = maximo e minimo de cada
# eixo -- e o que define a escala do grafico, nao dado de verdade.
dados_radar <- rbind(rep(20, 5), rep(0, 5), dados)

# Paleta categorica fixa (RColorBrewer "Set2") no lugar das cores rgb() manuais
# do exemplo original
cor_borda   <- RColorBrewer::brewer.pal(3, "Set2")
cor_preenc  <- scales::alpha(cor_borda, 0.35)
names(cor_borda) <- rownames(dados)

png("output.png", width = 900, height = 750, res = 120)
par(mar = c(1, 1, 3, 6), xpd = TRUE)

radarchart(
  dados_radar,
  axistype = 1,
  pcol = cor_borda, pfcol = cor_preenc, plwd = 3, plty = 1,
  cglcol = "grey70", cglty = 1, cglwd = 0.8,
  axislabcol = "grey40", caxislabels = seq(0, 20, 5),
  vlcex = 1.15
)

legend(
  x = 1.15, y = 1.05, legend = rownames(dados), bty = "n", pch = 20,
  col = cor_borda, text.col = "grey20", cex = 1.05, pt.cex = 2.5
)

dev.off()

# ---------------------------------------------------------------------------
# Exporta os mesmos dados pra versao interativa (data.json).
#
# Ao contrario do circular barplot (onde o layout polar tem espacamento
# customizado dificil de recalcular em D3), o radar chart e uma grade
# regular -- eixos igualmente espacados, escala linear do centro pra fora.
# O D3 recalcula essa geometria sozinho a partir dos MESMOS dados brutos +
# dominio, sem risco de divergir do fmsb::radarchart() (que usa a mesma regra).
# ---------------------------------------------------------------------------

grupos <- lapply(rownames(dados), function(nome) {
  list(nome = nome, cor = unname(cor_borda[nome]), valores = unname(as.numeric(dados[nome, eixos])))
})

viz <- list(
  meta = list(
    eixos = eixos,
    min = 0,
    max = 20,
    grade = seq(0, 20, 5),
    nota = "Passe o cursor num vértice pra ver o valor exato. Passe o cursor numa legenda pra isolar um personagem."
  ),
  grupos = grupos
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
