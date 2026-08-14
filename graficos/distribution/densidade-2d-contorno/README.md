---
title: "Densidade 2D em bandas de contorno"
category: distribution
date: 2026-07-23
source: "https://www.data-to-viz.com/graph/density2d.html"
interactive: true
resumo: "Bandas de contorno mostrando onde os pontos se concentram, no lugar de um gráfico de dispersão com sobreposição demais."
pacotes: ["ggplot2", "jsonlite", "d3"]
dados: "duas variáveis numéricas (uma linha por observação)"
nivel: básico
tags: ["interativo", "densidade", "distribuição"]
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

O gráfico é desenhado em D3, no próprio runtime do site — não existe um widget R
pronto pra esse tipo de mapa, então tanto a miniatura quanto a versão interativa
calculam sua própria estimativa de densidade, cada uma com seu método:

- **`output.png`**: `stat_density_2d()` (que usa `MASS::kde2d()` por baixo) com
  `geom = "polygon"` e `contour = TRUE` devolve bandas preenchidas prontas para o
  `ggplot2` — cada banda é o contorno de um nível de igual densidade, como as
  curvas de nível de um mapa topográfico.
- **Versão interativa**: `d3.contourDensity()` recalcula as bandas do zero, a
  partir dos mesmos pontos brutos exportados no `data.json` — o R não exporta a
  geometria pronta porque bandas de contorno podem ter furos (uma banda mais densa
  "vazada" dentro de uma menos densa), estrutura incômoda de serializar de forma
  genérica. A paridade visual entre as duas vem de usarem a mesma paleta
  (`YlOrRd`, sequencial) e a mesma família de técnica — não de desenhar
  pixel-a-pixel a mesma geometria calculada duas vezes por algoritmos diferentes.

O controle deslizante muda `.thresholds(n)` do `d3.contourDensity()` — o mesmo
parâmetro "número de níveis" citado acima, agora ajustável em tempo real: poucos
níveis simplificam demais, muitos criam ruído visual. Passar o cursor sobre o
gráfico faz um teste de ponto-dentro-de-polígono (regra par-ímpar, a mesma que o
`fill-rule` padrão do SVG usa) contra cada banda, da mais densa pra menos densa,
pra achar qual nível está sob o cursor.

Dados fictícios: quatro agrupamentos gaussianos gerados com `rnorm()` e
`set.seed(2026)`, escolhidos para que os múltiplos picos ficassem visíveis.

Existe uma versão tridimensional da mesma distribuição em
[superfície 3D de densidade](../superficie-3d-densidade) — mesmos dados, outra
forma de olhar.

## Possíveis problemas pelo caminho

- **Problema**: a densidade "vaza" para fora da região onde existem dados. **Por
  quê**: a estimativa por kernel espalha massa em torno de cada ponto, inclusive
  para além do limite observado. **Solução**: reduzir a largura de banda
  (`bandwidth()` no D3, `h` no `MASS::kde2d()`); e ter em mente que a suavidade das
  bordas é artefato do método, não do dado.

- **Problema**: aparecem picos onde há pouquíssimas observações. **Por quê**: com
  poucos dados a estimativa é instável. **Solução**: aumentar a amostra ou trocar
  por um gráfico de dispersão.

- **Problema**: as bandas mais externas desaparecem ao aumentar muito o número de
  níveis. **Por quê**: com muitos níveis, os intervalos de densidade entre um e
  outro ficam finos demais pra sobrar espaço visível nas regiões de baixa
  densidade. **Solução**: não é um bug — é o próprio trade-off que o controle
  deslizante existe pra deixar explorar; comece de novo com poucos níveis pra
  reancorar a leitura.

- **Problema**: o hover não encontra nenhuma banda mesmo com o cursor visivelmente
  dentro de uma. **Por quê**: o teste par-ímpar depende de os polígonos estarem
  fechados e sem auto-interseção — um contorno degenerado (raro, mas possível em
  bandas muito finas) pode confundir a contagem de cruzamentos. **Solução**:
  aumentar levemente o `bandwidth()` costuma resolver, suavizando a banda o
  suficiente pra evitar geometria degenerada.

## Variações possíveis

- Sobrepor os pontos originais com opacidade baixa, unindo a visão geral da
  densidade e o dado bruto.
- Colorir por grupo em vez de por densidade — várias distribuições sobrepostas,
  cada uma com um matiz e as bandas mais externas com bastante transparência.
- Adicionar um segundo controle pra largura de banda (`bandwidth()`), ao lado do
  de número de níveis — juntos, os dois parâmetros que mais mudam o resultado da
  estimativa ficam exploráveis em tempo real.
- Trocar os poucos toques finais que ainda mudam entre uma execução e outra por
  algo determinístico visualmente — por exemplo, fixar o domínio da escala de cor
  em vez de recalculá-lo a cada nível, pra que a cor de uma banda específica não
  mude de tom ao mover o controle deslizante.
