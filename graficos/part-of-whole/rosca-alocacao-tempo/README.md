---
title: "Rosca de alocação de tempo (ggplot2 + plotly)"
category: part-of-whole
date: 2026-07-27
source: "https://r-graph-gallery.com/doughnut-plot.html"
interactive: true
resumo: "Um anel dividido em fatias proporcionais ao todo, com um vazio no centro no lugar do miolo de uma pizza."
pacotes: ["ggplot2", "plotly"]
dados: "1 variável categórica + 1 variável numérica (uma fatia por categoria)"
nivel: básico
tags: ["interativo", "parte-do-todo", "proporção"]
---

## O que é

Uma rosca (donut) é uma pizza com um buraco no meio: cada fatia representa a
proporção de uma categoria dentro de um total, mas o centro vazio libera espaço
para um rótulo, um total geral, ou simplesmente deixa o gráfico com menos peso
visual do que uma pizza cheia.

**Para que serve**: mostrar como um todo se divide em poucas partes, quando a
soma de 100% é o próprio ponto da mensagem — orçamento, composição, participação.

## Quando usar (e quando evitar)

**Use quando** houver poucas categorias (até 5–6) e a mensagem for literalmente
"isto é uma parte de um todo" — não uma comparação de magnitudes entre itens sem
relação de soma.

**Evite quando** houver mais de 6 fatias: elas ficam finas demais para comparar, e
os rótulos começam a se sobrepor. Evite também quando os valores forem próximos
entre si — o olho humano compara mal ângulos e áreas curvas, e duas fatias de
32% e 35% parecem praticamente iguais mesmo não sendo.

Esse é o motivo de rosca e pizza serem tão criticados em visualização de dados:
na grande maioria dos casos, um **gráfico de barras** (ou um lollipop, para poucas
categorias) comunica os mesmos valores com muito mais precisão de leitura. Use
rosca quando a "totalidade" for parte da mensagem e as categorias forem poucas e
bem distintas em tamanho — como neste exemplo, em que a soma das fatias é
literalmente as 24 horas de um dia.

## Que dados você precisa

- **Uma variável categórica** — o nome de cada fatia.
- **Uma variável numérica** — o valor de cada categoria.

Os valores não precisam somar 100 nem qualquer total redondo — o gráfico
normaliza tudo para proporção automaticamente. Aqui, como o tema é "um dia",
os valores somam 24 (horas) por coincidência temática, não por exigência técnica.

## Como ler o gráfico

- **Ângulo/comprimento do arco de cada fatia**: a proporção daquela categoria no
  total.
- **Cor**: a categoria, repetida na legenda.
- **Buraco no centro**: sem significado — é só espaço negativo, diferença estética
  em relação a uma pizza cheia.

Fatias vizinhas com tamanho parecido são as mais difíceis de comparar só de
olho — é aí que passar o mouse (na versão interativa) ajuda, mostrando o
percentual exato.

## Como foi feito

Não existe um `geom_donut()` pronto no `ggplot2`: a técnica clássica é construir
uma barra empilhada (`geom_rect()`, com os limites `ymin`/`ymax` calculados a
partir da soma acumulada das proporções) e depois enrolar essa barra em círculo
com `coord_polar(theta = "y")`. O buraco no centro vem de `xlim(c(2, 4))` — o
gráfico só é desenhado a partir do raio 3 (em vez de 0), abrindo o vazio; mudar
esse intervalo controla a espessura do anel.

A versão interativa **não** usa `ggplotly()` sobre esse mesmo objeto: converter
gráficos com `coord_polar()` é uma limitação conhecida do `plotly` (o resultado
sai incorreto ou distorcido). Em vez disso, o widget é construído direto com a
função nativa de pizza do `plotly` (`type = "pie"`), que aceita um parâmetro
`hole` para abrir o buraco central — mesmos dados, técnica diferente, exatamente
como esse acervo já lida com outros casos sem conversão direta entre pacotes.

Dados fictícios: 5 categorias de uso do tempo num dia (Trabalho, Sono, Lazer,
Estudo, Outros), com horas inventadas somando 24.

## Possíveis problemas pelo caminho

- **Problema**: os rótulos de fatias pequenas se sobrepõem ou saem cortados.
  **Por quê**: o espaço ao longo do arco encolhe junto com o valor da fatia.
  **Solução**: mover rótulos de fatias pequenas para fora do anel com uma linha
  guia (`geom_label_repel` ou similar), ou omitir o rótulo e confiar na legenda.

- **Problema**: `ggplotly()` aplicado a este gráfico produz um resultado errado.
  **Por quê**: `coord_polar()` não é bem suportado na conversão do `plotly` para
  `ggplot2`. **Solução**: construir a versão interativa direto com
  `plot_ly(type = "pie", hole = ...)`, sem tentar converter o objeto `ggplot`.

- **Problema**: o buraco central fica grande ou pequeno demais. **Por quê**: o
  primeiro valor de `xlim()` (estático) ou `hole` (interativo) define a
  proporção do vazio. **Solução**: ajustar esse valor — mais perto de `xlim(c(0,4))`
  ou `hole=0` vira pizza cheia; valores maiores abrem mais o buraco.

- **Problema**: duas fatias de tamanho parecido parecem idênticas. **Por quê**: é
  uma limitação perceptual real de gráficos circulares, não um bug. **Solução**:
  ordenar as fatias por tamanho, ou trocar por um gráfico de barras quando a
  comparação precisa ser exata.

## Variações possíveis

- Aumentar `xlim` inferior (ex: `xlim(c(0, 4))`) pra virar uma pizza cheia sem
  buraco, quando quiser comparar com a versão tradicional.
- Ordenar as categorias por valor antes de plotar, o que facilita comparar
  fatias vizinhas.
- Colocar um número ou texto central (ex: o total), aproveitando o espaço vazio
  que a rosca libera e a pizza não tem.
- Trocar por um gráfico de barras horizontais — mesma informação, leitura mais
  precisa, especialmente com mais de 4-5 categorias.
