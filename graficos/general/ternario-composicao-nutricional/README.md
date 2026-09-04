---
title: "Ternário: composição nutricional de alimentos"
category: general
date: 2026-09-04
source: "https://r-graph-gallery.com/ternary-diagram (pacote ggtern indisponível nesta sessão — implementado à mão em ggplot2 puro; URL da página de origem não conferida, domínio bloqueado)"
interactive: true
resumo: "24 alimentos fictícios posicionados num triângulo pela composição de proteína, carboidrato e gordura — os três somam sempre 100%, e a posição dentro do triângulo mostra o equilíbrio entre eles de uma vez só."
veredito_uso: "você tem exatamente 3 partes que somam um total fixo (100%, ou qualquer constante) e quer comparar a composição de vários itens ao mesmo tempo."
veredito_evita: "são só 2 partes (aí um eixo simples ou barra 100% resolve) ou mais de 3 — o triângulo só existe pra exatamente três."
pacotes: ["ggplot2"]
dados: "3 valores por item que somam sempre a mesma constante (composição, não série nem categoria livre)"
nivel: avançado
tags: ["composição", "proporção", "geometria", "nutrição"]
---

## O que é

Um gráfico ternário posiciona cada item dentro de um triângulo equilátero
a partir de três valores que somam sempre o mesmo total — aqui, proteína +
carboidrato + gordura = 100% das calorias de cada alimento. Cada vértice
do triângulo representa 100% de um dos três componentes; quanto mais perto
de um vértice, mais aquele componente domina a composição do item. **Para
que serve**: comparar a composição relativa de muitos itens de uma vez,
revelando agrupamentos (itens parecidos ficam próximos no triângulo) que
três colunas de porcentagem numa tabela não deixam ver de bate-pronto.

## Quando usar (e quando evitar)

**Use quando** seu dado tem exatamente três componentes que somam sempre
o mesmo total — composição química, alocação de tempo em três atividades,
resultado eleitoral de três candidatos, mistura de três ingredientes.

**Evite quando** são só duas partes (a soma de duas partes fixas já é
totalmente descrita por uma delas — um eixo simples, ou uma barra 100%
empilhada, mostra a mesma informação sem exigir aprender a ler um
triângulo) ou mais de três (a geometria do ternário não generaliza além
de 3 dimensões; com 4+ partes, a técnica certa é um radar/spider chart ou
coordenadas paralelas). Também evite se o público não tiver familiaridade
nenhuma com a leitura de um triângulo de composição — é uma das técnicas
menos intuitivas de bater o olho pela primeira vez neste acervo.

## Como ler o gráfico

- **Os três vértices**: cada um é 100% de um macronutriente (Proteína no
  topo, Carboidrato na base à esquerda, Gordura na base à direita) — um
  alimento bem próximo de um vértice é quase inteiramente feito daquele
  macronutriente.
- **Posição dentro do triângulo**: a mistura dos três — um ponto no meio é
  aproximadamente 1/3 de cada; um ponto perto de uma aresta tem pouco do
  macronutriente do vértice oposto àquela aresta.
- **Linhas de grade**: níveis de 25%/50%/75% de cada macronutriente, cada
  família de linha paralela ao lado oposto ao vértice correspondente —
  ajuda a estimar a porcentagem sem precisar passar o cursor em cima.

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#3B6E8F"></span> Proteico — 50% ou mais das calorias vêm de proteína</div>
  <div><span class="swatch" style="background:#C9A24B"></span> Carboidrato — 50% ou mais vêm de carboidrato</div>
  <div><span class="swatch" style="background:#B34747"></span> Gorduroso — 50% ou mais vêm de gordura</div>
  <div><span class="swatch" style="background:#4A7B6D"></span> Equilibrado — nenhum macronutriente passa de 50%</div>
</div>

## Como foi feito

**Estático**: sem nenhum pacote de ternário (ver "Notas do coletor" sobre
por quê), a transformação de coordenadas baricêntricas pra cartesianas é
feita à mão — `x = gordura + proteína/2`, `y = proteína × altura`, com as
três frações normalizadas pra somar 1. As três famílias de linha de grade
(uma por macronutriente) usam a mesma lógica: a linha de nível *k* de um
vértice é sempre paralela ao lado **oposto** aquele vértice — geometria
padrão de qualquer diagrama ternário, derivada aqui em vez de importada de
um pacote.

**Dado fictício**: composição de macronutrientes de 24 alimentos comuns,
escrita à mão (não sorteada) pra cobrir o triângulo inteiro de propósito —
alguns bem perto de cada vértice (clara de ovo quase pura proteína, açúcar
quase puro carboidrato, azeite puro gordura) e um grupo no meio
(equilibrados), em vez de confiar em sorteio aleatório, que tende a
amontoar pontos perto do centro quando a soma é restrita a um total fixo.

**Perfil (cor)**: calculado a partir dos próprios dados no R (não escrito
à mão) — 50% ou mais de um macronutriente define o perfil daquele
alimento; sem nenhum vencedor, vira "Equilibrado". A cor de cada perfil
nasce uma única vez (`cor_perfil`) e alimenta as duas versões.

**Na versão interativa**: o D3 recebe só as três frações brutas de cada
alimento (não x/y prontos) e recalcula a mesma transformação baricêntrica
do R — garantindo que um alimento nunca caia num lugar diferente do
triângulo entre as duas versões, sem precisar exportar geometria nenhuma
do R. Legenda clicável isola um perfil; passar o cursor sobre um ponto
mostra o nome do alimento e as três porcentagens exatas.

## Possíveis problemas pelo caminho

- **Problema**: o pacote que o gráfico ternário normalmente usa (`ggtern`)
  não estava disponível nem via `apt` nem via CRAN nesta sessão (CRAN
  bloqueado — ver `docs/SETUP.md`). **Por quê**: `ggtern` não é um pacote
  Ubuntu empacotado, e a rede de saída bloqueia `cloud.r-project.org`
  neste ambiente. **Solução**: implementar a transformação baricêntrica
  manualmente com `ggplot2` puro (a matemática é simples o bastante pra
  não precisar de um pacote dedicado) — vantagem colateral: a mesma
  fórmula, e não um pacote, alimenta a versão D3, então as duas nunca
  podem discordar de onde um ponto cai.

## Variações possíveis

- Trocar o corte de 50% do perfil por um gradiente contínuo de cor (ex:
  interpolação RGB entre as três cores dos vértices, pesada pelas
  frações), útil quando a fronteira exata entre perfis importa menos que
  ver o gradiente cheio.
- Conectar pontos relacionados com uma linha (ex: a mesma receita antes e
  depois de uma reformulação nutricional), transformando o ternário num
  gráfico de trajetória dentro do triângulo.
- Adicionar contornos de densidade (2D KDE projetada no triângulo) por
  cima dos pontos, quando o número de itens crescer o bastante pra
  sobreposição de pontos individuais virar um problema de leitura.

## Notas do coletor

<div class="pull-quote">a mesma fórmula, e não um pacote, alimenta a versão D3, então as duas nunca podem discordar de onde um ponto cai</div>

Esta é a primeira geometria genuinamente nova do acervo em várias sessões
— nenhum outro gráfico usa coordenadas baricêntricas, e a falta do
`ggtern` (bloqueado nos dois canais de instalação de pacote deste
ambiente) acabou sendo uma decisão melhor do que parecia inicialmente: em
vez de aprender a API de um pacote de terceiros só pra desenhar um
triângulo, a fórmula de conversão saiu direto da geometria (um vértice por
componente, um ponto é a média ponderada dos três vértices pelas frações
de cada componente) e coube em duas linhas de R. Isso também resolveu de
graça o problema que mais aparece neste acervo quando um gráfico usa
pacote de terceiro pra layout (rede, hierarquia, clustering): a versão
interativa não tem como reaproveitar geometria calculada por um pacote que
ela não usa. Aqui não teve esse problema porque nunca existiu geometria
pra reaproveitar — só uma fórmula, replicável em qualquer linguagem.
