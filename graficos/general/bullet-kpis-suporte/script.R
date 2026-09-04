# Libraries
library(ggplot2)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Bullet chart (Stephen Few): cada KPI e' uma linha com sua PROPRIA escala
# (nao compartilhada com as outras) -- e' isso que permite comparar metricas
# de unidades bem diferentes (porcentagem, nota, contagem) lado a lado sem
# distorcer nenhuma. Tres camadas por linha: faixas de fundo em tons de
# cinza (ruim/medio/bom, contexto qualitativo), uma barra fina (o valor
# real) e um traco vertical (a meta) -- a leitura e' "a barra passou do
# traco?", sem precisar comparar numeros de cabeca.
set.seed(1709)

kpis <- data.frame(
  kpi = c(
    "Satisfação do cliente (%)",
    "Resolução no 1o contato (%)",
    "NPS (0-100)",
    "Retenção mensal (%)",
    "Chamados por agente/dia",
    "SLA cumprido (%)"
  ),
  valor = c(82, 68, 45, 91, 27, 88),
  meta  = c(85, 75, 55, 90, 30, 90),
  # 3 faixas qualitativas por KPI: [fim do ruim, fim do medio, fim do bom] --
  # sempre comecando em 0. Faixas diferentes por linha de propósito (SLA e
  # satisfacao tem exigencia mais alta que chamados/dia, por exemplo).
  fim_ruim  = c(60, 50, 20, 80, 15, 70),
  fim_medio = c(80, 70, 50, 90, 25, 85),
  fim_bom   = c(100, 100, 100, 100, 40, 100)
)
# Dado 100% ficticio: painel de KPIs de um time de suporte fictício,
# escrito à mão (nao sorteado) pra contar uma historia especifica -- a
# maioria abaixo da meta (satisfacao, resolucao, NPS, chamados por agente),
# uma ja passou dela (retencao) e uma quase la (SLA), pra o grafico
# mostrar os tres casos que um bullet chart existe pra distinguir: bem
# abaixo, perto, e acima da meta.
kpis$kpi <- factor(kpis$kpi, levels = kpis$kpi)

cor_faixa <- c(ruim = "#E4E1D8", medio = "#C9C4B4", bom = "#A8A190")
cor_barra <- "#2B4C5C"
cor_meta  <- "#B34747"

# ggplot2 nao tem geom de bullet chart pronto -- cada elemento e' desenhado
# na mao com geom_rect()/geom_segment() por cima de facet_wrap(scales =
# "free_x"), que da a cada KPI seu proprio eixo X independente.
faixas_longo <- do.call(rbind, lapply(seq_len(nrow(kpis)), function(i) {
  data.frame(
    kpi = kpis$kpi[i],
    xmin = c(0, kpis$fim_ruim[i], kpis$fim_medio[i]),
    xmax = c(kpis$fim_ruim[i], kpis$fim_medio[i], kpis$fim_bom[i]),
    faixa = factor(c("ruim", "medio", "bom"), levels = c("ruim", "medio", "bom"))
  )
}))

p <- ggplot() +
  geom_rect(
    data = faixas_longo,
    aes(xmin = xmin, xmax = xmax, ymin = -0.32, ymax = 0.32, fill = faixa)
  ) +
  geom_rect(
    data = kpis,
    aes(xmin = 0, xmax = valor, ymin = -0.10, ymax = 0.10),
    fill = cor_barra
  ) +
  geom_segment(
    data = kpis,
    aes(x = meta, xend = meta, y = -0.4, yend = 0.4),
    colour = cor_meta, linewidth = 1.3
  ) +
  scale_fill_manual(values = cor_faixa, guide = "none") +
  facet_wrap(vars(kpi), ncol = 1, scales = "free_x", strip.position = "left") +
  labs(title = "Painel de KPIs de um time de suporte (fictício)", x = NULL, y = NULL) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold"),
    axis.text.y = element_blank(),
    panel.grid.major.y = element_blank(),
    panel.grid.minor = element_blank(),
    panel.grid.major.x = element_line(colour = "grey92"),
    strip.placement = "outside",
    strip.text.y.left = element_text(angle = 0, hjust = 1, face = "bold", size = 9),
    panel.spacing.y = unit(1, "lines"),
    plot.margin = margin(t = 10, r = 16, b = 10, l = 10)
  )

ggsave("output.png", plot = p, width = 9, height = 7, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: mesmos KPIs, tooltip com valor exato/meta/diferenca.
# ---------------------------------------------------------------------------
viz <- list(
  meta_cores = list(ruim = cor_faixa[["ruim"]], medio = cor_faixa[["medio"]], bom = cor_faixa[["bom"]], barra = cor_barra, meta = cor_meta),
  kpis = lapply(seq_len(nrow(kpis)), function(i) {
    list(
      kpi = as.character(kpis$kpi[i]),
      valor = kpis$valor[i],
      meta = kpis$meta[i],
      fimRuim = kpis$fim_ruim[i],
      fimMedio = kpis$fim_medio[i],
      fimBom = kpis$fim_bom[i]
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
