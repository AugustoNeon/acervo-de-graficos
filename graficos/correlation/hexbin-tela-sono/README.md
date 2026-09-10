---
title: "Hexbin de dispersão: tempo de tela x sono"
category: correlation
date: 2026-09-10
source: "https://r-graph-gallery.com/hexbin-map.html"
interactive: true
resumo: "Tempo de tela por dia e horas de sono por noite de 1.500 pessoas fictícias, agregados em hexágonos coloridos por contagem — a densidade real em vez de uma mancha sólida de 1.500 pontos sobrepostos."
veredito_uso: "você tem centenas ou milhares de pontos numéricos e uma dispersão comum já virou uma mancha ilegível de tanta sobreposição."
veredito_evita: "há poucas dezenas de pontos — nesse caso um scatter comum, sem agregar nada, já é legível e mostra cada ponto individual."
pacotes: ["ggplot2", "hexbin"]
dados: "2 variáveis numéricas (os dois eixos), uma linha por observação bruta"
nivel: intermediário
tags: ["correlação", "hexbin", "densidade"]
---

## O que é

Um hexbin de dispersão é um scatter plot comum onde os pontos brutos são
substituídos por uma grade de hexágonos: cada célula conta quantos pontos
caíram naquela faixa das duas variáveis e é colorida pela contagem.
**Para que serve**: resolver overplotting — quando há pontos demais para
desenhar um por um sem virar uma mancha sólida — mantendo a leitura da
relação entre as duas variáveis, agora como densidade em vez de posição
individual.

## Quando usar (e quando evitar)

**Use quando** você tiver centenas ou milhares de observações numéricas e
uma dispersão comum já não for mais legível — os pontos se sobrepõem tanto
que não dá pra distinguir onde a concentração real está, só uma mancha
única mais escura no meio.

**Evite quando** houver poucas dezenas de pontos: agregar em hexágonos
esconde informação que um scatter comum mostraria de graça (cada ponto
individual, outliers isolados) sem ganhar nada em troca — a sobreposição
que o hexbin resolve simplesmente não existe ainda nessa escala.

## Que dados você precisa

- **eixo X** — variável numérica
- **eixo Y** — variável numérica

Formato esperado: uma linha por observação bruta, sem agregar nada antes —
o próprio gráfico conta quantos pontos caem em cada célula da grade.

## Como ler o gráfico

- **Hexágono**: uma célula da grade sobre as duas variáveis — todos do
  mesmo tamanho, cobrindo a mesma faixa de valores.
- **Cor**: quantas pessoas caíram naquela célula. Mais escuro (verde
  fechado) = mais gente naquela combinação de tempo de tela e horas de
  sono; mais claro = poucas.
- **Ausência de hexágono**: nenhuma observação caiu ali — não quer dizer
  "combinação impossível", só "rara demais pra aparecer nestas 1.500
  pessoas".

Passe o cursor num hexágono para ver a contagem exata e a faixa aproximada
de tela/sono que ele representa.

## Como foi feito

A miniatura estática usa `ggplot2::geom_hex(bins = 18)`, que já faz o
binning hexagonal sozinho a partir dos 1.500 pontos brutos — sem precisar
de nenhum cálculo manual de grade no R.

A versão interativa recebe os mesmos 1.500 pontos brutos no `data.json`
(nunca os hexágonos já agregados) e monta a própria grade hexagonal no D3,
mesmo princípio de sempre desta base: o R exporta dado cru, o D3 recalcula
geometria e agregação sozinho. A técnica de agregação não precisa ser
idêntica ao `hexbin::hexbin()` usado no R (mesmo caso do enxame beeswarm
desta base — equivalência visual, não algoritmo idêntico): cada ponto é
atribuído ao centro de hexágono mais próximo por distância euclidiana, o
que — numa grade hexagonal regular — produz exatamente a mesma partição
que as células de Voronoi dos centros, sem precisar reimplementar
arredondamento de coordenada axial. Diferente do
[mapa hexagonal de avistamentos](../../map/mapa-hexbin-avistamentos-aves),
onde a grade geográfica já vinha pronta do `ggplot_build()` e só era
reaproveitada, aqui não há binning nenhum calculado no R para reler — o D3
constrói a grade do zero sobre um plano cartesiano comum.

Dados fictícios: 1.500 pessoas (`set.seed(7733)`) com tempo de tela e horas
de sono gerados como duas normais correlacionadas (`rho = -0.62`, via
`z2 = rho*z1 + sqrt(1-rho²)*ruído`, o método de Cholesky de duas variáveis)
— mais tela tende a vir com menos sono, mas com ruído suficiente pra não
virar uma linha reta perfeita.

## Possíveis problemas pelo caminho

- **Problema**: a grade de hexágonos do D3 sai visualmente diferente da
  grade do `geom_hex()` do R — não incorreta, só com um recorte diferente
  das mesmas 1.500 pessoas em células vizinhas. **Por quê**: `geom_hex()`
  escolhe o número de bins e o alinhamento da grade por conta própria a
  partir dos dados; reproduzir exatamente essa escolha no D3 exigiria
  reimplementar o algoritmo de bin do pacote `hexbin`. **Solução**: não
  tentar — como no enxame beeswarm desta base, o padrão aqui é
  equivalência VISUAL (mesma forma de nuvem, mesma leitura de densidade),
  não uma réplica pixel a pixel da grade; qualquer grade hexagonal regular
  e razoavelmente fina comunica a mesma coisa.

## Variações possíveis

- Trocar a contagem bruta por uma agregação de uma terceira variável (ex:
  idade média das pessoas em cada hexágono), mudando só a estatística por
  célula, não a técnica de binning.
- Ajustar o número de colunas da grade para mais fina (mais detalhe, mais
  ruído visual) ou mais grossa (mais suave, esconde padrões pequenos) — o
  parâmetro mais sensível da técnica, igual no mapa hexagonal desta base.
- Usar quadrados em vez de hexágonos quando o alinhamento a uma grade
  cartesiana importar mais do que a distribuição mais uniforme de
  distância que o hexágono garante.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../bolhas-investimento-startups" style="--cat-link: var(--cat-correlation); --cat-link-ink: var(--cat-correlation-ink);">
    <span class="parecido-cat">correlation</span>
    <span class="parecido-titulo">Bubble chart: investimento x crescimento x porte</span>
    <span class="parecido-razao">O oposto direto: com só 50 pontos, cada um continua visível individualmente — aqui, com 1.500, os pontos crus dariam uma mancha ilegível, por isso a agregação em hexágonos.</span>
  </a>
  <a class="parecido-item" href="../../map/mapa-hexbin-avistamentos-aves" style="--cat-link: var(--cat-map); --cat-link-ink: var(--cat-map-ink);">
    <span class="parecido-cat">map</span>
    <span class="parecido-titulo">Mapa hexagonal: densidade de avistamentos</span>
    <span class="parecido-razao">Mesma técnica de binning hexagonal por densidade, mas sobre coordenada geográfica real em vez de duas variáveis quaisquer — lá a grade nasce de um mapa, aqui de um plano cartesiano comum.</span>
  </a>
</div>
