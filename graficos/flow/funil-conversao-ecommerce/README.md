---
title: "Funil de conversão de uma loja online"
category: flow
date: 2026-08-24
source: "https://r-graph-gallery.com/funnel-plot.html"
interactive: true
resumo: "Quantos visitantes sobrevivem a cada etapa do checkout, da entrada no site até a compra concluída."
pacotes: ["ggplot2", "RColorBrewer"]
dados: "1 variável categórica ordenada (etapa) + 1 numérica (contagem em cada etapa)"
nivel: básico
tags: ["interativo", "funil", "conversão"]
---

## O que é

Um funil mostra quantas unidades de um total inicial sobrevivem a cada etapa
de um processo sequencial, numa única direção — cada etapa só pode manter ou
perder unidades em relação à anterior, nunca ganhar. **Para que serve**:
responder "onde as pessoas desistem" ao longo de um processo com várias
etapas obrigatórias, e comparar o tamanho da perda entre uma etapa e outra.

## Quando usar (e quando evitar)

**Use quando** as etapas têm uma ordem obrigatória e cada uma é um
subconjunto estrito da anterior (visita → cadastro → carrinho → pagamento,
por exemplo) — o formato deixa óbvio em qual etapa a maior fatia de gente
some.

**Evite quando** as categorias não têm essa relação de contenção (não é
verdade que uma é sempre subconjunto da anterior) — nesse caso um funil
distorce a leitura, e um barplot comum comunica melhor. Também evite com
muitas etapas (mais de 6–7): a diferença visual entre etapas parecidas fica
difícil de perceber, e vale mais uma tabela com as taxas lado a lado.

## Que dados você precisa

- **etapa** — variável categórica **ordenada** (a ordem importa: é a
  sequência real do processo, não alfabética)
- **quantidade** — variável numérica, sempre decrescente (ou igual) etapa a
  etapa

Formato esperado: uma linha por etapa, já com a contagem final daquela
etapa (não é preciso calcular taxa de conversão antes — dá pra derivar da
contagem bruta).

## Como ler o gráfico

- **Largura do bloco**: quantidade de unidades que chegaram naquela etapa —
  quanto mais estreito, mais gente já desistiu antes de chegar ali.
- **Inclinação da lateral**: o tamanho da queda daquela etapa especificamente
  em relação à anterior — uma lateral quase vertical é uma etapa que quase
  não perde ninguém; uma lateral bem inclinada é onde a maior parte do
  abandono acontece.
- **Cor**: só identifica a etapa (profundidade no funil), não codifica um
  valor à parte.

## Como foi feito

Não existe um `geom_funnel()` pronto no `ggplot2`, então cada etapa é
desenhada à mão como um trapézio com `geom_polygon()`: a largura do topo é o
valor da própria etapa, a largura da base é o valor da etapa **seguinte**
(a última etapa fica com base igual ao topo, sem afunilar mais) — são essas
retas inclinadas, não blocos retos, que dão o formato clássico de funil.
`RColorBrewer::brewer.pal(5, "BuPu")` dá uma cor por profundidade, do início
(mais escuro) ao fim (mais claro) do processo.

Dados fictícios: um funil de checkout de uma loja online fictícia, começando
em 12.480 visitantes (`set.seed(7742)`), com uma queda percentual sorteada
etapa a etapa — deliberadamente maior nas duas primeiras etapas (visitar →
ver produto → carrinho) e menor nas duas últimas (carrinho → checkout →
compra), o perfil típico de e-commerce real, onde a maior parte do abandono
acontece bem no início da jornada, não perto do pagamento.

A versão interativa recalcula a mesma geometria de trapézio em D3, com o
rótulo de cada etapa aparecendo só quando ela é larga o bastante pra caber o
texto — etapas mais estreitas dependem só do tooltip, que mostra a
quantidade, o percentual do total **e** a taxa de conversão específica
daquela etapa em relação à anterior (esse último número não está no PNG
estático).

## Possíveis problemas pelo caminho

- **Problema**: texto quase-branco sobre um trapézio bem estreito sai com
  pedaços de palavra faltando ("Iniciaram o checkout" virando algo como
  "ciaram o checko"), sem nenhum erro no console do R. **Por quê**: é um
  bug de renderização do dispositivo que gera o PNG quando texto muito claro
  cai sobre uma forma estreita — não falta de espaço de verdade (o mesmo
  texto, na mesma posição, renderiza inteiro se a cor for um cinza médio ou
  preto). **Solução**: desenhar o rótulo como uma etiqueta (fundo branco +
  texto escuro, `geom_label()`) em vez de texto claro direto sobre o
  preenchimento — resolve por completo e ainda fica legível em cima de
  qualquer cor de fundo, clara ou escura.
- **Problema**: o gráfico nasce com uma faixa enorme de espaço em branco
  acima do funil, ou o funil sai comprimido/deformado. **Por quê**: forçar
  `coord_fixed()` com uma proporção calculada na mão distorce o painel de
  forma imprevisível quando a amplitude dos eixos X e Y é muito diferente
  (aqui, milhares de unidades no X contra só 5 posições no Y). **Solução**:
  não fixar a proporção — deixar o `ggsave(width=, height=)` controlar o
  formato final da imagem.

## Variações possíveis

- Funil "espelhado": em vez de estreitar simetricamente dos dois lados,
  alinhar todas as etapas por um dos lados (só a direita ou só a esquerda
  estreita) — comum em dashboards de produto.
- Colorir por taxa de conversão da etapa (uma escala divergente, vermelho
  pra quedas grandes, verde pra quedas pequenas) em vez de por profundidade
  no funil — muda o que a cor comunica, de "onde estou no processo" pra
  "quão grave foi essa etapa".
- Funil duplo/comparativo: dois funis lado a lado (ex: desktop vs. mobile,
  ou este mês vs. mês passado) pra comparar onde cada grupo perde mais
  gente.
