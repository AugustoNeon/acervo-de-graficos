---
title: "Circular barplot empilhado"
category: ranking
date: 2026-07-30
source: "https://r-graph-gallery.com/299-circular-stacked-barplot.html"
interactive: true
resumo: "Um barplot empilhado dobrado em círculo, com as barras agrupadas por categoria e um respiro visual entre cada grupo."
veredito_uso: "muitas barras (20+), um formato mais compacto que um barplot comprido, e os itens já têm noção de agrupamento em torno de um centro."
veredito_evita: "a comparação de valores precisa ser precisa — em coordenadas polares, a mesma diferença de valor ocupa área visual diferente conforme a distância do centro."
pacotes: ["ggplot2", "dplyr", "tidyr", "jsonlite", "d3"]
dados: "1 variável de identificação + 1 categórica (grupo) + várias numéricas empilháveis"
nivel: intermediário
tags: ["ranking", "parte-do-todo"]
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

<div class="pull-quote pull-quote-direita clearfix">barras mais distantes do centro ocupam mais área visual pro mesmo incremento de valor</div>

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
  não inverte sozinho passando de 180°. **Solução**: a fórmula e o porquê
  dela estão em "Notas do coletor".
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

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../barplot-classico" style="--cat-link: var(--cat-ranking); --cat-link-ink: var(--cat-ranking-ink);">
    <span class="parecido-cat">ranking</span>
    <span class="parecido-titulo">Barplot clássico: cinco variações</span>
    <span class="parecido-razao">O oposto direto quando a comparação precisa ser precisa: barras numa linha reta, sem a distorção de área que coordenadas polares introduzem.</span>
  </a>
  <a class="parecido-item" href="../../part-of-whole/sunburst-catalogo-streaming" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Sunburst zoomável: catálogo de streaming</span>
    <span class="parecido-razao">Outro gráfico que dobra barras/fatias em círculo, mas organizando por hierarquia de níveis em vez de grupos lado a lado.</span>
  </a>
</div>

## Notas do coletor

Girar o rótulo de cada barra pra acompanhar o ângulo dela no círculo
parece, à primeira vista, um problema de uma fórmula só: calcular o ângulo
a partir da posição da barra (`90 - 360 * posição / total`) e aplicar esse
valor na rotação do `geom_text()`. A fórmula sozinha funciona perfeitamente
na metade de cima do círculo — e produz texto de cabeça para baixo,
perfeitamente legível só que invertido, em toda a metade de baixo.

A causa é geométrica, não um bug de cálculo: rotação de texto em CSS/SVG
não "sabe" que passou de 180° — ela simplesmente continua girando na
mesma direção, e um texto girado além de 180° fica de cabeça para baixo do
ponto de vista de quem lê, mesmo que o ângulo em si esteja matematicamente
correto. A correção teve duas partes, não uma: somar 180° ao ângulo
sempre que ele cair na metade inferior do círculo (ângulo calculado menor
que -90°) reorienta o texto pra ficar na posição certa — mas isso sozinho
move o texto pro lado errado da barra, porque agora ele "nasce" do ponto
oposto. A segunda parte, trocar o `hjust` de 0 para 1 (ou o inverso) nesse
mesmo momento, resolve o alinhamento junto com a rotação. As duas
correções têm que acontecer juntas, na mesma condição — ajustar só uma
troca "de cabeça para baixo" por "de lado errado", nunca resolve as duas
ao mesmo tempo.
