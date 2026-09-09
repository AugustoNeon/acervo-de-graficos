---
title: "Candlestick: preço diário de uma ação"
category: general
date: 2026-09-09
source: "https://r-graph-gallery.com/candlestick-chart.html"
interactive: true
resumo: "Quarenta pregões de uma ação fictícia, cada dia uma vela com o corpo marcando abertura e fechamento, e o pavio marcando a mínima e a máxima."
veredito_uso: "você tem, para cada ponto no tempo, quatro valores (abertura, máxima, mínima, fechamento) e quer ver a amplitude do dia junto com a direção do movimento, não só o fechamento."
veredito_evita: "você só tem um valor por dia (o fechamento, por exemplo) — nesse caso o candlestick não tem o que desenhar além do que uma linha simples já mostra."
pacotes: ["ggplot2", "dplyr"]
dados: "1 variável de tempo + 4 numéricas (abertura, máxima, mínima, fechamento do mesmo período)"
nivel: intermediário
tags: ["candlestick", "OHLC", "financeiro"]
---

## O que é

Um candlestick (gráfico de velas) desenha, para cada período de tempo,
quatro valores de uma vez: abertura, fechamento, máxima e mínima. O
**corpo** (retângulo grosso) vai da abertura ao fechamento — a cor marca
se o período fechou acima (alta) ou abaixo (baixa) de onde abriu. O
**pavio** (linha fina) vai da mínima até a máxima, mostrando o quanto o
valor oscilou além do que o corpo sozinho revela. **Para que serve**:
resumir a amplitude e a direção de um movimento no mesmo símbolo, período
a período — a origem é o mercado financeiro, mas a técnica serve para
qualquer dado com "abertura/fechamento/mínima/máxima" por período
(temperatura diária, por exemplo).

## Quando usar (e quando evitar)

**Use quando** cada ponto no tempo tiver naturalmente esses quatro
valores — preço de um ativo, temperatura mínima/máxima do dia, qualquer
métrica com um valor inicial, final e uma faixa de variação no meio.
A leitura rápida (corpo cheio e alongado = movimento forte numa direção;
corpo curto com pavios longos = indecisão, muita oscilação sem direção
clara) é o que faz esse formato valer a pena sobre uma linha simples.

**Evite quando** você só tiver um valor por período — sem abertura,
máxima e mínima, não sobra nada para o corpo e o pavio desenharem, e uma
[linha comum](../../evolution/dispersao-conectada-streaming) comunica o
mesmo dado com menos ruído visual. Evite também com muitos períodos ao
mesmo tempo (centenas de velas): elas se espremem até virar uma faixa
sólida, perdendo a leitura individual que é a razão de existir do
formato.

## Como ler o gráfico

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#2E8B57"></span> Alta (fechou acima da abertura)</div>
  <div><span class="swatch" style="background:#C1443C"></span> Baixa (fechou abaixo da abertura)</div>
</div>

- **Corpo (retângulo grosso)**: do preço de abertura ao de fechamento
  daquele pregão — a altura do corpo é o tamanho do movimento entre os
  dois.
- **Pavio (linha fina acima/abaixo do corpo)**: da mínima até a máxima do
  dia — mostra o quanto o preço se moveu além do que abertura/fechamento
  sozinhos revelam.
- **Cor**: a direção do dia — não a tendência de longo prazo, só se
  aquele pregão específico fechou acima ou abaixo de onde abriu.

<div class="pull-quote">corpo curto com pavios longos é indecisão — muita oscilação sem direção clara</div>

## Como foi feito

**Duas camadas, sem pacote financeiro**: um `geom_segment()` fino para o
pavio (`y = mínima`, `yend = máxima`) e um `geom_rect()` grosso para o
corpo (`ymin`/`ymax` = o menor e o maior entre abertura e fechamento) —
nenhuma das duas depende de um pacote como `quantmod`/`TTR` (que fariam
isso com uma função pronta, mas não estavam disponíveis nesta sessão).
A mesma lógica de "só duas formas geométricas simples" já usada em outras
composições à mão desta base.

**Dado fictício**: 40 pregões de uma ação fictícia, gerados como um
passeio aleatório com deriva pequena para cima (cada dia abre onde o
anterior fechou, mais um "gap" pequeno) e máxima/mínima sempre além do
maior/menor entre abertura e fechamento — nunca um pavio mais curto que o
próprio corpo, o que quebraria a leitura.

**Na versão interativa**: o `data.json` carrega os quatro valores brutos
por pregão — o D3 calcula a posição do corpo e do pavio sozinho, mesmo
princípio de sempre desta base (nunca geometria já pronta).

## Possíveis problemas pelo caminho

- **Problema**: o corpo de um dia com abertura e fechamento quase iguais
  vira uma linha invisível em vez de um retângulo fino. **Por quê**: a
  altura calculada (`|abertura - fechamento|`) pode chegar bem perto de
  zero em pixels. **Solução**: aplique uma altura mínima fixa (1-2px) ao
  corpo, para que ele continue visível mesmo num dia de variação
  quase nula — sem isso, o dia simplesmente desaparece do gráfico.

## Variações possíveis

- Adicionar uma média móvel (linha suave sobre as velas) para destacar a
  tendência de médio prazo por cima do ruído dia a dia.
- Colorir o corpo por volume negociado em vez de só alta/baixa, usando
  opacidade ou um segundo canal de cor.
- Agrupar vários pregões num só candle (semanal em vez de diário), mesma
  técnica de agregação usada para qualquer granularidade de série
  temporal.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../../evolution/previsao-receita-banda-confianca" style="--cat-link: var(--cat-evolution); --cat-link-ink: var(--cat-evolution-ink);">
    <span class="parecido-cat">evolution</span>
    <span class="parecido-titulo">Linha com banda de confiança: previsão de receita</span>
    <span class="parecido-razao">Outra forma de mostrar amplitude ao redor de um valor central ao longo do tempo — lá é incerteza de uma estimativa, aqui é a oscilação real já ocorrida no período.</span>
  </a>
  <a class="parecido-item" href="../bullet-kpis-suporte" style="--cat-link: var(--cat-general); --cat-link-ink: var(--cat-general-ink);">
    <span class="parecido-cat">general</span>
    <span class="parecido-titulo">Bullet chart: painel de KPIs de suporte</span>
    <span class="parecido-razao">Mesma família de "gráfico especializado montado com formas geométricas simples, sem pacote pronto" desta categoria.</span>
  </a>
</div>
