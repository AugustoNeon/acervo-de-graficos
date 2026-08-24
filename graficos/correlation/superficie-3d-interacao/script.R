# Libraries
library(rgl)
library(RColorBrewer)

# Necessario pra rgl funcionar sem janela real (Rscript nao-interativo,
# sem sessao grafica anexada)
options(rgl.useNULL = TRUE)

# Dados 100% ficticios: rendimento de uma safra em funcao de fertilizante e
# irrigacao, com efeito de interacao entre os dois -- no lugar da superficie
# matematica sem contexto (x,y quaisquer, coeficientes sem significado) do
# exemplo original
set.seed(714)
base_produtividade   <- 40
efeito_fertilizante  <- 1.0
efeito_irrigacao     <- 0.8
interacao            <- 0.15

fertilizante <- 1:20
irrigacao    <- 1:20
rendimento <- outer(fertilizante, irrigacao, function(f, i) {
  base_produtividade + efeito_fertilizante * f + efeito_irrigacao * i + interacao * f * i
})

# Paleta sequencial (RColorBrewer "YlOrRd") mapeada pela altura da superficie
# -- no lugar do col.regions padrao do lattice::wireframe() do exemplo original
paleta <- colorRampPalette(RColorBrewer::brewer.pal(9, "YlOrRd"))(100)
faixa <- cut(rendimento, breaks = 100, labels = FALSE, include.lowest = TRUE)
cor_superficie <- matrix(paleta[faixa], nrow = nrow(rendimento))

open3d(windowRect = c(0, 0, 800, 650))
bg3d("white")
# specular = "black" tira o brilho especular do rgl -- com uma superficie
# vista quase de lado ele "queima" a cor pra preto em boa parte da area
persp3d(
  fertilizante, irrigacao, rendimento,
  col = cor_superficie, specular = "black",
  xlab = "Fertilizante", ylab = "Irrigação", zlab = "Rendimento"
)

# Malha por cima da superficie colorida -- o mesmo espirito visual do
# lattice::wireframe(drape=TRUE) do exemplo original (cor + grade ao mesmo
# tempo), sem precisar do pacote lattice
cor_malha <- "grey30"
for (i in seq_along(fertilizante)) {
  lines3d(x = rep(fertilizante[i], length(irrigacao)), y = irrigacao, z = rendimento[i, ], color = cor_malha, alpha = 0.25, lwd = 1)
}
for (j in seq_along(irrigacao)) {
  lines3d(x = fertilizante, y = rep(irrigacao[j], length(fertilizante)), z = rendimento[, j], color = cor_malha, alpha = 0.25, lwd = 1)
}

# Angulo padrao do rgl (sem view3d customizado): testado e e o que melhor
# mostra a superficie sem ficar de cauda pro observador -- um angulo mal
# escolhido aqui esconde a curvatura da interacao inteira (ver "Possiveis
# problemas pelo caminho" no README)
snapshot3d("output.png", fmt = "png", width = 800, height = 650)

# ---------------------------------------------------------------------------
# Versao interativa: reaproveita a MESMA cena (mesmos dados, mesma cor, mesmo
# angulo inicial) -- rglwidget() converte pra WebGL, dando controle de
# rotacao de verdade ao usuario, no lugar da animacao GIF pre-gravada
# (rotacao fixa, via quadros PNG + ImageMagick) do exemplo original. Nao
# precisa de ImageMagick nem de gerar/empilhar frames -- o mesmo padrao 3D
# ja usado no acervo (dispersao-3d-cafes) resolve com menos peca movel.
# ---------------------------------------------------------------------------
widget <- rglwidget()

# O canvas WebGL nasce com largura fixa em pixels (a mesma do dispositivo rgl
# criado no inicio) e nao se adapta ao espaco disponivel -- mesmo ajuste ja
# usado no outro grafico rgl deste acervo.
estilo_responsivo <- htmltools::tags$style(htmltools::HTML("
  .rglWebGL { max-width: 100%; }
  .rglWebGL canvas { max-width: 100%; height: auto !important; }
"))

htmltools::save_html(htmltools::tagList(estilo_responsivo, widget), file = "widget.html", libdir = "widget_files")
