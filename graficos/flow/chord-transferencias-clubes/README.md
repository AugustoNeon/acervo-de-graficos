---
title: "Diagrama de cordas: transferências entre clubes"
category: flow
date: 2026-08-20
source: "https://r-graph-gallery.com/123-circular-plot-circlize-package-2.html"
interactive: true
resumo: "Transferências de jogadores entre clubes desenhadas como fitas ao redor de um círculo, com a espessura proporcional à quantidade e a cor indicando quem mandou o jogador."
veredito_uso: "as categorias trocam entre si nos dois sentidos, e você quer comparar a intensidade de cada ligação de uma vez."
veredito_evita: "há mais de 10-12 categorias, ou as relações são de mão única e sequenciais — aí um Sankey conta melhor."
pacotes: ["circlize", "RColorBrewer", "jsonlite", "d3"]
dados: "matriz quadrada (clube de origem × clube de destino), com a quantidade de jogadores em cada célula"
nivel: avançado
tags: ["fluxo", "circular"]
---

## O que é

Um diagrama de cordas dispõe um conjunto de categorias em volta de um círculo e
liga cada par com uma fita cuja espessura é proporcional à quantidade que flui
entre elas. **Para que serve**: responder "quem troca com quem, e quanto" quando
as relações são **mútuas** — ao contrário do Sankey, que separa origem e destino
em colunas diferentes.

<div class="pull-quote">todo mundo vive no mesmo círculo e pode mandar e receber ao mesmo tempo</div>

## Quando usar (e quando evitar)

**Use quando** as categorias trocarem entre si nos dois sentidos (clubes que
compram e vendem jogadores entre eles, países que importam e exportam uns dos
outros, migração entre regiões) e o interesse for comparar a intensidade de
cada ligação de uma vez só.

**Evite quando** houver muitas categorias: acima de 10-12 nós as fitas se
sobrepõem e cruzam demais, e o círculo vira um emaranhado ilegível — o motivo
de este exemplo usar só 6 clubes. Evite também quando as relações forem de mão
única e sequenciais (um funil, um processo com estágios): aí um Sankey conta a
história melhor, porque preserva a ordem entre estágios em vez de espalhar tudo
num círculo. E se você só quer comparar totais por categoria, sem se importar
com quem-pra-quem, um gráfico de barras é mais direto.

## Que dados você precisa

- **matriz quadrada** — uma linha e uma coluna por categoria, onde a célula
  `[i, j]` é o quanto flui da categoria `i` pra categoria `j`.
- Alternativa equivalente: uma **lista de ligações** (origem, destino, valor),
  que é como este gráfico guarda o dado — mais compacta quando a matriz é
  esparsa (muitos pares em zero), como é o caso aqui.

A diagonal (categoria ligada a si mesma) normalmente fica em zero.

## Como ler o gráfico

- **Arco externo**: um clube. O comprimento do arco é proporcional ao total
  movimentado por ele (jogadores enviados + recebidos).
- **Fita**: uma transferência entre dois clubes. A ponta larga fica no clube
  de origem, a ponta estreita (com a seta) aponta pro clube de destino.
- **Espessura da fita**: quantos jogadores foram naquela transferência.
- **Cor**: a cor do clube que mandou o jogador — não a do que recebeu.

Passe o cursor num clube pra isolar tudo que entra e sai dele; passe sobre uma
fita pra ver a origem, o destino e o valor exato.

## Como foi feito

A miniatura estática usa `circlize::chordDiagram()`, que já resolve o layout
circular e funde cada par de clubes numa única fita com pontas de larguras
diferentes (uma pra cada sentido — a opção `direction.type = c("diffHeight",
"arrows")`). A versão interativa reencena a mesma ideia com outra técnica:
`d3.chordDirected()` (parte do pacote `d3-chord`, incluído no `d3` principal
desde a v6, sem dependência extra) desenha uma fita **por transferência**, com
uma seta de verdade apontando pro destino, em vez de uma única fita composta —
mais fácil de isolar uma transferência específica ao passar o cursor.

O script.R exporta só a lista de clubes com sua cor e a lista de fluxos
não-zero pelo nome (`origem`, `destino`, `valor`); a matriz completa, os
ângulos de cada arco e a curva de cada fita são recalculados no D3, o mesmo
princípio já usado no Sankey deste acervo.

Dados fictícios: transferências de jogadores entre 6 clubes fictícios numa
única janela de mercado (`set.seed(4127)`). A matriz é deliberadamente
assimétrica e esparsa — cerca de 60% dos pares possíveis têm alguma
transferência, o resto fica em zero, porque nem todo clube negocia com todo
mundo na mesma janela.

## Possíveis problemas pelo caminho

- **Problema**: um rótulo comprido (ex: um nome de clube com duas palavras)
  aparece cortado na borda do PNG. **Por quê**: o `circos.par()` padrão reserva
  espaço só até a borda do círculo (`canvas.xlim/ylim = c(-1, 1)`), sem folga
  pro texto que sai pra fora dele. **Solução**: aumentar a folga antes de
  chamar `chordDiagram()` — `circos.par(canvas.xlim = c(-1.3, 1.3), canvas.ylim
  = c(-1.3, 1.3))`.

- **Problema**: o diagrama parece simétrico mesmo quando o dado não é (dois
  clubes com volumes bem diferentes em cada sentido). **Por quê**: sem
  indicação explícita de direção, uma fita de espessura única entre dois
  pontos não distingue "A manda 9 pra B" de "B manda 9 pra A". **Solução**:
  usar seta (estático) ou uma fita por sentido com seta de verdade
  (interativo) — nunca deixar a direção implícita.

- **Problema**: um clube que só recebe jogadores (nunca envia) fica com um
  arco de comprimento zero, sumindo do círculo. **Solução**: use
  `d3.chordDirected()`, não `d3.chord()` — a história completa está em
  "Notas do coletor", no fim da página.

## Variações possíveis

- Ordenar os clubes por volume total em vez da ordem alfabética
  (`sortGroups` no D3, `order` no `circlize`), pra destacar quem mais
  participa do mercado.
- Colorir a fita por um critério diferente da origem — por exemplo, uma cor
  fixa por par de clubes, deixando as cores de origem só nos arcos.
- Filtrar o diagrama por um valor mínimo de transferência, escondendo fitas
  pequenas que atrapalham a leitura quando o número de categorias cresce.
- Trocar por um Sankey quando o processo tiver estágios com direção única em
  vez de troca mútua entre as mesmas categorias.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="sankey-networkd3-simplificado" style="--cat-link: var(--cat-flow); --cat-link-ink: var(--cat-flow-ink);">
    <span class="parecido-cat">flow</span>
    <span class="parecido-titulo">Sankey diagram simplificado</span>
    <span class="parecido-razao">O oposto direto: quando o fluxo tem direção única e estágios em sequência, em vez de troca mútua entre as mesmas categorias.</span>
  </a>
  <a class="parecido-item" href="../network/rede-direcionada-ponderada" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Rede direcionada e ponderada (fluxo entre cidades)</span>
    <span class="parecido-razao">Mesmo tipo de dado (fluxo direcionado e ponderado entre nós), lido como grafo de nós e arestas em vez de fitas ao redor de um círculo.</span>
  </a>
</div>

## Notas do coletor

Um clube que só recebia jogadores, nunca enviava nenhum, simplesmente
sumia do círculo — sem erro, sem aviso, o arco dele tinha comprimento
zero. Não era um problema do dado: o clube realmente tinha volume de
transferências, só não tinha nenhuma saindo dele naquela janela.

O gerador padrão do D3 pra diagramas de corda, `d3.chord()`, foi desenhado
pra matrizes **não-direcionadas** — ele mede o comprimento do arco de cada
nó pela soma da linha da matriz, que neste dado representa só as
transferências enviadas. Um clube com uma coluna cheia (muito recebido) e
uma linha vazia (nada enviado) tem soma de linha zero, e o arco reflete
isso literalmente: zero de comprimento, o nó desaparece do desenho mesmo
participando ativamente do mercado.

A correção foi trocar `d3.chord()` por `d3.chordDirected()` — parte do
mesmo pacote `d3-chord`, mas que mede cada arco pela soma de **entrada e
saída** juntas, tratando a matriz como o que ela é aqui: direcionada, não
simétrica. Vale desconfiar sempre que um gerador de layout tiver uma
variante "direcionada" ao lado da versão simples — a versão simples quase
sempre assume simetria que o dado real não tem.
