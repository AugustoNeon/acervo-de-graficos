---
title: "Cascata: o que explica a variação da receita"
category: flow
date: 2026-08-26
source: "https://r-graph-gallery.com/waterfall-chart.html"
interactive: true
resumo: "Como um total sai de um valor e chega a outro, parcela a parcela — cada barra começa onde a anterior parou."
pacotes: ["ggplot2"]
dados: "1 variável categórica ordenada + 1 numérica com sinal (a parcela de cada etapa)"
nivel: básico
tags: ["cascata", "waterfall", "variação", "interativo"]
---

## O que é

Um gráfico de cascata (*waterfall*) mostra o caminho entre dois totais, quebrado
nas parcelas que explicam a diferença. A primeira e a última barra partem do
zero e são os totais; as do meio flutuam, cada uma começando exatamente onde a
anterior parou, subindo quando somam e descendo quando subtraem.

**Para que serve**: responder "por que esse número mudou?" mostrando ao mesmo
tempo o tamanho de cada causa e como elas se acumulam até o resultado final.

## Quando usar (e quando evitar)

**Use quando** houver um ponto de partida, um ponto de chegada e um conjunto de
parcelas que somam exatamente a diferença entre os dois. Variação de receita,
composição de um preço, saldo de entradas e saídas, diferença entre orçado e
realizado — todos têm essa forma.

**Evite quando** as parcelas não fecham a conta. Se sobra um resto inexplicado,
ou a cascata mente, ou precisa de uma barra "outros" explícita — e uma cascata
com um "outros" maior que as parcelas nomeadas não está explicando nada.

Evite também quando o **valor de partida for muito maior que as parcelas**: com
uma base de milhões e variações de milhares, as barras do meio viram tracinhos
e o gráfico não diz mais do que uma tabela. Nesse caso, desenhe a cascata sobre
a *variação* (começando em zero) em vez do valor cheio.

Quando a pergunta for só "qual foi a maior causa", sem interesse pelo
encadeamento, um gráfico de barras ordenado responde melhor e mais barato.

## Que dados você precisa

- **variável categórica ordenada** — as etapas, na ordem em que se quer contar
  a história
- **variável numérica com sinal** — a parcela de cada etapa: positiva soma,
  negativa subtrai

Os totais inicial e final **não** são dados independentes: o final é a soma do
inicial com todas as parcelas. Calcular esse valor em vez de digitá-lo é o que
garante que a cascata sempre fecha.

O acumulado de cada etapa (onde a barra começa e onde termina) também é
derivado, não fornecido — basta percorrer as parcelas somando.

## Como ler o gráfico

- **Altura de uma barra do meio**: o tamanho daquela parcela.
- **Posição vertical da barra**: onde o total estava naquele ponto do caminho.
  Duas parcelas de mesmo tamanho aparecem em alturas diferentes — a posição
  conta a história, o tamanho conta a magnitude.
- **Cor**: o sinal. Verde soma, vinho subtrai, e as duas barras escuras das
  pontas são totais, não variação.
- **Linha ligando as barras**: o encadeamento. É o único elemento que separa
  uma cascata de uma fileira de barras em alturas arbitrárias.

A armadilha de leitura está em comparar tamanhos de barras que estão em alturas
diferentes: o olho tende a julgar pela posição, e uma parcela pequena no alto
pode parecer maior que uma grande embaixo. É por isso que a versão interativa
oferece o modo que traz todas para a mesma linha de base.

## Como foi feito

As barras são desenhadas com `geom_rect()` em vez de `geom_col()`, porque cada
uma precisa de um `ymin` e um `ymax` próprios — uma coluna comum sempre começa
no zero, que é exatamente o que uma cascata não faz. Os limites vêm de um laço
que percorre as etapas acumulando: barra de total vai de zero ao valor, barra de
parcela vai do acumulado até o acumulado mais a parcela.

Os conectores são um `geom_segment()` horizontal ligando o fim de uma barra ao
início da seguinte, desenhado **antes** das barras para passar por baixo delas.

Os rótulos de valor ficam sempre do lado de fora da barra — acima quando ela
sobe, abaixo quando desce. Colocá-los dentro falharia justamente nas parcelas
pequenas, que são as que mais precisam do número escrito.

O sinal `+` dos valores positivos é colado à mão: as funções de formatação do R
escrevem o `-` dos negativos, mas nenhuma acrescenta o `+` dos positivos, e numa
cascata o sinal é a informação principal de cada parcela.

Dados fictícios: a receita anual de uma rede pequena de cafeterias e as seis
parcelas que explicam a diferença entre um ano e o outro. A base foi mantida
propositalmente pequena em relação às parcelas, pelo motivo descrito acima.

Na versão interativa, o mesmo conjunto de parcelas ganha uma segunda leitura, em
que todas partem do zero e podem ser comparadas diretamente — a pergunta muda de
"como se chegou lá" para "qual foi a maior alavanca". Os dois totais recuam
nesse modo, porque não são contribuição nenhuma e manteriam a escala esmagada.
Também dá para reordenar as parcelas por impacto: a escala fica fixa de
propósito, o que deixa ver que a ordem muda o caminho da cascata e nunca o ponto
onde ela fecha.

## Possíveis problemas pelo caminho

- **Problema**: a cascata não fecha — a última barra não bate com a soma.
  **Por quê**: o total final foi digitado como um dado, e alguma parcela mudou
  depois. **Solução**: calcule o total final somando as parcelas ao inicial,
  nunca o informe à mão.
- **Problema**: as barras do meio ficam minúsculas. **Por quê**: o valor de
  partida é muito maior que as variações, e o eixo precisa ir até ele.
  **Solução**: desenhe a cascata sobre a variação em vez do valor cheio, ou
  aceite que o gráfico é sobre o total e não sobre as parcelas.
- **Problema**: usar `geom_col()` e não conseguir fazer as barras flutuarem.
  **Por quê**: uma coluna é ancorada no zero por definição. **Solução**:
  `geom_rect()` com `ymin`/`ymax` explícitos.
- **Problema**: cortar o eixo vertical para "dar zoom" nas parcelas.
  **Por quê**: parece resolver o problema anterior. **Solução**: não faça —
  barras cortadas mentem sobre a proporção entre si. Se o zoom for necessário,
  mude o que o gráfico mede (a variação), não a escala com que ele é desenhado.

## Variações possíveis

- Desenhar sobre a variação (começando em zero) em vez do valor cheio, quando a
  base for muito maior que as parcelas.
- Ordenar as parcelas por tamanho em vez da ordem do relato, quando o interesse
  for hierarquizar causas — o total final é o mesmo em qualquer ordem.
- Separar as parcelas positivas das negativas em dois blocos, ganhando
  legibilidade e perdendo a cronologia.
- Acrescentar subtotais intermediários (barras ancoradas no zero no meio do
  caminho) quando as etapas se agruparem em fases.
- Empilhar cada parcela por uma segunda dimensão (região, produto), quando a
  pergunta "de onde veio esse ganho" tiver mais de um nível.
