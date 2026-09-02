# Libraries
library(ggplot2)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Dados 100% ficticios: cronograma de lancamento de um app, com tarefas que
# TEM DURACAO (inicio e fim), nao um instante so -- e' o que distingue este
# grafico do outro da categoria (linha-do-tempo-startup-ficticia, so
# eventos pontuais). Sobreposicao proposital entre tarefas de fases
# vizinhas (ex: design comeca antes do planejamento terminar) -- e'
# justamente essa sobreposicao que um Gantt mostra e uma lista datada nao.
tarefas <- data.frame(
  tarefa = c(
    "Pesquisa de mercado", "Definicao de escopo",
    "Wireframes", "Design visual", "Testes de usabilidade",
    "Backend da API", "App mobile", "Integracao de pagamento", "QA e testes",
    "Beta fechado", "Marketing de lancamento", "Lancamento publico"
  ),
  fase = c(
    "Planejamento", "Planejamento",
    "Design", "Design", "Design",
    "Desenvolvimento", "Desenvolvimento", "Desenvolvimento", "Desenvolvimento",
    "Lancamento", "Lancamento", "Lancamento"
  ),
  inicio = as.Date(c(
    "2024-01-08", "2024-01-22",
    "2024-02-05", "2024-02-19", "2024-03-11",
    "2024-03-04", "2024-03-18", "2024-04-22", "2024-05-13",
    "2024-06-03", "2024-05-20", "2024-06-24"
  )),
  fim = as.Date(c(
    "2024-01-26", "2024-02-09",
    "2024-02-23", "2024-03-15", "2024-03-22",
    "2024-05-17", "2024-05-31", "2024-05-24", "2024-06-07",
    "2024-06-17", "2024-06-21", "2024-06-24"
  ))
)

# Ordem de exibicao: cronologica pelo inicio, de cima pra baixo no eixo Y --
# geom_segment usa o fator na ordem dos LEVELS, entao o mais antigo precisa
# ser o ULTIMO level (topo do grafico == topo do fator invertido).
tarefas <- tarefas[order(tarefas$inicio), ]
tarefas$tarefa <- factor(tarefas$tarefa, levels = rev(tarefas$tarefa))
tarefas$fase <- factor(tarefas$fase, levels = c("Planejamento", "Design", "Desenvolvimento", "Lancamento"))

# A cor de cada fase nasce AQUI, uma unica vez -- o data.json exporta os
# mesmos hex, pra estatico e interativo nunca discordarem de que cor e' cada
# fase (mesma regra da matriz de adjacencia, aplicada a fase em vez de tag).
cor_fase <- c(
  "Planejamento"    = "#6B7FD7",
  "Design"          = "#D77BAE",
  "Desenvolvimento" = "#5FAD8C",
  "Lancamento"      = "#E0A458"
)

# Lancamento publico e' um marco de um dia so (inicio == fim) -- nao da pra
# desenhar como barra (largura zero, invisivel), entao os marcos pontuais
# ganham um losango em vez de um segmento.
tarefas$duracao <- as.numeric(tarefas$fim - tarefas$inicio)
marcos <- tarefas[tarefas$duracao == 0, ]
barras <- tarefas[tarefas$duracao > 0, ]

# Dependencias reais entre tarefas (o que precisa terminar pra outra comecar
# de verdade), NAO derivadas so da ordem de datas -- duas tarefas vizinhas no
# tempo podem so estar rodando em paralelo sem uma depender da outra (esse e'
# o proprio ponto da sobreposicao ja registrada acima). So entram aqui pares
# com uma razao de negocio real de por que B so faz sentido depois de A.
# Usado so na versao interativa (camada oculta por padrao, ligada por um
# botao) -- o output.png/estado padrao do widget continuam identicos, sem
# nenhuma seta.
dependencias <- data.frame(
  de   = c("Pesquisa de mercado", "Definicao de escopo", "Wireframes", "Design visual",
           "Definicao de escopo", "Definicao de escopo", "Backend da API", "App mobile",
           "Integracao de pagamento", "QA e testes", "Beta fechado", "Marketing de lancamento"),
  para = c("Definicao de escopo", "Wireframes", "Design visual", "Testes de usabilidade",
           "Backend da API", "App mobile", "Integracao de pagamento", "QA e testes",
           "QA e testes", "Beta fechado", "Lancamento publico", "Lancamento publico")
)

p <- ggplot() +
  geom_segment(
    data = barras,
    aes(x = inicio, xend = fim, y = tarefa, yend = tarefa, colour = fase),
    linewidth = 7, lineend = "round"
  ) +
  geom_point(
    data = marcos,
    aes(x = inicio, y = tarefa, colour = fase),
    shape = 18, size = 5
  ) +
  scale_colour_manual(values = cor_fase, name = NULL) +
  scale_x_date(date_labels = "%d/%m", date_breaks = "3 weeks", expand = expansion(mult = 0.03)) +
  labs(
    title = "Cronograma de lancamento de um app (Jan-Jun 2024)",
    x = NULL, y = NULL
  ) +
  theme_minimal(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold"),
    panel.grid.major.y = element_blank(),
    panel.grid.minor = element_blank(),
    panel.grid.major.x = element_line(colour = "grey92"),
    axis.text.y = element_text(hjust = 1),
    legend.position = "top",
    plot.margin = margin(t = 10, r = 16, b = 10, l = 16)
  )

ggsave("output.png", plot = p, width = 10, height = 6, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: mesmo cronograma, com tooltip por tarefa mostrando
# duracao em dias e destaque por fase ao apontar qualquer tarefa dela.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(cores = as.list(cor_fase)),
  tarefas = lapply(seq_len(nrow(tarefas)), function(i) {
    list(
      tarefa = as.character(tarefas$tarefa[i]),
      fase = as.character(tarefas$fase[i]),
      inicio = format(tarefas$inicio[i], "%Y-%m-%d"),
      fim = format(tarefas$fim[i], "%Y-%m-%d")
    )
  }),
  dependencias = lapply(seq_len(nrow(dependencias)), function(i) {
    list(de = dependencias$de[i], para = dependencias$para[i])
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
