---
title: "Bubble chart: investimento x crescimento x porte"
category: correlation
date: 2026-08-24
source: "https://r-graph-gallery.com/320-the-basis-of-bubble-plot.html"
interactive: true
resumo: "50 startups fictícias posicionadas por investimento captado e crescimento de receita, com o porte (funcionários) no tamanho da bolha."
pacotes: ["ggplot2", "ggrepel", "RColorBrewer"]
dados: "2 variáveis numéricas (eixos) + 1 numérica (tamanho) + 1 categórica (cor)"
nivel: intermediário
tags: ["correlação", "bolhas"]
---

## O que é

Um bubble chart é uma dispersão comum (duas variáveis numéricas, uma em
cada eixo) com uma terceira variável numérica codificada no **tamanho** de
cada ponto — e, opcionalmente, uma quarta variável categórica na cor.
**Para que serve**: comparar quatro dimensões de uma vez sem precisar de um
gráfico 3D, útil quando a pergunta não é só "X se relaciona com Y" mas
"X se relaciona com Y, e isso muda dependendo do porte/categoria de cada
ponto".

## Quando usar (e quando evitar)

**Use quando** a terceira variável numérica tem uma leitura natural de
"tamanho"/"peso" (população, receita, número de funcionários...) e vale a
pena ver as três variáveis JUNTAS — não em três gráficos separados.

**Evite quando** a terceira variável não é claramente "quanto maior,
melhor/mais" (o tamanho do círculo é uma leitura ordinal fraca — o olho
humano compara área pior do que compara posição num eixo), ou quando há
dezenas de pontos com valores parecidos de tamanho: bolhas de raio
parecido se sobrepõem e a leitura de qual é maior vira adivinhação. Nesses
casos, considere separar a terceira variável num eixo próprio (voltando a
ser uma dispersão comum, com um painel a mais) ou usar `facet` por
categoria.

## Que dados você precisa

- **eixo X** — variável numérica
- **eixo Y** — variável numérica
- **tamanho** — variável numérica, sempre ≥ 0 (não faz sentido bolha de
  raio negativo)
- **cor** (opcional) — variável categórica

Formato esperado: uma linha por ponto/entidade, já com as quatro colunas
prontas — não precisa agregar nada antes.

## Como ler o gráfico

- **Posição X/Y**: as duas primeiras variáveis, exatamente como numa
  dispersão comum.
- **Tamanho da bolha**: a terceira variável — bolhas maiores têm valor
  maior. A área (não o raio) é proporcional ao valor, então uma bolha
  "duas vezes maior" que outra representa um valor bem mais que o dobro em
  raio, mas exatamente o dobro em área.
- **Cor**: identifica a categoria de cada ponto.

## Como foi feito

`geom_point(aes(size = ...))` do `ggplot2` já desenha o tamanho
proporcional à ÁREA por padrão (ao contrário de outros ecossistemas de
gráfico, onde às vezes é preciso configurar isso manualmente) —
`scale_size_area()` reforça essa garantia e fixa o tamanho máximo da maior
bolha. O eixo X usa escala logarítmica (`scale_x_log10()`): o investimento
captado tem distribuição de cauda longa (poucas startups captam muito, a
maioria capta pouco), então uma escala linear amontoaria quase todo mundo
num canto só do gráfico. `ggrepel::geom_text_repel()` rotula só as 4 bolhas
maiores, evitando sobrepor texto nas outras 46.

Dados fictícios: 50 startups fictícias (`set.seed(2871)`) em 5 setores,
cada uma com um "porte" latente que gera investimento captado E número de
funcionários JUNTOS (empresa maior tende a captar mais e empregar mais
gente ao mesmo tempo — não são sorteados de forma independente), mas o
crescimento de receita tem sua própria aleatoriedade, quase independente do
porte — de propósito, pra revelar que "quem captou mais" não é sempre
"quem cresce mais rápido", a pergunta clássica que esse tipo de gráfico
ajuda a responder num contexto de investimento. Nomes de empresa gerados
por combinação (prefixo + sufixo temático por setor) em vez de rótulo
genérico tipo "Fintech 1".

A versão interativa recalcula o raio em D3 com `d3.scaleSqrt()` (a mesma
regra de área-proporcional do `ggplot2`) e mostra os quatro números de cada
empresa no tooltip; clicar num setor na legenda isola aquele grupo entre as
50 bolhas.

## Possíveis problemas pelo caminho

- **Problema**: duas bolhas de tamanhos visualmente bem diferentes (uma
  parecendo o dobro da outra) representam, na verdade, valores muito mais
  distantes que o dobro. **Por quê**: usar uma escala de RAIO linear em vez
  de área — o olho humano percebe área, não raio, então um raio 2x maior
  já parece "muito mais que o dobro" de tamanho. **Solução**: sempre usar
  uma escala de raiz quadrada (`scale_size_area()` no `ggplot2`,
  `d3.scaleSqrt()` no D3) entre o valor da variável e o raio desenhado —
  nunca uma escala linear direta.
- **Problema**: bolhas pequenas (funding baixo) ficam praticamente
  invisíveis, competindo com bolhas grandes que dominam visualmente a
  mesma região do gráfico. **Por quê**: sobreposição — uma bolha grande
  desenhada por cima esconde uma pequena embaixo. **Solução**: usar
  transparência (`alpha`) em todas as bolhas, e desenhar as maiores
  primeiro (`arrange(desc(tamanho))` antes do `ggplot()`) pra que as
  pequenas fiquem por cima, não escondidas.

## Variações possíveis

- Animar a mesma bolha ao longo do tempo (uma posição/tamanho por ano),
  como o clássico bubble chart animado do Gapminder — ver [bolhas animadas
  estilo Gapminder](../../evolution/bolhas-animadas-planetas) deste acervo
  pra essa variação, já implementada com outro tema.
- Trocar a cor categórica por uma cor contínua (uma quarta variável
  numérica), usando uma escala sequencial em vez de qualitativa — vira uma
  leitura de "quatro variáveis numéricas ao mesmo tempo" em vez de "três
  numéricas mais uma categórica".
- Facetar por categoria (`facet_wrap(~setor)`) quando o número de pontos
  por bolha ficar grande demais pra uma leitura confortável num painel só.
