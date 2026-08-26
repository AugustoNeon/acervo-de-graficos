---
title: "Dispersão conectada: preço x assinantes"
category: evolution
date: 2026-08-25
source: "https://r-graph-gallery.com/connected-scatterplot.html"
interactive: true
resumo: "Preço médio da assinatura e número de assinantes de um streaming fictício, ano a ano, conectados em ordem cronológica."
pacotes: ["ggplot2", "ggrepel", "dplyr"]
dados: "1 variável de tempo + 2 numéricas"
nivel: intermediário
tags: ["dispersão", "série temporal"]
---

## O que é

Uma dispersão conectada é um gráfico de dispersão comum — duas variáveis
numéricas, uma em cada eixo — com uma diferença: os pontos são ligados por
uma linha na ordem de uma terceira variável, geralmente tempo. **Para que
serve**: mostrar como a *relação* entre duas variáveis evolui, em vez de só
mostrar cada variável evoluindo separadamente. Onde um gráfico de linha
comum precisaria de dois eixos Y pra contar essa história, a dispersão
conectada usa só a posição dos pontos e a ordem do traço.

## Quando usar (e quando evitar)

**Use quando** a relação entre duas variáveis muda de direção ao longo do
tempo — períodos em que elas sobem juntas, depois um período em que uma
sobe enquanto a outra cai. É nesses momentos de reversão que a técnica
compensa o esforço de leitura extra que ela exige.

**Evite quando** a relação é simples e monotônica (as duas variáveis só
crescem juntas, sem reversão) — nesse caso a linha conectada só adiciona
ruído visual a uma dispersão comum, ou pior ainda, dois gráficos de linha
separados já contam a história com menos esforço de leitura.

## Que dados você precisa

- **variável de tempo** — define a ordem em que os pontos são ligados (não
  precisa aparecer num eixo do gráfico)
- **duas variáveis numéricas** — uma pra cada eixo

Formato longo/tidy: uma linha por período de tempo, com as duas variáveis
numéricas já na mesma linha (não é preciso pivotar).

## Como ler o gráfico

- **Posição**: o valor das duas variáveis naquele momento, como numa
  dispersão comum.
- **A linha que liga os pontos**: a ordem cronológica — não existe eixo de
  tempo explícito, a sequência é a própria história.
- **Cor do ponto**: gradiente do início ao fim do período, um reforço visual
  pra direção do tempo (do azul pro laranja), redundante com os rótulos de
  ano.
- **Pontos onde o caminho muda de direção**: o que vale mais atenção — é
  onde a relação entre as duas variáveis mudou de regime.

## Como foi feito

A técnica é simplesmente `geom_path()` (que liga os pontos na ORDEM em que
aparecem no dado, diferente de `geom_line()`, que reordena pelo eixo X antes
de desenhar — usar `geom_line()` aqui destruiria a história temporal) por
cima de um `geom_point()` comum. `ggrepel::geom_text_repel()` posiciona os
rótulos de ano só nos pontos de virada, sem sobrepor os pontos vizinhos.

Dados fictícios: preço médio e número de assinantes de um serviço de
streaming fictício, ano a ano entre 2009 e 2024, construídos à mão (não só
tendência + ruído) pra desenhar de propósito uma reversão: uma guerra de
preços em 2014-2016 que dispara a base de assinantes, uma recuperação
gradual de preço com a base ainda crescendo, e um reajuste forte em
2023-2024 que estagna o crescimento — o tipo de relação não-monotônica que
fica escondida se preço e assinantes forem olhados cada um no seu próprio
gráfico de linha.

## Possíveis problemas pelo caminho

- **Problema**: o gráfico vira um emaranhado de linhas cruzando o próprio
  caminho, difícil de seguir. **Por quê**: acontece quando os dados têm
  muitos pontos ou muitas reversões pequenas (ruído), não só as reversões
  que importam. **Solução**: suavizar a série (média móvel) antes de
  desenhar, ou reduzir a granularidade temporal (de mensal pra trimestral,
  por exemplo).
- **Problema**: sem nenhuma pista de direção, o leitor não sabe por qual
  ponta o caminho começa. **Solução**: rotular pelo menos o primeiro e o
  último ponto (ou, como aqui, usar uma escala de cor que varie do início ao
  fim do período).

## Variações possíveis

- Adicionar uma seta (`arrow = arrow(...)` dentro do `geom_path()`) em cada
  segmento, reforçando a direção sem depender só da cor ou dos rótulos —
  usado na versão estática deste gráfico.
- Facetar por uma variável categórica adicional, uma dispersão conectada por
  painel, quando houver mais de uma série pra comparar.
- Trocar a linha reta entre pontos por uma curva suavizada
  (`geom_path(..., lineend = "round")` combinado com interpolação), quando o
  objetivo for enfatizar a tendência geral em vez do valor exato de cada
  ano.
