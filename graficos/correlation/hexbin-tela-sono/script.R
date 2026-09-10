# Libraries
library(ggplot2)
library(hexbin)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Hexbin de dispersao: tempo de tela por dia x horas de sono por noite,
# 1.500 pessoas ficticias. Sétimo membro de `correlation`, mas o primeiro
# que resolve OVERPLOTTING -- com N grande, um scatter comum (como
# correlation/bolhas-investimento-startups) vira uma mancha solida onde não
# dá mais pra ver onde os pontos realmente se concentram; agregar em
# hexágonos e colorir por CONTAGEM revela a densidade que o olho não
# consegue separar em milhares de círculos sobrepostos. Já existe um hexbin
# nesta base (map/mapa-hexbin-avistamentos-aves), mas aquele agrega
# COORDENADA GEOGRÁFICA sobre um mapa; aqui é a técnica genérica de
# densidade 2D sobre duas variáveis quaisquer, sem geografia nenhuma.
set.seed(7733)

n <- 1500
# Correlacao negativa (mais tela, menos sono) com ruido -- gerada via duas
# normais correlacionadas (metodo de Cholesky manual, sem pacote extra):
# z2 = rho*z1 + sqrt(1-rho^2)*ruido garante a correlacao alvo exatamente.
rho <- -0.62
z1 <- rnorm(n)
z2 <- rho * z1 + sqrt(1 - rho^2) * rnorm(n)
tela_horas <- pmax(pmin(4.2 + z1 * 1.6, 11), 0.3)
sono_horas <- pmax(pmin(7.3 + z2 * 1.1, 10.5), 3)

dados <- data.frame(tela = round(tela_horas, 2), sono = round(sono_horas, 2))

p <- ggplot(dados, aes(x = tela, y = sono)) +
  geom_hex(bins = 18, colour = "white", linewidth = 0.15) +
  scale_fill_gradientn(colours = c("#EAF0EE", "#7BAE8F", "#2F6E4F", "#123D28"), name = "Pessoas") +
  scale_x_continuous(limits = c(0, 11)) +
  scale_y_continuous(limits = c(3, 10.5)) +
  labs(
    title = "Tempo de tela x horas de sono (1.500 pessoas)",
    subtitle = "Cada hexágono agrega quantas pessoas caem naquela faixa das duas variáveis",
    x = "Tempo de tela por dia (horas)", y = "Sono por noite (horas)"
  ) +
  theme_minimal(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14),
    plot.subtitle = element_text(colour = "grey40", margin = margin(b = 10), size = 9.5),
    panel.grid.minor = element_blank()
  )

ggsave("output.png", plot = p, width = 8.5, height = 6, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 recebe os 1.500 PONTOS BRUTOS (nunca os hexagonos
# ja agregados pelo geom_hex) -- ele monta a propria grade hexagonal e
# agrega sozinho, mesmo principio de sempre desta base. A tecnica de
# agregacao no D3 nao precisa ser identica ao hexbin::hexbin() usado aqui
# (mesmo caso do enxame beeswarm desta base: equivalencia visual, nao
# algoritmo identico) -- centro de hexagono mais proximo de cada ponto,
# por distancia euclidiana, produz a mesma particao de um grid hexagonal
# regular.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(dominio = list(telaMax = 11, sonoMin = 3, sonoMax = 10.5)),
  pontos = lapply(seq_len(nrow(dados)), function(i) {
    list(tela = dados$tela[i], sono = dados$sono[i])
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
