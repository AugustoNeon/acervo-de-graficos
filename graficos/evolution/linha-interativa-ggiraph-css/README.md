---
title: "Linha interativa com destaque por série"
category: evolution
date: 2026-07-24
source: "https://r-graph-gallery.com/412-customize-css-in-interactive-ggiraph.html"
interactive: true
resumo: "Várias séries temporais na mesma tela, em que passar o cursor numa linha a destaca e apaga as demais."
pacotes: ["ggplot2", "tidyverse", "jsonlite", "d3"]
dados: "3 colunas — tempo, categoria e valor (uma linha por combinação)"
nivel: intermediário
tags: ["interativo", "temporal"]
---

## O que é

Um gráfico de linhas comum — várias séries temporais na mesma tela, uma cor por
categoria — com um problema clássico quando o número de séries cresce: linhas se
cruzam, cores próximas se confundem, e seguir uma categoria específica de ponta a
ponta fica difícil só de olho. **Para que serve**: comparar a evolução de várias
categorias ao longo do tempo, com a interação resolvendo exatamente o problema que
a imagem estática não resolve — isolar uma série por vez.

## Quando usar (e quando evitar)

**Use quando** houver várias séries sobrepostas (o clássico "gráfico de
espaguete") e a leitura precisar tanto da visão geral (todas as linhas juntas)
quanto do detalhe de uma categoria por vez. Passar o cursor e apagar as demais é
a forma mais direta de resolver isso sem remover nenhuma linha do gráfico.

**Evite quando** houver só 2-3 séries — nesse caso todas já são legíveis de uma
vez, e a interação vira complexidade sem ganho. Evite também qualquer
interatividade quando o destino final for impressão ou PDF: sem clique ou hover,
só a imagem estática (todas as linhas sobrepostas) fica disponível.

## Que dados você precisa

- **Tempo** — a coluna do eixo horizontal.
- **Categoria** — o que separa uma linha da outra.
- **Valor** — a grandeza numérica.

Formato longo/tidy: uma linha por combinação tempo × categoria.

## Como ler o gráfico

- **Eixo horizontal**: o tempo.
- **Eixo vertical**: o valor do índice.
- **Cor**: a categoria (país), repetida na legenda abaixo do gráfico.
- **Cada linha** acompanha uma categoria ao longo do período.

Na versão interativa, passar o cursor numa linha (ou na legenda) a destaca e
apaga as demais; um ponto acompanha a posição mais próxima do cursor e mostra o
mês e o valor exato.

## Como foi feito

O gráfico estático vem de `ggplot2` comum (`geom_line()` + `geom_point()`), sem
nada de especial — a técnica interessante está só na versão interativa.

Essa página já teve uma versão anterior que mostrava **quatro tratamentos de
interatividade via CSS puro** do `ggiraph` (hover simples, destacar+apagar,
hover com sombra/tracejado, tooltip+zoom), alternáveis por um seletor — a
"interatividade definida por CSS, não JavaScript" era o próprio assunto da
página. Isso não tem equivalente em D3: lá, toda interatividade é código
JavaScript por natureza, não existe um "modo CSS". A versão em D3 se concentra
num único tratamento — destacar a série sob o cursor e apagar as demais —, que
já era o mais indicado na prática entre os quatro (o README anterior já
apontava isso: é o que mais ajuda quando as linhas se cruzam bastante).

Dois detalhes técnicos do módulo D3: (1) a linha visível tem só ~2px de
espessura, um alvo de ponteiro pequeno demais — por cima de cada linha existe
uma segunda linha invisível e bem mais larga, só para capturar o hover; (2) o
ponto que acompanha o cursor usa `d3.bisector()` para achar, dentro da série
sob o mouse, a data mais próxima da posição horizontal do cursor — sem isso o
tooltip só conseguiria mostrar o valor do ponto exato onde o SVG foi clicado,
não "o mês mais próximo de onde estou olhando".

Dados fictícios: índice de sentimento econômico de 6 países ao longo de 24
meses, gerado como passeio aleatório com `set.seed(3311)`.

## Possíveis problemas pelo caminho

- **Problema**: o hover não registra quase nunca, mesmo passando o cursor bem
  em cima da linha. **Por quê**: o traço visível é fino (~2px) e a área
  clicável de um `<path>` em SVG é literalmente o traço, sem nenhuma margem de
  tolerância. **Solução**: desenhar uma segunda cópia do mesmo path, invisível
  (`stroke: transparent`) e bem mais larga, só para receber os eventos de
  ponteiro — a linha visível fica livre para ter a espessura que for melhor
  visualmente.

- **Problema**: o tooltip mostra o valor de um mês qualquer, não o mais
  próximo de onde o cursor está. **Por quê**: sem nenhum cálculo extra, o
  único jeito de saber "qual ponto" seria o cursor estar exatamente em cima de
  um `<circle>` — o que raramente acontece. **Solução**: converter a posição
  horizontal do cursor de volta para uma data (`escalaX.invert()`) e usar
  `d3.bisector()` pra achar o ponto da série mais próximo dessa data.

- **Problema**: um `Rplots.pdf` indesejado aparece na pasta junto do PNG.
  **Por quê**: o plot foi deixado para imprimir sozinho no fim do script.
  **Solução**: atribuir o gráfico a uma variável (`p <- ggplot(...) + ...`) e
  passá-la explicitamente para `ggsave()`.

## Variações possíveis

- Mostrar todas as linhas apagadas exceto uma selecionada por clique (em vez
  de só hover), útil quando quem está lendo precisa "fixar" a comparação
  antes de mover o cursor para ver os números.
- Adicionar uma segunda camada de destaque por grupo (ex: países vizinhos),
  quando as categorias tiverem uma hierarquia natural entre si.
- Trocar o destaque por hover por um pequeno multiplo (`facet_wrap` no
  estático, um painel por série no D3) quando o número de categorias for
  grande demais até para o hover ajudar.
- Ligar este gráfico a outro pelo mesmo identificador de categoria, como em
  [dashboard interativo: mapa + dispersão + barras](../../map/dashboard-inovacao-ggiraph).
