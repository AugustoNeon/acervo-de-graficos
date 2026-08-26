---
title: "Sunburst zoomável: catálogo de streaming"
category: part-of-whole
date: 2026-08-25
source: "https://r-graph-gallery.com/sunburst.html"
interactive: true
resumo: "Catálogo de um streaming fictício em três níveis — gênero, subgênero e título — com zoom e recolorir ao vivo na versão interativa."
pacotes: ["ggplot2", "dplyr", "colorspace"]
dados: "3 variáveis categóricas hierárquicas + 1 numérica"
nivel: avançado
tags: ["hierarquia", "zoom", "animação"]
---

## O que é

Um sunburst é a versão radial de uma hierarquia parte-do-todo: cada anel
representa um nível (gênero, depois subgênero, depois título), e o ângulo
de cada fatia é proporcional ao valor que ela representa dentro do próprio
nível pai. **Para que serve**: mostrar proporção E estrutura hierárquica ao
mesmo tempo — dá pra comparar fatias dentro do mesmo anel (mesmo nível) e
também enxergar, com um olhar, quantos ramos e folhas cada categoria tem.

## Quando usar (e quando evitar)

**Use quando** o dado tem hierarquia de verdade (2-4 níveis) e tanto a
proporção quanto a estrutura da árvore importam pra quem vai ler.

**Evite quando** a hierarquia tem só um nível (aí um donut ou pizza comum
já resolve, sem a complexidade extra) ou quando há muitos níveis/muitas
fatias pequenas no anel mais externo — a fatia fica fina demais pra rotular
ou até clicar. Nesses casos um treemap costuma aproveitar melhor o espaço
(retângulos, não fatias de arco, então uma folha pequena ainda vira uma
área utilizável).

## Que dados você precisa

- **de 2 a 4 variáveis categóricas encadeadas** — cada uma um nível da
  hierarquia (aqui: gênero → subgênero → título)
- **1 variável numérica** — o valor de cada folha (aqui, horas assistidas);
  o valor de cada nó pai é a soma dos filhos, calculada automaticamente

Formato: uma linha por folha (nível mais interno da hierarquia), com as
colunas categóricas de cada nível acima dela preenchidas.

## Como ler o gráfico

- **Anel**: o nível da hierarquia — mais perto do centro é mais genérico
  (gênero), mais longe é mais específico (título).
- **Ângulo da fatia**: proporção do valor dentro do próprio nó pai — a soma
  dos ângulos de todas as fatias-filhas de um nó preenche exatamente o
  ângulo do próprio nó.
- **Cor** (modo padrão): uma cor-base por gênero, clareada em cada anel mais
  externo — deixa óbvio que uma fatia pequena pertence ao mesmo ramo da
  fatia grande logo atrás dela.
- **Buraco no centro**: mostra o nó atualmente em foco (o catálogo inteiro,
  ou o ramo em que você deu zoom) e a porcentagem que ele representa do
  nível acima.

## Como foi feito

A imagem estática replica o algoritmo de partição hierárquica (o mesmo que
o `d3.partition()` faz) calculando à mão, por nível, a fração acumulada do
círculo que cada nó ocupa (`cumsum()` do valor dividido pelo total),
desenhando cada anel como `geom_rect()` com eixo Y discreto por
profundidade e usando `coord_polar(theta = "x")` pra dobrar os retângulos em
arcos.

A versão interativa refaz essa árvore com `d3.hierarchy()` +
`d3.partition()` de verdade, e adiciona duas camadas que só existem em
código: **zoom por clique** (clicar numa fatia reenquadra a árvore nela,
recalculando o ângulo/raio de todo mundo com uma transição de arco animada;
clicar no centro volta um nível) e **um seletor de modo de cor** — além do
modo "por categoria" (igual à imagem estática), dá pra recolorir por
profundidade (só a estrutura da árvore, sem distinguir gênero) ou por valor
(destaca os títulos mais assistidos, achatando o resto pra cinza).

Dados fictícios: horas assistidas de 23 títulos fictícios, agrupados em 10
subgêneros e 5 gêneros, com tamanhos desiguais de propósito — alguns gêneros
dominam o catálogo, outros são nicho.

## Possíveis problemas pelo caminho

- **Problema**: uma fatia do anel mais externo fica fina demais pra clicar
  ou ler. **Por quê**: acontece quando um nó pai tem muitos filhos com
  valores pequenos e parecidos entre si. **Solução**: agrupar os menores
  numa fatia "outros", ou limitar a hierarquia a 3 níveis (como aqui) em vez
  de deixar crescer sem limite.
- **Problema**: a transição de zoom "pula" em vez de animar suavemente.
  **Por quê**: interpolar `x0`/`x1`/`y0`/`y1` direto (em vez de um objeto
  intermediário) faz o D3 trocar os valores no fim da transição, não ao
  longo dela. **Solução**: guardar o estado atual de cada nó (`current`) e
  interpolar explicitamente dele até o alvo a cada quadro.

## Variações possíveis

- Trocar o clique por hover pra dar zoom automaticamente ao passar o
  cursor, útil quando o gráfico for só de exploração rápida.
- Adicionar uma "trilha" (breadcrumb) de texto acima do gráfico mostrando o
  caminho completo até o nó em foco, além do rótulo no centro.
- Limitar a profundidade visível (ex: sempre mostrar só 2 anéis a partir do
  foco atual), útil quando a hierarquia real tiver muito mais que 3 níveis.
