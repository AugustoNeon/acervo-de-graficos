---
title: "Espiral: preço da gasolina ao longo dos anos"
category: timeline
date: 2026-09-09
source: "https://www.climate-lab-book.ac.uk/spirals/ (técnica da 'climate spiral' de Ed Hawkins, adaptada em ggplot2/coord_polar — não é uma página do r-graph-gallery)"
interactive: true
resumo: "O preço médio mensal da gasolina em cinco anos, cada ano um laço fechado sobreposto aos outros — a cor, fria para os anos antigos e quente para os recentes, revela a tendência."
veredito_uso: "o dado é sazonal (se repete todo ano) E tem uma tendência de longo prazo — as duas coisas juntas são exatamente o que este gráfico mostra melhor do que qualquer eixo linear."
veredito_evita: "não há mais de 2-3 anos de dado, ou não há sazonalidade real — com poucos laços ou um padrão mensal achatado, uma linha do tempo linear comum é mais fácil de ler."
pacotes: ["ggplot2", "dplyr"]
dados: "1 variável de ano + 1 de mês (posição angular) + 1 numérica (o raio)"
nivel: avançado
tags: ["espiral", "circular", "sazonalidade"]
---

## O que é

Uma espiral (popularizada pela *climate spiral* de Ed Hawkins) desenha
**cada ano como um laço fechado** sobre o mesmo círculo — o ângulo marca o
mês (janeiro a dezembro, uma volta completa) e o raio marca o valor daquele
mês. Anos diferentes ocupam a mesma faixa angular, mas raios diferentes; a
cor (fria para os anos mais antigos, quente para os mais recentes) é o que
revela a tendência de longo prazo. **Para que serve**: mostrar sazonalidade
(o padrão que se repete todo ano) e tendência (a mudança de ano para ano)
**na mesma imagem**, algo que um eixo linear de tempo obriga a escolher
entre um ou outro.

Apesar do nome, não é uma espiral matemática de verdade — o raio não cresce
de forma constante e monotônica com o tempo. É a sobreposição de vários
círculos concêntricos-mas-não-exatamente, coloridos por ano, que o olho lê
como um movimento em espiral quando existe uma tendência clara.

## Quando usar (e quando evitar)

**Use quando** o dado for mensal (ou de outro ciclo regular) ao longo de
vários anos, e tanto o padrão sazonal quanto a tendência de longo prazo
importarem — clima, preços de commodities, consumo de energia, qualquer
métrica com estação alta e baixa que também está subindo ou descendo ano a
ano.

**Evite quando** houver poucos anos de dado (com 2 ou 3 laços, a
comparação de cor já não sustenta uma leitura de tendência) ou quando não
existir sazonalidade real — sem um padrão mensal, os laços viram círculos
quase perfeitos e a forma circular deixa de acrescentar nada sobre uma
[linha do tempo linear comum](../linha-do-tempo-startup-ficticia). Evite
também para públicos não familiarizados com o formato: é uma leitura que
precisa de uma legenda explicando a convenção antes de fazer sentido.

## Como ler o gráfico

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#3C6E91"></span> 2021 (mais antigo)</div>
  <div><span class="swatch" style="background:#8FAE55"></span> 2023</div>
  <div><span class="swatch" style="background:#C1502E"></span> 2025 (mais recente)</div>
</div>

- **Ângulo**: o mês do ano — janeiro no topo, sentido horário, uma volta
  completa por ano.
- **Raio (distância até o centro)**: o preço médio daquele mês — quanto
  mais longe do centro, mais caro.
- **Cor**: o ano — fria para os mais antigos, quente para os mais
  recentes. Se os laços quentes ficam visivelmente mais afastados do
  centro que os frios em quase todo o círculo, há uma tendência de alta
  consistente, não só um ano atípico.

<div class="pull-quote">a cor é o que revela a tendência que o raio sozinho não deixaria óbvia</div>

## Como foi feito

**Camada**: `geom_path()` sobre coordenadas polares (`coord_polar(theta =
"x")`), uma linha por ano (`group = ano`, `colour = ano`). O detalhe que
faz o laço fechar de verdade: `geom_path()` só liga pontos consecutivos na
ordem em que existem — sem um ponto de fechamento, o segmento entre
dezembro e janeiro simplesmente não é desenhado, e o laço fica aberto. A
correção é duplicar o ponto de janeiro como um 13º ponto (mês 13) ao final
de cada ano, e ajustar os limites do eixo (`limits = c(1, 13)`) para que
esse ponto extra caia exatamente na mesma posição angular do janeiro
original.

**Paleta**: uma escala sequencial fria→quente escrita à mão (não
`viridis`/`RColorBrewer` padrão), cinco cores para cinco anos — a mesma
lógica de "temperatura" da *climate spiral* original, adaptada a uma
paleta própria do acervo.

**Dado fictício**: preço médio mensal de gasolina ao longo de cinco anos,
combinando uma tendência de alta ano a ano com uma sazonalidade fixa
(picos em julho e dezembro, meses de mais viagem) e ruído pequeno — sem
tendência nenhuma, a espiral não teria nada para revelar além da cor.

**Na versão interativa**: o `data.json` carrega só ano/mês/preço por
ponto — o D3 calcula ângulo e raio, e fecha cada laço duplicando o
primeiro ponto no fim do caminho, mesma técnica do `script.R`. A entrada
anima cada laço se desenhando (`stroke-dasharray`/`stroke-dashoffset`) na
ordem cronológica, um ano de cada vez. O realce funciona nas duas
dimensões do cruzamento: passar o mouse (ou clicar) num laço ou na
legenda acende aquele **ano** inteiro; passar o mouse (ou clicar) no
**rótulo do mês**, na borda externa do círculo, acende o mesmo mês nos
cinco laços ao mesmo tempo — a leitura "dezembro ficou mais caro ano a
ano?" fica direta, em vez de precisar seguir cada laço na mão.

## Possíveis problemas pelo caminho

- **Problema**: os rótulos de dois meses vizinhos (por exemplo "Jan" e
  "Dez") aparecem colados ou sobrepostos no círculo. **Por quê**: os
  limites do eixo angular não cobrem o círculo inteiro — com `limits =
  c(1, 12)` para 12 meses, sobra só 11/12 de volta completa, porque
  `coord_polar` mapeia o *intervalo* entre o menor e o maior valor do eixo
  em 360°, não o número de categorias. **Solução**: adicione um ponto
  extra além do último mês (o 13º ponto, duplicando o primeiro) e estenda
  os limites de acordo (`c(1, 13)` em vez de `c(1, 12)`), para que cada mês
  real ocupe sua fatia angular completa e igual.

## Variações possíveis

- Trocar o ano pelo dia da semana (ciclo de 7) ou pela hora do dia (ciclo
  de 24) — a técnica de fechamento do laço e a leitura por cor continuam
  idênticas, só muda a granularidade do ciclo.
- Preencher a área entre o laço e um raio de referência (a média histórica,
  por exemplo) com `geom_ribbon()` polar, destacando visualmente os meses
  acima ou abaixo do normal.
- Animar a entrada laço por laço em ordem cronológica (como a versão
  interativa já faz) para narrar a progressão ano a ano, em vez de revelar
  tudo de uma vez.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../circular-calendario-datas-comemorativas" style="--cat-link: var(--cat-timeline); --cat-link-ink: var(--cat-timeline-ink);">
    <span class="parecido-cat">timeline</span>
    <span class="parecido-titulo">Calendário circular de datas comemorativas</span>
    <span class="parecido-razao">Mesma convenção angular (mês do ano, sentido horário), mas o raio ali só marca posição — aqui ele carrega uma variável contínua, e vários anos se sobrepõem no mesmo círculo.</span>
  </a>
  <a class="parecido-item" href="../../evolution/streamgraph-legenda-interativo" style="--cat-link: var(--cat-evolution); --cat-link-ink: var(--cat-evolution-ink);">
    <span class="parecido-cat">evolution</span>
    <span class="parecido-titulo">Streamgraph interativo com legenda</span>
    <span class="parecido-razao">O oposto direto: mesmo problema de mostrar várias séries temporais coloridas ao longo do tempo, mas com um eixo linear em vez de circular.</span>
  </a>
</div>
