---
title: "Circular barplot empilhado"
category: ranking
date: 2026-07-30
source: "https://r-graph-gallery.com/299-circular-stacked-barplot.html"
interactive: true
resumo: "Um barplot empilhado dobrado em círculo, com as barras agrupadas por categoria e um respiro visual entre cada grupo."
pacotes: ["ggplot2", "dplyr", "tidyr", "jsonlite", "d3"]
dados: "1 variável de identificação + 1 categórica (grupo) + várias numéricas empilháveis"
nivel: intermediário
tags: ["ranking", "parte-do-todo", "interativo"]
---

## O que é

Circular barplot é um barplot comum dobrado sobre um círculo em vez de esticado
numa linha: cada barra vira uma fatia de anel, saindo do centro pra fora, e o
eixo X que normalmente corre da esquerda pra direita passa a dar a volta no
círculo. Na versão empilhada, cada barra ainda carrega várias categorias
sobrepostas (como um barplot empilhado comum) — só que curvadas junto com o
resto. **Para que serve**: comparar muitos itens ao mesmo tempo (dezenas)
sem que o gráfico fique comprido demais pra rolar na tela, e ainda mostrar a
composição interna de cada item.

## Quando usar (e quando evitar)

**Use quando** você tem muitas barras (20+) e quer um formato mais compacto e
visualmente convidativo que um barplot comprido, especialmente se os itens já
têm uma noção natural de "ciclo" ou de agrupamento em torno de um centro.

**Evite quando** a comparação de valores precisa ser precisa: em coordenadas
polares, barras mais distantes do centro ocupam mais área visual pro mesmo
incremento de valor, e comparar alturas de barras em ângulos bem diferentes é
mais difícil do que numa linha reta. Se a decisão depender de comparar dois
valores de perto, prefira um barplot comum (linha) ou um lollipop chart.

## Que dados você precisa

- **identificador** — um nome/rótulo por barra (ex: filial, pessoa, produto)
- **grupo** — uma categoria que agrupa várias barras (cria o respiro visual
  entre blocos e o arco com o nome do grupo)
- **uma ou mais variáveis numéricas** — cada uma vira uma fatia empilhada
  dentro da barra

Formato longo (uma linha por identificador × categoria empilhada, não uma
coluna por categoria) — é o formato que `geom_bar(stat = "identity")` espera
pra empilhar sozinho via `fill`.

## Como ler o gráfico

- **Ângulo (posição ao redor do círculo)**: qual item é, agrupado por bloco
- **Distância do centro**: valor acumulado daquele item (soma das fatias)
- **Cor**: qual categoria compõe aquele pedaço da barra
- **Arcos internos com nome**: identificam a qual grupo aquele bloco de
  barras pertence

## Como foi feito

A técnica tem três partes que não aparecem num barplot comum:

1. **Barras vazias entre grupos**: linhas extras com valor `NA` são inseridas
   no fim de cada grupo antes de plotar. Como elas não têm altura, criam um
   respiro visual entre os blocos quando o gráfico é dobrado em círculo.
2. **Rótulo de cada barra girado e alinhado**: como o texto teria que
   acompanhar o ângulo da própria barra pra ficar legível, o ângulo de cada
   rótulo é calculado a partir da posição da barra no círculo (`90 - 360 *
   posição / total`), e o alinhamento (`hjust`) inverte pra metade de baixo
   do círculo, senão o texto sai de cabeça para baixo.
3. **Arco + nome por grupo**: uma camada separada (`geom_segment` +
   `geom_text`) desenha o arco preto e o nome do grupo por baixo do bloco de
   barras correspondente, calculado a partir do início/fim de cada grupo.

O gráfico final usa `coord_polar()` do `ggplot2` pra dobrar tudo isso em
círculo — até esse ponto, os dados são um barplot empilhado comum.

Dados fictícios: uma rede fictícia de livrarias com filiais agrupadas por
região (Norte, Sul, Leste, Oeste, em quantidades diferentes por região) e
receita mensal fictícia (R$ mil) em três linhas de produto (ficção,
não-ficção, infantil), no lugar dos indivíduos genéricos ("Mister N") e das
variáveis sem nome do exemplo original. Paleta categórica fixa
(`RColorBrewer::brewer.pal(3, "Dark2")`) no lugar do `scale_fill_viridis()`
do exemplo original.

**Versão interativa**: nenhuma biblioteca interativa pronta reproduz um
circular barplot com grade, rótulos rotacionados e arcos de grupo
customizados — todas trazem o próprio sistema de eixos junto. Então a versão
interativa é desenhada em D3, e o script em R exporta um `data.json` com o
dado *e a geometria já calculada* (posição angular de cada barra, extensão de
cada grupo, arcos de grade, paleta). O desenho acontece em dois lugares, mas
a regra de layout mora num só: recalcular os ângulos do outro lado faria as
duas versões divergirem na primeira edição. Por cima disso, a versão
interativa acrescenta o que a imagem não dá — as barras crescem do centro pra
fora ao entrar na tela, passar o cursor numa barra mostra os números daquela
filial, e a legenda destaca uma linha de produto em todas as barras de uma vez.

## Possíveis problemas pelo caminho

- **Problema**: os rótulos de texto saem de cabeça para baixo na metade
  inferior do círculo. **Por quê**: o ângulo de rotação de um `geom_text()`
  não inverte sozinho passando de 180°. **Solução**: somar 180° ao ângulo e
  trocar o `hjust` de 0 para 1 (ou vice-versa) sempre que o ângulo calculado
  for menor que -90°.
- **Problema**: o número de barras "vazias" certo depende de quantos grupos e
  quantas categorias empilhadas existem. **Por quê**: o respiro é multiplicado
  por `nlevels(grupo) * nlevels(categoria)` — mudar a quantidade de grupos ou
  de categorias empilhadas sem ajustar essa conta faz o respiro sumir ou
  dobrar de tamanho. **Solução**: sempre calcular esse número a partir dos
  próprios dados (`nlevels(...)`), nunca deixar um valor fixo solto no script.

## Variações possíveis

- Trocar a soma empilhada por posição lado a lado (`position = "dodge"`),
  perdendo o empilhamento mas ganhando comparação mais direta entre
  categorias dentro do mesmo grupo.
- Adicionar um segundo anel de informação (ex: uma linha de referência por
  item) por fora das barras, usando outra camada de `geom_segment` num raio
  maior.
- Reduzir a quantidade de "barras vazias" pra deixar os grupos mais próximos
  entre si, ou aumentar pra dar mais destaque à separação entre eles.
- Fazer uma versão interativa com `plotly::plot_ly(type = "barpolar")` —
  empilha por categoria e mostra tooltip sozinho, mas exige recriar os
  rótulos girados e o arco por grupo na mão, já que esse layout de anotações
  não é algo que o `barpolar` reproduz automaticamente.
