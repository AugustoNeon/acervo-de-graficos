---
title: "Streamgraph interativo com legenda/dropdown"
category: evolution
date: 2026-07-22
source: "https://r-graph-gallery.com/156-interactive-streamgraph-with-legend.html"
interactive: true
resumo: "Áreas empilhadas que fluem em torno de um eixo central, mostrando como a composição de um total mudou ao longo do tempo."
pacotes: ["streamgraph", "webshot2", "chromote"]
dados: "3 colunas — tempo, categoria e valor (uma linha por combinação)"
nivel: intermediário
tags: ["interativo", "temporal", "composição"]
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

**Evite quando** o leitor precisar ler valores exatos: sem uma linha de base fixa,
comparar espessuras de faixas em alturas diferentes é pouco confiável — o olho
compara mal áreas que não compartilham a mesma origem. Também evite se as
categorias forem poucas (duas ou três): um gráfico de linhas comunica melhor. E
como o total não fica visível como um número, não use quando a soma importar.

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

- **Problema**: salvar o widget falha reclamando de `pandoc`. **Por quê**: a opção
  `selfcontained = TRUE` do `saveWidget()` depende do `pandoc` para embutir tudo
  num arquivo só. **Solução**: usar `selfcontained = FALSE`. Isso cria uma pasta
  `widget_files/` ao lado do HTML com as dependências (jquery, d3); as duas
  precisam andar juntas ou o gráfico abre em branco.

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
