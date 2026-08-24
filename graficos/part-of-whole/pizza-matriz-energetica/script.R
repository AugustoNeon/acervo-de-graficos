# Libraries
library(ggplot2)
library(jsonlite)
library(RColorBrewer)

# Dados 100% ficticios: matriz de geracao eletrica de um pais ficticio em um
# ano ficticio, em vez do dataset generico (contagem de cilindros do mtcars)
# do exemplo original -- ver AGENTS.md "Decisoes fechadas"
set.seed(4519)
fontes <- c("Hidrelétrica", "Eólica", "Solar", "Gás natural", "Biomassa", "Carvão")
pesos <- c(38, 22, 14, 15, 7, 4) # somam 100, pensados p/ ter 1 fatia dominante
dados <- data.frame(
  fonte = factor(fontes, levels = fontes[order(-pesos)]),
  gwh   = pesos * 12.5 # escala arbitraria pra virar um numero de GWh/ano
)
dados$fracao <- dados$gwh / sum(dados$gwh)
dados$rotulo <- paste0(round(dados$fracao * 100), "%")

# Paleta trocada em relacao ao original (paleta padrao do ggplot2/generica do
# tutorial) -- qualitativa, uma cor por fonte de energia
cores <- setNames(brewer.pal(6, "Set2"), levels(dados$fonte))

# Pizza classica em ggplot2: geom_bar(stat="identity", width=1) + coord_polar
# -- nao existe geom_pie() pronto, o truque padrao e "barra empilhada de
# categoria unica, dobrada em circulo" (mesma familia de coord_polar() ja
# usada na rosca, so que sem o buraco do meio: aqui xmin/xmax cobrem o centro)
p <- ggplot(dados, aes(x = "", y = gwh, fill = fonte)) +
  geom_bar(stat = "identity", width = 1, color = "white", linewidth = 0.8) +
  geom_text(
    aes(label = rotulo),
    position = position_stack(vjust = 0.5), color = "white",
    fontface = "bold", size = 4.2
  ) +
  coord_polar(theta = "y") +
  scale_fill_manual(values = cores, name = "Fonte") +
  labs(title = "Matriz de geração elétrica (dado fictício)") +
  theme_void(base_size = 13) +
  theme(
    plot.title = element_text(hjust = 0.5, face = "bold"),
    legend.title = element_text(face = "bold")
  )

ggsave("output.png", plot = p, width = 7.5, height = 6, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3 (d3.pie()+d3.arc(), raio interno zero -- mesma tecnica
# da rosca do acervo, sem o buraco central), mesma regra do resto do acervo.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(nota = "Passe o cursor numa fatia pra ver o percentual e o total em GWh/ano."),
  fatias = dados[order(-dados$gwh), c("fonte", "gwh")],
  paleta = as.list(cores)
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
