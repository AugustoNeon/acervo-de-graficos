# Libraries
library(ggplot2)
library(dplyr)
library(RColorBrewer)
library(jsonlite)

# Dados 100% ficticios: a MESMA receita mensal de um SaaS ficticio por
# categoria de produto (24 meses) ja usada no grafico de area empilhada deste
# acervo (graficos/evolution/area-receita-saas-ficticio) -- de proposito, pra
# comparar lado a lado a mesma evolucao lida como pequenos multiplos (aqui) e
# como pilha/sobreposicao (la). Ver data-to-viz.com/caveat/stacking.html: e
# dificil estudar a evolucao de um grupo que nao esta na base da pilha, porque
# a linha de base dele se move; pequenos multiplos dao a cada grupo seu proprio
# eixo, sem essa distorcao.
set.seed(5566)
meses <- seq(as.Date("2024-01-01"), by = "month", length.out = 24)
categorias <- c("Assinaturas", "Marketplace", "Consultoria", "Suporte Premium")

tendencia <- function(base, incremento_mensal, n = 24, ruido_sd) {
  pmax(base + incremento_mensal * (0:(n - 1)) + rnorm(n, sd = ruido_sd), 5)
}

dados <- bind_rows(
  data.frame(mes = meses, categoria = "Assinaturas", receita = tendencia(80, 2.6, ruido_sd = 6)),
  data.frame(mes = meses, categoria = "Marketplace", receita = tendencia(12, 4.1, ruido_sd = 4)),
  data.frame(mes = meses, categoria = "Consultoria", receita = tendencia(55, -1.4, ruido_sd = 5)),
  data.frame(mes = meses, categoria = "Suporte Premium", receita = tendencia(20, 0.5, ruido_sd = 3))
)
dados$categoria <- factor(dados$categoria, levels = categorias)
dados$receita <- round(dados$receita, 1)

# Paleta trocada em relacao ao original (o exemplo do gallery usa
# scale_fill_viridis_d()) -- croma alto, e diferente tambem da paleta Dark2 ja
# usada no grafico de area empilhada irmao deste, pra nao confundir os dois na
# galeria mesmo usando o mesmo dado.
cores <- setNames(c("#E4572E", "#17A398", "#7B2D8B", "#F2B134"), categorias)

p <- ggplot(dados, aes(x = mes, y = receita, fill = categoria)) +
  geom_area(color = "white", linewidth = 0.3) +
  scale_fill_manual(values = cores) +
  scale_x_date(date_labels = "%b/%y", date_breaks = "6 months") +
  facet_wrap(~categoria, scale = "free_y", ncol = 2) +
  labs(
    title = "Receita mensal por categoria, lida em pequenos múltiplos",
    x = NULL, y = "Receita mensal (mil R$)"
  ) +
  theme_minimal(base_size = 11) +
  theme(
    legend.position = "none",
    plot.title = element_text(face = "bold"),
    strip.text = element_text(face = "bold"),
    panel.spacing = unit(1.1, "lines")
  )

ggsave("output.png", plot = p, width = 9, height = 6.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3 desenha o mesmo layout em grade 2x2, cada painel com a
# SUA propria escala Y (equivalente ao scale="free_y" do facet_wrap) e
# tooltip por mes ao passar o cursor. O R so exporta a serie bruta por
# categoria -- o layout de grade e as escalas independentes sao calculados no
# D3, mesmo principio ja usado nos outros graficos interativos deste acervo.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    categorias = categorias,
    paleta = as.list(cores),
    nota = "Cada painel tem sua própria escala vertical — repare que Consultoria está em queda ao lado das outras crescendo, algo que a versão empilhada esconde."
  ),
  series = lapply(categorias, function(cat) {
    linha <- dados[dados$categoria == cat, ]
    list(categoria = cat, pontos = lapply(seq_len(nrow(linha)), function(i) {
      list(mes = format(linha$mes[i], "%Y-%m-%d"), receita = linha$receita[i])
    }))
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
