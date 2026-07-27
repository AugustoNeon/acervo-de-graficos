---
title: "Série temporal interativa customizada (dygraphs)"
category: evolution
date: 2026-07-24
source: "https://r-graph-gallery.com/318-custom-dygraphs-time-series-example.html"
interactive: true
resumo: "Série temporal longa com seletor de intervalo, média móvel ajustável e leitura de valores ponto a ponto."
pacotes: ["dygraphs", "xts", "webshot2"]
dados: "uma série temporal — datas + valores (objeto xts)"
nivel: intermediário
tags: ["interativo", "temporal", "série longa"]
---

## O que é

Um gráfico de série temporal construído para **navegação**, não apenas para
visualização. Além da linha, ele traz três controles que mudam o que é possível
fazer com o dado:

- **Seletor de intervalo** — a faixa abaixo do gráfico permite recortar um período
  e ampliá-lo, mantendo a série completa visível como referência.
- **Média móvel ajustável** — o campo de rolagem controla o suavizamento em tempo
  real, sem recalcular nada no R.
- **Leitura ponto a ponto** — uma linha vertical acompanha o cursor e mostra o
  valor exato daquela data.

**Para que serve**: explorar séries longas, em que a visão completa esconde os
detalhes e o detalhe isolado esconde a tendência.

## Quando usar (e quando evitar)

**Use quando** a série tiver muitos pontos (centenas ou milhares) e o leitor
precisar circular entre o panorama e o detalhe. Dados diários ao longo de anos são
o caso ideal: a granularidade fina é ruidosa demais para ler de longe, mas
descartá-la perderia informação.

**Evite quando** a série for curta — com dezenas de pontos, um gráfico de linhas
estático mostra tudo de uma vez e os controles só atrapalham. Evite também quando
o destino for impressão, e quando houver muitas séries sobrepostas (a técnica é
mais forte com uma ou poucas).

**Cuidado com a média móvel**: ela é ferramenta de exploração, não conclusão. Um
período de suavização escolhido de forma conveniente pode fazer qualquer tendência
parecer existir ou desaparecer.

## Que dados você precisa

- **Uma série temporal** — datas e valores correspondentes.

O formato exigido é um objeto `xts`, que é uma matriz de valores indexada por
tempo. Um data frame comum precisa ser convertido antes, com
`xts(x = valores, order.by = datas)`.

Os intervalos entre observações não precisam ser perfeitamente regulares, mas
lacunas grandes aparecem como saltos na linha.

## Como ler o gráfico

- **Eixo horizontal**: o tempo.
- **Eixo vertical**: o valor da série.
- **Linha e área preenchida**: a série em si.
- **Faixa inferior**: a série inteira em miniatura, com o trecho selecionado em
  destaque — é o mapa de onde você está.

Interações disponíveis: arraste as bordas da faixa inferior para recortar um
período; passe o mouse sobre o gráfico para ver data e valor exatos; e altere o
número no campo de média móvel para suavizar mais ou menos.

Comece com a média móvel em 1 para ver o dado bruto, depois aumente aos poucos: a
tendência de fundo e o padrão semanal aparecem em escalas diferentes de
suavização.

## Como foi feito

`dygraphs::dygraph()` recebe o objeto `xts` e devolve o widget. Os controles são
adicionados encadeando funções: `dyRangeSelector()` para o seletor de intervalo,
`dyRoller()` para a média móvel, `dyHighlight()` para o realce no hover e
`dyOptions()` para preenchimento e cores.

O eixo temporal é gerenciado pela própria biblioteca, que ajusta a densidade de
rótulos conforme o zoom — não é preciso configurar quebras.

Como não há equivalente estático em `ggplot2`, a miniatura veio de uma captura de
tela do widget com `webshot2::webshot()`.

Dados fictícios: 300 dias de downloads de um aplicativo (`set.seed(1907)`),
combinando tendência de crescimento, sazonalidade semanal com picos no fim de
semana e ruído aleatório — a estrutura em três camadas foi escolhida justamente
para que os controles de zoom e suavização tivessem o que revelar.

## Possíveis problemas pelo caminho

- **Problema**: a função reclama do formato dos dados. **Por quê**: foi passado um
  data frame comum, e o pacote exige uma série temporal indexada. **Solução**:
  converter com `xts(x = valores, order.by = as.Date(datas))`.

- **Problema**: o eixo de tempo aparece com datas erradas ou deslocadas. **Por
  quê**: fuso horário na conversão da coluna de datas. **Solução**: usar `as.Date()`
  para dados diários, ou definir o fuso explicitamente ao converter.

- **Problema**: o gráfico fica lento com séries muito longas. **Por quê**: cada
  ponto vira um elemento desenhado no navegador. **Solução**: agregar antes de
  plotar (média diária a partir de dados horários, por exemplo).

- **Problema**: salvar o widget falha por falta de `pandoc`. **Solução**: usar
  `selfcontained = FALSE` e manter a pasta `widget_files/` junto do HTML.

- **Problema**: a média móvel inicial esconde um padrão importante. **Por quê**: um
  `rollPeriod` alto suaviza justamente a sazonalidade de período curto. **Solução**:
  começar em 1 ou 3 e deixar o leitor aumentar.

## Variações possíveis

- Adicionar uma segunda série e comparar com `dySeries()` — o realce no hover passa
  a diferenciar as duas.
- Marcar eventos com `dyEvent()` (uma linha vertical rotulada) ou destacar períodos
  com `dyShading()`, útil para anotar lançamentos e interrupções.
- Mostrar banda de incerteza com `dySeries(c("min", "media", "max"))`, quando houver
  intervalo estimado.
- Fixar um intervalo inicial em `dyRangeSelector(dateWindow = ...)` para abrir o
  gráfico já no período que interessa.
