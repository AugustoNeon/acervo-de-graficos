---
title: "Ridgeline plot"
category: distribution
date: 2026-08-18
source: "https://r-graph-gallery.com/294-basic-ridgeline-plot.html"
interactive: true
resumo: "Distribuição de notas de avaliação em oito bairros fictícios, empilhadas e coloridas em gradiente pela própria nota."
pacotes: ["ggplot2", "ggridges", "RColorBrewer", "jsonlite", "d3"]
dados: "1 variável categórica (com várias observações por categoria) + 1 numérica contínua"
nivel: intermediário
tags: ["densidade", "distribuição"]
---

## O que é

Uma série de gráficos de densidade, um por categoria, empilhados verticalmente
com um pouco de sobreposição entre eles — como um perfil de montanhas visto de
lado. Também chamado de joyplot. **Para que serve**: comparar a distribuição
inteira de uma variável numérica entre várias categorias de uma vez, em vez de
resumir cada uma a um único número (média, mediana).

## Quando usar (e quando evitar)

**Use quando** houver várias categorias (tipicamente 5 a 15) e o que importa
for comparar a **forma** da distribuição entre elas — onde cada uma se
concentra, se é estreita ou espalhada, se tem mais de um pico.

**Evite quando** houver poucas categorias (um gráfico de densidade sobreposto
comum já resolve) ou muitas (a sobreposição vira ilegível) — e evite também
quando cada categoria tiver poucas observações: a estimativa de densidade
fica instável e pode sugerir formas que não existem no dado.

## Que dados você precisa

- **uma variável categórica** — os grupos a comparar (aqui, bairros).
- **uma variável numérica contínua**, com várias observações por categoria
  (aqui, notas de avaliação de restaurantes).

Formato longo: uma linha por observação, não uma linha por categoria já
agregada — a densidade precisa dos valores brutos para ser estimada.

## Como ler o gráfico

- **Posição vertical (linha)**: a categoria — aqui, ordenadas da mediana mais
  baixa (embaixo) para a mais alta (em cima).
- **Forma de cada faixa**: a distribuição daquela categoria — picos marcam
  onde as observações se concentram; faixas largas e baixas indicam mais
  variação, faixas estreitas e altas indicam mais consistência.
- **Sobreposição entre faixas vizinhas**: não codifica nada por si — é só o
  efeito visual de dar mais altura a cada pico do que o espaço reservado pra
  cada linha, pra ficar mais fácil comparar as formas.
- **Cor**: aqui, a própria nota — vermelho para notas baixas, verde para
  notas altas, a mesma escala em todas as faixas (não uma cor por bairro).

## Como foi feito

O `output.png` usa `ggridges::geom_density_ridges_gradient()`, que estima a
densidade de cada bairro e colore cada ponto da curva pela posição no eixo
X — o mesmo `nota`, não uma cor fixa por categoria. `scale_fill_distiller()`
com paleta divergente mapeia nota baixa a vermelho e alta a verde.

A versão interativa não importa a curva calculada pelo R — o `ggridges`
resolve a densidade internamente e não expõe esse cálculo de um jeito
reaproveitável. Em vez disso, o `script.R` exporta só as notas brutas de cada
bairro, e o D3 estima sua própria densidade com um kernel gaussiano (a mesma
família de método usada por trás de `ggridges`/`stats::density()`), com a
largura de banda calculada pela regra de Silverman a partir do desvio-padrão
de cada bairro. O gradiente de cor é um `<linearGradient>` alinhado à mesma
escala do eixo X, então a cor de um ponto da curva depende só da posição
horizontal — igual à lógica do `after_stat(x)` do lado R. As faixas são
desenhadas de trás (maior mediana) pra frente (menor mediana), pra que a
faixa mais embaixo sempre fique por cima onde os picos se tocam, o efeito
clássico do ridgeline.

Dados fictícios: notas de 0 a 10 para oito bairros fictícios, cada um com sua
própria média e desvio-padrão (`set.seed(4127)`) — pensados para produzir
formas bem diferentes entre si (faixas estreitas e altas vs. largas e
achatadas), em vez de curvas parecidas.

## Possíveis problemas pelo caminho

- **Problema**: a densidade estimada mostra um pico onde há pouquíssimas
  observações. **Por quê**: com poucas observações por categoria, a
  estimativa de densidade é instável e amplifica ruído. **Solução**: mais de
  algumas centenas de observações por categoria (como aqui) já deixa a
  estimativa razoavelmente estável; abaixo disso, desconfie de picos
  estreitos.
- **Problema**: a curva "vaza" um pouco para fora do intervalo real dos
  dados (por exemplo, mostrando densidade abaixo de 0 numa escala de 0 a 10).
  **Por quê**: o kernel gaussiano espalha massa de probabilidade em torno de
  cada ponto, inclusive além do limite observado — mesmo problema de qualquer
  estimativa por kernel. **Solução**: fixar o domínio do eixo X no intervalo
  válido (feito aqui) resolve o efeito visual, mesmo que a curva matemática
  continue existindo além dele.
- **Problema**: faixas muito próximas ficam difíceis de distinguir onde se
  sobrepõem. **Por quê**: a mesma sobreposição que ajuda a comparar picos
  atrapalha quando duas categorias têm formas parecidas e medianas
  próximas. **Solução**: reduzir a sobreposição (diminuir a altura do pico
  em relação ao espaço de cada linha) quando isso acontecer muito.

## Variações possíveis

- Colorir por categoria em vez de por valor, quando identificar *qual* linha
  é qual importar mais do que comparar a magnitude ponto a ponto.
- Adicionar uma linha vertical marcando a mediana de cada bairro sobre a
  própria faixa, unindo a leitura da forma completa com um resumo pontual.
- Trocar a forma suave por uma versão em histograma (bins), útil quando o
  dado bruto for discreto ou quando picos suavizados esconderem uma
  multimodalidade real.
- Facetar por um segundo agrupamento (por exemplo, tipo de restaurante),
  virando um pequeno múltiplo de ridgelines.
