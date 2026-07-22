# Libraries
library(streamgraph)
library(htmlwidgets)
library(webshot2)

# Dados ficticios: evolucao de 8 categorias fake ao longo de 25 anos
# (numero de grupos, periodo, seed e distribuicao diferentes do exemplo
# original do R Graph Gallery -- ver AGENTS.md "Decisoes fechadas")
set.seed(2024)
anos <- 2000:2024
grupos <- paste0("categoria_", 1:8)
data <- data.frame(
  year = rep(anos, each = length(grupos)),
  name = rep(grupos, length(anos)),
  value = round(rgamma(length(anos) * length(grupos), shape = 2, scale = 15), 1)
)

# Streamgraph interativo com legenda/dropdown (sg_legend) e paleta customizada
# (paleta "Set2" via sg_fill_brewer -- o exemplo original nao customiza a
# paleta, entao qualquer escolha explicita ja diferencia do padrao do gallery)
pp <- streamgraph(data, key = "name", value = "value", date = "year",
                   height = "400px", width = "800px") |>
  sg_legend(show = TRUE, label = "Categoria: ") |>
  sg_fill_brewer("Set2")

# Salvar o widget interativo na propria pasta do grafico
# (selfcontained = FALSE porque pandoc nao esta instalado neste ambiente --
# ver docs/SETUP.md; gera uma pasta widget_files/ com as dependencias ao lado)
saveWidget(pp, file = "widget.html", selfcontained = FALSE)

# Gerar thumbnail estatico (output.png) tirando um screenshot do widget,
# ja que streamgraph nao tem equivalente estatico em ggplot2
webshot2::webshot("widget.html", file = "output.png", vwidth = 900, vheight = 450, delay = 1)
