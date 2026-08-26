---
title: "Funil de conversão de uma loja online"
category: flow
date: 2026-08-24
source: "https://r-graph-gallery.com/funnel-plot.html"
interactive: true
resumo: "Quantos visitantes sobrevivem a cada etapa do checkout, da entrada no site até a compra concluída."
veredito_uso: "as etapas têm ordem obrigatória e cada uma é subconjunto estrito da anterior."
veredito_evita: "as categorias não têm relação de contenção, ou há mais de 6-7 etapas."
pacotes: ["ggplot2", "RColorBrewer"]
dados: "1 variável categórica ordenada (etapa) + 1 numérica (contagem em cada etapa)"
nivel: básico
tags: ["funil", "conversão"]
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
etapa a etapa — deliberadamente maior nas duas primeiras etapas e menor nas
duas últimas, o perfil típico de e-commerce real.

<div class="pull-quote pull-quote-direita clearfix">a maior parte do abandono acontece bem no início da jornada, não perto do pagamento</div>

A versão interativa recalcula a mesma geometria de trapézio em D3, com o
rótulo de cada etapa aparecendo só quando ela é larga o bastante pra caber o
texto — etapas mais estreitas dependem só do tooltip, que mostra a
quantidade, o percentual do total **e** a taxa de conversão específica
daquela etapa em relação à anterior (esse último número não está no PNG
estático).

## Possíveis problemas pelo caminho

- **Problema**: texto quase-branco sobre um trapézio bem estreito sai com
  pedaços de palavra faltando ("Iniciaram o checkout" virando algo como
  "ciaram o checko"), sem nenhum erro no console do R. **Solução**: desenhe
  o rótulo como etiqueta (fundo branco + texto escuro, `geom_label()`) em
  vez de texto claro direto sobre o preenchimento — a investigação completa
  está em "Notas do coletor", no fim da página.
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

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../cascata-variacao-receita" style="--cat-link: var(--cat-flow); --cat-link-ink: var(--cat-flow-ink);">
    <span class="parecido-cat">flow</span>
    <span class="parecido-titulo">Cascata: o que explica a variação da receita</span>
    <span class="parecido-razao">Mesma família (etapas sequenciais que se acumulam), mas sem a restrição de só encolher — a cascata pode subir e descer, o funil só afunila.</span>
  </a>
</div>

## Notas do coletor

O texto de um rótulo saía com pedaços faltando — não cortado de forma
óbvia (tipo "..."), literalmente faltando letras do meio ou do início da
palavra, e só nas etapas mais estreitas do funil. A primeira suspeita óbvia
era falta de espaço: o texto não cabia na largura daquele trapézio
específico.

Eliminação sistemática descartou isso rápido: o mesmo texto, na mesma
posição e tamanho, cabia inteiro quando a cor mudava pra um cinza médio ou
preto — só sumia com a cor quase-branca original. Também não era sobre
`coord_cartesian(clip=)` (alternar entre os dois modos não mudou nada), nem
sobre o número de grupos do `geom_polygon()`, nem sobre a forma ser
trapézio em vez de retângulo isoladamente. Só reproduzia com a
**combinação** exata: texto muito claro **e** forma estreita ao mesmo
tempo — nenhum dos dois fatores sozinho.

A causa real é um bug de renderização do próprio dispositivo que gera o
PNG nessa máquina, não um erro de lógica no código — algo na forma como
texto quase-branco é composto sobre uma forma de largura pequena faz
glifos sumirem silenciosamente, sem warning. A correção não tentou achar
"a cor certa" de texto claro longe o bastante do branco — trocou a
abordagem inteira: rótulo como etiqueta, fundo branco sólido atrás de
texto escuro (`geom_label()`), que nunca esbarra nesse bug e ainda fica
legível sobre qualquer cor de fundo. Outros gráficos deste acervo (pizza,
rosca, treemap) usam texto branco direto sobre preenchimento sem problema —
eles nunca tiveram uma forma fina o bastante pra disparar o bug, não porque
fizeram algo diferente.
