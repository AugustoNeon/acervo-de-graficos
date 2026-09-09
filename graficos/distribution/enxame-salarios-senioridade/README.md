---
title: "Enxame: distribuição de salário por senioridade"
category: distribution
date: 2026-09-09
source: "https://r-graph-gallery.com/303-beeswarm-plot-with-ggbeeswarm.html"
interactive: true
resumo: "O salário de 164 profissionais fictícios, um ponto por pessoa, espalhados horizontalmente dentro de cada nível de senioridade pra caber sem se sobrepor."
veredito_uso: "a amostra é pequena o bastante (até algumas centenas de pontos) pra que ver cada indivíduo, não só um resumo estatístico, ainda seja útil."
veredito_evita: "a amostra tem milhares de pontos — o enxame vira uma mancha sólida, e um violino ou uma densidade comprimem melhor a mesma informação."
pacotes: ["ggplot2", "ggbeeswarm", "dplyr"]
dados: "1 variável categórica (o grupo) + 1 numérica (o valor de cada indivíduo do grupo)"
nivel: intermediário
tags: ["enxame", "pontos individuais", "distribuição"]
---

## O que é

Um gráfico de enxame (*beeswarm*) desenha **cada observação como um ponto
individual**, deslocado horizontalmente só o suficiente para não colidir com
o vizinho mais próximo — ao contrário do jitter comum, que espalha os pontos
aleatoriamente, o enxame calcula o deslocamento mínimo necessário para caber.
**Para que serve**: mostrar a forma completa de uma distribuição — onde os
pontos se aglomeram, onde ficam esparsos, quantos existem no total — sem
resumir nada a uma estatística.

## Quando usar (e quando evitar)

**Use quando** o tamanho da amostra for pequeno o bastante para que contar
pontos individualmente ainda faça sentido (de algumas dezenas a poucas
centenas por grupo) e quando **outliers e sobreposição entre grupos**
importarem tanto quanto a tendência central — um enxame mostra os dois de
graça, coisas que um boxplot resume até desaparecer.

**Evite quando** a amostra tiver milhares de pontos por grupo: o
empacotamento não tem mais espaço para separar tudo, os pontos se comprimem
numa mancha sólida e a forma da distribuição fica menos legível do que num
[violino](../violino-e-boxplot) ou numa curva de densidade. Evite também
quando o que importa é só comparar médias entre muitos grupos — nesse caso
um gráfico de barras com erro é mais direto.

## Como ler o gráfico

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#D8C2E8"></span> Estagiário</div>
  <div><span class="swatch" style="background:#8F68B5"></span> Pleno</div>
  <div><span class="swatch" style="background:#472C6B"></span> Especialista</div>
</div>

- **Posição vertical de cada ponto**: o salário daquela pessoa — a única
  coordenada com significado numérico neste gráfico.
- **Posição horizontal**: não tem significado próprio — existe só para
  separar pontos que, de outra forma, cairiam um em cima do outro na mesma
  altura. Duas pessoas lado a lado não são "parecidas" por estarem próximas
  no eixo X.
- **Densidade horizontal (largura da nuvem numa altura)**: quantas pessoas
  ganham perto daquele valor — quanto mais larga a nuvem numa altura, mais
  concentração de gente ali.
- **Traço cinza**: a mediana de cada nível.

<div class="pull-quote">duas pessoas lado a lado não são "parecidas" por estarem próximas no eixo X</div>

## Como foi feito

**Camada**: `ggbeeswarm::geom_beeswarm()`, uma extensão do `ggplot2` que
substitui a posição X aleatória de um `geom_jitter()` por uma calculada —
o método padrão (`"swarm"`) processa os pontos em ordem de valor e desloca
cada um lateralmente até encontrar a posição livre mais próxima do centro.
Uma segunda camada, `geom_crossbar()` sobre a mediana pré-calculada de cada
grupo, desenha o traço de referência.

**Dado fictício**: salário mensal de profissionais fictícios em cinco níveis
de senioridade, cada nível com sua própria distribuição normal (`rnorm`) —
as faixas se sobrepõem de propósito entre níveis vizinhos (um estagiário de
destaque pode ganhar quase o mesmo que um júnior iniciante), porque um
enxame sem nenhuma sobreposição só confirmaria o óbvio.

**Na versão interativa**: como não existe equivalente de `geom_beeswarm()`
em D3, o algoritmo de empacotamento foi reimplementado à mão — os pontos de
cada nível são ordenados por salário e cada um tenta deslocamentos
alternados (centro, direita, esquerda, direita mais longe...) até achar o
primeiro que não colide (por distância euclidiana) com nenhum ponto já
posicionado nas proximidades verticais. A geometria nunca é exportada
pronta do R: o `data.json` carrega só nível e salário por pessoa, e o D3
roda o próprio empacotamento sobre a largura de tela real disponível.

## Possíveis problemas pelo caminho

- **Problema**: pontos de uma mesma altura ficam empilhados numa coluna
  reta em vez de se espalharem em nuvem. **Por quê**: o algoritmo de
  empacotamento processando os pontos em ordem aleatória (ou na ordem
  original dos dados) em vez de ordenados pelo próprio valor — sem essa
  ordenação, um ponto pode "reservar" uma posição central antes de pontos
  mais extremos existirem, e o enxame cresce torto. **Solução**: sempre
  ordenar por valor antes de calcular os deslocamentos, do menor ao maior.

## Variações possíveis

- Colorir por uma segunda variável categórica (por exemplo, área da
  empresa) em vez de pelo próprio nível, quando o que importa for comparar
  subgrupos dentro de cada categoria.
- Sobrepor um violino translúcido atrás do enxame — uma leitura híbrida,
  forma agregada e pontos individuais na mesma imagem, útil quando a
  amostra está no limiar entre "cabe todo mundo separado" e "vira mancha".
- Reduzir o raio do ponto (ou aumentar a largura disponível por categoria)
  quando a amostra crescer — o enxame se degrada aos poucos, não de uma vez,
  então ajustar esses dois parâmetros estica o intervalo em que ele
  continua legível.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../violino-e-boxplot" style="--cat-link: var(--cat-distribution); --cat-link-ink: var(--cat-distribution-ink);">
    <span class="parecido-cat">distribution</span>
    <span class="parecido-titulo">Violino e boxplot: velocidade por provedor</span>
    <span class="parecido-razao">Mesma pergunta, forma comprimida: quando a amostra cresce demais para mostrar cada ponto, o violino resume a mesma distribuição sem contar indivíduos.</span>
  </a>
  <a class="parecido-item" href="../../timeline/linha-do-tempo-densa-releases" style="--cat-link: var(--cat-timeline); --cat-link-ink: var(--cat-timeline-ink);">
    <span class="parecido-cat">timeline</span>
    <span class="parecido-titulo">Linha do tempo densa: releases de um software</span>
    <span class="parecido-razao">Mesma técnica de empacotamento sem sobreposição, aplicada a um eixo de tempo em vez de um eixo categórico.</span>
  </a>
</div>
