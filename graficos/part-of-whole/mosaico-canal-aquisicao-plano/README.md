---
title: "Mosaico: canal de aquisição x plano assinado"
category: part-of-whole
date: 2026-09-09
source: "https://r-graph-gallery.com/mosaic-plot-ggplot2.html"
interactive: true
resumo: "Cada canal de aquisição vira uma coluna cuja largura é seu tamanho, e a altura dentro dela mostra a composição de planos assinados por quem veio daquele canal."
veredito_uso: "duas variáveis categóricas se cruzam e o TAMANHO de cada grupo é tão importante quanto a composição interna dele — as duas perguntas cabem numa imagem só."
veredito_evita: "o tamanho dos grupos já é conhecido ou irrelevante, e só a composição interna importa — nesse caso um barplot 100% empilhado (colunas de largura igual) é mais simples de ler."
pacotes: ["ggplot2", "dplyr"]
dados: "2 variáveis categóricas (linha e coluna) + 1 numérica (a contagem de cada combinação das duas)"
nivel: avançado
tags: ["mosaico", "marimekko", "composição aninhada"]
---

## O que é

Um mosaico (também chamado de gráfico Marimekko) cruza **duas** variáveis
categóricas ao mesmo tempo: a largura de cada coluna representa o tamanho
daquele grupo em relação ao total geral, e a altura dentro da coluna
representa como esse grupo se divide numa segunda categoria — recalculada
**coluna a coluna**, não sobre o total geral. **Para que serve**: responder
duas perguntas na mesma imagem — "quão grande é cada grupo?" e "como cada
grupo se compõe por dentro?" — sem que uma pergunta esconda a outra.

## Quando usar (e quando evitar)

**Use quando** o tamanho relativo dos grupos for parte da história, não só
um detalhe — um canal pequeno com composição excelente de planos e um canal
grande com composição mediana contam histórias de negócio bem diferentes,
e só o mosaico mostra as duas escalas ao mesmo tempo. Funciona melhor com
poucos grupos em cada eixo (até 4-6 colunas, 3-5 fatias por coluna): células
muito pequenas ficam sem espaço pro rótulo.

**Evite quando** o tamanho dos grupos for irrelevante ou já óbvio — nesse
caso um [barplot 100% empilhado](../barplot-agrupado-empilhado) com colunas
de largura igual é mais simples de comparar composições lado a lado, sem a
carga extra de decifrar duas escalas ao mesmo tempo. Evite também com
muitas categorias em qualquer um dos dois eixos: a grade de retângulos fica
apertada demais pra rotular.

## Que dados você precisa

- **duas variáveis categóricas** — uma vira coluna (aqui, o canal de
  aquisição), a outra vira a divisão dentro de cada coluna (aqui, o plano)
- **uma contagem** para cada combinação das duas — o número de clientes
  daquele canal **e** daquele plano ao mesmo tempo

Formato de tabela de contingência (uma linha por combinação canal×plano,
com a contagem), não uma linha por cliente — a agregação já precisa estar
feita antes de desenhar.

## Como ler o gráfico

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#CBD5C0"></span> Free</div>
  <div><span class="swatch" style="background:#8FB08A"></span> Starter</div>
  <div><span class="swatch" style="background:#4C8557"></span> Pro</div>
  <div><span class="swatch" style="background:#265C38"></span> Enterprise</div>
</div>

- **Largura da coluna**: o tamanho do canal — quantos clientes ele trouxe,
  em proporção ao total de todos os canais somados.
- **Altura de cada célula**: a proporção daquele plano **dentro** do canal
  — não do total geral. Duas células da mesma altura em colunas diferentes
  representam a mesma fatia percentual do canal, mesmo que o canal maior
  tenha muito mais clientes ali dentro.
- **Área do retângulo**: largura × altura — o único elemento visual que
  combina as duas escalas numa quantidade só (a contagem real de clientes
  daquela combinação).

<div class="pull-quote">a mesma altura em colunas diferentes não é a mesma quantidade de clientes</div>

## Como foi feito

**Sem pacote pronto**: existe uma extensão do `ggplot2` para isso
(`ggmosaic`), mas ela não estava disponível nesta sessão — o pacote
empacotado no repositório do Ubuntu para mosaico (`vcd`) desenha em base
graphics, não em `ggplot2`, e não teria como reaproveitar a paleta e o
`data.json` do resto da base. A geometria foi montada à mão com
`geom_rect()`: `x0`/`x1` vêm da largura acumulada dos totais por canal
(dividida pelo total geral), e `y0`/`y1` vêm da altura acumulada das
contagens por plano, recalculada **separadamente para cada canal** — essa
segunda normalização coluna a coluna é o que diferencia um mosaico de um
treemap comum.

**Dado fictício**: uma base de clientes de SaaS dividida em quatro canais
de aquisição, cada um com sua própria composição de planos escrita à mão
(não sorteada) — o canal orgânico traz muito plano gratuito, parceiros
trazem clientes maiores com mais Enterprise — de propósito, porque um
mosaico com composições idênticas entre colunas não teria nada para
mostrar.

**Na versão interativa**: o `data.json` carrega só as contagens brutas por
combinação canal×plano — o D3 soma os totais e recalcula as duas
normalizações sozinho, nunca a partir de coordenadas já prontas.

## Possíveis problemas pelo caminho

- **Problema**: uma célula pequena demais para caber o rótulo de
  porcentagem, texto vazando pra fora do retângulo. **Por quê**: nem toda
  combinação canal×plano tem clientes suficientes para render um número
  legível na área disponível. **Solução**: esconda o rótulo abaixo de um
  limiar mínimo de proporção (aqui, 6%) em vez de forçar o texto a
  aparecer em qualquer tamanho de célula.

## Variações possíveis

- Ordenar as colunas pelo tamanho do canal (maior para menor) em vez da
  ordem categórica original, quando o ranking de tamanho for parte da
  pergunta.
- Adicionar uma terceira dimensão via padrão de textura ou borda diferente,
  quando duas variáveis categóricas não bastarem — com cautela, mosaicos
  já carregam duas leituras simultâneas antes de qualquer dimensão extra.
- Trocar a ordem de qual variável vira coluna e qual vira divisão interna
  — a pergunta muda de "como cada canal se compõe por plano" para "como
  cada plano se compõe por canal de origem", com os mesmos dados.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../barplot-agrupado-empilhado" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Barras agrupadas e empilhadas</span>
    <span class="parecido-razao">O estado "empilhado 100%" desse gráfico é este mosaico sem a largura variável — compare os dois pra ver exatamente o que a largura acrescenta.</span>
  </a>
  <a class="parecido-item" href="../treemap-orcamento-municipal" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Treemap com zoom: orçamento municipal</span>
    <span class="parecido-razao">Mesma ideia de área proporcional em duas dimensões, mas sem a restrição de linhas/colunas alinhadas — o treemap otimiza forma, o mosaico prioriza comparação entre colunas.</span>
  </a>
</div>
