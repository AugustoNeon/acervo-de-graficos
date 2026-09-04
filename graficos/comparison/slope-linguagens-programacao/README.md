---
title: "Slope chart: uso de linguagens de programação"
category: comparison
date: 2026-09-04
source: "https://r-graph-gallery.com/web-slopechart-with-ggplot2 (domínio bloqueado nesta sessão; URL não conferida)"
interactive: true
resumo: "10 linguagens de programação, cada uma como uma linha ligando o uso reportado em 2020 e em 2024 — a inclinação da linha já mostra quem subiu, desceu ou cruzou outra linguagem, sem precisar calcular nada de cabeça."
veredito_uso: "você quer comparar exatamente dois instantes (antes/depois, dois anos, duas edições) e o CRUZAMENTO entre categorias é parte da história."
veredito_evita: "são mais de dois instantes no tempo — aí um gráfico de evolução com uma linha por série mostra a trajetória inteira, não só os extremos."
pacotes: ["ggplot2"]
dados: "1 categoria + 2 valores (início e fim) por linha — sempre exatamente dois instantes"
nivel: básico
tags: ["temporal", "ranking", "antes-depois"]
---

## O que é

Um slope chart liga dois valores da mesma categoria — um no início, outro
no fim — com um segmento de reta entre duas colunas verticais fixas. **Para
que serve**: a inclinação de cada linha já é o dado (sobe, desce, fica
igual), e o padrão que mais chama atenção é o **cruzamento**: duas linhas
que trocam de posição relativa entre o início e o fim, algo que uma barra
lado a lado ou uma tabela de números não revela com a mesma clareza.

## Quando usar (e quando evitar)

**Use quando** você tem exatamente dois instantes no tempo (ou duas
condições: antes/depois, controle/tratamento) pra várias categorias, e
quer que o leitor veja rápido quem subiu, quem desceu, e principalmente
quem **ultrapassou** quem.

**Evite quando** você tem mais de dois instantes — um slope chart só liga
dois pontos; com três ou mais, a técnica certa é um gráfico de evolução
comum (uma linha por série ao longo do tempo todo), que este acervo já
cobre em outra categoria. Também evite com muitas dezenas de categorias:
os rótulos nas duas pontas começam a competir por espaço vertical antes
mesmo de a linha em si virar ruído visual.

## Como ler o gráfico

- **As duas colunas verticais**: os dois instantes comparados (aqui, 2020
  e 2024) — nunca mais que dois.
- **Inclinação da linha**: sobe da esquerda pra direita = cresceu; desce =
  encolheu; quase horizontal = ficou estável.
- **Cruzamento entre duas linhas**: a categoria que estava atrás
  ultrapassou a que estava na frente — o evento mais informativo que este
  gráfico existe pra mostrar.
- **Cor + rótulo em cada ponta**: um slope chart clássico não usa legenda
  separada — o nome e o valor exato já vêm escritos ao lado de cada ponto,
  então a cor só reforça visualmente qual ponta pertence a qual linha
  quando duas ficam próximas.

## Como foi feito

**Estático**: `geom_segment()` liga os dois pontos de cada linguagem,
`geom_point()` marca as duas pontas, e dois `geom_text()` (um pra cada
coluna, com `hjust` oposto) escrevem "linguagem (valor%)" crescendo pra
fora do gráfico — nunca pra dentro, onde cortaria as linhas. `nudge_x`
pequeno separa o texto da ponta o suficiente pra não colar no ponto.

**Dado fictício**: uso reportado de 10 linguagens de programação numa
pesquisa fictícia, 2020 vs. 2024, escrito à mão (não sorteado) — o ponto
central do dado é o **cruzamento**: TypeScript e Rust sobem rápido o
bastante pra ultrapassar C++, PHP e Go, e isso não aconteceria por acaso
com números sorteados independentes uns dos outros.

**Na versão interativa**: apontar ou clicar qualquer linha, ponto ou
rótulo acende aquela linguagem inteira (linha + as duas pontas + os dois
rótulos) e apaga o resto. A margem lateral do gráfico é calculada
medindo a largura real do maior rótulo (`getComputedTextLength()`), não
um número fixo — importante porque o rótulo mais longo ("JavaScript
(63%)") precisa de espaço real constante em pixels, e uma margem fixa em
unidades do desenho encolhe relativamente ao texto num container
estreito. A entrada anima as linhas "se escrevendo" da esquerda pra
direita, em ordem decrescente de uso em 2020 — a linguagem mais usada no
início desenha primeiro.

## Possíveis problemas pelo caminho

- **Problema**: com 10 rótulos numa faixa de valores de 5% a 63%, alguns
  ficam próximos o bastante pra colidir verticalmente (ex: duas
  linguagens com 26% e 27% em 2020). **Por quê**: o rótulo fica na altura
  exata do valor, e nada impede dois valores de ficarem a poucos pixels
  um do outro. **Solução**: depois de posicionar todos os rótulos de uma
  coluna pela altura do valor, uma segunda passada (`espacarRotulos()`)
  ordena por altura e empurra qualquer rótulo mais baixo que colidiria
  com o vizinho de cima — nunca muda a ORDEM (quem está mais alto
  continua mais alto), só a distância exata quando necessário.

## Variações possíveis

- Colorir só as linhas que sobem de uma cor e as que descem de outra (em
  vez de uma cor por categoria), quando o que importa é só a direção da
  mudança, não identificar cada categoria individualmente.
- Adicionar uma terceira coluna (três instantes), o que exige abandonar o
  segmento reto por uma linha poligonal — nesse ponto já é mais parecido
  com um gráfico de evolução comum do que com um slope chart clássico.
- Ordenar as categorias por magnitude da mudança (maior queda no topo,
  maior alta embaixo, ou vice-versa) em vez de pela posição natural do
  valor, quando o ranking da mudança em si for o ponto principal.

## Notas do coletor

<div class="pull-quote">o rótulo mais longo precisa de espaço real constante em pixels, e uma margem fixa em unidades do desenho encolhe relativamente ao texto num container estreito</div>

Esta é a terceira vez nesta sessão que "margem em unidade de desenho não
acompanha texto em pixels reais" aparece (depois do sismógrafo kaiju e da
linha do tempo de marcos, ambos alguns gráficos atrás) — mas a primeira
vez que a correção foi feita **antes** de publicar, em vez de depois de
alguém reportar um vazamento. A diferença: em vez de escolher um número
de margem que "parecesse suficiente", a margem nasce medindo a largura
real do maior rótulo com `getComputedTextLength()` (a mesma técnica já
usada há algumas sessões pra decidir camadas de colisão na linha do
tempo de marcos, aplicada aqui pra decidir o tamanho da margem em vez do
número de camadas). Qualquer gráfico futuro deste acervo cujo rótulo
precise crescer PRA FORA de uma área de desenho (não pra dentro, como no
gráfico ternário) deveria fazer essa mesma medição em vez de chutar uma
margem fixa.
