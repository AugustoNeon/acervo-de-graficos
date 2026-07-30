# Libraries
library(collapsibleTree)
library(htmlwidgets)
library(webshot2)

# Excecao a decisao padrao do projeto de nunca replicar dado/paleta
# identicos ao original -- pedido explicito do usuario pra este grafico
# especifico: usa o mesmo dataset (`warpbreaks`, embutido no proprio R) e a
# mesma cor padrao (lightsteelblue) do exemplo, sem paleta por nivel nem
# dados ficticios.
widget <- collapsibleTree(warpbreaks, c("wool", "tension", "breaks"))

# Salvar o widget interativo na propria pasta do grafico
# (selfcontained = FALSE porque pandoc nao esta instalado -- ver docs/SETUP.md)
saveWidget(widget, file = "widget.html", selfcontained = FALSE)

# output.png via screenshot do proprio widget: collapsibleTree e so
# interativo (arvore D3 que se expande por clique), nao tem equivalente
# estatico em ggplot2 -- mesmo padrao de outros widgets sem versao ggplot2
# (streamgraph, networkD3, leaflet). Como o thumbnail e um screenshot do
# proprio widget renderizado no estado inicial (colapsado), os dois ficam
# sempre visualmente identicos por construcao -- sem risco de divergencia
# entre estatico e interativo.
webshot2::webshot("widget.html", file = "output.png", vwidth = 500, vheight = 400, delay = 4, zoom = 2)
