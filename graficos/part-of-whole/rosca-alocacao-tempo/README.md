---
title: "Rosca de alocação de tempo"
category: part-of-whole
date: 2026-07-27
source: "https://r-graph-gallery.com/doughnut-plot.html"
interactive: true
resumo: "Um anel dividido em fatias proporcionais ao todo, com um vazio no centro no lugar do miolo de uma pizza."
veredito_uso: "a totalidade é parte da mensagem (a soma é literalmente 100%, ou 24 horas, ou um orçamento inteiro) e há poucas categorias bem distintas em tamanho."
veredito_evita: "há mais de 6 fatias, ou os valores são próximos entre si — o olho compara mal ângulos e áreas curvas parecidas."
pacotes: ["ggplot2", "jsonlite", "d3"]
dados: "1 variável categórica + 1 variável numérica (uma fatia por categoria)"
nivel: básico
tags: ["parte-do-todo", "proporção"]
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
percentual exato. Vale repetir a regra de leitura: o buraco no centro: sem
significado — é só espaço negativo.

<div class="pull-quote pull-quote-direita clearfix">o buraco no centro: sem significado — é só espaço negativo</div>

## Como foi feito

Não existe um `geom_donut()` pronto no `ggplot2`: a técnica clássica é construir
uma barra empilhada (`geom_rect()`, com os limites `ymin`/`ymax` calculados a
partir da soma acumulada das proporções) e depois enrolar essa barra em círculo
com `coord_polar(theta = "y")`. O buraco no centro vem de `xlim(c(2, 4))` — o
gráfico só é desenhado a partir do raio 3 (em vez de 0), abrindo o vazio; mudar
esse intervalo controla a espessura do anel.

A versão interativa é desenhada em D3 (`d3.pie()`+`d3.arc()`), com `innerRadius`
fazendo o mesmo papel do `xlim()` do estático — controla a espessura do anel.
Isso evita de vez um problema de conversão que este gráfico já teve — ver
"Notas do coletor". Por cima disso, a fatia sob o cursor salta um pouco pra
fora do anel e o tooltip mostra o percentual exato — o rótulo dentro da fatia
só aparece quando ela é larga o bastante pra não ficar espremido, ver
"Possíveis problemas" abaixo.

Dados fictícios: 5 categorias de uso do tempo num dia (Trabalho, Sono, Lazer,
Estudo, Outros), com horas inventadas somando 24.

## Possíveis problemas pelo caminho

- **Problema**: os rótulos de fatias pequenas se sobrepõem ou saem cortados.
  **Por quê**: o espaço ao longo do arco encolhe junto com o valor da fatia.
  **Solução**: mover rótulos de fatias pequenas para fora do anel com uma linha
  guia (`geom_label_repel` ou similar), ou omitir o rótulo e confiar na legenda.

- **Problema**: o buraco central fica grande ou pequeno demais. **Por quê**: o
  primeiro valor de `xlim()` (estático) ou a razão `innerRadius`/`outerRadius`
  (interativo, no `d3.arc()`) define a proporção do vazio. **Solução**: ajustar
  esse valor — mais perto de `xlim(c(0,4))` ou `innerRadius` próximo de zero
  vira pizza cheia; valores maiores abrem mais o buraco.

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

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../pizza-matriz-energetica" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Pizza clássica: matriz de geração elétrica</span>
    <span class="parecido-razao">A mesma técnica sem o buraco no centro — comparar as duas ajuda a decidir se o vazio no meio vale a pena.</span>
  </a>
  <a class="parecido-item" href="../../ranking/lollipop-streaming" style="--cat-link: var(--cat-ranking); --cat-link-ink: var(--cat-ranking-ink);">
    <span class="parecido-cat">ranking</span>
    <span class="parecido-titulo">Lollipop de horas assistidas por plataforma</span>
    <span class="parecido-razao">O substituto de mais precisão quando poucas categorias forem próximas demais em valor pra uma rosca comunicar bem.</span>
  </a>
</div>

## Notas do coletor

A versão interativa deste gráfico nem sempre foi feita em D3 puro. Numa
implementação anterior, a tentativa natural era reaproveitar o próprio
objeto `ggplot` e convertê-lo direto pra interativo com `ggplotly()` —
economizando desenhar tudo de novo numa segunda linguagem. O problema:
`ggplotly()` não lida bem com `coord_polar()`, o truque que dobra a barra
empilhada num círculo. A conversão automática simplesmente não sabe
traduzir esse sistema de coordenadas pro formato que o `plotly` entende, e
o resultado saía distorcido ou quebrado.

A saída, na época, foi abandonar a conversão automática pra esse gráfico
específico e construir a rosca com a função nativa de pizza do `plotly`
(`plot_ly(..., type = "pie", hole = ...)`) em vez de reaproveitar o objeto
`ggplot` — uma segunda implementação, mas pelo menos dentro do mesmo
pacote. Esse problema de conversão nem chega a existir mais na versão
atual: com o D3 desenhando a rosca do zero a partir dos mesmos dados
(`d3.pie()` + `d3.arc()`), não há nenhum objeto `ggplot` pra tentar
converter — o R só exporta os números, e o desenho inteiro nasce no
navegador. A migração pra D3 em todo o acervo não foi só uma escolha de
estilo visual; em pelo menos este gráfico, ela eliminou uma classe inteira
de bug de conversão que simplesmente não tem como acontecer quando não
existe conversão nenhuma.
