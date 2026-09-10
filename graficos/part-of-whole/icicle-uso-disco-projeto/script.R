# Libraries
library(ggplot2)
library(dplyr)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Icicle chart: uso de espaco em disco da estrutura de pastas de um projeto
# de software ficticio. Sexto membro de part-of-whole, mas com uma leitura
# que nenhum dos outros cinco (pizza, rosca, treemap, circle packing x2,
# sunburst) oferece: PROFUNDIDADE DA HIERARQUIA vira EIXO Y discreto (uma
# linha por nivel, raiz no topo), em vez de virar anel concentrico
# (sunburst/circle packing) ou aninhamento 2D livre (treemap) -- comparar o
# tamanho de dois nos em NIVEIS DIFERENTES é so olhar a largura de cada um
# na propria linha, sem precisar comparar aneis de raio diferente. Mesma
# geometria de particao aninhada do mosaico desta base (largura acumulada
# proporcional ao total do pai), só que aplicada a profundidade em vez de
# categoria x categoria -- sem pacote pronto (ggraph/igraph fariam um
# dendrograma ou treemap, nao um icicle), montado a mao com geom_rect(),
# mesma familia "sem widget -> desenha na mao" do waffle/mosaico/ternario.
set.seed(2214)

# Estrutura: categoria (nivel 1) -> subpasta (nivel 2, folha) -> tamanho em MB.
# Categorias sem subpasta (docs, tests) sao sua propria folha -- pasta real,
# sem filhos, nao um erro de dado.
dados <- data.frame(
  categoria = c(
    "src", "src", "src", "src",
    "node_modules", "node_modules", "node_modules",
    "assets", "assets", "assets",
    "build", "build", "build",
    "docs",
    "tests"
  ),
  subpasta = c(
    "components", "pages", "utils", "styles",
    "react + deps", "lodash", "outras deps",
    "imagens", "fontes", "videos",
    "js", "css", "html",
    "docs",
    "tests"
  ),
  tamanho_mb = c(
    4.2, 2.8, 1.5, 0.9,
    8.1, 3.2, 12.4,
    6.7, 0.8, 15.3,
    3.4, 0.6, 0.2,
    1.1,
    2.3
  )
)

total_geral <- sum(dados$tamanho_mb)

# Nivel 1 (categoria): largura acumulada proporcional ao total geral --
# mesma tecnica do mosaico (part-of-whole/mosaico-canal-aquisicao-plano),
# só que aqui e' o unico nivel intermediario, nao uma segunda dimensao
# independente por coluna.
nivel1 <- dados %>%
  group_by(categoria) %>%
  summarise(total = sum(tamanho_mb), .groups = "drop") %>%
  arrange(desc(total)) %>%
  mutate(x1 = cumsum(total) / total_geral, x0 = x1 - total / total_geral)

# Nivel 2 (subpasta): largura proporcional ao total DA PROPRIA categoria,
# depois RE-ESCALADA pro intervalo [x0, x1] da categoria -- e' essa
# reescala (multiplicar pela largura do pai, nao só normalizar 0-1) que
# faz o filho ficar aninhado DENTRO do pai em vez de reocupar a largura
# inteira do grafico (diferenca central pro mosaico, onde cada coluna
# reusa 0-1 inteiro porque as colunas sao independentes, nao aninhadas).
folhas <- dados %>%
  left_join(nivel1, by = "categoria") %>%
  group_by(categoria) %>%
  arrange(categoria, desc(tamanho_mb)) %>%
  mutate(
    frac_fim = cumsum(tamanho_mb) / total,
    frac_inicio = frac_fim - tamanho_mb / total,
    x0_folha = x0 + frac_inicio * (x1 - x0),
    x1_folha = x0 + frac_fim * (x1 - x0)
  ) %>%
  ungroup()

paleta_categoria <- c(
  "src"           = "#3B6E8F",
  "node_modules"  = "#8B5FA8",
  "assets"        = "#4A9A6A",
  "build"         = "#C9793A",
  "docs"          = "#B34747",
  "tests"         = "#6E7A8A"
)

# Tres linhas (y discreto): raiz (todo o projeto), categoria, subpasta --
# raiz sempre no topo (y mais alto no ggplot, que cresce pra cima).
retangulos <- bind_rows(
  data.frame(
    rotulo = "projeto", categoria = NA_character_, nivel = 3,
    x0 = 0, x1 = 1, tamanho_mb = total_geral
  ),
  nivel1 %>% transmute(rotulo = categoria, categoria = categoria, nivel = 2, x0, x1, tamanho_mb = total),
  folhas %>% transmute(rotulo = subpasta, categoria = categoria, nivel = 1, x0 = x0_folha, x1 = x1_folha, tamanho_mb)
)
retangulos$cor_preenchimento <- ifelse(
  retangulos$nivel == 3, "#E4E1D8", paleta_categoria[retangulos$categoria]
)

p <- ggplot(retangulos) +
  geom_rect(aes(xmin = x0, xmax = x1, ymin = nivel - 0.48, ymax = nivel + 0.48, fill = cor_preenchimento), colour = "white", linewidth = 0.8) +
  geom_text(
    data = subset(retangulos, (x1 - x0) > 0.035),
    aes(x = (x0 + x1) / 2, y = nivel, label = rotulo),
    size = 3, fontface = "bold", colour = "grey15"
  ) +
  scale_fill_identity() +
  scale_x_continuous(limits = c(0, 1), expand = c(0, 0)) +
  scale_y_continuous(limits = c(0.5, 3.5), expand = c(0, 0), breaks = NULL) +
  labs(
    title = "Uso de espaço em disco de um projeto de software fictício",
    subtitle = paste0("Estrutura de pastas · ", round(total_geral, 1), " MB no total · raiz no topo, folhas embaixo")
  ) +
  theme_void(base_size = 12) +
  theme(
    plot.title = element_text(face = "bold", size = 14, hjust = 0.5),
    plot.subtitle = element_text(colour = "grey40", hjust = 0.5, margin = margin(b = 10))
  )

ggsave("output.png", plot = p, width = 10, height = 5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 recebe so a lista achatada categoria+subpasta+
# tamanho -- ele monta a particao aninhada (largura acumulada por nivel)
# sozinho, mesmo principio de sempre desta base.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(cores = as.list(paleta_categoria), totalGeral = round(total_geral, 1)),
  folhas = lapply(seq_len(nrow(dados)), function(i) {
    list(categoria = dados$categoria[i], subpasta = dados$subpasta[i], tamanhoMb = dados$tamanho_mb[i])
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
