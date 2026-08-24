---
title: "Radar chart com múltiplos grupos"
category: ranking
date: 2026-08-18
source: "https://r-graph-gallery.com/143-spider-chart-with-saveral-individuals.html"
interactive: true
resumo: "Um polígono por personagem, um eixo por atributo — a forma do polígono é o perfil de quem está sendo comparado."
pacotes: ["fmsb", "RColorBrewer", "d3"]
dados: "1 variável de identificação (grupo) + várias numéricas na mesma escala (uma por eixo)"
nivel: básico
tags: ["ranking", "comparação", "interativo"]
---

## O que é

Um radar (ou spider) chart mostra várias variáveis numéricas, todas na mesma
escala, como eixos que saem de um centro comum e se espalham igualmente ao
redor de um círculo. Cada grupo comparado vira um polígono, ligando o valor
que ele tem em cada eixo. **Para que serve**: comparar o *perfil* de poucos
itens — não um número isolado, mas o padrão de pontos fortes e fracos em
várias dimensões ao mesmo tempo, como uma ficha de atributos.

## Quando usar (e quando evitar)

**Use quando** você tem poucos grupos (até 4-5) e poucos eixos (3-8), as
variáveis já estão na mesma escala (ou dá pra normalizar), e o que importa é
o formato geral — onde um item se destaca, onde ele é fraco — não o valor
exato de um eixo isolado.

**Evite quando** a decisão depende de comparar valores com precisão: área e
ângulo enganam a percepção do mesmo jeito que numa rosca ou pizza, e dois
polígonos parecidos são difíceis de diferenciar de longe. Evite também com
muitos grupos (os polígonos se sobrepõem e viram emaranhado) ou muitos eixos
(cada um fica espremido, difícil de rotular). Nesses casos, um heatmap
(como o [heatmap com clustering hierárquico](../../correlation/heatmap-clustering-heatmaply)
deste acervo) ou um conjunto de barras lado a lado comunica melhor.

## Que dados você precisa

- **identificador** — quem está sendo comparado (pessoa, produto, personagem)
- **3 a 8 variáveis numéricas**, na mesma escala ou normalizadas — cada uma
  vira um eixo

Formato **largo** (uma linha por grupo, uma coluna por variável) — ao
contrário da maioria dos gráficos deste acervo, que pede dado longo/tidy.

## Como ler o gráfico

- **Eixo (posição ao redor do círculo)**: o atributo sendo medido
- **Distância do centro ao longo de um eixo**: o valor daquele grupo naquele
  atributo
- **Forma do polígono**: o perfil geral — picos são pontos fortes, vales são
  pontos fracos
- **Cor**: o grupo/personagem

## Como foi feito

`fmsb::radarchart()` desenha a partir de um `data.frame` em que as duas
**primeiras linhas** precisam ser o máximo e o mínimo de cada coluna — é o
que define a escala dos eixos, não dado de verdade, e é fácil esquecer.

Dados fictícios: três personagens de RPG (Guerreiro, Mago, Ladino) com
valores autorais — não amostrados aleatoriamente, escolhidos pra cada um ter
um perfil reconhecível (guerreiro forte e resistente mas pouco inteligente, o
oposto no mago, ladino equilibrado com pico em destreza e carisma) — em cinco
atributos (Força, Inteligência, Destreza, Vitalidade, Carisma), no lugar dos
indivíduos genéricos e das variáveis sem nome do exemplo original. Paleta
categórica fixa (`RColorBrewer::brewer.pal(3, "Set2")`) no lugar das cores
`rgb()` manuais do exemplo.

**Versão interativa**: primeira vez que este gráfico ganha versão interativa
— `fmsb` é grafismo base do R, sem widget pronto. Como a geometria é uma
grade regular (eixos igualmente espaçados, escala linear do centro pra fora),
a versão em D3 recalcula tudo a partir dos mesmos dados brutos do
`data.json`, sem precisar exportar geometria pré-calculada do R — não há
risco de divergir do `output.png` porque as duas seguem a mesma regra
simples. Passar o cursor num vértice mostra o valor exato; passar sobre um
grupo (no polígono ou na legenda) isola ele, apagando os outros dois.

## Possíveis problemas pelo caminho

- **Problema**: os eixos saem espelhados — a ordem das variáveis ao redor do
  círculo não bate com o `output.png`. **Por quê**: `fmsb::radarchart()`
  desenha os eixos em sentido **anti-horário** a partir do topo, o oposto do
  sentido horário mais comum em gráfico polar (confirmado comparando a
  imagem gerada com o cálculo manual dos ângulos). **Solução**: inverter o
  sinal do incremento angular (usar `-i`, não `+i`) ao recalcular a posição
  de cada eixo em qualquer lib fora do `fmsb`.
- **Problema**: o gráfico sai com escala errada, ou o `radarchart()` nem
  desenha. **Por quê**: a função não recebe domínio como argumento separado —
  ela lê o teto e o piso de cada eixo das duas primeiras linhas do próprio
  `data.frame`. **Solução**: sempre `rbind(rep(máximo, n), rep(mínimo, n),
  dados)` antes de plotar.
- **Problema**: a legenda encosta ou corta o gráfico. **Por quê**: por
  padrão o radar ocupa quase toda a área de plotagem, sem margem sobrando.
  **Solução**: aumentar a margem do lado da legenda (`par(mar = c(1,1,3,6))`)
  e usar `xpd = TRUE` pra permitir desenhar fora da área normal do gráfico.

## Variações possíveis

- Normalizar cada eixo pro próprio min-máx dos dados, em vez de uma escala
  fixa igual pra todos, quando as variáveis têm faixas muito diferentes entre
  si.
- Trocar preenchimento sólido por só contorno quando os polígonos se
  sobrepõem demais e o excesso de camadas translúcidas atrapalha mais do que
  ajuda.
- Reduzir pra um grupo só por vez, alternado por um seletor, se o número de
  grupos crescer — a sobreposição de muitos polígonos vira ilegível rápido.
- Animar um eixo de cada vez em vez de todos os grupos ao mesmo tempo, pra
  guiar a leitura pela ordem dos atributos.
