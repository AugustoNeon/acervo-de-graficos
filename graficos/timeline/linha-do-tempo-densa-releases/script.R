# Libraries
library(ggplot2)
library(ggbeeswarm)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Terceira entrada da categoria `timeline`, pensada pra cobrir a lacuna que
# os outros dois graficos ja documentam: a linha do tempo de marcos (so
# alterna 2 lados) e o Gantt (uma linha por tarefa) so cabem bem com poucas
# dezenas de itens. Aqui o dado tem MUITOS eventos discretos (dezenas), e a
# tecnica -- empacotamento tipo enxame (beeswarm) ao longo de um unico eixo
# de tempo -- e o que resolve a colisao sem esconder nenhum evento.
set.seed(9102)

inicio_geral <- as.Date("2022-01-01")
fim_geral    <- as.Date("2024-12-31")
dias_total   <- as.numeric(fim_geral - inicio_geral)

# Marcos escritos a mao (decisao de produto, nao sorteio): 4 lancamentos
# major cadenciados ao longo dos 3 anos, e uma RAJADA de 5 hotfixes logo
# apos o v2.0.0 -- simulando um lancamento com bug serio que precisou de
# correcao emergencial dia sim, dia nao. E exatamente essa rajada que a
# tecnica de empacotamento existe pra revelar: numa linha do tempo comum,
# 5 eventos em 9 dias colidiriam num ponto so ou exigiriam esconder rotulo.
majors <- data.frame(
  data = as.Date(c("2022-01-10", "2023-02-06", "2024-01-15", "2024-10-01")),
  versao = c("v1.0.0", "v2.0.0", "v3.0.0", "v4.0.0"),
  tipo = "major"
)

hotfixes_v2 <- data.frame(
  data = as.Date(c("2023-02-08", "2023-02-09", "2023-02-11", "2023-02-14", "2023-02-17")),
  versao = paste0("v2.0.", 1:5, "-hotfix"),
  tipo = "hotfix"
)

# Volume gerado por sorteio (minor bem menos frequente que patch, cadencia
# tipica de um projeto de software real), espalhado por todo o periodo.
gerar_datas <- function(n) sort(inicio_geral + sample(seq_len(dias_total), n))

# Numero da "era" (quantos majors ja saíram até aquela data) só pra compor
# um numero de versao plausivel no rotulo -- cosmetico, nao precisa refletir
# semver de verdade.
era_de <- function(datas) pmax(1, sapply(datas, function(d) sum(majors$data <= d)))

minors_datas <- gerar_datas(16)
minors <- data.frame(
  data = minors_datas,
  versao = paste0("v", era_de(minors_datas), ".", ave(seq_along(minors_datas), era_de(minors_datas), FUN = seq_along), ".0"),
  tipo = "minor"
)

patches_datas <- gerar_datas(28)
patches <- data.frame(
  data = patches_datas,
  versao = paste0("v", era_de(patches_datas), ".0.", ave(seq_along(patches_datas), era_de(patches_datas), FUN = seq_along)),
  tipo = "patch"
)

releases <- rbind(majors, hotfixes_v2, minors, patches)
releases <- releases[order(releases$data), ]
releases$tipo <- factor(releases$tipo, levels = c("major", "minor", "patch", "hotfix"))

# A cor de cada tipo nasce AQUI, uma unica vez -- mesma regra ja usada nos
# outros dois graficos da categoria, aplicada a "tipo de release" em vez de
# fase/categoria de marco.
cor_tipo <- c(
  "major"  = "#2B5B7A",
  "minor"  = "#4F9A8B",
  "patch"  = "#C9A24B",
  "hotfix" = "#B34747"
)

# geom_beeswarm espera eixo categorico (aqui, uma unica categoria "todos") +
# eixo de VALOR continuo -- o valor e' a data, preservada exatamente; o
# empacotamento acontece no outro eixo (categorico), que vira o eixo
# vertical sem sentido de dado nenhum. coord_flip() deita isso, entao o eixo
# com sentido (tempo) fica horizontal, como em qualquer outro grafico desta
# categoria.
p <- ggplot(releases, aes(x = "todos", y = data, colour = tipo)) +
  geom_beeswarm(cex = 1.3, size = 2.6, priority = "density", method = "swarm") +
  scale_colour_manual(values = cor_tipo, name = NULL) +
  scale_y_date(date_labels = "%Y", date_breaks = "1 year") +
  labs(title = "Histórico de releases de um software (2022-2024)", x = NULL, y = NULL) +
  coord_flip() +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold"),
    axis.text.y = element_blank(),
    axis.ticks.y = element_blank(),
    panel.grid.major.y = element_blank(),
    panel.grid.minor = element_blank(),
    panel.grid.major.x = element_line(colour = "grey92"),
    legend.position = "top",
    plot.margin = margin(t = 10, r = 16, b = 10, l = 16)
  )

ggsave("output.png", plot = p, width = 10, height = 4, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: mesmos releases, sem posicao vertical pronta -- o D3
# refaz o proprio empacotamento (algoritmo de camadas por colisao, mesmo
# principio ja usado na linha-do-tempo-startup-ficticia) porque ele precisa
# ser recalculado a cada zoom, quando o numero de pontos visiveis muda.  A
# posicao Y aqui e so anti-sobreposicao, nunca dado -- por isso nao ha
# necessidade de exportar a posicao calculada pelo ggbeeswarm (que sozinho
# tambem nao seria reproduzivel a niveis de zoom diferentes).
viz <- list(
  meta = list(cores = as.list(cor_tipo)),
  releases = lapply(seq_len(nrow(releases)), function(i) {
    list(
      data = format(releases$data[i], "%Y-%m-%d"),
      versao = releases$versao[i],
      tipo = as.character(releases$tipo[i])
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
