---
title: "Linha com banda de confiança: previsão de receita"
category: evolution
date: 2026-09-09
source: "https://r-graph-gallery.com/104-plot-lines-with-error-envelopes-ggplot2.html"
interactive: true
resumo: "Doze meses de receita já realizada seguidos de doze meses de previsão, com uma faixa de incerteza que se alarga quanto mais longe do presente."
veredito_uso: "parte da sua série temporal é fato (já aconteceu) e parte é estimativa — e a incerteza da estimativa cresce com a distância no tempo, algo comum em previsão financeira ou de demanda."
veredito_evita: "toda a série é feita de medições reais — nesse caso uma banda de confiança sugeriria incerteza que não existe, e uma linha simples é mais honesta."
pacotes: ["ggplot2", "dplyr"]
dados: "1 variável de tempo + 1 numérica (o valor) + 2 numéricas opcionais (limite inferior e superior da banda, só no trecho previsto)"
nivel: intermediário
tags: ["previsão", "intervalo de confiança", "série temporal"]
---

## O que é

Uma linha com banda de confiança divide uma série temporal em dois
trechos visualmente distintos: um **realizado** (linha sólida, sem
margem — já é fato) e um **previsto** (linha tracejada, com uma faixa
sombreada ao redor marcando o intervalo onde o valor real provavelmente
vai cair). **Para que serve**: comunicar, na mesma imagem, tanto uma
estimativa quanto o quão confiável ela é — sem isso, uma previsão
desenhada como uma linha comum passa uma certeza que ela não tem.

## Quando usar (e quando evitar)

**Use quando** sua série tiver essa fronteira real entre fato e
estimativa — vendas realizadas versus projetadas, medições versus
simulação de um modelo — e especialmente quando a incerteza crescer com o
horizonte (prever o próximo mês é mais confiável que prever o próximo
ano). A largura da banda carrega informação por si só: se ela se mantém
estreita ao longo de toda a previsão, o modelo está confiante; se ela se
abre rápido, está avisando que não sabe.

**Evite quando** toda a série for feita de medições reais, sem nenhuma
parte projetada — uma banda de confiança nesse caso sugeriria uma
incerteza que não existe. Evite também quando a banda for constante (não
crescer com o tempo): um [intervalo de confiança pontual](../../comparison/intervalo-confianca-variantes-teste-ab)
por categoria comunica isso melhor do que uma faixa ao longo de um eixo
temporal.

## Como ler o gráfico

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#2B5B7A"></span> Realizado</div>
  <div><span class="swatch" style="background:#C9793A"></span> Previsto</div>
</div>

- **Linha sólida**: receita já realizada — um fato, sem margem de erro.
- **Linha tracejada**: a estimativa central da previsão — o valor mais
  provável, não o único possível.
- **Faixa sombreada**: o intervalo de confiança da previsão — quanto mais
  larga, menos confiável é a estimativa naquele ponto.
- **Linha pontilhada vertical ("hoje")**: a fronteira entre o que já
  aconteceu e o que ainda é estimativa.

<div class="pull-quote">a largura da banda é, ela mesma, uma informação — não só decoração ao redor da linha</div>

## Como foi feito

**Camadas**: `geom_ribbon()` (só nos dados do trecho previsto, com
`ymin`/`ymax` já calculados) desenhada **antes** das linhas, para ficar
atrás delas; dois `geom_line()` separados — um para o trecho realizado,
outro para o previsto com `linetype` tracejado — em vez de um só,
porque a mudança de estilo (sólido → tracejado) não é algo que uma
única camada consiga fazer no meio do caminho.

**Ponto de emenda**: o último mês do realizado é duplicado como primeiro
ponto do trecho previsto, com banda de largura zero (`banda_min =
banda_max = receita`). Sem esse ponto, tanto a linha tracejada quanto a
faixa sombreada nasceriam com um pequeno degrau em vez de continuar
suavemente de onde a linha sólida parou.

**Margem crescente**: a largura da banda cresce com a raiz quadrada do
número de meses à frente (`sqrt(horizonte)`), não linearmente — convenção
comum em previsão de série temporal, em que a incerteza acumula mas não
na mesma proporção do horizonte.

**Na versão interativa**: o `data.json` carrega os pontos crus (índice,
fase, valor, banda mín/máx — `null` fora do trecho previsto) e o ponto de
emenda, exatamente como o R gerou — o D3 monta a mesma composição de área
e duas linhas em cima dos mesmos dados. A banda exportada é tratada como a
de 95% (±1,96 desvio-padrão); um switcher "Confiança" deriva o próprio
desvio-padrão implícito a partir dela e recalcula a banda de 68% (±1
desvio) na hora, sem pedir um segundo cálculo ao R — só a área muda de
largura, a linha central e o `hoje` ficam parados. O tooltip de cada mês
previsto mostra a faixa numérica do nível selecionado no momento.

## Possíveis problemas pelo caminho

- **Problema**: a linha tracejada (ou a faixa) nasce com um salto visível
  bem no início da previsão, em vez de continuar de onde a linha sólida
  parou. **Por quê**: os dois trechos (realizado e previsto) são séries
  separadas — sem um ponto em comum entre elas, cada `geom_line()`/
  `geom_ribbon()` começa do zero, sem saber onde a outra terminou.
  **Solução**: duplique o último ponto do trecho realizado como primeiro
  ponto do trecho previsto (com banda de largura zero, se houver banda).

## Variações possíveis

- Sobrepor várias previsões (otimista, central, pessimista) como três
  linhas tracejadas dentro da mesma banda, em vez de só uma linha central.
- Trocar a banda de confiança fixa por uma calculada de um modelo real
  (por exemplo, `forecast::forecast()` no R), mantendo a mesma
  composição visual.
- Animar a banda se estreitando conforme novos meses "acontecem" (viram
  realizado), simulando como a incerteza diminui à medida que a previsão
  se aproxima do presente.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../../comparison/intervalo-confianca-variantes-teste-ab" style="--cat-link: var(--cat-comparison); --cat-link-ink: var(--cat-comparison-ink);">
    <span class="parecido-cat">comparison</span>
    <span class="parecido-titulo">Intervalos de confiança: teste A/B</span>
    <span class="parecido-razao">Mesma ideia de comunicar incerteza junto com o valor, mas como medições pontuais por categoria, não como uma faixa ao longo do tempo.</span>
  </a>
  <a class="parecido-item" href="../area-receita-saas-ficticio" style="--cat-link: var(--cat-evolution); --cat-link-ink: var(--cat-evolution-ink);">
    <span class="parecido-cat">evolution</span>
    <span class="parecido-titulo">Área sobreposta, empilhada e empilhada 100%</span>
    <span class="parecido-razao">Mesma técnica de área sob uma série temporal, mas cada camada ali é um FATO conhecido — aqui a área existe só para marcar incerteza sobre uma estimativa.</span>
  </a>
</div>
