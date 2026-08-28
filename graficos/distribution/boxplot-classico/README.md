---
title: "Boxplot clássico: cinco variações"
category: distribution
date: 2026-08-20
source: "https://r-graph-gallery.com/262-basic-boxplot-with-ggplot2.html"
interactive: true
resumo: "Tempo de resolução de chamados por equipe de suporte, com cinco variações alternáveis do boxplot clássico: básico, ordenado, com jitter, entalhado e largura variável."
veredito_uso: "você precisa comparar espalhamento, assimetria e atípicos entre várias categorias de uma vez."
veredito_evita: "a amostra de alguma categoria é pequena (menos de ~10 pontos), ou a distribuição é multimodal."
pacotes: ["ggplot2", "dplyr", "forcats", "patchwork", "RColorBrewer", "jsonlite", "d3"]
dados: "1 variável categórica + 1 numérica contínua, várias observações por categoria"
nivel: intermediário
tags: ["distribuição", "comparação"]
---

## O que é

Um boxplot resume a distribuição de uma variável numérica dentro de cada
categoria usando cinco números: a mediana, os quartis (Q1 e Q3, os limites da
caixa) e os valores mais extremos que ainda não são atípicos (os whiskers).
Pontos fora dessa faixa aparecem marcados individualmente como valores
atípicos (outliers). **Para que serve**: comparar a distribuição inteira —
não só a média — de várias categorias ao mesmo tempo, respondendo "onde essa
categoria se concentra, quão espalhada ela é, e ela tem valores fora da
curva".

## Quando usar (e quando evitar)

**Use quando** precisar comparar espalhamento, assimetria e valores atípicos
entre várias categorias de uma vez — é mais informativo que comparar só
médias ou medianas lado a lado, porque mostra a variabilidade dentro de cada
grupo, não só a posição central.

**Evite quando** a amostra de cada categoria for muito pequena (menos de uns
10 pontos): a caixa vira um resumo instável, e um jitter ou um gráfico de
pontos cru comunica melhor. Evite também quando a distribuição for
multimodal (dois picos separados) — um boxplot resume isso numa caixa só, sem
avisar que existem dois grupos escondidos ali dentro; um histograma ou uma
densidade (ver o [ridgeline](../ridgeline-avaliacoes-bairros) deste acervo)
mostra a forma de verdade. E se o interesse for só comparar um único número
por categoria, um [gráfico de barras](../../ranking/barplot-classico) é mais
direto.

## Que dados você precisa

- **variável categórica** — o grupo (aqui, a equipe de suporte).
- **variável numérica** — o valor medido em cada observação (aqui, horas até
  resolver o chamado).

Formato longo/tidy: uma linha por observação, não uma linha por categoria —
o boxplot precisa dos valores individuais pra calcular quartis e detectar
atípicos, um resumo já pronto (média, desvio-padrão) não é suficiente.

## Como ler o gráfico

- **Caixa**: do primeiro ao terceiro quartil (Q1–Q3) — os 50% centrais dos
  dados daquela equipe. A altura da caixa é o IQR (intervalo interquartil).
- **Linha grossa dentro da caixa**: a mediana.
- **Whiskers (linhas finas saindo da caixa)**: até o valor mais extremo que
  ainda está a no máximo 1,5× o IQR de distância da caixa.
- **Pontos isolados além dos whiskers**: valores atípicos — observações bem
  fora do padrão do resto do grupo.
- **Cor**: uma equipe, fixa nas cinco variações.

Use os botões acima do gráfico pra alternar a variação; passe o cursor sobre
a caixa pra ver os quartis exatos, ou sobre um ponto individual pra ver seu
valor.

## Como foi feito

A miniatura estática é um poster com as cinco variações lado a lado
(`patchwork`), mesmo princípio já usado no
[barplot clássico](../../ranking/barplot-classico) deste acervo — só que
aqui as cinco variações são as opções nativas do próprio `geom_boxplot()`
(jitter, `notch`, `varwidth`), não uma reinvenção.

A versão interativa reconstrói a estatística do zero em D3 em vez de herdar
do R: o script exporta só os **valores brutos** de cada equipe, e quartis,
whiskers, atípicos e o entalhe (fórmula de McGill) são calculados no
navegador. Isso importa porque a ordenação muda o grupo, mas as estatísticas
de cada grupo não dependem de ordem nenhuma — calcular tudo no cliente evita
ter que exportar uma estatística por estado.

A caixa em si é sempre um path SVG de 10 pontos fixos, entalhada ou não: no
estado sem entalhe os pontos do meio de cada lado ficam colineares com os
cantos (entalhe = zero), formando um retângulo comum; ligar o entalhe só
afasta esses pontos pra dentro. Isso faz a caixa "morphar" suavemente entre
retângulo e ampulheta ao trocar de estado, em vez de cortar de uma forma pra
outra — a mesma ideia de "chave estável, nunca cria/destrói elemento" já
usada no resto do runtime D3 do site, aplicada dentro de uma única forma.

Dados fictícios: tempo de resolução de chamados (horas) de 6 equipes de
suporte fictícias, com `rlnorm()` (`set.seed(7331)`) — uma distribuição de
cauda longa à direita, o formato típico de tempo de resolução (a maioria
resolve rápido, uma minoria demora muito), que gera atípicos de verdade pro
boxplot mostrar. Cada equipe tem seu próprio tamanho de amostra (12 a 45) e
seus próprios parâmetros de mediana/dispersão.

## Possíveis problemas pelo caminho

- **Problema**: o R avisa `Notch went outside hinges` ao gerar a miniatura, e
  o entalhe de alguma equipe (no estado "Entalhado") ultrapassa a própria
  caixa, formando uma ampulheta meio torta em vez de um entalhe limpo.
  **Por quê**: o entalhe representa um intervalo de confiança da mediana
  (`± 1,58 × IQR / √n`) — quando a amostra é pequena ou o IQR é estreito,
  esse intervalo pode ser maior que a distância até Q1/Q3. **Solução**:
  nenhuma correção de layout — é um sinal estatístico de verdade (a mediana
  daquele grupo não tem precisão suficiente pra comparar com confiança
  contra outra caixa), então tanto o R quanto a versão em D3 deste gráfico
  deixam o entalhe "estourar" em vez de escondê-lo.

- **Problema**: pontos de jitter mudam de posição horizontal a cada
  redesenho (ex: ao redimensionar a janela). **Por quê**: gerar a posição
  com `Math.random()` a cada `draw()` reembaralha tudo, já que o runtime do
  site redesenha o gráfico inteiro do zero em todo resize. **Solução**: um
  deslocamento determinístico por índice do ponto (função seno com um fator
  grande, o "hash" mais simples que existe), não aleatório de verdade — o
  mesmo ponto sempre cai no mesmo lugar horizontal.

- **Problema**: passar o cursor sobre um ponto atípico ou de jitter mostra o
  tooltip resumido da caixa inteira, em vez do valor daquele ponto
  específico. **Solução**: `event.stopPropagation()` no listener do ponto —
  a história completa está em "Notas do coletor", no fim da página.

## Variações possíveis

- Combinar caixa e violino (densidade) no mesmo espaço — mostra a forma
  completa da distribuição, não só os cinco números do boxplot.
- Adicionar um ponto ou losango marcando a média junto da mediana, quando as
  duas divergirem bastante (sinal de assimetria forte).
- Boxplot agrupado: duas variáveis categóricas, uma no eixo X e outra como
  cor dentro de cada posição.
- Trocar o cálculo de atípicos pelo desvio-padrão (±2σ) em vez do IQR, quando
  a distribuição for aproximadamente normal.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../ridgeline-avaliacoes-bairros" style="--cat-link: var(--cat-distribution); --cat-link-ink: var(--cat-distribution-ink);">
    <span class="parecido-cat">distribution</span>
    <span class="parecido-titulo">Ridgeline plot</span>
    <span class="parecido-razao">O oposto direto quando a distribuição é multimodal: o boxplot resume tudo numa caixa só, sem avisar que existem dois picos escondidos ali — o ridgeline mostra a forma de verdade.</span>
  </a>
  <a class="parecido-item" href="../violino-e-boxplot" style="--cat-link: var(--cat-distribution); --cat-link-ink: var(--cat-distribution-ink);">
    <span class="parecido-cat">distribution</span>
    <span class="parecido-titulo">Violino + boxplot: três variações</span>
    <span class="parecido-razao">Mesma técnica, um passo adiante: o boxplot clássico combinado com a densidade do violino no mesmo espaço, em vez de alternável.</span>
  </a>
</div>

## Notas do coletor

O tooltip de um ponto atípico mostrava os quartis da caixa inteira em vez do
valor daquele ponto específico — mesmo com o cursor claramente em cima do
círculo certo, não da caixa. O listener do ponto individual estava correto,
disparando com o dado certo.

O culpado era um segundo listener, no `<g>` que agrupa todos os elementos de
uma equipe (caixa, whiskers, pontos), pra mostrar o resumo da caixa ao passar
perto de qualquer parte dela. Eventos de ponteiro **borbulham**: o
`pointermove` do círculo dispara primeiro no próprio ponto, mas continua
subindo pela árvore até o `<g>` pai, cujo handler roda logo em seguida e
sobrescreve o tooltip com o resumo errado — os dois listeners disparavam pro
mesmo movimento do mouse, e o último a rodar vencia.

A correção foi `event.stopPropagation()` no listener do ponto, impedindo o
evento de continuar subindo depois de já ter sido tratado ali. Vale
desconfiar desse padrão sempre que dois elementos visualmente sobrepostos
(um específico dentro de um mais geral) tiverem listeners próprios pro mesmo
tipo de evento — sem parar a propagação, o mais geral sempre tem a
"última palavra".
