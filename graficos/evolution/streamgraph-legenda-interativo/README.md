---
title: "Streamgraph interativo com legenda"
category: evolution
date: 2026-07-22
source: "https://r-graph-gallery.com/156-interactive-streamgraph-with-legend.html"
interactive: true
resumo: "Áreas empilhadas que fluem em torno de um eixo central, mostrando como a composição de um total mudou ao longo do tempo."
veredito_uso: "há muitas categorias e muitos pontos no tempo, e o interesse é o padrão geral — quem domina, quem surge, quem some."
veredito_evita: "o leitor precisa ler valores exatos, a soma importa, ou há só duas ou três categorias."
pacotes: ["ggplot2", "jsonlite", "d3"]
dados: "3 colunas — tempo, categoria e valor (uma linha por combinação)"
nivel: intermediário
tags: ["temporal", "composição"]
---

## O que é

Um streamgraph é um gráfico de áreas empilhadas com uma diferença: em vez de
apoiar as camadas numa linha de base fixa em zero, elas se distribuem em torno de
um eixo central. O resultado tem aparência orgânica, de fluxo — cada faixa se
alarga e se estreita ao longo do tempo conforme sua categoria cresce ou encolhe.

**Para que serve**: mostrar como a **composição** de um total evoluiu. A pergunta
que ele responde bem é "quem estava dominando em cada momento, e quando isso
virou?".

## Quando usar (e quando evitar)

**Use quando** houver muitas categorias e muitos pontos no tempo, e o interesse for
o padrão geral — quais faixas dominam, quais surgem do nada, quais desaparecem. A
linha de base flutuante reduz as distorções de forma que atrapalham as áreas
empilhadas comuns.

**Evite quando** o leitor precisar ler valores exatos: sem uma linha de base
fixa, comparar espessuras de faixas em alturas diferentes é pouco confiável.

<div class="pull-quote pull-quote-direita clearfix">o olho compara mal áreas que não compartilham a mesma origem</div>

Também evite se as categorias forem poucas (duas ou três): um gráfico de
linhas comunica melhor. E como o total não fica visível como um número, não
use quando a soma importar.

Essa fragilidade de leitura é justamente o motivo de a versão interativa valer a
pena: o hover devolve o valor exato que a forma sozinha não entrega.

## Que dados você precisa

- **Tempo** — a coluna do eixo horizontal (ano, data, período).
- **Categoria** — o que define cada faixa.
- **Valor** — a grandeza numérica empilhada.

Formato longo/tidy: uma linha por combinação tempo × categoria. Todas as
categorias precisam existir em todos os períodos — buracos viram descontinuidades
estranhas na forma. Se faltar combinação, preencha com zero antes de plotar.

## Como ler o gráfico

- **Eixo horizontal**: o tempo.
- **Espessura vertical de uma faixa**: o valor daquela categoria naquele momento.
- **Espessura total do fluxo**: a soma de todas as categorias.
- **Cor**: a categoria, repetida na legenda e no dropdown.
- Uma faixa que **nasce fina e engorda** é uma categoria em ascensão; uma que
  **afina até sumir** saiu de cena.

Passe o mouse sobre qualquer faixa para ver o valor exato daquele ponto, ou use o
dropdown para isolar uma categoria.

## Como foi feito

O pacote `streamgraph` gera o widget direto do data frame em formato longo, com
`streamgraph(key, value, date)`. A legenda interativa vem de
`sg_legend(show = TRUE)`, que adiciona o dropdown de seleção acima do gráfico.

Como a técnica não tem equivalente estático em `ggplot2` — é um htmlwidget puro,
desenhado em d3.js —, a miniatura estática foi gerada tirando uma captura de tela
do próprio widget com `webshot2::webshot()`, que usa o Chrome já instalado na
máquina.

Dados fictícios: 8 categorias ao longo de 25 anos (2000–2024), com valores
amostrados de uma distribuição gama (`rgamma(shape = 2, scale = 15)`) e
`set.seed(2024)`. A distribuição gama foi escolhida por produzir valores sempre
positivos e assimétricos, que dão ao fluxo um formato mais natural do que valores
uniformes.

## Possíveis problemas pelo caminho

- **Problema**: o pacote não instala com `install.packages()`. **Por quê**:
  `streamgraph` nunca foi publicado no CRAN. **Solução**: instalar do GitHub com
  `remotes::install_github("hrbrmstr/streamgraph")`.

- **Problema**: salvar o widget falha reclamando de `pandoc`. **Solução**:
  `selfcontained = FALSE` — mas isso tem uma consequência que passou batida
  na primeira tentativa; a história completa está em "Notas do coletor".

- **Problema**: dois avisos aparecem ao rodar o script
  (`streamgraph_html returned an object of class 'list'` e `bindFillRole() only
  works on htmltools::tag() objects`). **Por quê**: o pacote não recebe manutenção
  há anos e ficou defasado em relação ao `htmltools` atual. **Solução**: nenhuma
  necessária — são inofensivos, o widget funciona normalmente no navegador.

- **Problema**: a forma fica com degraus em vez de fluir. **Por quê**:
  interpolação padrão em degrau. **Solução**: usar `offset` e `interpolate`
  adequados na chamada (`"wiggle"` e `"cardinal"` dão o visual clássico).

## Variações possíveis

- Trocar `offset = "wiggle"` por `"zero"` e obter um gráfico de áreas empilhadas
  tradicional, com base fixa — mais fácil de ler em valores, menos expressivo.
- Usar `offset = "expand"` para normalizar tudo em 100% e passar a mostrar
  participação relativa em vez de valor absoluto.
- Reduzir o número de categorias agrupando as menores em "Outros" — a forma fica
  bem mais legível.
- Ordenar as faixas por momento de pico em vez de alfabeticamente, o que costuma
  revelar a narrativa temporal com mais clareza.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../area-receita-saas-ficticio" style="--cat-link: var(--cat-evolution); --cat-link-ink: var(--cat-evolution-ink);">
    <span class="parecido-cat">evolution</span>
    <span class="parecido-titulo">Área sobreposta, empilhada e empilhada 100%</span>
    <span class="parecido-razao">Mesma técnica (área empilhada), outra base: aqui a pilha centraliza pra ganhar fluidez, lá ela parte de zero pra manter o total legível.</span>
  </a>
  <a class="parecido-item" href="../../flow/alluvial-trajetoria-eleitoral" style="--cat-link: var(--cat-flow); --cat-link-ink: var(--cat-flow-ink);">
    <span class="parecido-cat">flow</span>
    <span class="parecido-titulo">Diagrama aluvial: trajetória de voto</span>
    <span class="parecido-razao">A mesma pergunta — como a composição de um total muda — respondida entre categorias discretas (de/para) em vez de continuamente ao longo do tempo.</span>
  </a>
</div>

## Notas do coletor

`selfcontained = FALSE` resolveu o erro de `pandoc` na hora de salvar o
widget, mas criou um problema que só apareceu depois, no site publicado:
o gráfico abria em branco, sem erro nenhum no console além de alguns 404
silenciosos na aba de rede. Faltavam os arquivos de `widget_files/` — a
pasta que `saveWidget()` gera ao lado do `widget.html` com as dependências
JS/CSS (d3, jquery) que o modo não-autocontido exige.

A causa não estava neste gráfico — estava no script que publica os
arquivos gerados no site (`sync-assets.mjs`), que só sabia copiar
`output.png` e `widget.html`, os dois arquivos que todo gráfico anterior
tinha. Nenhum gráfico até aqui tinha precisado de uma pasta de
dependências extra, então ninguém tinha notado a lacuna. Este foi o
primeiro gráfico do acervo a usar `selfcontained = FALSE` de verdade, e
por isso o primeiro a expor o problema.

A correção não ficou local a este gráfico: o script de sincronização
ganhou uma lista de diretórios de asset (`ASSET_DIRS`) copiados
recursivamente, não só os dois arquivos fixos — resolvendo não só este
caso, mas qualquer gráfico futuro que também viesse a precisar de uma
pasta de dependências ao lado do widget.
