---
title: "Intervalos de confiança: taxa de conversão por variante de teste A/B"
category: comparison
date: 2026-08-28
source: "https://r-graph-gallery.com/web-error-bars-with-ggplot2.html"
interactive: true
resumo: "A taxa média observada de cada variante, com o intervalo de confiança ao redor — variantes cujos intervalos se sobrepõem podem não ser realmente diferentes."
veredito_uso: "você tem uma média por grupo E uma medida de incerteza dela, e quer que o leitor veja de cara quais diferenças são reais e quais podem ser só ruído de amostra."
veredito_evita: "você só tem os valores observados, sem nenhuma estimativa de erro — nesse caso um barplot comum já resolve, sem forçar um intervalo que não existe."
pacotes: ["ggplot2", "jsonlite", "d3"]
dados: "1 variável categórica + 1 numérica (a média) + 1 medida de incerteza (erro padrão)"
nivel: intermediário
tags: ["comparação", "incerteza", "estatística"]
---

## O que é

Um gráfico de intervalo de confiança marca, para cada grupo, um ponto (a
média observada) e uma linha horizontal ao redor dele (a faixa onde o valor
real provavelmente está). **Para que serve**: responder não só "qual grupo
teve o número maior" mas "essa diferença é grande o bastante pra confiar
nela, ou pode ser só ruído de amostra" — a pergunta que uma média sozinha,
sem contexto de incerteza, nunca responde.

É deliberadamente **pontos com linha**, não barras com barra de erro: uma
barra desenha uma "torre" até o zero que não é o que importa aqui — o que
importa é só a região de incerteza ao redor da média, e uma barra cheia
distrai dela.

## Quando usar (e quando evitar)

**Use quando** você tem uma média (ou outra estimativa) por grupo e também
uma medida de incerteza dela — erro padrão, desvio padrão ou intervalo de
confiança calculado de algum jeito. É o gráfico certo pra decidir se um
teste A/B tem um vencedor de verdade, se a diferença entre dois grupos
sobrevive ao tamanho da amostra, ou se um resultado precisa de mais dado
antes de virar decisão.

**Evite quando** você só tem os valores observados, sem nenhuma estimativa
de erro — não invente um intervalo só pra usar a técnica; um barplot ou
lollipop comum já resolve. Evite também comparar mais de ~8-10 grupos de
uma vez: passado esse número, a régua vertical de linhas fica difícil de
escanear, e agrupar ou filtrar os grupos mais relevantes lê melhor.

## Que dados você precisa

- **variável categórica** — o grupo (aqui, a variante do teste)
- **uma estimativa numérica** — a média observada de cada grupo
- **uma medida de incerteza** — erro padrão é o mais comum; também funciona
  com desvio padrão ou os dois limites de um IC já calculados por outro
  método (bootstrap, por exemplo)

O intervalo de confiança em si (`média ± 1,96 × erro padrão` para 95%) é
derivado, não precisa vir pronto no dado — só o erro padrão de cada grupo.

## Como ler o gráfico

- **Posição do ponto**: a média observada daquele grupo.
- **Comprimento da linha**: o intervalo de confiança — quanto mais curta,
  mais precisa é a estimativa (geralmente, amostra maior).
- **Linha vertical tracejada**: a média do grupo de referência (aqui, o
  controle), pra comparar todos os outros contra um ponto fixo.
- **Dois intervalos que se sobrepõem**: os dois grupos podem não ser
  realmente diferentes — a diferença entre as médias pode ser só ruído.
  Intervalos que **não** se tocam são o sinal mais forte de uma diferença
  real.

## Como foi feito

**Geometria**: `geom_errorbarh()` (a linha horizontal com "tampa" nas duas
pontas) por baixo de um `geom_point()` — a ordem importa, senão o ponto some
atrás da linha do intervalo. A linha de referência do controle é um
`geom_vline()` simples, desenhada primeiro pra ficar atrás de tudo.

**Intervalo**: calculado uma vez (`média ± 1,96 × erro_padrao`) e usado só
pra desenhar — o erro padrão de cada variante é o dado real exportado,
1,96 é a constante que converte erro padrão em intervalo de confiança de
95% (a mesma constante que a versão interativa usa pra recalcular o
intervalo do zero, nunca lendo um valor pré-calculado do R).

**Dado fictício**: taxa de conversão de checkout em 5 variantes de teste
(A a E), com erro padrão diferente por variante, não um valor único pra
todas — de propósito, pra desenhar quatro histórias ao mesmo tempo: A e B
têm intervalos que se sobrepõem (não dá pra separar os dois com confiança);
C fica claramente acima de todo o resto; D fica claramente abaixo; E tem
uma média parecida com A, mas um intervalo enorme, porque a amostra dela
é bem menor que a das outras quatro.

**Na versão interativa**: o mesmo ponto ganha um segundo modo de intervalo —
**erro padrão** (±1, bem mais estreito) em vez de **IC 95%** (±1,96) — pra
mostrar que a leitura de "quem parece diferente de quem" depende da
convenção de intervalo escolhida, não só dos dados. O eixo nunca se move
entre os modos: o domínio é calculado uma vez a partir do intervalo mais
largo (IC 95%), então trocar de modo só encolhe as linhas.

## Possíveis problemas pelo caminho

- **Problema**: o ponto (média) desaparece atrás da linha do intervalo.
  **Por quê**: no `ggplot2` a ordem de empilhamento é a ordem em que as
  camadas são somadas — com `geom_point()` antes de `geom_errorbarh()`, a
  linha, mais grossa, cobre o ponto. **Solução**: sempre declarar o
  intervalo antes do ponto.
- **Problema**: dois grupos com médias visivelmente diferentes no gráfico
  ainda assim têm intervalos que se tocam, e não dá pra dizer que são
  "diferentes" com confiança. **Por quê**: não é bug — é exatamente o que o
  intervalo de confiança avisa quando a amostra (ou a variação interna do
  grupo) não é grande o bastante pra separar as duas médias com certeza.
  **Solução**: nenhuma correção de gráfico resolve isso — a resposta certa é
  coletar mais dado, não forçar uma conclusão que o intervalo não sustenta.

## Variações possíveis

- Colorir os pontos por "significativo vs não" (comparando cada intervalo
  contra o do controle) em vez de deixar essa leitura só pro olho — troca a
  interpretação para o próprio gráfico, ao custo de exigir uma regra
  explícita de "o que conta como significativo".
- Ordenar os grupos pela média em vez da ordem original, quando o ranking
  importar mais do que a ordem em que os grupos foram testados.
- Empilhar vários indicadores (não só um) no mesmo eixo Y, um bloco de
  pontos por indicador, quando o teste tiver mais de uma métrica de
  sucesso.
- Usar bootstrap em vez da fórmula `média ± 1,96 × erro padrão` para
  calcular o intervalo, quando a distribuição do dado for muito assimétrica
  e a aproximação normal não for confiável.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../halteres-espera-especialidades" style="--cat-link: var(--cat-comparison); --cat-link-ink: var(--cat-comparison-ink);">
    <span class="parecido-cat">comparison</span>
    <span class="parecido-titulo">Halteres: espera antes e depois por especialidade</span>
    <span class="parecido-razao">Mesma família visual (ponto + linha horizontal), propósito oposto: ali a linha liga DOIS valores observados sem incerteza nenhuma; aqui é UM valor com a incerteza ao redor dele.</span>
  </a>
  <a class="parecido-item" href="../../distribution/boxplot-classico" style="--cat-link: var(--cat-distribution); --cat-link-ink: var(--cat-distribution-ink);">
    <span class="parecido-cat">distribution</span>
    <span class="parecido-titulo">Boxplot clássico: cinco variações</span>
    <span class="parecido-razao">Incerteza de tipos diferentes: o boxplot mostra a dispersão dos dados observados (quartis); este gráfico mostra a incerteza sobre a MÉDIA estimada — não são a mesma coisa, e é fácil confundir as duas.</span>
  </a>
</div>

## Notas do coletor

A primeira tentativa de desenho tinha o `geom_point()` antes do
`geom_errorbarh()`, seguindo a ordem "primeiro o dado principal, depois o
detalhe" — parecia a ordem lógica de leitura do código. O resultado saiu
com os pontos sumindo: a linha do intervalo, mais grossa e desenhada por
cima, cobria o círculo inteiro em quase todas as variantes, sobrando só um
traço contínuo sem marcação nenhuma de onde ficava a média.

Não foi um bug de cor nem de tamanho — os dois elementos estavam lá, com os
atributos certos. Era só ordem de empilhamento: o `ggplot2` desenha camadas
na ordem em que são somadas ao gráfico, então a última declarada fica por
cima. Inverter a ordem (intervalo primeiro, ponto depois) resolveu sem
mudar mais nada. Fica registrado porque é o tipo de erro que "funciona" no
código (nenhum aviso, nenhum erro) e só aparece olhando a imagem renderizada
de verdade — a mesma lição do dumbbell desta categoria, com a ordem
invertida.
