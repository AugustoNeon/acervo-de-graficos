---
title: "Barras divergentes: variação de vendas por categoria"
category: ranking
date: 2026-09-09
source: "https://r-graph-gallery.com/web-diverging-lollipop-plot-with-ggplot2.html"
interactive: true
resumo: "A variação percentual de vendas de cada categoria de produto em relação à média da rede, crescendo pra cima ou pra baixo de uma linha de referência."
veredito_uso: "o zero do seu dado não é ausência de valor, é uma referência — uma meta, uma média, um ano-base — e o que importa é de que lado dela cada categoria caiu."
veredito_evita: "o que importa é o valor absoluto de cada categoria, não o desvio de uma referência — um ranking comum é mais direto."
pacotes: ["ggplot2", "dplyr", "forcats"]
dados: "1 variável categórica + 1 numérica (a variação, já calculada em relação à referência)"
nivel: básico
tags: ["barras", "divergente", "variação"]
---

## O que é

Um gráfico de barras divergentes é um ranking horizontal em que o eixo
começa numa **referência**, não em zero-ausência — e a barra de cada
categoria cresce para a direita ou para a esquerda dependendo se o valor
fica acima ou abaixo dela. **Para que serve**: mostrar, na mesma imagem,
duas perguntas que um ranking comum responde separadamente — quem está
acima ou abaixo da referência, e por quanto.

## Quando usar (e quando evitar)

**Use quando** o zero do seu dado for uma referência de verdade — uma meta,
uma média do grupo, um valor do ano anterior — e a pergunta central for "quem
ficou de que lado, e por quanto". Funciona bem com poucas dezenas de
categorias: o contraste de direção (barras pra um lado e pro outro) é o que
sustenta a leitura, e ele se perde com listas muito longas.

**Evite quando** o que importa é o valor absoluto de cada categoria, não o
desvio de uma referência — nesse caso um [barplot comum](../barplot-classico)
é mais direto, sem a camada extra de "acima/abaixo de quê". Evite também
quando a referência não é a mesma para todas as categorias (metas
individuais, por exemplo): a leitura por posição só funciona porque o zero
significa a mesma coisa em toda barra.

## Como ler o gráfico

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#1F7A5C"></span> Acima da média da rede</div>
  <div><span class="swatch" style="background:#B5482E"></span> Abaixo da média da rede</div>
</div>

- **Direção da barra**: para a direita é acima da referência, para a esquerda
  é abaixo — a linha vertical central é o zero conceitual (aqui, a média da
  rede), não a borda do gráfico.
- **Comprimento da barra**: o tamanho do desvio. Duas barras do mesmo
  comprimento em lados opostos representam desvios de mesma magnitude, um
  pra cada direção.
- **Ordem vertical**: da maior alta (topo) à maior queda (base) — a mesma
  ordem em que uma lista de "melhores e piores" seria lida.

## Como foi feito

**Camada única**: um `geom_col()` sobre a variação já calculada (não é um
histograma nem uma contagem), com `coord_flip()` para que as categorias
fiquem no eixo vertical e a variação no horizontal. Uma `geom_hline(yintercept
= 0)` marca a referência — sem ela, a posição do zero teria que ser inferida
pela grade comum, que é bem mais fraca visualmente.

**Cor por sinal, não por categoria**: `fill` mapeia se o valor é positivo ou
negativo (`if_else(variacao >= 0, ...)`), não a categoria em si — reforça que
o que importa aqui é o lado, e a paleta fica com só duas cores em vez de uma
por categoria.

**Ordem**: a categoria vira `factor` reordenado pelo próprio valor
(`fct_reorder`), a mesma técnica de qualquer ranking desta base — sem isso o
`ggplot2` cai para ordem alfabética.

**Dado fictício**: variação percentual de vendas de 10 categorias de uma rede
de varejo num trimestre, com uma tendência-base por categoria somada a ruído
pequeno (`rnorm`) — gera um miolo de categorias perto de zero e caudas nos
dois extremos, o padrão que um dado real de varejo costuma ter, em vez de
uma distribuição uniforme entre -20% e +20%.

**Na versão interativa**: os rótulos numéricos (`+17.2%`, `-16.8%`) ficam
sempre do lado externo da ponta da barra, nunca sobre ela — a posição deles
inverte com o sinal (à direita para barras positivas, à esquerda para
negativas), calculado a cada desenho, não fixado num lado só.

## Possíveis problemas pelo caminho

- **Problema**: os rótulos de valor saem colados na barra, ou de cabeça para
  o lado errado. **Por quê**: um único `hjust` fixo funciona só para um dos
  dois sinais — barras positivas e negativas terminam em lados opostos do
  zero. **Solução**: calcule `hjust` (ou, no D3, `text-anchor` e o sinal do
  deslocamento) a partir do próprio sinal do valor, nunca um número fixo.

## Variações possíveis

- Trocar a referência de "média do grupo" por uma meta fixa por categoria,
  desde que ela seja a mesma linha de corte visual para todas — ler o gráfico
  deixa de fazer sentido se o zero muda de significado entre barras.
- Adicionar uma segunda camada de ponto na ponta de cada barra para destacar
  o valor absoluto ao lado do desvio, quando as duas leituras importarem
  juntas.
- Facetar por região ou período, repetindo o mesmo eixo de categorias em
  painéis lado a lado, para comparar como o desvio muda entre grupos.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../barplot-classico" style="--cat-link: var(--cat-ranking); --cat-link-ink: var(--cat-ranking-ink);">
    <span class="parecido-cat">ranking</span>
    <span class="parecido-titulo">Barplot clássico: audição por gênero musical</span>
    <span class="parecido-razao">O oposto direto: zero como ausência de valor, não como referência — a pergunta é "quanto", não "de que lado".</span>
  </a>
  <a class="parecido-item" href="../../comparison/halteres-espera-especialidades" style="--cat-link: var(--cat-comparison); --cat-link-ink: var(--cat-comparison-ink);">
    <span class="parecido-cat">comparison</span>
    <span class="parecido-titulo">Halteres: espera antes e depois por especialidade</span>
    <span class="parecido-razao">Mesma ideia de desvio a partir de uma referência, mas com os dois valores originais visíveis — aqui só o saldo sobrevive.</span>
  </a>
</div>
