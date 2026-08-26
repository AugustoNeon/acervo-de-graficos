---
title: "Diagrama aluvial: trajetória de voto"
category: flow
date: 2026-08-21
source: "https://r-graph-gallery.com/alluvial-diagram-ggalluvial.html"
interactive: true
resumo: "O mesmo grupo de eleitores acompanhado em três eleições seguidas, mostrando quantos ficaram no mesmo bloco e quantos migraram entre eles."
veredito_uso: "a mesma unidade é medida em mais de um momento, e o trajeto individual entre categorias importa tanto quanto os totais."
veredito_evita: "as colunas não representam a mesma unidade ao longo do tempo, ou há mais de 5-6 categorias por coluna."
pacotes: ["ggalluvial", "ggplot2", "dplyr", "jsonlite", "d3", "d3-sankey"]
dados: "3 variáveis categóricas (o bloco em cada eleição) medidas na mesma unidade + 1 numérica (quantidade de eleitores em cada combinação)"
nivel: intermediário
tags: ["fluxo", "série temporal categórica"]
---

## O que é

Um diagrama aluvial dispõe categorias em colunas — uma por momento no tempo (ou
por etapa) — e liga cada categoria à sua correspondente na coluna seguinte com
uma fita cuja espessura é proporcional à quantidade de unidades que fizeram
aquele trajeto. **Para que serve**: responder "quem ficou onde e quem mudou de
lugar" quando as MESMAS unidades (pessoas, produtos, casos) são observadas
repetidas vezes, em categorias que podem mudar de uma observação pra outra.

## Quando usar (e quando evitar)

**Use quando** você tiver a mesma unidade medida em mais de um momento numa
variável categórica — eleitores votando em blocos diferentes a cada eleição,
pacientes mudando de estágio de um tratamento, assinantes trocando de plano —
e o interesse for tanto os totais de cada categoria quanto o **trajeto**
individual entre elas.

**Evite quando** as colunas não representarem a mesma unidade ao longo do
tempo (aí é só uma sequência de barras, sem histórico pra ligar) ou quando
houver mais de 5-6 categorias por coluna: as fitas começam a se cruzar tanto
que fica difícil seguir uma trajetória específica com o olho — nesse caso um
conjunto de gráficos de barra lado a lado, um por momento, comunica os totais
com menos ruído (ao custo de perder o trajeto individual).

## Que dados você precisa

- **uma variável categórica por coluna** — o bloco/estágio de cada unidade
  naquele momento, com o mesmo conjunto de categorias possíveis (ou não —
  categorias podem aparecer/sumir entre colunas).
- **uma contagem** — quantas unidades passaram por aquela combinação exata de
  categorias, uma linha por combinação observada.

Formato esperado: uma linha por combinação de categorias com sua contagem
(“formato de eixos”, como uma tabela de contingência despivotada) — não uma
linha por unidade individual, embora seja o ponto de partida mais comum (aqui
foi agregado a partir de uma base de 500 eleitores individuais).

## Como ler o gráfico

- **Coluna**: um momento no tempo (uma eleição).
- **Bloco (retângulo cinza no estático / colorido na versão interativa)**:
  uma categoria dentro daquele momento — a altura é proporcional a quantos
  eleitores estavam nela.
- **Fita**: um grupo de eleitores que fez o mesmo trajeto entre duas eleições
  seguidas. A espessura é proporcional a quantos eleitores fizeram esse
  trajeto específico.
- **Cor da fita**: o bloco em que aquele grupo estava na primeira eleição
  (2016) — assim dá pra seguir visualmente pra onde o eleitorado de origem
  se espalhou nas eleições seguintes, mesmo que a fita mude de bloco no meio
  do caminho.

Na versão interativa, passar o cursor num bloco isola só os trechos que
entram ou saem dele; passar o cursor numa fita acompanha o grupo inteiro nas
**três** eleições, não só naquele trecho isolado.

## Como foi feito

A miniatura estática usa `ggalluvial::geom_alluvium()` (as fitas) +
`geom_stratum()` (os blocos por coluna), com o eixo X fixado nas três
eleições via `scale_x_discrete(limits = ...)`. A cor de cada fita vem do bloco
de origem em 2016 (`aes(fill = eleicao_2016)`), que é como o pacote resolve
o mesmo trajeto atravessando várias colunas sem exigir uma cor por trecho
isolado.

A versão interativa reencena a mesma ideia com outra técnica: um diagrama
aluvial de eixos discretos é, por baixo dos panos, um Sankey em várias
colunas — cada grupo de eleitores que fez o mesmo trajeto completo (um
"lode") vira dois trechos, um por par de eleições consecutivas, com um
identificador em comum entre eles. `d3-sankey` (o mesmo motor já usado no
Sankey deste acervo) calcula a posição de cada bloco na coluna e a espessura
de cada trecho a partir desse identificador; o script.R só exporta os blocos
(com a cor do próprio bloco) e os trechos (com a cor do bloco de origem em
2016, igual ao estático).

Dados fictícios: 500 eleitores de uma cidade fictícia, sorteados eleição a
eleição por uma matriz de transição (mais provável ficar no mesmo bloco do
que trocar, mas nunca determinístico), em vez de uma tabela de combinações
puramente aleatória — isso gera trajetos plausíveis, com blocos "fiéis" mais
grossos que trajetos de migração rara. Paleta `RColorBrewer::brewer.pal(4,
"Pastel1")`, ainda não usada em nenhum outro gráfico do acervo.

## Possíveis problemas pelo caminho

- **Problema**: um bloco que só recebe eleitores na última coluna (ninguém
  chega até ele numa coluna anterior) teria espessura de entrada zero se o
  layout medisse cada bloco só pelo que sai dele. **Por quê**: assim como o
  Sankey, o layout mede a altura de cada bloco pela soma dos trechos que o
  tocam, então um bloco sem trechos de saída (por estar na última coluna) e
  sem trechos de entrada (hipotético) sumiria do diagrama. **Solução**: como
  cada bloco sempre tem ao menos um trecho o tocando (de entrada ou de
  saída), isso não ocorre aqui — mas vale conferir em qualquer dado futuro
  com categorias que só aparecem em algumas colunas.

- **Problema**: o aviso `Some strata appear at multiple axes` aparece no
  console ao gerar o `output.png`. **Por quê**: os mesmos quatro nomes de
  bloco (Esquerda, Centro, Direita, Abstenção) se repetem nas três colunas —
  o `ggalluvial` avisa disso por padrão, caso seja um erro de digitação.
  **Solução**: nenhuma correção necessária aqui — é o comportamento esperado
  quando as categorias realmente se repetem entre colunas (o parâmetro
  `discern` do pacote existe justamente pra decidir se trata isso como o
  mesmo rótulo ou não).

- **Problema**: rótulos com acento (nomes de bloco, "Eleição") saíam
  corrompidos no `data.json` gerado. **Solução**: rode o `Rscript` com locale
  UTF-8 explícito (`LC_ALL=C.UTF-8`) — a história completa está em "Notas do
  coletor", no fim da página.

## Variações possíveis

- Ordenar os blocos por tamanho total em vez de manter a mesma ordem em
  todas as colunas, pra destacar qual bloco cresceu ou encolheu entre
  eleições.
- Colorir as fitas pelo bloco de DESTINO (última coluna) em vez do de
  origem, pra responder "de onde veio quem terminou em cada bloco" em vez de
  "pra onde foi quem começou em cada bloco".
- Acrescentar uma quarta coluna (mais uma eleição) — a técnica generaliza
  pra qualquer número de colunas sem mudar a lógica de trecho a trecho.
- Trocar o identificador de trajeto fictício (eleições) por qualquer outra
  sequência categórica repetida na mesma unidade — estágios de funil,
  planos de assinatura, categorias de risco de crédito ao longo de meses.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="sankey-networkd3-simplificado" style="--cat-link: var(--cat-flow); --cat-link-ink: var(--cat-flow-ink);">
    <span class="parecido-cat">flow</span>
    <span class="parecido-titulo">Sankey diagram simplificado</span>
    <span class="parecido-razao">Mesma técnica por baixo dos panos — um diagrama aluvial de eixos discretos é um Sankey em várias colunas — mas sem a restrição de "mesma unidade repetida", livre pra ligar categorias de naturezas diferentes.</span>
  </a>
  <a class="parecido-item" href="../../evolution/streamgraph-legenda-interativo" style="--cat-link: var(--cat-evolution); --cat-link-ink: var(--cat-evolution-ink);">
    <span class="parecido-cat">evolution</span>
    <span class="parecido-titulo">Streamgraph interativo com legenda</span>
    <span class="parecido-razao">A mesma pergunta — como a composição de um total muda — respondida continuamente ao longo do tempo em vez de entre categorias discretas (de/para).</span>
  </a>
</div>

## Notas do coletor

Os nomes dos blocos ("Esquerda", "Centro", "Direita") e o próprio título
"Eleição" saíam corrompidos no `data.json` — não um caractere estranho
isolado, o texto inteiro virava ruído a partir do primeiro acento. Nenhum
erro, nenhum aviso no console do R. O script rodava, gerava o arquivo, e o
arquivo simplesmente tinha lixo onde deveria ter "Eleição".

Esta foi a primeira sessão deste projeto rodando num ambiente Linux, em vez
de uma das máquinas Windows já usadas antes — e o motivo apareceu aí:
`Rscript` nasce com o locale em `POSIX`/`C` por padrão nesse tipo de
ambiente, que não é UTF-8. Uma string acentuada, codificada em UTF-8 de
verdade pelo R internamente, é reinterpretada **byte a byte** como se fosse
outra coisa na hora de escrever no arquivo — os bytes continuam
tecnicamente corretos, só a interpretação deles muda no meio do caminho,
silenciosamente.

A correção foi rodar o script com `LANG=C.UTF-8 LC_ALL=C.UTF-8` explícitos
— um locale UTF-8 que já vem disponível no sistema, sem precisar instalar
nada. Virou hábito depois disso: qualquer gráfico novo com acentuação tem o
`data.json` conferido de propósito (abrir com `json.load` e imprimir um
campo acentuado), porque esse tipo de corrupção nunca aparece como erro —
só como texto errado que passaria despercebido numa checagem rápida.
