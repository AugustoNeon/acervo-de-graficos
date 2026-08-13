# Libraries
library(ggraph)
library(igraph)
library(jsonlite)

# Dados ficticios: catalogo de streaming (midia > genero > titulo), horas
# assistidas/ouvidas num mes ficticio -- no lugar do dataset real "flare"
# (hierarquia de pacotes de software) do exemplo original
dados <- data.frame(
  midia = rep(c("Filmes", "Series", "Musica", "Podcasts"), each = 6),
  genero = c(
    rep(c("Acao", "Comedia", "Drama"), each = 2),
    rep(c("Ficcao Cientifica", "Documentario", "Sitcom"), each = 2),
    rep(c("Pop", "Rock", "MPB"), each = 2),
    rep(c("Noticias", "True Crime", "Educacao"), each = 2)
  ),
  titulo = c(
    "Trovao Final", "Ronda de Aco", "Risada Geral", "Zoeira Nacional", "Lagrimas de Vidro", "Segunda Chance",
    "Orbita Zero", "Simulacro", "Fundo do Mar", "Era Glacial", "Vizinhos Terriveis", "Escritorio Vazio",
    "Verao Sem Fim", "Luz de Neon", "Estrada de Ferro", "Ruido Branco", "Violao e Chuva", "Samba Novo",
    "Resumo do Dia", "Manchetes", "Caso Encerrado", "Arquivo Aberto", "Aprenda Rapido", "Ciencia Simples"
  ),
  horas = c(
    82, 54, 61, 39, 47, 33,
    95, 58, 42, 36, 70, 45,
    120, 88, 66, 40, 58, 44,
    30, 22, 77, 51, 35, 28
  )
)

# Monta a hierarquia como grafo (raiz -> midia -> genero -> titulo). Cada
# nome e unico globalmente (nenhum genero se repete entre midias), entao da
# pra usar os nomes direto como id dos vertices, sem precisar concatenar
# caminho -- ver AGENTS.md "Licoes aprendidas" se isso mudar no futuro
edges <- rbind(
  data.frame(from = "Catalogo", to = unique(dados$midia)),
  setNames(unique(dados[, c("midia", "genero")]), c("from", "to")),
  data.frame(from = dados$genero, to = dados$titulo)
)

# "horas" so existe nas folhas (titulos); nos internos ficam 0 e o layout
# circlepack soma os descendentes sozinho pra definir a area de cada anel
# (0, nao NA -- o layout_igraph_circlepack faz uma comparacao != 0 internamente)
vertices <- data.frame(
  name = c("Catalogo", unique(dados$midia), unique(dados$genero), dados$titulo),
  horas = c(
    0, rep(0, length(unique(dados$midia))), rep(0, length(unique(dados$genero))),
    dados$horas
  )
)

mygraph <- graph_from_data_frame(edges, vertices = vertices)

# Paleta por profundidade, definida UMA vez e reaproveitada pelas duas versoes
# (estatica aqui, interativa no fim do script) -- evita as duas dessincronizarem
# quando uma cor muda. Paleta trocada em relacao ao original (viridis) por
# tons teal/dourado/terracota
cor_nivel <- c("0" = "white", "1" = "#2a9d8f", "2" = "#e9c46a", "3" = "#e76f51")

# Esconde o primeiro nivel: a raiz recebe a mesma cor do fundo, entao ainda
# ocupa espaco mas fica invisivel (o layout nao tem opcao de omitir nivel).
# set.seed imediatamente antes do layout: o "circlepack" do ggraph e
# estocastico (duas chamadas seguidas, com os mesmos dados, produzem arranjos
# diferentes), entao sem semente o output.png muda a cada execucao
set.seed(2907)
p <- ggraph(mygraph, layout = "circlepack", weight = horas) +
  geom_node_circle(aes(fill = as.factor(depth), color = as.factor(depth))) +
  scale_fill_manual(values = cor_nivel) +
  scale_color_manual(values = c("0" = "white", "1" = "black", "2" = "black", "3" = "black")) +
  theme_void() +
  theme(legend.position = "none")

ggsave("output.png", plot = p, width = 7, height = 7, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: desenhada em D3 (d3.hierarchy + d3.pack), com clique pra
# dar zoom num galho -- a mesma navegacao que o circlepackeR dava, so que sem
# as duas limitacoes dele (gradiente continuo de 2 cores em vez de uma cor por
# nivel, folhas forcadas em branco pelo CSS do pacote) documentadas em
# AGENTS.md "Licoes aprendidas".
#
# O layout em si (posicao/raio de cada circulo) NAO vem daqui: o pack do
# ggraph e estocastico (duas chamadas com os mesmos dados dao arranjos
# diferentes, por isso o set.seed acima so vale pro output.png) e a regra do
# acervo pra grafico de rede/hierarquia e recalcular o layout no proprio D3
# (mesmo padrao do modulo compartilhado de rede), nao tentar replicar posicao
# a posicao. O que precisa vir do R e so a arvore (estrutura + valores) e a
# paleta por nivel, pra manter a MESMA regra de cor dos dois lados.
# ---------------------------------------------------------------------------
midias <- factor(dados$midia, levels = unique(dados$midia))

arvore_generos <- function(bloco_midia) {
  generos <- factor(bloco_midia$genero, levels = unique(bloco_midia$genero))
  unname(lapply(split(bloco_midia, generos), function(bloco_genero) {
    list(
      nome = as.character(bloco_genero$genero[1]),
      filhos = unname(lapply(seq_len(nrow(bloco_genero)), function(i) {
        list(nome = bloco_genero$titulo[i], valor = bloco_genero$horas[i])
      }))
    )
  }))
}

arvore <- list(
  nome = "Catalogo",
  filhos = unname(lapply(split(dados, midias), function(bloco_midia) {
    list(nome = as.character(bloco_midia$midia[1]), filhos = arvore_generos(bloco_midia))
  }))
)

viz <- list(
  meta = list(
    paleta = as.list(cor_nivel),
    nota = "Clique numa bolha pra ampliar; clique fora pra voltar."
  ),
  arvore = arvore
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
