---
title: "Densidade 2D em bandas de contorno"
category: distribution
date: 2026-07-23
source: "https://www.data-to-viz.com/graph/density2d.html"
interactive: true
resumo: "Bandas de contorno mostrando onde os pontos se concentram, no lugar de um gráfico de dispersão com sobreposição demais."
veredito_uso: "há muitos pontos e a sobreposição está escondendo a estrutura — quanto mais dados, melhor funciona."
veredito_evita: "há poucas dezenas de observações, ou os pontos individuais (atípicos, por exemplo) importam."
pacotes: ["ggplot2", "jsonlite", "d3"]
dados: "duas variáveis numéricas (uma linha por observação)"
nivel: básico
tags: ["densidade", "distribuição"]
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
estrutura.

<div class="pull-quote pull-quote-direita clearfix">quanto mais dados, melhor funciona — é o oposto da maioria das técnicas</div>

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

- **Problema**: o hover não encontra nenhuma banda mesmo com o cursor
  visivelmente dentro de uma. **Por quê**: um contorno degenerado (raro, em
  bandas muito finas) pode confundir o teste par-ímpar — ver "Notas do
  coletor" pra como esse teste lida com furos. **Solução**: aumentar
  levemente o `bandwidth()` costuma suavizar o suficiente pra evitar a
  geometria degenerada.

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

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../superficie-3d-densidade" style="--cat-link: var(--cat-distribution); --cat-link-ink: var(--cat-distribution-ink);">
    <span class="parecido-cat">distribution</span>
    <span class="parecido-titulo">Superfície 3D de densidade (plotly + MASS::kde2d)</span>
    <span class="parecido-razao">Mesmos dados exatos, outro ângulo de propósito: a mesma distribuição, vista como bandas de contorno de cima aqui, e como relevo tridimensional lá.</span>
  </a>
  <a class="parecido-item" href="../../correlation/dispersao-marginais-imoveis" style="--cat-link: var(--cat-correlation); --cat-link-ink: var(--cat-correlation-ink);">
    <span class="parecido-cat">correlation</span>
    <span class="parecido-titulo">Dispersão com histogramas marginais</span>
    <span class="parecido-razao">O oposto direto pra poucos dados: quando a amostra é pequena demais pra uma estimativa de densidade confiável, um scatter comum é mais honesto que bandas suavizadas.</span>
  </a>
</div>

## Notas do coletor

O teste de "que banda está sob o cursor" parecia que ia exigir tratar cada
banda como um caso especial: bandas de contorno de densidade podem ter
**furos** — uma região mais densa "vazada" dentro de uma menos densa —, e a
suspeita inicial era que o teste ponto-dentro-de-polígono precisaria saber
diferenciar o anel externo de cada banda do anel do furo, pra não contar o
miolo vazado como parte dela.

Não precisou. A regra par-ímpar (a mesma que o `fill-rule` padrão do SVG
usa) aplicada em **todos os anéis de todas as bandas de uma vez**, sem
distinguir anel externo de furo, já dá o resultado certo por conta própria:
um raio partindo de um ponto dentro de um furo cruza um número par de
anéis — entra na banda pela borda externa, sai de novo na borda do furo —,
e o teste conclui corretamente que o ponto está fora. A geometria "sabe"
resolver o furo sozinha, sem nenhum código extra pra reconhecer buracos.

Isso também evitou o problema maior, mencionado em "Como foi feito": exportar
a geometria de banda já calculada pelo R (`MASS::kde2d()` via `ggplot2`) é
incômodo justamente por causa desses furos — serializar `Polygon[]` com
anéis de buraco de forma genérica é mais trabalho do que recalcular a
estimativa do zero em D3, a partir dos pontos brutos. A paridade visual vem
de usar a mesma paleta e a mesma família de técnica, não de desenhar a
mesma geometria calculada duas vezes.
