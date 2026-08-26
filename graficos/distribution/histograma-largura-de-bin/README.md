---
title: "Histograma: largura de bin variável"
category: distribution
date: 2026-08-20
source: "https://r-graph-gallery.com/220-basic-ggplot2-histogram.html"
interactive: true
resumo: "Idade dos participantes de uma corrida de bairro fictícia, com um controle deslizante pro número de bins — mostra como poucos bins escondem os dois grupos etários e bins demais viram ruído."
pacotes: ["ggplot2", "patchwork", "RColorBrewer", "jsonlite", "d3"]
dados: "1 variável numérica contínua, uma observação por participante"
nivel: básico
tags: ["distribuição"]
---

## O que é

Um histograma divide uma variável numérica contínua em faixas de valor
(bins) de largura igual e conta quantas observações caem em cada uma,
desenhando essa contagem como a altura de uma barra. **Para que serve**:
a primeira pergunta que se faz de qualquer variável numérica nova — "que
forma essa distribuição tem? onde ela se concentra? tem mais de um grupo
misturado aqui?"

## Quando usar (e quando evitar)

**Use quando** quiser entender a forma de uma única variável numérica antes
de qualquer outra análise — é geralmente o primeiro gráfico que se faz de um
dado novo. Também serve pra decidir se faz sentido tratar a variável como
normal, assimétrica, ou (como neste gráfico) uma mistura de grupos
diferentes.

**Evite quando** precisar comparar várias categorias ao mesmo tempo — vários
histogramas sobrepostos ficam ilegíveis rápido; um
[boxplot](../boxplot-classico) ou um [violino](../violino-e-boxplot) resolve
melhor esse caso. Evite também confiar demais numa única largura de bin: como
este gráfico mostra na prática, a MESMA distribuição pode parecer unimodal
ou bimodal dependendo só de quantos bins você escolheu — sempre vale testar
mais de uma largura antes de tirar conclusão.

## Que dados você precisa

- **uma variável numérica contínua** — uma linha por observação (aqui, a
  idade de cada participante).

Não precisa de variável categórica nenhuma — ao contrário da maioria dos
outros gráficos de `distribution` deste acervo, o histograma clássico
descreve uma distribuição só, não compara grupos.

## Como ler o gráfico

- **Barras**: altura = quantos participantes caem naquela faixa de idade.
- **Curva por cima**: densidade estimada da mesma distribuição (KDE) — não
  muda de forma quando você mexe no controle, só de escala (pra continuar do
  tamanho certo em relação ao eixo Y, que muda com o número de bins).
  Comparar a curva (fixa na forma) com as barras (que mudam) é o ponto do
  gráfico: a curva mostra que só existe UMA distribuição por baixo, e as
  barras são só uma forma, entre várias possíveis, de resumi-la.
- **Controle deslizante**: arraste pra mudar o número de bins — poucos bins
  (esquerda) fundem os dois grupos etários numa forma só; muitos bins
  (direita) fragmentam os dados em ruído.

Passe o cursor sobre uma barra pra ver a faixa de idade exata e quantos
participantes caem nela.

## Como foi feito

A miniatura estática é um poster com três larguras de bin fixas
(`geom_histogram(bins = 5/18/60)`) sobre o mesmo dado — cada painel
corresponde a uma posição aproximada do controle da versão interativa.

A versão interativa usa `d3.bin()` pra recalcular os bins a cada movimento do
controle, sobre os valores brutos exportados pelo R (nenhuma contagem
pré-calculada). A curva de densidade usa a mesma função de KDE gaussiano
(`shared/densidade.ts`) já compartilhada entre o
[ridgeline](../ridgeline-avaliacoes-bairros) e o
[violino](../violino-e-boxplot) deste acervo — calculada uma vez só (não
depende do slider); o que muda a cada arrasto é só o fator que converte
densidade em "contagem esperada por bin" (`densidade × n × largura do bin
atual`), pra ela continuar na mesma escala do eixo Y.

Ao contrário dos outros switchers deste acervo, as barras NÃO usam uma
chave estável entre posições do slider — cada movimento troca completamente
os limites de cada bin, então não existe "a mesma barra mudando de forma"
pra preservar. As barras entram e saem pelo enter/exit comum do D3, indexadas
por posição.

Dados fictícios: idade de 300 participantes de uma corrida de bairro
fictícia (`set.seed(918)`), misturando de propósito uma categoria infantil
(90 participantes, 6–16 anos) e uma categoria adulta (210 participantes,
18–70 anos) — o exemplo clássico de por que a largura do bin importa: os
dois grupos só aparecem separados numa faixa intermediária de bins.

## Possíveis problemas pelo caminho

- **Problema**: com poucos bins (controle todo pra esquerda), a curva de
  densidade fica visivelmente mais alta que qualquer barra. **Por quê**: a
  curva é normalizada pela largura de bin ATUAL, mas o pico da densidade
  real (perto dos participantes infantis, um grupo estreito e concentrado)
  é mais agudo do que um bin largo consegue capturar — a barra "achata" um
  pico que a curva continua mostrando fielmente. **Solução**: nenhuma — é o
  comportamento correto, e reforça visualmente o ponto do gráfico (a barra
  perde informação que a curva preserva).

## Variações possíveis

- Densidade em vez de contagem no eixo Y (`after_stat(density)`) — deixa a
  curva e as barras na mesma escala sempre, sem precisar do fator de
  conversão.
- Regra automática de bins (Freedman-Diaconis, Sturges) marcada com uma linha
  vertical no controle, pra mostrar onde a heurística "recomendada" cairia.
- Histograma + rug plot (marcas na base pra cada observação individual),
  útil quando a amostra é pequena o bastante pra não poluir.
