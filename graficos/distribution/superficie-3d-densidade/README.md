---
title: "Superfície 3D de densidade (plotly + MASS::kde2d)"
category: distribution
date: 2026-07-23
source: "https://www.data-to-viz.com/graph/density2d.html"
interactive: true
resumo: "A mesma estimativa de densidade de um plano, mas levantada como relevo tridimensional que dá para girar e ampliar."
pacotes: ["plotly", "MASS", "webshot2"]
dados: "duas variáveis numéricas (uma linha por observação)"
nivel: intermediário
tags: ["3D", "densidade"]
---

## O que é

A mesma ideia da densidade bidimensional, com a terceira dimensão usada de fato: a
concentração de pontos vira **altura**. O resultado é uma paisagem — picos onde há
muitas observações, vales onde há poucas.

**Para que serve**: tornar imediata a percepção de quantos picos existem e o quanto
um é mais alto que o outro. Em curvas de nível essa comparação depende de contar
contornos; em relevo, o olho responde na hora.

## Quando usar (e quando evitar)

**Use quando** a distribuição tiver múltiplos picos e a comparação entre as alturas
deles for o ponto principal — e quando o leitor puder girar a superfície. É um
gráfico de exploração e de apresentação ao vivo.

**Evite quando** o resultado for consumido como imagem estática: um ângulo fixo
sempre esconde parte da superfície atrás dos picos, e a perspectiva distorce as
alturas (o que está mais perto parece maior). Para leitura precisa ou impressa, a
versão 2D com contornos é superior.

Vale a regra geral: 3D em visualização de dados costuma ser decoração. Aqui se
justifica porque a terceira dimensão carrega informação real e o giro é possível.

## Que dados você precisa

- **Duas variáveis numéricas contínuas** — as duas dimensões da base.
- Uma linha por observação.

A altura não vem de nenhuma coluna: é **calculada** a partir da densidade dos
pontos. Não é preciso fornecer terceira variável.

## Como ler o gráfico

- **Base (dois eixos horizontais)**: as duas variáveis originais.
- **Altura**: a densidade estimada — quantas observações se concentram ali.
- **Cor**: acompanha a altura, reforçando a leitura do relevo.
- **Cada pico** é uma concentração de observações; **vários picos** indicam
  subgrupos.
- **Um platô largo e baixo** é uma distribuição espalhada, sem concentração clara.

Arraste para girar, use a roda do mouse para aproximar. Girar não é enfeite: é a
única forma de ver o que está escondido atrás dos picos.

## Como foi feito

O processo tem dois passos separados. Primeiro `MASS::kde2d()` estima a densidade
sobre uma grade regular (`n = 50`), devolvendo uma matriz de alturas. Depois
`plotly::add_surface()` desenha essa matriz como superfície interativa.

O parâmetro `n` define a resolução da grade: valores baixos deixam a superfície
facetada, valores altos custam desempenho no navegador sem ganho visual real.

A escala de cores usa `colorscale = "Earth"`, que reforça a leitura topográfica.

A miniatura estática é apenas um ângulo de câmera padrão, capturado com
`webshot2::webshot()` — a versão de verdade é a interativa.

Dados fictícios: os mesmos quatro agrupamentos gaussianos com `set.seed(2026)`
usados na [densidade 2D](../densidade-2d-contorno), justamente para as duas
versões serem comparáveis lado a lado.

## Possíveis problemas pelo caminho

- **Problema**: a superfície sai angulosa, com facetas visíveis. **Por quê**: a
  grade do `kde2d()` está grosseira demais. **Solução**: aumentar `n` — mas sem
  exagero, porque o custo de renderização cresce rápido.

- **Problema**: o gráfico fica lento ou trava ao girar. **Por quê**: grade grande
  demais, com milhares de vértices. **Solução**: reduzir `n`; acima de 100 × 100 o
  ganho visual é mínimo e o custo, grande.

- **Problema**: um pico importante não aparece. **Por quê**: está escondido atrás
  de outro no ângulo escolhido. **Solução**: girar — e, se o destino for uma
  imagem estática, considerar a versão 2D.

- **Problema**: as alturas parecem diferentes do esperado. **Por quê**: a
  perspectiva 3D distorce sistematicamente — o que está mais próximo da câmera
  parece maior. **Solução**: não usar este gráfico para comparação quantitativa
  precisa.

- **Problema**: salvar o widget falha por falta de `pandoc`. **Solução**: usar
  `selfcontained = FALSE` e manter a pasta `widget_files/` junto do HTML.

## Variações possíveis

- Ativar os contornos projetados na base (`contours`), unindo a leitura 3D com a
  precisão das curvas de nível.
- Trocar a paleta por uma perceptualmente uniforme (viridis) quando a cor precisar
  ser lida quantitativamente.
- Sobrepor os pontos originais como dispersão 3D rente à base, mostrando o dado
  bruto que gerou o relevo.
- Fixar a câmera num ângulo escolhido (`layout(scene = list(camera = ...))`) quando
  o gráfico for usado em apresentação com enquadramento definido.
