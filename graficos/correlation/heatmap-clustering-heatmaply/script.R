# Libraries
library(pheatmap)
library(viridis)
library(jsonlite)

# Dados ficticios: 12 itens x 6 metricas, valores aleatorios (set.seed(2026)).
# O exemplo original do R Graph Gallery/data-to-viz usa um CSV real de
# indicadores socioeconomicos por pais -- aqui geramos uma matriz ficticia
# do zero, sem depender de um CSV externo (ver AGENTS.md "Decisoes fechadas")
set.seed(2026)
itens <- paste0("Produto_", sprintf("%02d", 1:12))
metricas <- c("Metrica_A", "Metrica_B", "Metrica_C", "Metrica_D", "Metrica_E", "Metrica_F")
mat <- matrix(
  round(rnorm(length(itens) * length(metricas), mean = 50, sd = 15)),
  nrow = length(itens), ncol = length(metricas),
  dimnames = list(itens, metricas)
)

paleta_magma <- viridis(256, option = "magma")

# pheatmap() no lugar do heatmaply(): desenha direto num device PNG (sem
# precisar de webshot2/pandoc) e devolve os hclust de linha/coluna que ele
# mesmo usou -- a versao interativa reaproveita ESSES objetos pra montar o
# dendrograma em D3, garantindo a mesma ordem e a mesma arvore por
# construcao, em vez de tentar reproduzir o clustering do heatmaply (que usa
# "optimal leaf ordering" por padrao, dificil de replicar exatamente).
resultado <- pheatmap(
  mat,
  scale = "column",
  color = paleta_magma,
  clustering_distance_rows = "euclidean",
  clustering_distance_cols = "euclidean",
  clustering_method = "complete",
  border_color = "white",
  fontsize_row = 10,
  fontsize_col = 11,
  legend = FALSE,
  silent = TRUE,
  filename = "output.png",
  width = 8,
  height = 6
)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3, no proprio runtime do site. Exporta a
# ordem ja clusterizada (linhas/colunas), os valores (bruto + escalado por
# coluna, que e o que determina a cor) e as duas arvores de clustering
# convertidas de hclust$merge pra uma lista aninhada -- o D3 so calcula
# posicao/traço a partir dela, sem recalcular nenhum clustering no navegador.
# ---------------------------------------------------------------------------
hc_linhas <- resultado$tree_row
hc_colunas <- resultado$tree_col

mat_escalado <- scale(mat) # mesma formula (z-score por coluna) que o pheatmap usa internamente

itens_ordenados <- itens[hc_linhas$order]
metricas_ordenadas <- metricas[hc_colunas$order]
mat_ordenada <- mat[hc_linhas$order, hc_colunas$order]
mat_escalada_ordenada <- mat_escalado[hc_linhas$order, hc_colunas$order]

celulas <- expand.grid(
  linha = seq_len(nrow(mat_ordenada)) - 1,
  coluna = seq_len(ncol(mat_ordenada)) - 1
)
celulas$valor <- mapply(function(i, j) mat_ordenada[i + 1, j + 1], celulas$linha, celulas$coluna)
celulas$escalado <- round(mapply(function(i, j) mat_escalada_ordenada[i + 1, j + 1], celulas$linha, celulas$coluna), 3)

# Converte hclust$merge (indices negativos = folha, positivos = referencia a
# um merge anterior) numa lista aninhada; a folha guarda sua POSICAO no
# clustering (0-based), nao o indice original -- assim o D3 nao precisa de
# nenhum array de mapeamento a parte, a posicao bate direto com a ordem das
# linhas/colunas ja reordenadas acima.
hclust_para_arvore <- function(hc) {
  posicao_de <- setNames(seq_along(hc$order) - 1, hc$order)
  construir <- function(i) {
    if (i < 0) {
      list(folha = TRUE, posicao = unname(posicao_de[[as.character(-i)]]))
    } else {
      list(altura = hc$height[i], filhos = list(construir(hc$merge[i, 1]), construir(hc$merge[i, 2])))
    }
  }
  construir(nrow(hc$merge))
}

viz <- list(
  meta = list(
    linhas = itens_ordenados,
    colunas = metricas_ordenadas,
    dominioEscalado = c(min(mat_escalada_ordenada), max(mat_escalada_ordenada)),
    nota = "Passe o cursor sobre uma célula pra ver item, métrica e valor exato."
  ),
  celulas = celulas,
  dendrogramaLinhas = hclust_para_arvore(hc_linhas),
  dendrogramaColunas = hclust_para_arvore(hc_colunas)
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
