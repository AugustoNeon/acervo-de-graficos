# Libraries
library(ggplot2)
library(dplyr)
library(patchwork)
library(RColorBrewer)
library(jsonlite)

# Dados ficticios: preco x area construida de 300 imoveis a venda numa
# cidade ficticia, em 4 bairros. Cada bairro tem seu proprio "premio" de
# preco por m2 (mesma area, bairro diferente, preco final diferente) --
# gera uma correlacao positiva clara dentro de cada grupo, mas os grupos
# tambem se separam visivelmente no eixo Y, o tipo de padrao que colorir
# por categoria revela e um scatter monocromatico esconderia.
set.seed(2985)

bairros <- data.frame(
  bairro = c("Jardim das Flores", "Vila Nova", "Centro", "Alto da Serra"),
  preco_m2_base = c(3.2, 4.6, 6.1, 8.4), # R$ mil por m2
  n = c(90, 80, 70, 60)
)

imoveis <- do.call(rbind, lapply(seq_len(nrow(bairros)), function(i) {
  b <- bairros[i, ]
  area <- pmax(28, rnorm(b$n, 75, 22))
  ruido_m2 <- rnorm(b$n, 0, 0.55)
  data.frame(
    bairro = b$bairro,
    area = area,
    preco = area * pmax(0.6, b$preco_m2_base + ruido_m2)
  )
}))
imoveis$bairro <- factor(imoveis$bairro, levels = bairros$bairro)

cores <- setNames(brewer.pal(nrow(bairros), "Dark2"), bairros$bairro)

lim_area <- range(imoveis$area) + c(-3, 3)
lim_preco <- range(imoveis$preco) + c(-30, 30)

# Bins EXPLICITOS (nao so `bins = 28`) pra estatico e interativo caírem
# exatamente nos mesmos limites -- `geom_histogram(bins=)` e `hist(breaks=)`
# usam algoritmos de binning diferentes por baixo dos panos (o segundo trata
# um numero unico como sugestao, nao como contagem exata de bins), entao os
# dois só produzem os MESMOS retangulos se receberem o mesmo vetor de breaks.
breaks_area <- seq(lim_area[1], lim_area[2], length.out = 29)
breaks_preco <- seq(lim_preco[1], lim_preco[2], length.out = 29)

tema_marginal <- theme_void() + theme(legend.position = "none")

p_principal <- ggplot(imoveis, aes(area, preco, color = bairro)) +
  geom_point(alpha = 0.75, size = 1.8) +
  geom_smooth(method = "lm", se = FALSE, color = "grey35", linetype = "dashed", linewidth = 0.8) +
  scale_color_manual(values = cores, name = "Bairro") +
  scale_x_continuous(limits = lim_area) +
  scale_y_continuous(limits = lim_preco) +
  labs(x = "Área construída (m²)", y = "Preço (R$ mil)") +
  theme_minimal(base_size = 12) +
  theme(legend.position = c(0.82, 0.18), legend.background = element_rect(fill = "white", color = NA))

p_topo <- ggplot(imoveis, aes(area)) +
  geom_histogram(breaks = breaks_area, fill = "grey65", color = "white", linewidth = 0.15) +
  scale_x_continuous(limits = lim_area) +
  tema_marginal

p_direita <- ggplot(imoveis, aes(preco)) +
  geom_histogram(breaks = breaks_preco, fill = "grey65", color = "white", linewidth = 0.15) +
  scale_x_continuous(limits = lim_preco) +
  coord_flip() +
  tema_marginal

p <- (p_topo + patchwork::plot_spacer() + p_principal + p_direita) +
  patchwork::plot_layout(ncol = 2, widths = c(4, 1), heights = c(1, 4))

ggsave("output.png", plot = p, width = 8.5, height = 7, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3. O script exporta os pontos brutos (pra
# o painel principal recalcular a mesma regressao linear e desenhar os
# pontos) e os bins JA CALCULADOS de cada histograma marginal (via hist(),
# mesma contagem de bins do estatico) -- assim o D3 nao recalcula binning
# nenhum, so posiciona retangulos nos limites que o R ja determinou.
coefs <- coef(lm(preco ~ area, data = imoveis))

hist_area <- hist(imoveis$area, breaks = breaks_area, plot = FALSE)
hist_preco <- hist(imoveis$preco, breaks = breaks_preco, plot = FALSE)

paineis_hist <- function(h) {
  data.frame(x0 = head(h$breaks, -1), x1 = tail(h$breaks, -1), contagem = h$counts)
}

viz <- list(
  meta = list(nota = "Passe o cursor num ponto pra destacar a faixa dele nos dois histogramas marginais."),
  regressao = list(intercepto = unname(coefs[1]), inclinacao = unname(coefs[2])),
  limites = list(area = lim_area, preco = lim_preco),
  bairros = data.frame(bairro = bairros$bairro, cor = unname(cores[bairros$bairro])),
  pontos = imoveis |> mutate(id = row_number()) |> select(id, bairro, area, preco),
  histArea = paineis_hist(hist_area),
  histPreco = paineis_hist(hist_preco)
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
