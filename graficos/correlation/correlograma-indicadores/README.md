---
title: "Correlograma: indicadores municipais"
category: correlation
date: 2026-08-20
source: "https://r-graph-gallery.com/correlogram.html"
interactive: true
resumo: "Matriz de correlação entre 8 indicadores municipais, reordenada por semelhança e com significância estatística marcada célula a célula."
veredito_uso: "você tem muitas variáveis numéricas (4+) e quer uma primeira leitura de quais se relacionam."
veredito_evita: "a relação entre variáveis não é linear — Pearson não enxerga isso, e a grade esconde o que existe."
pacotes: ["ggcorrplot", "RColorBrewer"]
dados: "8 variáveis numéricas medidas nas mesmas observações (matriz de correlação par a par)"
nivel: intermediário
tags: ["estatística", "matriz"]
---

## O que é

Um correlograma resume, numa grade de células coloridas, a correlação entre
todos os pares possíveis de um conjunto de variáveis numéricas. Cada célula
responde a uma pergunta pontual — "o quanto A e B andam juntas?" — e a grade
inteira, lida de uma vez, mostra que blocos de variáveis se movem em conjunto
e quais são independentes entre si.

## Quando usar (e quando evitar)

**Use quando** você tem muitas variáveis numéricas (a partir de 4-5) medidas
nas mesmas unidades e quer uma primeira leitura de quais delas se relacionam,
antes de aprofundar em qualquer par específico com um gráfico de dispersão.

**Evite quando** o número de variáveis é muito grande (acima de ~20 a grade
vira ilegível) ou quando a relação entre as variáveis não é linear — o
coeficiente de correlação de Pearson mede só o grau de associação linear, e
duas variáveis podem ter uma relação forte (em forma de U, por exemplo) com
correlação linear próxima de zero. Nesses casos, gráficos de dispersão por
par (ou uma matriz de dispersões) enxergam o que o correlograma esconde.

## Que dados você precisa

- **variáveis numéricas** — uma coluna por indicador, todas medidas nas
  mesmas observações (aqui, 8 indicadores de 150 municípios fictícios)

Formato esperado: uma tabela larga, uma linha por observação e uma coluna por
variável — o próprio código calcula a matriz de correlação (`cor()`) e o
teste de significância a partir dela, nenhum pré-processamento é necessário.

## Como ler o gráfico

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#f1a340"></span> Laranja — correlação negativa, quanto mais saturado mais forte</div>
  <div><span class="swatch" style="background:#f7f7f7;border:1px solid #ddd"></span> Quase branco — correlação perto de zero</div>
  <div><span class="swatch" style="background:#998ec3"></span> Roxo — correlação positiva, quanto mais saturado mais forte</div>
</div>

- **Posição da célula**: o par de variáveis que ela cruza, sempre o mesmo nas
  duas direções (é uma matriz simétrica — só o triângulo superior é
  desenhado, o inferior seria a mesma informação espelhada)
- **Número dentro da célula**: o coeficiente de correlação exato, de -1 a 1
- **Marca "n.s." (não significativo)**: a correlação observada nessa amostra
  pode ser só ruído — o teste estatístico não descarta a hipótese de que a
  correlação verdadeira seja zero
- **Ordem das linhas/colunas**: não é alfabética nem a ordem original —
  variáveis que se correlacionam de forma parecida com o resto são
  agrupadas lado a lado, o que faz blocos de alta correlação aparecerem como
  quadrados contíguos na grade em vez de espalhados

## Como foi feito

`cor()` calcula a matriz de correlação de Pearson entre as 8 colunas
numéricas, e `cor_pmat()` (do pacote `ggcorrplot`) calcula o p-valor de cada
par, usado para marcar células não significativas (`insig = "pch"`, ao nível
de 5%). A ordem de exibição vem de `hclust(as.dist(1 - matriz_corr))`: tratar
"1 menos a correlação" como uma distância agrupa variáveis fortemente
correlacionadas (distância baixa) antes das fracamente correlacionadas —
`ggcorrplot(hc.order = TRUE)` faz esse mesmo cálculo por baixo dos panos.

Dados fictícios: 150 municípios fictícios com 8 indicadores (renda,
escolaridade, expectativa de vida, saneamento, área verde, mortalidade
infantil, criminalidade, tempo de deslocamento), construídos a partir de um
fator latente comum de "desenvolvimento" com ruído próprio em cada variável —
por isso a estrutura de correlação lembra a de dados socioeconômicos reais
(indicadores de bem-estar puxando juntos, indicadores adversos puxando na
direção oposta), com uma variável propositalmente quase independente
(deslocamento) para mostrar como fica uma correlação não significativa na
grade.

A versão interativa recebe a mesma matriz e a mesma ordem já calculadas pelo
R (nenhum clustering é refeito no navegador) e acrescenta realce ligado: focar
uma célula destaca, ao mesmo tempo, todas as outras células que compartilham
uma das duas variáveis envolvidas, além das próprias etiquetas de linha e
coluna — uma forma de seguir uma variável específica por toda a matriz sem
precisar ler célula por célula.

## Possíveis problemas pelo caminho

- **Problema**: a matriz de correlação "confirma" uma relação que na
  verdade é espúria. **Por quê**: com muitas variáveis, o número de pares
  testados cresce rápido (8 variáveis já são 28 pares), e a chance de algum
  par dar significativo só por acaso aumenta junto — é o problema de
  comparações múltiplas. **Solução**: tratar o correlograma como ponto de
  partida exploratório, não como prova; qualquer relação que pareça
  interessante merece um teste dedicado (ou correção do nível de
  significância) antes de virar conclusão.
- **Problema**: duas variáveis que claramente deveriam se relacionar aparecem
  com correlação baixa. **Por quê**: a relação pode não ser linear (Pearson
  não enxerga isso), ou pode existir só dentro de subgrupos que se cancelam
  quando misturados. **Solução**: olhar a dispersão do par diretamente antes
  de descartar a relação.

## Variações possíveis

- Trocar o coeficiente de Pearson por Spearman (`cor(..., method = "spearman")`)
  quando a relação é monotônica mas não linear, ou existem outliers fortes
  que distorceriam o valor de Pearson
- Desenhar a matriz completa (os dois triângulos) em vez de só o superior,
  útil quando o gráfico precisa ficar legível sem depender de simetria óbvia
  para quem o vê
- Substituir o número/cor por elipses de excentricidade proporcional à força
  da correlação (`corrplot(method = "ellipse")`), uma codificação visual
  alternativa que alguns leitores acham mais rápida de escanear que números

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="dispersao-marginais-imoveis" style="--cat-link: var(--cat-correlation); --cat-link-ink: var(--cat-correlation-ink);">
    <span class="parecido-cat">correlation</span>
    <span class="parecido-titulo">Dispersão com histogramas marginais</span>
    <span class="parecido-razao">O oposto direto: quando a relação entre DUAS variáveis específicas precisa de exame direto, não do resumo em grade — inclusive pra flagrar a relação não linear que o correlograma esconde.</span>
  </a>
  <a class="parecido-item" href="../network/matriz-adjacencia-tags" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Matriz de adjacência: tags que aparecem juntas</span>
    <span class="parecido-razao">Mesma técnica — a mesma grade de células reordenada por semelhança — mas a força na célula vem de coocorrência numa rede, não de correlação estatística.</span>
  </a>
</div>

## Notas do coletor

A versão interativa saiu com o sinal da correlação invertido na primeira
tentativa: pares positivamente correlacionados apareciam laranja, os
negativos apareciam roxo — exatamente o oposto da imagem estática. O código
parecia certo: `d3.scaleDiverging(d3.interpolatePuOr).domain([-1, 0, 1])`,
mesma paleta `PuOr` usada no R.

O problema é que os dois interpoladores não concordam sobre qual ponta é
qual. `interpolatePuOr(0)` do D3 é roxo e `interpolatePuOr(1)` é laranja;
`RColorBrewer::brewer.pal(3, "PuOr")[1]` é laranja e `[3]` é roxo — direções
opostas, mesmo nome de paleta. Não há erro nem aviso, porque os dois lados
estão "certos" dentro da própria convenção — só divergem entre si, e isso só
aparece comparando lado a lado com a imagem estática.

A correção foi inverter o parâmetro do interpolador (`(t) => interpolatePuOr(1 - t)`),
não o domínio da escala — inverter o domínio teria trocado também a ordem dos
valores no eixo/legenda. Virou hábito conferir a direção de qualquer paleta
divergente nova comparando `interpolate<Nome>(0)` do D3 contra
`brewer.pal(3, "<Nome>")[1]` do R antes de assumir que os dois concordam.
