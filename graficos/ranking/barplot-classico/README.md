---
title: "Barplot clássico: cinco variações"
category: ranking
date: 2026-08-18
source: "https://r-graph-gallery.com/barplot.html"
interactive: true
resumo: "As mesmas seis barras se reorganizando entre básico, ordenado, horizontal, largura variável e barra de erro."
veredito_uso: "poucas dezenas de categorias, e a comparação por comprimento (a leitura mais precisa que o olho humano tem) é o que importa."
veredito_evita: "dezenas de categorias (fica ilegível), ou o que importa é a composição de um total — aí um gráfico de partes responde melhor."
pacotes: ["ggplot2", "patchwork", "RColorBrewer", "jsonlite", "d3"]
dados: "1 variável categórica + 1 numérica, com duas métricas extras opcionais"
nivel: básico
tags: ["comparação", "animação"]
---

## O que é

O gráfico de barras mais fundamental da estatística: uma barra por categoria,
comprimento proporcional a um valor numérico. Este espécime reúne cinco jeitos
de desenhar essa mesma ideia — não como cinco gráficos separados, mas como
cinco **estados** de um único conjunto de barras, que se reorganiza ao vivo
quando você troca de variação.

**Para que serve**: comparar uma métrica entre categorias. A escolha entre as
variações (ordem, orientação, largura, incerteza) muda o que salta aos olhos
primeiro, sem mudar o dado.

## Quando usar (e quando evitar)

**Use quando** você tem poucas dezenas de categorias, no máximo, e quer que a
diferença de magnitude entre elas seja lida por comprimento — a forma mais
precisa que o olho humano tem de comparar valores.

<div class="pull-quote pull-quote-direita clearfix">a forma mais precisa que o olho humano tem de comparar valores</div>

**Evite quando** houver dezenas de categorias (vira ilegível; considere
agrupar ou usar só as N maiores) ou quando o que importa é a **composição**
de um total, não a comparação entre categorias soltas — nesse caso um
gráfico de partes (barra empilhada, treemap) responde melhor.

## Que dados você precisa

- **uma variável categórica** — os grupos a comparar (aqui, gêneros musicais).
- **uma variável numérica** — o valor de cada grupo (aqui, horas de audição).
- Opcionalmente, uma **segunda métrica numérica** por categoria, usada só na
  variação de largura variável (aqui, ouvintes ativos) e um **desvio/margem de
  erro** por categoria, usado só na variação com barra de erro.

Uma linha por categoria já agregada — não é dado bruto por observação.

## Como ler o gráfico

- **Básico**: barras na ordem original das categorias — útil quando a ordem
  já tem significado próprio (alfabética, cronológica, geográfica).
- **Ordenado**: mesmas barras, da maior pra menor — a leitura mais rápida
  quando o que importa é o ranking, não a identidade fixa de cada categoria.
- **Horizontal**: ordenado com os eixos trocados — rótulos longos ficam
  legíveis na horizontal em vez de girados.
- **Largura variável**: a altura continua sendo o valor principal; a
  **largura** de cada barra passa a codificar uma segunda métrica — quanto
  mais larga, maior essa segunda variável.
- **Com barra de erro**: um traço vertical com "T" nas pontas sobre cada
  barra, mostrando a faixa de incerteza em torno do valor — a barra sozinha
  vira só o centro dessa faixa, não mais um número exato.
- **Cor**: cada categoria mantém a própria cor em todos os estados — segue a
  mesma barra enquanto ela muda de posição.

## Como foi feito

O `output.png` é um pôster com os cinco painéis lado a lado, via `patchwork`
— cada um é um `ggplot2` independente sobre o mesmo `data.frame`, só trocando
`aes()`/`coord_flip()`/`width` conforme a variação. A cor de cada categoria
vem de uma paleta fixa (`RColorBrewer::brewer.pal(6, "Dark2")`, uma cor por
gênero) aplicada igual nos cinco painéis, pra reforçar que é o mesmo dado
visto de ângulos diferentes.

A versão interativa não troca de gráfico a cada clique — ela mantém a mesma
seleção de seis retângulos (uma chave estável por categoria) e só recalcula
`x`/`y`/`largura`/`altura` de cada um a cada estado, transicionando entre os
valores antigos e novos. É por isso que dá pra "seguir" uma barra específica
enquanto ela muda de lugar, cresce ou encolhe — nenhum elemento é destruído e
recriado entre os cinco botões. A barra de erro é uma camada à parte
(desenhada por cima, escondida por padrão) que só aparece com fade no estado
correspondente, reaproveitando a mesma posição do estado "ordenado" por
baixo.

Dados fictícios: horas de audição (em milhões) de seis gêneros musicais,
gerados a partir de pesos de distribuição por plataforma de streaming
(`set.seed(5817)`) — a granularidade completa por plataforma não é usada
aqui, só a soma por gênero. As mesmas seis categorias e valores aparecem nos
gráficos de [lollipop](../../ranking/lollipop-streaming) e
[barras agrupadas/empilhadas](../../part-of-whole/barplot-agrupado-empilhado),
que exploram a mesma família a partir de outros ângulos.

## Possíveis problemas pelo caminho

- **Problema**: a barra de erro parece "mentir" sobre o valor real. **Por
  quê**: a barra é só o centro (média/estimativa); a variação em torno dela é
  real e às vezes maior que a diferença entre duas categorias vizinhas — nesse
  caso, a diferença entre elas pode não ser confiável. **Solução**: sempre ler
  a barra de erro antes de comparar duas categorias próximas.
- **Problema**: a variação "largura variável" engana quem lê rápido, porque o
  olho tende a comparar **área** (altura × largura) em vez de só altura.
  **Por quê**: é uma limitação conhecida de qualquer codificação por área.
  **Solução**: usar largura variável só quando a segunda métrica for
  realmente secundária à leitura principal, nunca como o dado central do
  gráfico.
- **Problema**: ordenar por valor muda a ordem a cada atualização do dado.
  **Por quê**: é o comportamento esperado de "ordenado" — a posição deixa de
  ser fixa por categoria. **Solução**: se a posição fixa importa (comparar a
  mesma categoria ao longo do tempo, por exemplo), prefira a variação
  "básico".

## Variações possíveis

- Facetar por um terceiro grupo (pequenos múltiplos), em vez de uma única
  barra por categoria.
- Colorir por um valor contínuo (gradiente) em vez de uma cor categórica por
  barra, quando a própria magnitude for o que se quer destacar.
- Adicionar um rótulo numérico no topo de cada barra, útil quando a precisão
  do valor exato importa mais que a comparação visual.
- Trocar a barra de erro por um intervalo de confiança assimétrico, quando a
  incerteza não for simétrica em torno do valor central.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../lollipop-streaming" style="--cat-link: var(--cat-ranking); --cat-link-ink: var(--cat-ranking-ink);">
    <span class="parecido-cat">ranking</span>
    <span class="parecido-titulo">Lollipop de horas assistidas por plataforma</span>
    <span class="parecido-razao">Mesmos dados, mesma família de gráfico — troca a barra sólida por uma linha fina com ponto na ponta, menos tinta pro mesmo comprimento.</span>
  </a>
  <a class="parecido-item" href="../../part-of-whole/barplot-agrupado-empilhado" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Barplot agrupado e empilhado</span>
    <span class="parecido-razao">O oposto direto quando a composição importa: cada barra decomposta em subgrupos, em vez de uma única categoria por barra.</span>
  </a>
</div>

## Notas do coletor

A variação "com barra de erro" não é um sexto painel independente — é uma
camada extra desenhada por cima do estado "ordenado", escondida por padrão
e revelada com um fade quando esse estado é selecionado. A decisão de
reaproveitar a posição do "ordenado" em vez de desenhar a barra de erro
como seu próprio estado, com layout calculado do zero, evita um problema
sutil: se a barra de erro fosse um sexto conjunto de retângulos com chave
própria, ela teria que entrar e sair da tela junto com a transição de
estado, e qualquer diferença mínima de posição entre "ordenado" e "com
barra de erro" (arredondamento de ponto flutuante, por exemplo) faria as
barras "tremerem" um pixel na troca — imperceptível isolado, mas visível
bem no momento em que o traço da barra de erro precisa se alinhar
perfeitamente ao topo da barra que ela descreve.

Reaproveitar a mesma posição x/y do estado "ordenado" para desenhar a
camada de erro elimina essa possibilidade por construção: a barra de erro
nunca precisa concordar com a posição da barra principal calculando as
duas de forma independente, porque as duas são, literalmente, a mesma
posição — só uma delas ganha um traço extra por cima. A técnica generaliza
para qualquer anotação que precisa estar "grudada" numa forma que já
existe: em vez de recalcular a posição da anotação a partir dos mesmos
dados brutos, ler a posição já resolvida do elemento principal garante que
as duas nunca divirjam.
