# Libraries
library(wordcloud)
library(RColorBrewer)
library(jsonlite)

# Dados 100% ficticios: frequencia de palavras em avaliacoes de um app
# bancario ficticio (loja de apps), no lugar do texto de um discurso real
# (Obama) do exemplo original -- ver AGENTS.md "Decisoes fechadas". Palavras
# ja ordenadas da mais pra menos citada (refletindo o vocabulario tipico de
# avaliacao de app: termos genericos e reclamacoes/elogios curtos dominam,
# termos especificos de funcionalidade aparecem bem menos), com uma queda
# tipo Zipf (poucas palavras MUITO citadas, cauda longa de citadas poucas
# vezes) -- o padrao estatistico real de frequencia de palavras em texto
# livre, sem o qual uma nuvem de palavras fica com todo mundo do mesmo
# tamanho e perde o sentido.
set.seed(6289)

palavras <- c(
  "app", "rápido", "trava", "ótimo", "lento", "bug", "prático", "erro",
  "adorei", "travando", "interface", "recomendo", "suporte", "péssimo",
  "confiável", "demora", "simples", "instável", "fácil", "excelente",
  "senha", "login", "atualização", "eficiente", "confuso", "pix", "ruim",
  "cartão", "moderno", "saldo", "reclamação", "transferência", "elogio",
  "notificação", "problema", "biometria", "funcional", "falha", "fatura",
  "seguro", "limite", "cliente", "atendimento", "satisfeito", "versão", "tela"
)
sentimento <- c(
  app = "neutro", "rápido" = "positivo", trava = "negativo", "ótimo" = "positivo",
  lento = "negativo", bug = "negativo", "prático" = "positivo", erro = "negativo",
  adorei = "positivo", travando = "negativo", interface = "neutro", recomendo = "positivo",
  suporte = "neutro", "péssimo" = "negativo", "confiável" = "positivo", demora = "negativo",
  simples = "positivo", instável = "negativo", "fácil" = "positivo", excelente = "positivo",
  senha = "neutro", login = "neutro", "atualização" = "neutro", eficiente = "positivo",
  confuso = "negativo", pix = "neutro", ruim = "negativo", cartão = "neutro",
  moderno = "positivo", saldo = "neutro", "reclamação" = "negativo", transferência = "neutro",
  elogio = "positivo", "notificação" = "neutro", problema = "negativo", biometria = "neutro",
  funcional = "positivo", falha = "negativo", fatura = "neutro", seguro = "positivo",
  limite = "neutro", cliente = "neutro", atendimento = "neutro", satisfeito = "positivo",
  versão = "neutro", tela = "neutro"
)

n <- length(palavras)
rank <- seq_len(n)
freq <- round(340 / rank^0.72 + rnorm(n, sd = 3))
freq <- pmax(freq, 6)

dados <- data.frame(
  palavra = palavras,
  frequencia = freq,
  # unname() -- sem isso, o vetor nomeado sentimento[palavras] gruda os
  # proprios nomes como row.names do data.frame, e jsonlite exporta isso
  # como um campo extra "_row" indesejado em cada linha do JSON
  sentimento = unname(sentimento[palavras])
)

# Paleta trocada em relacao ao original (paleta padrao "Dark2"/preto do
# tutorial) -- sequencial, intensidade acompanhando a frequencia
paleta_nome <- "YlGnBu"
cores_freq <- rev(brewer.pal(8, paleta_nome))

set.seed(6289) # wordcloud() tem aleatoriedade propria no posicionamento;
# fixar de novo aqui garante um layout reproduzivel entre execucoes
png("output.png", width = 1000, height = 700, res = 130)
par(mar = c(0, 0, 0, 0), bg = "white")
wordcloud(
  words = dados$palavra, freq = dados$frequencia,
  min.freq = 1, max.words = n, random.order = FALSE, rot.per = 0.15,
  colors = cores_freq, scale = c(4.2, 0.7)
)
dev.off()

# ---------------------------------------------------------------------------
# Versao interativa: layout calculado do ZERO em D3 (pacote d3-cloud, o
# mesmo algoritmo de posicionamento em espiral com deteccao de colisao que a
# funcao wordcloud() do R usa por baixo) -- mesmo principio ja usado em
# gráficos de rede deste acervo, onde um layout caro/estocastico e
# recalculado no navegador em vez de exportado do R (nao ha coordenada
# "certa" unica; cada motor calcula a propria disposicao válida).
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(
    dominioFrequencia = c(min(dados$frequencia), max(dados$frequencia)),
    paletaSentimento = as.list(setNames(brewer.pal(3, "Dark2"), c("positivo", "negativo", "neutro"))),
    nota = "Passe o cursor numa palavra pra ver a frequência e o sentimento; clique num sentimento pra isolar o grupo."
  ),
  palavras = dados
)

jsonlite::write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
