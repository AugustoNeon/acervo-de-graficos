# Libraries
library(ggplot2)

# TODO: colar aqui o código do gráfico copiado do R Graph Gallery
# IMPORTANTE: atribua o plot final a uma variável (ex: `p <- ggplot(...) + ...`)
# em vez de deixá-lo imprimir sozinho — senão o R gera um Rplots.pdf indesejado
# junto do output.png.

# Salvar imagem final na pasta do próprio gráfico
ggsave("output.png", plot = p, width = 8, height = 6, dpi = 150)
