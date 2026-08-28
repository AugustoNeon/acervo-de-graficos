---
title: "Dispersão com histogramas marginais"
category: correlation
date: 2026-08-21
source: "https://r-graph-gallery.com/277-marginal-histogram-for-ggplot2.html"
interactive: true
resumo: "Preço x área construída de 300 imóveis fictícios, coloridos por bairro, com a distribuição de cada eixo isoladamente nas bordas do gráfico."
veredito_uso: "a relação entre duas variáveis É a pergunta, e a forma de cada distribuição isolada também importa."
veredito_evita: "só a relação importa (os histogramas viram ruído), ou uma das variáveis é categórica."
pacotes: ["ggplot2", "dplyr", "patchwork", "RColorBrewer", "jsonlite", "d3"]
dados: "2 variáveis numéricas (uma em cada eixo) + 1 categórica opcional (cor)"
nivel: básico
tags: ["correlação", "distribuição"]
---

## O que é

Um scatterplot (gráfico de dispersão) com um histograma colado em cada
borda — um mostrando a distribuição da variável do eixo X, outro a do eixo
Y. **Para que serve**: responder duas perguntas ao mesmo tempo, sem duas
consultas separadas — "como as duas variáveis se relacionam" (o próprio
scatter) e "como cada variável se distribui sozinha" (os histogramas), sem
precisar alternar entre dois gráficos diferentes nem adivinhar a forma de
cada eixo só pela nuvem de pontos.

## Quando usar (e quando evitar)

**Use quando** a relação entre duas variáveis numéricas for o centro da
pergunta — este é o gráfico mais fundamental de toda a categoria
`correlation` — e a forma de cada distribuição isolada (assimetria,
bimodalidade, outliers) também importar pra história completa.

**Evite quando** você já sabe que só a relação entre as duas variáveis
importa (aí os histogramas são ruído visual a menos) ou quando uma das
variáveis é categórica (nesse caso um boxplot/violino por categoria conta
melhor a história do que um scatter). Evite também com poucos pontos
(dezenas): os histogramas marginais precisam de volume pra a forma da
distribuição significar alguma coisa.

## Que dados você precisa

- **duas variáveis numéricas** — uma por eixo, a relação entre elas é o que
  o gráfico existe pra mostrar.
- **uma variável categórica opcional** — usada só pra cor (aqui, o bairro do
  imóvel); não é obrigatória, um scatter de uma cor só já funciona.

Formato esperado: uma linha por observação (aqui, um imóvel), sem nenhuma
agregação prévia — os histogramas marginais são calculados a partir dos
mesmos pontos brutos do scatter.

## Como ler o gráfico

- **Cada ponto**: um imóvel — posição horizontal é a área, vertical é o
  preço.
- **Cor**: o bairro.
- **Linha tracejada**: a reta de regressão linear (`preço ~ área`) ajustada
  sobre TODOS os pontos, ignorando a cor — mostra a tendência geral, mesmo
  com grupos que têm níveis de preço bem diferentes.
- **Histograma de cima**: quantos imóveis caem em cada faixa de área,
  somando todos os bairros juntos.
- **Histograma da direita**: o mesmo, para faixas de preço.

Na versão interativa, passar o cursor num ponto destaca ele e ilumina a
faixa exata que ele ocupa nos dois histogramas marginais ao mesmo tempo.

## Como foi feito

A miniatura estática combina 4 painéis via `patchwork` (histograma de cima +
espaço vazio + scatter principal + histograma da direita, numa grade
2×2 com larguras/alturas desiguais) — o mesmo pacote já usado noutros
gráficos multi-painel deste acervo, aqui aplicado a um layout de eixos
compartilhados em vez de gráficos lado a lado. Os três painéis usam os
MESMOS limites de eixo (`scale_x_continuous(limits=)`/`scale_y_continuous`)
pra o histograma de cima ficar exatamente alinhado com o eixo X do scatter
embaixo dele, e o da direita com o eixo Y ao lado.

A versão interativa reencena os três painéis em D3 com duas escalas
lineares compartilhadas (área → X do painel principal E do histograma de
cima; preço → Y do painel principal E do histograma da direita). Os bins de
cada histograma marginal vêm prontos do R (`hist(..., breaks = <mesmo vetor
de breaks do geom_histogram>)`) — o D3 só desenha retângulos nos limites que
o R já calculou, garantindo os mesmos bins da miniatura estática por
construção. O realce ligado (passar o cursor num ponto ilumina a faixa dele
nos dois histogramas) generaliza o mesmo princípio já usado no dashboard
mapa+dispersão+barras deste acervo — só que aqui a "chave em comum" entre
painéis não é um id compartilhado, é a POSIÇÃO do ponto dentro de cada eixo.

Dados fictícios: 300 imóveis fictícios (`set.seed(2985)`) em 4 bairros, cada
um com seu próprio "preço-base por m²" — mesma área, bairro diferente, preço
final bem diferente. Gera uma correlação positiva clara dentro de cada
grupo, mas os grupos também se separam no eixo Y, o tipo de padrão que
colorir por categoria revela e um scatter de uma cor só esconderia.

## Possíveis problemas pelo caminho

- **Problema**: `geom_histogram(bins = 28)` no estático e `hist(breaks = 28)`
  na exportação pro D3 produziam bins **ligeiramente diferentes** (2 pontos
  ficavam de fora do histograma marginal). **Solução**: gere um vetor de
  `breaks` explícito uma vez só e passe o MESMO vetor pros dois lados — a
  história completa está em "Notas do coletor", no fim da página.

## Variações possíveis

- Trocar o histograma marginal por uma curva de densidade (KDE) quando o
  interesse for a forma suave da distribuição, não a contagem discreta por
  faixa.
- Colorir os histogramas marginais por bairro também (empilhados), quando
  comparar a distribuição de CADA grupo isoladamente importar mais do que a
  distribuição geral.
- Adicionar uma reta de regressão por bairro (em vez de uma só, geral) pra
  comparar a força da relação área×preço entre grupos.
- Trocar o par área×preço por qualquer outro par de variáveis numéricas —
  a técnica não muda.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../correlograma-indicadores" style="--cat-link: var(--cat-correlation); --cat-link-ink: var(--cat-correlation-ink);">
    <span class="parecido-cat">correlation</span>
    <span class="parecido-titulo">Correlograma: indicadores municipais</span>
    <span class="parecido-razao">O oposto direto: em vez de examinar UM par de variáveis a fundo, resume a correlação de TODOS os pares numa grade — bom primeiro passo antes de abrir um par específico aqui.</span>
  </a>
  <a class="parecido-item" href="../../distribution/histograma-largura-de-bin" style="--cat-link: var(--cat-distribution); --cat-link-ink: var(--cat-distribution-ink);">
    <span class="parecido-cat">distribution</span>
    <span class="parecido-titulo">Histograma: largura de bin variável</span>
    <span class="parecido-razao">A técnica de cada histograma marginal, isolada e aprofundada — inclusive a mesma armadilha de bins que não batem entre R e D3.</span>
  </a>
</div>

## Notas do coletor

Dois pontos sumiam do histograma marginal, com o aviso `Removed 2 rows
containing missing values` — mas só na versão exportada pro D3, nunca na
imagem estática. Os dois lados usavam o mesmo número de bins (28), o mesmo
dado, e pareciam fazer a mesma coisa.

O motivo é que `geom_histogram(bins = 28)` e `hist(breaks = 28)` tratam esse
número de formas diferentes por baixo dos panos. `geom_histogram` calcula
exatamente 28 bins de largura igual cobrindo o domínio da escala. `hist()`
trata 28 como **sugestão** pro algoritmo de Sturges, que pode arredondar pra
uma contagem de bins ligeiramente diferente — com limites que não cobrem
100% dos dados originais, sobrando pontos de fora.

A correção não foi ajustar o número até os dois "baterem por sorte" — foi
parar de dar um número pros dois e gerar um vetor de `breaks` explícito uma
vez só (`seq(limite_min, limite_max, length.out = 29)`), passado idêntico
pros dois lados. Bins idênticos por construção, não por coincidência de
parâmetro. Vale o mesmo cuidado em qualquer gráfico novo que precise dos
mesmos bins nos dois lados.
