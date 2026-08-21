---
title: "Bump chart: ranking mensal de audiência"
category: ranking
date: 2026-08-21
source: "https://r-graph-gallery.com/package/ggbump.html"
interactive: true
resumo: "A posição de 7 jogos no ranking mensal de audiência de uma plataforma de streaming fictícia, mês a mês, ao longo de um ano."
pacotes: ["ggplot2", "dplyr", "RColorBrewer", "jsonlite", "d3"]
dados: "1 variável categórica (o item) × 1 ordinal/temporal (o momento) × 1 posição de ranking derivada de uma métrica numérica"
nivel: intermediário
tags: ["interativo", "ranking ao longo do tempo", "linha"]
---

## O que é

Um bump chart (também chamado de gráfico de classificação) usa uma linha por
categoria para mostrar como a **posição dela num ranking** muda de um
momento pro outro — o eixo Y não é o valor bruto, é o LUGAR que aquele valor
ocupa naquele momento, de 1º a Nº. **Para que serve**: responder "quem estava
na frente, quem ultrapassou quem, e quando" — perguntas que um gráfico de
linha com o valor bruto no eixo Y não responde diretamente, porque a escala
de valor pode disfarçar uma troca de posição (ou mostrar uma "troca" que na
verdade é só ruído perto do topo).

## Quando usar (e quando evitar)

**Use quando** você tiver poucas categorias (até 8-10) competindo pelas
mesmas posições ao longo de várias medições — ranking de vendas por mês,
colocação de times num campeonato por rodada, top N de qualquer lista que se
atualiza periodicamente — e o interesse for a **disputa** entre elas, não só
a trajetória de valor de cada uma isoladamente.

**Evite quando** houver muitas categorias: acima de 10-12 linhas cruzando o
mesmo espaço o gráfico vira um emaranhado, e fica impossível seguir uma linha
específica com o olho — nesse caso um pequeno número de long chart(s)
(small multiples) ou uma tabela com setas de variação comunica melhor.
Evite também quando o valor absoluto importar mais do que a posição relativa
(a diferença entre o 1º e o 2º lugar pode ser mínima, ou enorme, e o bump
chart não distingue isso) — nesse caso um gráfico de linha comum, com o
valor no eixo Y, é mais honesto.

## Que dados você precisa

- **uma categoria** — o item que compete pelo ranking (aqui, um jogo).
- **um momento** — em que ponto da série aquela posição foi medida (aqui, um
  mês do ano), a mesma categoria aparecendo em todos os momentos.
- **uma métrica numérica** — usada só pra CALCULAR a posição (aqui, uma
  pontuação de popularidade); o gráfico não desenha essa métrica diretamente,
  só a ordem que ela produz a cada momento.

Formato esperado: uma linha por combinação categoria×momento, já com a
posição calculada (`rank()` da métrica dentro de cada momento) — sem
empates, ou o ranking fica ambíguo.

## Como ler o gráfico

- **Eixo X**: o momento (aqui, o mês).
- **Eixo Y**: a posição no ranking naquele momento — 1º no topo, o resto
  descendo. **Não é uma escala de valor.**
- **Linha**: a trajetória de posição de uma categoria ao longo do tempo. Uma
  linha subindo significa que ela ultrapassou concorrentes; descendo, que foi
  ultrapassada.
- **Cruzamento de linhas**: exatamente o momento em que duas categorias
  trocaram de posição entre si.

Na versão interativa, passar o cursor numa linha (ou num ponto dela) isola a
trajetória daquele item e mostra a pontuação exata por trás da posição em
cada mês.

## Como foi feito

A miniatura estática usa `ggplot2::geom_line()` + `geom_point()` comuns, com
`scale_y_reverse()` (pra 1º lugar ficar no topo, não embaixo) e os nomes dos
jogos escritos como texto nas duas pontas de cada linha em vez de uma
legenda separada — mais fácil de seguir qual linha é qual sem ficar
alternando o olhar entre o gráfico e uma legenda longe dele.

A versão interativa reencena a mesma ideia com D3: duas escalas lineares (mês
→ x, posição → y) e uma curva suave (`d3.curveMonotoneX`) por jogo, no lugar
de segmentos retos — deixa o cruzamento entre duas linhas mais fácil de ler
quando elas se aproximam bastante. O script.R só exporta a série longa (jogo,
mês, posição, pontuação) e a cor de cada jogo; a curva de cada linha e a
posição de cada ponto são recalculadas no D3 a partir das mesmas duas
escalas, o mesmo princípio já usado no resto do acervo.

Dados fictícios: 7 jogos de uma plataforma de streaming de gameplay
fictícia, com uma pontuação de popularidade mensal gerada por passeio
aleatório com deriva própria por jogo (`set.seed(3391)`) — não um ranking
sorteado do zero a cada mês, que ficaria com uma disputa sem nenhum "sentido"
por trás. Um dos jogos ("Vale Sombrio") foge do passeio aleatório de
propósito: começa em último, é lançado no meio do ano e dispara pro topo em
poucos meses, o tipo de virada que um bump chart existe pra tornar óbvia à
primeira vista.

## Possíveis problemas pelo caminho

- **Problema**: duas categorias empatadas na métrica bruta viram uma posição
  ambígua (as duas "1º lugar"). **Por quê**: `rank()` sem um critério de
  desempate definido pode devolver posições fracionárias (`1.5`) ou deixar a
  ordem ao sabor da ordem original dos dados. **Solução**: usar
  `rank(..., ties.method = "first")` (ou qualquer critério de desempate
  explícito) — aqui a pontuação já nasce como número decimal (passeio
  aleatório contínuo), então empate exato é praticamente impossível, mas o
  parâmetro fica ali como proteção.

- **Problema**: com muitas categorias, os nomes escritos nas pontas das
  linhas se sobrepõem verticalmente quando duas terminam em posições
  próximas. **Por quê**: cada rótulo é centralizado exatamente na posição Y
  da linha, sem nenhum ajuste de colisão. **Solução**: não ocorre com 7
  categorias (o espaçamento vertical entre posições dá folga suficiente),
  mas um ranking com 15+ itens precisaria de um algoritmo de
  "label placement" que empurra rótulos vizinhos pra não colidir.

## Variações possíveis

- Usar curvas em S de verdade entre cada par de pontos (técnica do pacote
  `ggbump`) em vez da curva suave contínua usada aqui — visualmente mais
  "arredondada" nas transições, ao custo de exigir uma dependência extra.
- Colorir por FAIXA de posição (ex: sempre destacar o top 3 e apagar o
  resto) em vez de uma cor fixa por categoria, quando o interesse for só
  "quem está na liderança agora", não a identidade de cada concorrente.
- Trocar o eixo X de meses por qualquer outra sequência ordenada — rodadas
  de campeonato, versões de produto, trimestres fiscais — a técnica não
  muda, só o rótulo do eixo.
- Adicionar uma faixa de "zona de risco" (ex: sombreado nas últimas posições)
  quando o ranking tiver um corte que importa — os últimos colocados que
  saem de uma lista, times rebaixados, etc.
