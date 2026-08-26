---
title: "Pizza clássica: matriz de geração elétrica"
category: part-of-whole
date: 2026-08-21
source: "https://r-graph-gallery.com/piechart-ggplot2.html"
interactive: true
resumo: "A fatia de cada fonte de energia na geração elétrica anual de um país fictício, em um círculo só."
pacotes: ["ggplot2", "RColorBrewer"]
dados: "1 variável categórica + 1 numérica (proporção de um total)"
nivel: básico
tags: ["composição", "clássico"]
---

## O que é

Uma pizza (pie chart) divide um círculo em fatias, uma por categoria, com o
ângulo de cada fatia proporcional à sua participação num total. **Para que
serve**: responder "que fração do todo cada categoria representa" quando o
número de categorias é pequeno — é o gráfico mais reconhecível que existe
pra essa pergunta, mesmo sendo também um dos mais criticados (ver seção
seguinte).

## Quando usar (e quando evitar)

**Use quando** há poucas categorias (até 5–6), uma ou duas fatias dominam
claramente o total, e o ponto é comunicar "isso aqui é a maior parte do
todo" pra um público que já reconhece o formato de longe.

**Evite quando** há mais de 6–7 categorias (as fatias pequenas viram uma
faixa fina ilegível), as fatias têm tamanhos parecidos (o olho humano
compara ângulo pior do que compara comprimento de barra), ou quando o
objetivo é comparar valores com precisão — nesses casos um barplot
ordenado ou um treemap comunicam a mesma composição com muito menos erro
de leitura.

## Que dados você precisa

- **categoria** — o nome de cada fatia (variável categórica, poucos níveis)
- **valor** — o tamanho de cada fatia (variável numérica, sempre ≥ 0)

Formato esperado: uma linha por categoria já agregada (não é preciso somar
nada antes — o próprio código calcula a fração de cada fatia sobre o total).

## Como ler o gráfico

- **Ângulo/área da fatia**: participação daquela categoria no total —
  quanto maior o arco, maior a fração.
- **Cor**: identifica a categoria (mesma cor na legenda e na fatia).
- **Rótulo dentro da fatia**: percentual arredondado; a versão interativa
  mostra o valor exato (e a unidade) ao passar o cursor.

## Como foi feito

Técnica clássica em `ggplot2`: não existe um `geom_pie()` pronto no pacote,
então o truque padrão é desenhar uma única barra empilhada
(`geom_bar(stat = "identity", width = 1)`, uma categoria por segmento da
pilha) e depois dobrar essa barra num círculo com `coord_polar(theta = "y")`
— o ângulo de cada segmento empilhado vira o ângulo da fatia correspondente.
`RColorBrewer::brewer.pal(6, "Set2")` dá uma cor distinta por fonte de
energia.

Dados fictícios: geração elétrica anual (GWh) de um país fictício,
distribuída entre 6 fontes de energia (`set.seed(4519)`) com pesos pensados
de propósito pra ter uma fatia claramente dominante (hidrelétrica, 38%) e
uma claramente residual (carvão, 4%) — o caso em que a pizza costuma
comunicar bem, ao contrário de fatias todas parecidas entre si.

A versão interativa é desenhada em D3 (`d3.pie()` + `d3.arc()`, raio interno
zero) em vez de importar a geometria pronta do R — mesmo padrão já usado na
rosca de alocação de tempo deste acervo, só sem o buraco central. Passar o
cursor numa fatia mostra o valor exato e o percentual no tooltip, e a fatia
sob o cursor "salta" um pouco pra fora do círculo; clicar fixa esse destaque.

## Possíveis problemas pelo caminho

- **Problema**: o rótulo de percentual fica ilegível ou sai cortado numa
  fatia fina. **Por quê**: não há espaço suficiente dentro do arco pra caber
  o texto. **Solução**: esconder o rótulo abaixo de um ângulo mínimo (fatias
  pequenas dependem só da legenda/tooltip) em vez de forçar o texto a
  caber.
- **Problema**: cores parecidas demais entre fatias vizinhas dificultam
  identificar o limite entre uma fatia e outra. **Por quê**: uma paleta
  sequencial (tons de uma cor só) não cria contraste suficiente entre
  categorias. **Solução**: usar sempre uma paleta **qualitativa** (`Set2`,
  `Dark2`, `Paired`...) pra dado categórico, nunca sequencial/divergente.

## Variações possíveis

- Ordenar as fatias por tamanho (maior primeiro, no sentido horário a
  partir do topo) em vez da ordem alfabética/de entrada dos dados.
- Trocar o raio interno de zero por um valor positivo, transformando a
  pizza numa rosca — ver a [rosca de alocação de
  tempo](../rosca-alocacao-tempo) deste acervo, que usa exatamente essa
  variação com um tema diferente (horas de um dia, não fontes de energia).
  Comparar as duas lado a lado ajuda a decidir qual formato comunica melhor
  pro seu caso.
- "Explodir" a fatia mais importante (afastá-la um pouco do centro de forma
  permanente, não só no hover) pra chamar atenção pra ela sem precisar de
  interação nenhuma.
- Small multiples: várias pizzas pequenas lado a lado (uma por ano/região)
  em vez de uma única pizza — funciona melhor que empilhar todas as
  categorias e anos num só círculo quando o objetivo é comparar a
  composição ao longo do tempo.
