---
title: "Densidade 2D (stat_density_2d)"
category: distribution
date: 2026-07-23
source: "https://www.data-to-viz.com/graph/density2d.html"
interactive: false
resumo: "Mapa de calor de onde os pontos se concentram, no lugar de um gráfico de dispersão com sobreposição demais."
pacotes: ["ggplot2", "hrbrthemes"]
dados: "duas variáveis numéricas (uma linha por observação)"
nivel: básico
tags: ["estático", "densidade", "distribuição"]
---

## O que é

A versão bidimensional de um gráfico de densidade. Em vez de desenhar cada
observação como um ponto, estima-se a **concentração de pontos** em cada região do
plano e pinta-se o resultado — como um mapa topográfico da distribuição.

**Para que serve**: resolver o problema clássico do gráfico de dispersão com muitos
dados. Quando milhares de pontos se sobrepõem, tudo vira uma mancha sólida e não
dá para saber onde estão as concentrações reais. A densidade responde exatamente
isso.

## Quando usar (e quando evitar)

**Use quando** houver muitos pontos e a sobreposição estiver escondendo a
estrutura. Quanto mais dados, melhor funciona — é o oposto da maioria das técnicas.

**Evite quando** houver poucas observações: com poucas dezenas de pontos a
estimativa é instável e inventa formas que não existem nos dados. Nesse caso o
gráfico de dispersão comum é mais honesto. Evite também quando os pontos
individuais importarem (identificar valores atípicos, por exemplo) — a densidade
os apaga por definição.

Um bom meio-termo é sobrepor os pontos à densidade com transparência.

## Que dados você precisa

- **Duas variáveis numéricas contínuas** — uma para cada eixo.
- Uma linha por observação, sem agregação prévia.

Não há um mínimo formal, mas abaixo de algumas centenas de pontos o resultado
começa a ficar pouco confiável.

## Como ler o gráfico

- **Eixos**: as duas variáveis, como num gráfico de dispersão comum.
- **Cor**: a densidade estimada — quanto mais intensa, mais observações naquela
  região.
- **Linhas de contorno**: níveis de igual densidade, como curvas de nível de um
  mapa. Contornos apertados indicam mudança brusca; espaçados, transição suave.
- **Vários picos separados** indicam subgrupos nos dados — geralmente o achado
  mais interessante desse gráfico.

Importante: a cor representa **concentração de observações**, não o valor de uma
terceira variável.

## Como foi feito

`stat_density_2d()` faz a estimativa por kernel e devolve a superfície pronta para
o `ggplot2`. Com `geom = "polygon"` e `aes(fill = after_stat(density))`, as faixas
saem preenchidas em vez de apenas contornadas.

O parâmetro que mais muda o resultado é o número de níveis (`bins` ou `n`): poucos
níveis simplificam demais, muitos criam ruído visual.

A paleta é `scale_fill_distiller(palette = "YlOrRd")`, sequencial — apropriada para
uma grandeza que só cresce, como densidade.

Dados fictícios: quatro agrupamentos gaussianos gerados com `rnorm()` e
`set.seed(2026)`, escolhidos para que os múltiplos picos ficassem visíveis.

Existe uma versão tridimensional e interativa da mesma distribuição em
[superfície 3D de densidade](../superficie-3d-densidade) — mesmos dados, outra
forma de olhar.

## Possíveis problemas pelo caminho

- **Problema**: `aes(fill = ..density..)` gera aviso de sintaxe obsoleta. **Por
  quê**: a notação `..variavel..` foi substituída no ggplot2 moderno. **Solução**:
  usar `aes(fill = after_stat(density))`.

- **Problema**: a densidade "vaza" para fora da região onde existem dados. **Por
  quê**: a estimativa por kernel espalha massa em torno de cada ponto, inclusive
  para além do limite observado. **Solução**: recortar com
  `coord_cartesian()` ou reduzir a largura de banda; e ter em mente que a suavidade
  das bordas é artefato do método, não do dado.

- **Problema**: aparecem picos onde há pouquíssimas observações. **Por quê**: com
  poucos dados a estimativa é instável. **Solução**: aumentar a amostra ou trocar
  por um gráfico de dispersão.

- **Problema**: as cores não distinguem nada — quase tudo sai no mesmo tom. **Por
  quê**: há uma concentração muito dominante que comprime o resto da escala.
  **Solução**: usar uma transformação (raiz ou log) na escala de preenchimento.

## Variações possíveis

- Trocar `geom = "polygon"` por contornos em linha, resultado mais leve e discreto.
- Sobrepor os pontos originais com `geom_point(alpha = 0.1)`, unindo a visão geral
  e o dado bruto.
- Usar `geom_hex()` ou `geom_bin2d()`, que contam observações em células em vez de
  estimar uma superfície contínua — menos suave, mais fiel ao dado.
- Separar em painéis por categoria com `facet_wrap()` para comparar distribuições
  entre grupos.
