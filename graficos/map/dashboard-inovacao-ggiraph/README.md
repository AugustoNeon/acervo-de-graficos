---
title: "Dashboard interativo: mapa + dispersão + barras (ggiraph)"
category: map
date: 2026-07-27
source: "https://r-graph-gallery.com/414-map-multiple-charts-in-ggiraph.html"
interactive: true
resumo: "Três gráficos diferentes ligados pela mesma chave: passar o mouse em um destaca o mesmo dado nos outros dois."
pacotes: ["ggiraph", "patchwork", "sf", "spData", "dplyr"]
dados: "geometria por país + 2 variáveis numéricas"
nivel: avançado
tags: ["interativo", "geoespacial", "dashboard"]
---

## O que é

Três gráficos que mostram o mesmo conjunto de dados por ângulos diferentes — um
mapa coroplético, um gráfico de dispersão e um de barras — **ligados entre si**.
Passar o mouse sobre um país no mapa destaca o ponto dele na dispersão e a barra
dele no ranking, simultaneamente.

Essa ligação é o que caracteriza a técnica, conhecida como *brushing* ou destaque
vinculado. O mecanismo é simples: todos os elementos que representam a mesma
entidade compartilham um identificador, e a biblioteca cuida do resto.

Cinco tratamentos de interação estão disponíveis nos botões acima do gráfico:
destaque por país, destaque por continente (que realça o grupo inteiro), CSS
customizado, brilho avançado e esmaecimento dos não-selecionados.

**Para que serve**: responder perguntas que nenhum gráfico isolado responde. "Onde
fica o país que mais investe?" exige o mapa; "investir mais leva a inovar mais?"
exige a dispersão; "quem lidera?" exige o ranking. Ligados, permitem circular entre
as três perguntas sem perder o fio.

## Quando usar (e quando evitar)

**Use quando** a mesma entidade tiver várias dimensões relevantes e a pergunta
principal for de comparação cruzada — geografia, relação entre variáveis e ranking
ao mesmo tempo.

**Use o destaque por grupo** (o segundo botão) quando a pergunta for sobre blocos e
não indivíduos: realçar um continente inteiro nos três painéis revela padrões
regionais que passariam despercebidos país a país.

**Evite quando** dois gráficos já bastarem — cada painel adicional divide a atenção
e reduz o espaço dos demais. Evite também em telas pequenas: a ligação depende do
leitor ver os três painéis ao mesmo tempo, e num celular isso não acontece.

E vale o alerta usual: em dados fictícios como estes, qualquer correlação aparente
é artefato da geração, não achado.

## Que dados você precisa

- **Geometria por entidade** — os polígonos dos países, num objeto espacial.
- **Duas variáveis numéricas** — uma para colorir o mapa, ambas para a dispersão.
- **Uma variável de agrupamento** — o continente, usada no destaque por grupo.
- **Um identificador estável** — o nome do país, que é o que liga os três painéis.

O ponto crítico é esse identificador: ele precisa ser **exatamente o mesmo** nos
três gráficos. Se o mapa usa "Brazil" e o ranking usa "Brasil", a ligação não
acontece — e falha em silêncio, sem erro nenhum.

## Como ler o gráfico

**Mapa** — cor de cada país indica o investimento em P&D; países mais escuros
investem mais.

**Dispersão** — posição horizontal é o investimento, vertical é o índice de
inovação. Pontos acima e à direita têm as duas grandezas altas.

**Barras** — os 15 países com maior índice de inovação, do maior para o menor.

Passe o mouse sobre qualquer elemento de qualquer painel: o mesmo país é destacado
nos três. Troque para "Por continente" e o realce passa a atingir o bloco inteiro —
é o modo mais revelador de padrão regional.

## Como foi feito

Cada painel é um `ggplot2` normal usando as versões interativas dos geoms
(`geom_sf_interactive()`, `geom_point_interactive()`, `geom_col_interactive()`),
todos com a estética `data_id` apontando para a mesma chave — é ela, e só ela, que
cria a ligação.

Os três são combinados num único gráfico com o operador `/` e o `+` do `patchwork`:
o mapa em cima ocupando a largura toda, dispersão e barras dividindo a linha de
baixo.

Os cinco estilos são o mesmo conjunto de painéis embrulhado em `girafe()` com
`girafe_options()` diferentes. Os dois primeiros usam `data_id` distintos (país e
continente); os outros três variam apenas o CSS. Todos são reunidos num arquivo só
com `htmltools::save_html()`, e a troca é feita por JavaScript puro.

A imagem estática sai do mesmo objeto `patchwork` via `ggsave()` — fora do
`girafe()`, as estéticas de interatividade são ignoradas.

Dados fictícios: investimento em P&D e índice de inovação por país
(`set.seed(1414)`), gerados a partir de um valor base por continente mais ruído. A
geometria dos países é real; os valores, não.

## Possíveis problemas pelo caminho

- **Problema**: o destaque não se propaga entre os painéis. **Por quê**: o
  `data_id` difere entre eles — nomes escritos de forma diferente, ou tipos
  diferentes (fator versus texto). **Solução**: garantir a mesma chave exata nos
  três; é a causa mais comum, e falha silenciosamente.

- **Problema**: o arquivo do widget fica muito grande. **Por quê**: cada estilo
  embute um SVG completo com todos os polígonos do mapa, e são cinco. **Solução**:
  simplificar a geometria antes de plotar (`sf::st_simplify()`) ou reduzir o número
  de estilos.

- **Problema**: o mapa sai distorcido ou vazio. **Por quê**: sistema de coordenadas
  ausente ou incompatível. **Solução**: conferir o CRS do objeto espacial e
  reprojetar se necessário.

- **Problema**: a legenda de um painel desalinha o conjunto. **Por quê**: o
  `patchwork` reserva espaço por painel. **Solução**: recolher legendas repetidas
  com `plot_layout(guides = "collect")` ou ajustar as proporções.

- **Problema**: os polígonos ficam pesados no navegador. **Por quê**: geometria de
  alta resolução vira milhares de vértices no SVG. **Solução**: simplificar a
  geometria — a diferença visual em escala mundial é imperceptível.

## Variações possíveis

- Trocar o `data_id` por outra chave de agrupamento (região, faixa de renda) e
  obter um novo modo de leitura sem mexer nos gráficos.
- Substituir um dos painéis por um histograma ou boxplot, mantendo a ligação.
- Acrescentar seleção por clique (`opts_selection`) para fixar comparações em vez
  de depender do hover.
- Aplicar a mesma técnica sem mapa — a ligação funciona entre quaisquer gráficos,
  como em
  [linha interativa com CSS customizado](../../evolution/linha-interativa-ggiraph-css).
