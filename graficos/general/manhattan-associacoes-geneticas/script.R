# Libraries
library(ggplot2)
library(dplyr)
library(jsonlite)

# Dados 100% ficticios: um estudo de associacao genetica (GWAS) simulado --
# 22 "cromossomos" ficticios, cada um com um numero de SNPs (marcadores)
# testados contra um desfecho, e o p-valor de cada teste. A maioria dos
# SNPs nao tem associacao real (p-valor uniforme(0,1), o esperado sob a
# hipotese nula) -- exceto dois "loci" ficticios (cromossomos 6 e 16), onde
# um grupo de SNPs vizinhos foi forcado a ter associacao forte, decaindo com
# a distancia do pico, simulando o desequilibrio de ligacao que faz varios
# marcadores proximos de uma associacao real aparecerem juntos.
set.seed(8420)
n_cromossomos <- 22
snps_por_cromossomo <- 90
tamanho_cromossomo <- round(runif(n_cromossomos, 8e7, 2.6e8))

dados <- do.call(rbind, lapply(seq_len(n_cromossomos), function(cr) {
  # as.numeric: sample.int() devolve inteiro (32 bits) -- somando as posicoes
  # cumulativas de 22 cromossomos de ate 2.6e8 pb cada estoura esse limite
  # (~2.1e9) silenciosamente (NA sem erro) se ficar em inteiro.
  bp <- as.numeric(sort(sample.int(tamanho_cromossomo[cr], snps_por_cromossomo)))
  data.frame(
    CHR = cr,
    BP = bp,
    SNP = paste0("rs", cr, "_", seq_len(snps_por_cromossomo))
  )
}))
dados$P <- runif(nrow(dados))

# Injeta um locus de associacao forte: um cluster de SNPs vizinhos com
# -log10(p) caindo em curva de sino a partir do pico (formato de "montanha",
# como o desequilibrio de ligacao produz num GWAS real, em vez de um unico
# ponto isolado).
injetar_locus <- function(dados, cromossomo, indice_pico, largura, logp_pico, sigma) {
  indices_cr <- which(dados$CHR == cromossomo)
  janela <- max(1, indice_pico - largura):min(length(indices_cr), indice_pico + largura)
  alvo <- indices_cr[janela]
  distancia <- abs(janela - indice_pico)
  logp_alvo <- logp_pico * exp(-(distancia^2) / (2 * sigma^2))
  dados$P[alvo] <- 10^(-logp_alvo)
  dados
}
dados <- injetar_locus(dados, cromossomo = 6, indice_pico = 55, largura = 15, logp_pico = 9.5, sigma = 5)
dados <- injetar_locus(dados, cromossomo = 16, indice_pico = 40, largura = 10, logp_pico = 7.5, sigma = 4)

dados$logP <- -log10(dados$P)

# Posicao cumulativa no eixo X: cada cromossomo "emenda" no fim do anterior,
# tecnica padrao pra desenhar todos os cromossomos numa unica linha continua
# em vez de reiniciar a posicao a cada um.
deslocamentos <- dados %>%
  group_by(CHR) %>%
  summarise(tam = max(BP)) %>%
  mutate(desloc = cumsum(tam) - tam) %>%
  select(CHR, desloc)

dados <- dados %>%
  left_join(deslocamentos, by = "CHR") %>%
  arrange(CHR, BP) %>%
  mutate(BPcum = BP + desloc)

eixo_cromossomos <- dados %>%
  group_by(CHR) %>%
  summarise(centro = (min(BPcum) + max(BPcum)) / 2)

# Paleta trocada em relacao ao original (o exemplo do gallery alterna
# cinza-escuro/cinza-claro) -- alternancia vivida par/impar, mais a linha de
# significancia sugestiva (cinza) e a genomica (vermelha), padrao da tecnica.
cor_par <- "#2E5EAA"
cor_impar <- "#E4572E"
limiar_sugestivo <- -log10(1e-5)
limiar_genomico <- -log10(5e-8)

p <- ggplot(dados, aes(x = BPcum, y = logP, color = factor(CHR %% 2))) +
  geom_hline(yintercept = limiar_sugestivo, linetype = "dashed", color = "grey60", linewidth = 0.4) +
  geom_hline(yintercept = limiar_genomico, linetype = "dashed", color = "#B22222", linewidth = 0.5) +
  geom_point(alpha = 0.75, size = 1.2) +
  scale_color_manual(values = c("0" = cor_par, "1" = cor_impar), guide = "none") +
  scale_x_continuous(labels = eixo_cromossomos$CHR, breaks = eixo_cromossomos$centro, expand = expansion(mult = 0.01)) +
  scale_y_continuous(expand = expansion(mult = c(0.02, 0.08))) +
  labs(x = "Cromossomo", y = expression(-log[10](p))) +
  theme_minimal(base_size = 11) +
  theme(
    panel.grid.major.x = element_blank(),
    panel.grid.minor = element_blank(),
    axis.text.x = element_text(size = 7)
  )

ggsave("output.png", plot = p, width = 11, height = 4.4, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3 desenha os mesmos pontos ao longo da posicao
# cumulativa, com a mesma paleta par/impar e as mesmas linhas de limiar, e
# tooltip por SNP (cromossomo, posicao e p-valor) ao passar o cursor.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    corPar = cor_par,
    corImpar = cor_impar,
    limiarSugestivo = limiar_sugestivo,
    limiarGenomico = limiar_genomico,
    cumMax = max(dados$BPcum),
    eixoCromossomos = lapply(seq_len(nrow(eixo_cromossomos)), function(i) {
      list(cromossomo = eixo_cromossomos$CHR[i], centro = eixo_cromossomos$centro[i])
    }),
    nota = "Cada ponto é um marcador genético testado; os dois agrupamentos que cruzam a linha vermelha (significância genômica) simulam associações reais — o restante é ruído estatístico esperado."
  ),
  pontos = lapply(seq_len(nrow(dados)), function(i) {
    list(
      snp = dados$SNP[i],
      cromossomo = dados$CHR[i],
      posicao = dados$BP[i],
      bpCum = dados$BPcum[i],
      p = dados$P[i],
      logP = dados$logP[i]
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
