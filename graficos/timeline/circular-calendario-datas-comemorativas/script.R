# Libraries
library(ggplot2)
library(jsonlite)

# Sessao roda em locale C puro (ASCII) neste ambiente -- sem isso, toda
# string acentuada sai corrompida byte a byte no data.json e no proprio PNG.
# "C.utf8" existe no sistema (locale -a). Ver AGENTS.md, "Licoes aprendidas".
invisible(Sys.setlocale("LC_CTYPE", "C.utf8"))

# Linha do tempo CIRCULAR: quarta entrada da categoria timeline, geometria
# diferente das outras tres (eixo linear -- marcos, Gantt, enxame). Um ano
# de calendario e' ciclico de verdade (31 de dezembro emenda em 1o de
# janeiro), e um eixo linear esconde essa continuidade cortando o ano em
# algum ponto arbitrario -- o circulo mostra isso de graca, sem precisar
# de nenhum truque.
#
# Datas reais de feriados/datas comemorativas brasileiras (nao ficticias --
# sao fatos de calendario, nao estatisticas inventadas; a Sexta-feira Santa
# e o Carnaval usam as datas de um ano especifico, ja que sao moveis).
eventos <- data.frame(
  evento = c(
    "Confraternização Universal", "Carnaval", "Dia Internacional da Mulher",
    "Sexta-feira Santa", "Tiradentes", "Dia do Trabalho",
    "Dia das Mães", "Dia dos Namorados", "Festa de São João",
    "Dia dos Pais", "Independência do Brasil",
    "Dia das Crianças / N. Sra. Aparecida", "Dia de Finados",
    "Proclamação da República", "Consciência Negra", "Black Friday",
    "Natal", "Véspera de Ano Novo"
  ),
  data = as.Date(c(
    "2025-01-01", "2025-03-04", "2025-03-08",
    "2025-04-18", "2025-04-21", "2025-05-01",
    "2025-05-12", "2025-06-12", "2025-06-24",
    "2025-08-11", "2025-09-07",
    "2025-10-12", "2025-11-02",
    "2025-11-15", "2025-11-20", "2025-11-29",
    "2025-12-25", "2025-12-31"
  )),
  categoria = c(
    "Nacional", "Cultural", "Internacional",
    "Religioso", "Nacional", "Nacional",
    "Comercial", "Comercial", "Cultural",
    "Comercial", "Nacional",
    "Cultural", "Religioso",
    "Nacional", "Nacional", "Comercial",
    "Religioso", "Cultural"
  )
)

cor_categoria <- c(
  "Nacional"      = "#2B5B7A",
  "Religioso"     = "#8B5FA8",
  "Comercial"     = "#C9A24B",
  "Cultural"      = "#4A9A6A",
  "Internacional" = "#B34747"
)
eventos$categoria <- factor(eventos$categoria, levels = names(cor_categoria))

# Dia do ano real de cada evento -- usado pra posicionar o PONTO (sempre
# na data verdadeira) e como base do dia usado pro RÓTULO (que pode ser
# afastado, ver abaixo).
eventos$dia_do_ano <- as.numeric(format(eventos$data, "%j"))

# Colisao de rotulo: tentativa inicial foi abrir espaço empurrando o
# rótulo pra um raio maior (mais longe do centro) quando dois eventos
# calem perto no calendário. Não funcionou -- nesse gráfico o texto sai
# rotacionado pra ficar alinhado com o próprio raio (tipo raio de roda),
# em QUALQUER ponto do círculo, então "afastar pelo raio" empurra o
# rótulo bem na direção em que ele já se estende sozinho: o comprimento
# do PRÓPRIO nome compete direto com a distância aberta, e nomes como
# "Confraternização Universal" (27 letras) precisam de um raio bem maior
# que o resto do gráfico só pra não encostar no vizinho -- o gráfico
# inteiro teria que inchar (raio 10+) pra sobrar espaço pros piores casos,
# a maioria das camadas ficando vazia à toa.
#
# Solução: espalhar os rótulos colidentes na direção ANGULAR (dia do ano
# do TEXTO, não da posição real do ponto) em vez do raio -- o comprimento
# do nome não compete com essa direção. O ponto (a marcação exata da
# data) nunca se move; só o texto, ligado ao ponto por uma linha-guia.
idx_ordenado <- order(eventos$dia_do_ano)
n <- nrow(eventos)
MIN_SEPARACAO_DIAS <- 11
dia_ord <- eventos$dia_do_ano[idx_ordenado]

# Mesmo truque de corte do maior vão vazio já usado antes: sem ele, o
# primeiro evento do ano (Confraternização, 1o de janeiro) dependeria da
# posição do ÚLTIMO evento (Véspera, 31 de dezembro) que na mesma
# passada ainda não foi calculado -- um vão de circular-dependência que
# só existe porque o calendário é ciclico (31/dez emenda em 1/jan).
gaps <- c(dia_ord[1] + 365 - dia_ord[n], diff(dia_ord))
corte <- which.max(gaps)
ordem_corte <- ((seq_len(n) - 1 + corte - 1) %% n) + 1
idx_ordenado <- idx_ordenado[ordem_corte]
dia_ord <- dia_ord[ordem_corte]

# +365 pra manter a sequencia CONTINUAMENTE crescente depois do corte
# (senao o unico ponto onde ela ainda "desce" -- a virada real do
# calendario, ex. Vespera=365 pro Confraternizacao=1 -- faz a cascata
# achar uma distancia negativa e empurrar errado, o mesmo tipo de
# armadilha do wraparound corrigida antes pra camada). Devolvido pra
# faixa 1-365 (com "%% 365", ajustado pra nao virar 0) só depois da
# cascata, na hora de usar como coordenada.
dia_ord_continuo <- dia_ord
if (n > 1) {
  quebra <- which(diff(dia_ord) < 0)
  if (length(quebra) > 0) dia_ord_continuo[(quebra[1] + 1):n] <- dia_ord[(quebra[1] + 1):n] + 365
}

dia_texto_ord <- numeric(n)
dia_texto_ord[1] <- dia_ord_continuo[1]
for (i in 2:n) {
  dia_texto_ord[i] <- if (dia_ord_continuo[i] - dia_texto_ord[i - 1] < MIN_SEPARACAO_DIAS) {
    dia_texto_ord[i - 1] + MIN_SEPARACAO_DIAS
  } else {
    dia_ord_continuo[i]
  }
}
dia_texto_ord <- ((dia_texto_ord - 1) %% 365) + 1
eventos$dia_texto <- NA_real_
eventos$dia_texto[idx_ordenado] <- dia_texto_ord
eventos$empurrado <- abs(eventos$dia_texto - eventos$dia_do_ano) > 0.01

# Raio: o PONTO fica sempre no mesmo anel (1, a data real). O RÓTULO fica
# num raio um pouco maior (1.3) só quando foi afastado angularmente --
# suficiente pra abrir espaço pra linha-guia entre ponto e texto; nomes
# que não colidem com ninguém ficam bem coladinhos no próprio ponto (1.1).
eventos$raio_ponto <- 1
eventos$raio_texto <- ifelse(eventos$empurrado, 1.3, 1.1)

# Angulo do ROTULO (nao do ponto): 0 grau no topo (1o de janeiro), sentido
# HORARIO -- mesma convencao de um relogio/calendario de parede. Usa
# dia_texto (a posição já afastada), não dia_do_ano, pra girar o texto
# alinhado com onde ele realmente vai aparecer. Normalizado pra [-180,180)
# antes de decidir se o rótulo precisa girar 180 graus (senão sai de
# cabeça pra baixo na metade esquerda do círculo) -- sem essa normalização
# o ângulo bruto passa de -180 pra valores bem mais negativos perto do
# fim do ano e a comparação "< -90" para de fazer sentido.
bruto <- 90 - (eventos$dia_texto / 365) * 360
eventos$angulo_norm  <- ((bruto + 180) %% 360) - 180
eventos$angulo_texto <- ifelse(abs(eventos$angulo_norm) > 90, eventos$angulo_norm + 180, eventos$angulo_norm)
eventos$ancora       <- ifelse(abs(eventos$angulo_norm) > 90, "right", "left")

# Raios de referencia (arbitrarios, so pra desenhar): 1 = anel unico de
# todos os pontos, spoke de mes vai de 0 a 1.8, rotulo do mes fica em 2.0.

# Abreviacao de mes escrita a mao, indexada por numero -- "month.abb" do R
# base e' sempre em ingles (constante fixa, nao depende de locale nenhum),
# e format(..., "%b") dependeria do locale de TEMPO (LC_TIME), que e' um
# problema DIFERENTE do de caractere (LC_CTYPE) ja corrigido acima -- ver
# AGENTS.md "Licoes aprendidas", 2026-08-28.
abrev_mes_pt <- c("Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez")
meses <- data.frame(
  mes = factor(abrev_mes_pt, levels = abrev_mes_pt),
  dia_do_ano = as.numeric(format(as.Date(paste0("2025-", 1:12, "-01")), "%j"))
)

p <- ggplot(eventos) +
  geom_segment(
    data = meses, aes(x = dia_do_ano, xend = dia_do_ano, y = 0, yend = 1.8),
    colour = "grey85", linewidth = 0.4, inherit.aes = FALSE
  ) +
  geom_text(
    data = meses, aes(x = dia_do_ano, y = 2.0, label = mes),
    colour = "grey45", size = 3.2, fontface = "bold", inherit.aes = FALSE
  ) +
  # linha-guia: só aparece quando o rótulo foi empurrado pra outro dia
  # (senão o próprio ponto já está na ponta da linha, uma guia de
  # comprimento zero não faz diferença nenhuma).
  geom_segment(
    data = subset(eventos, empurrado),
    aes(x = dia_do_ano, xend = dia_texto, y = raio_ponto, yend = raio_texto - 0.08, colour = categoria),
    linewidth = 0.4, alpha = 0.5
  ) +
  geom_point(aes(x = dia_do_ano, y = raio_ponto, colour = categoria), size = 3) +
  geom_text(
    aes(x = dia_texto, y = raio_texto, label = evento, colour = categoria, angle = angulo_texto, hjust = ancora),
    size = 3, fontface = "bold"
  ) +
  scale_colour_manual(values = cor_categoria, name = NULL) +
  scale_x_continuous(limits = c(0, 365)) +
  ylim(0, 3.4) +
  coord_polar(theta = "x", start = 0) +
  labs(title = "Calendário de datas comemorativas do Brasil") +
  theme_void(base_size = 11) +
  theme(
    plot.title = element_text(face = "bold", hjust = 0.5, size = 15, margin = margin(b = 6)),
    legend.position = "bottom"
  )

ggsave("output.png", plot = p, width = 10, height = 10, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: o D3 recebe so dia_do_ano/categoria (nao angulo
# pronto) e recalcula a mesma trigonometria -- mesmo principio ja usado no
# grafico ternario desta categoria, aplicado aqui a angulo em vez de
# coordenada cartesiana.
# ---------------------------------------------------------------------------
viz <- list(
  meta = list(cores = as.list(cor_categoria)),
  eventos = lapply(seq_len(nrow(eventos)), function(i) {
    list(
      evento = eventos$evento[i],
      data = format(eventos$data[i], "%Y-%m-%d"),
      diaDoAno = eventos$dia_do_ano[i],
      categoria = as.character(eventos$categoria[i])
    )
  })
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
