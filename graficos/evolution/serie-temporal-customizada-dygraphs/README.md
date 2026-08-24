---
title: "Série temporal interativa customizada"
category: evolution
date: 2026-07-24
source: "https://r-graph-gallery.com/318-custom-dygraphs-time-series-example.html"
interactive: true
resumo: "Série temporal longa com faixa de seleção de intervalo, média móvel ajustável e leitura de valores ponto a ponto."
pacotes: ["ggplot2", "jsonlite", "d3"]
dados: "uma série temporal — datas e valores correspondentes"
nivel: intermediário
tags: ["interativo", "temporal", "série longa"]
---

## O que é

Um gráfico de série temporal construído para **navegação**, não apenas para
visualização. Além da linha, ele traz três controles que mudam o que é possível
fazer com o dado:

- **Faixa de seleção de intervalo** — uma miniatura da série inteira, abaixo do
  gráfico principal, com bordas arrastáveis que recortam um período e o
  ampliam, mantendo a série completa visível como referência.
- **Média móvel ajustável** — um controle deslizante muda o suavizamento em
  tempo real, sem recarregar nada.
- **Leitura ponto a ponto** — uma linha vertical acompanha o cursor e mostra o
  valor exato daquela data.

**Para que serve**: explorar séries longas, em que a visão completa esconde os
detalhes e o detalhe isolado esconde a tendência.

## Quando usar (e quando evitar)

**Use quando** a série tiver muitos pontos (centenas ou milhares) e o leitor
precisar circular entre o panorama e o detalhe. Dados diários ao longo de anos
são o caso ideal: a granularidade fina é ruidosa demais para ler de longe, mas
descartá-la perderia informação.

**Evite quando** a série for curta — com dezenas de pontos, um gráfico de
linhas estático mostra tudo de uma vez e os controles só atrapalham. Evite
também quando o destino for impressão, e quando houver muitas séries
sobrepostas (a técnica é mais forte com uma ou poucas).

**Cuidado com a média móvel**: ela é ferramenta de exploração, não conclusão.
Um período de suavização escolhido de forma conveniente pode fazer qualquer
tendência parecer existir ou desaparecer.

## Que dados você precisa

- **Uma série temporal** — datas e valores correspondentes, uma observação por
  data.

O formato é o mais simples possível: duas colunas, sem precisar de nenhuma
estrutura indexada especial. Os intervalos entre observações não precisam ser
perfeitamente regulares, mas lacunas grandes aparecem como saltos na linha.

## Como ler o gráfico

- **Eixo horizontal**: o tempo.
- **Eixo vertical**: o valor da série — fica fixo mesmo ao recortar um
  intervalo, então a régua nunca muda de escala embaixo do seu cursor.
- **Linha e área preenchida**: a série em si.
- **Faixa inferior**: a série inteira em miniatura — é o mapa de onde você
  está, sempre visível para orientar o recorte.

Interações disponíveis: arraste as bordas da faixa inferior para recortar um
período (duplo clique no gráfico principal volta pro intervalo inteiro); passe
o mouse sobre o gráfico para ver data e valor exatos; e mova o controle
deslizante da média móvel para suavizar mais ou menos.

Comece com a média móvel em 1 dia para ver o dado bruto, depois aumente aos
poucos: a tendência de fundo e o padrão semanal aparecem em escalas diferentes
de suavização.

## Como foi feito

O gráfico é desenhado em D3, no próprio runtime do site — o `script.R` só
gera o `output.png` (o estado inicial, sem nenhuma interação) e exporta a
série bruta pro `data.json`; nenhum dos três controles vem pronto de um
pacote, cada um foi recriado à mão:

- **Faixa de seleção**: um segundo painel, menor, com a série inteira e um
  `d3.brushX()` por cima. Arrastar as bordas recalcula o domínio do eixo X do
  painel principal (`rescaleX` manual: um novo `scaleUtc()` com o domínio da
  seleção) e redesenha a linha e a grade dentro dele.
- **Média móvel**: um `<input type="range">` HTML comum. A cada mudança, uma
  função recalcula a série inteira como uma média móvel à direita (janela
  crescente nos primeiros pontos, pra nunca descartar o início da série) e o
  painel principal é redesenhado com o resultado — nada volta pro R.
- **Leitura ponto a ponto**: um `bisector` sobre a série atualmente exibida
  (bruta ou suavizada) encontra o ponto mais próximo do cursor a cada
  `pointermove`.

**Decisão consciente**: o eixo vertical fica fixo no domínio da série inteira,
mesmo com um intervalo recortado — o widget original reescala o eixo Y pro
range visível, mas isso faria a curva mudar de forma a cada arrasto, o que
divergiria da leitura "mapa fixo, recorte só no tempo" que a faixa inferior
promete.

**Cuidado de fuso horário**: como o eixo é temporal, o mesmo problema já visto
em outro gráfico de série deste acervo se repete aqui — `d3.scaleUtc()` no
lugar de `d3.scaleTime()`, e todo `toLocaleDateString()` (tooltip, eixo)
com `timeZone: 'UTC'` explícito, porque as datas do `data.json` chegam no
formato `AAAA-MM-DD`, que o JavaScript interpreta como meia-noite UTC.

Dados fictícios: 300 dias de downloads de um aplicativo (`set.seed(1907)`),
combinando tendência de crescimento, sazonalidade semanal com picos no fim de
semana e ruído aleatório — a estrutura em três camadas foi escolhida
justamente para que os controles de recorte e suavização tivessem o que
revelar.

## Possíveis problemas pelo caminho

- **Problema**: a média móvel parece não fazer nada nos primeiros pontos da
  série. **Por quê**: com janela crescente no início (não há observações
  suficientes antes do primeiro ponto pra preencher a janela cheia), os
  primeiros valores mudam pouco em relação ao dado bruto. **Solução**: não é
  um bug — é esperado que o efeito da suavização fique mais visível conforme a
  janela "enche", mais à frente na série.

- **Problema**: a linha do gráfico principal parece cortada de repente na
  borda do intervalo recortado. **Por quê**: o painel principal usa um
  `clipPath` do tamanho da área útil, então qualquer trecho da linha fora do
  domínio atual simplesmente não é desenhado. **Solução**: comportamento
  esperado — dê duplo clique no gráfico pra voltar ao intervalo inteiro.

- **Problema**: o eixo de tempo aparece com datas erradas ou deslocadas.
  **Por quê**: fuso horário — sem `scaleUtc()`/`timeZone: 'UTC'` explícitos, o
  navegador interpreta a meia-noite UTC da data no fuso local e pode mostrar o
  dia (ou mês) anterior. **Solução**: usar `d3.scaleUtc()` para a escala e
  `timeZone: 'UTC'` em todo `toLocaleDateString()`.

- **Problema**: o gráfico fica lento com séries muito longas. **Por quê**:
  cada ponto vira um vértice desenhado no navegador, e o recorte de intervalo
  redesenha o painel principal a cada `pointermove` do arrasto. **Solução**:
  agregar antes de plotar (média diária a partir de dados horários, por
  exemplo) ou limitar a frequência de redesenho durante o arrasto.

## Variações possíveis

- Adicionar uma segunda série e comparar as duas com uma legenda que isola
  cada uma — mesmo padrão de destaque usado em outros gráficos de linha deste
  acervo.
- Marcar eventos com uma linha vertical rotulada (um lançamento, uma
  interrupção) desenhada por cima do painel principal.
- Mostrar uma banda de incerteza (mínimo/máximo) atrás da linha central,
  quando houver intervalo estimado.
- Abrir o gráfico já com um intervalo inicial diferente do completo, movendo o
  brush programaticamente pra uma seleção pronta assim que o gráfico monta.
