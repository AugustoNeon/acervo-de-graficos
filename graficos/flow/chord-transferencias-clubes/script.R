# Libraries
library(circlize)
library(RColorBrewer)
library(jsonlite)

# Dados ficticios: transferencias de jogadores entre 6 clubes ficticios numa
# unica janela de mercado. Matriz assimetrica (m[i, j] = jogadores que saem
# do clube i pro clube j) -- o mesmo par de clubes pode trocar jogadores nas
# duas direcoes, em quantidades diferentes, e boa parte dos pares fica em
# zero (nem todo clube negocia com todo mundo na mesma janela).
clubes <- c("Central FC", "Atletico Norte", "Porto Real",
            "Uniao Oeste", "Estrela do Sul", "Fenix EC")
n <- length(clubes)

set.seed(4127)
m <- matrix(0, n, n, dimnames = list(clubes, clubes))
pares <- which(row(m) != col(m), arr.ind = TRUE)
ativos <- pares[sample(nrow(pares), round(nrow(pares) * 0.6)), ]
m[ativos] <- sample(1:9, nrow(ativos), replace = TRUE)

# Paleta categorica (uma cor por clube) -- "Paired" ainda nao usada em
# nenhum outro grafico do acervo (ver docs/WORKFLOW.md, "nunca deixar a
# paleta identica ao exemplo").
cores <- setNames(brewer.pal(n, "Paired"), clubes)

# Miniatura estatica com circlize::chordDiagram(). direction.type com
# "arrows" deixa visivel o sentido de cada fluxo (quem manda, quem recebe),
# que e o ponto central do dado -- sem isso um diagrama de cordas parece
# simetrico mesmo quando nao e.
png("output.png", width = 900, height = 900, res = 130)
par(mar = c(1, 1, 1, 1))
# canvas.xlim/ylim maior do que o padrao [-1,1] da folga pros rotulos mais
# compridos (ex: "Atletico Norte") nao serem cortados na borda do PNG.
circos.par(canvas.xlim = c(-1.3, 1.3), canvas.ylim = c(-1.3, 1.3))
chordDiagram(
  m,
  grid.col = cores,
  directional = 1,
  direction.type = c("diffHeight", "arrows"),
  link.arr.type = "big.arrow",
  link.arr.length = 0.04,
  annotationTrack = "grid",
  preAllocateTracks = list(track.height = 0.12)
)
circos.trackPlotRegion(
  track.index = 1,
  panel.fun = function(x, y) {
    circos.text(
      CELL_META$xcenter, CELL_META$ylim[1], CELL_META$sector.index,
      facing = "clockwise", niceFacing = TRUE, adj = c(0, 0.5), cex = 0.85
    )
  },
  bg.border = NA
)
circos.clear()
dev.off()

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3 (d3-chord, incluido no pacote `d3`
# principal a partir da v6 -- sem dependencia extra) no proprio runtime do
# site. O script so exporta a lista de clubes com sua cor e a lista de
# fluxos nao-zero pelo NOME (origem, destino, valor); a matriz completa, os
# angulos de cada arco e a geometria de cada fita sao recalculados no D3 a
# partir dela -- o mesmo principio ja usado no sankey deste acervo (ver
# graficos/flow/sankey-networkd3-simplificado).
idx <- which(m > 0, arr.ind = TRUE)
fluxos <- data.frame(
  origem = clubes[idx[, 1]],
  destino = clubes[idx[, 2]],
  valor = m[idx]
)

viz <- list(
  meta = list(nota = "Passe o cursor num clube ou numa fita pra destacar as transferências que envolvem ele."),
  nos = data.frame(name = clubes, cor = unname(cores[clubes])),
  fluxos = fluxos
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
