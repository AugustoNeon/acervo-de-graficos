---
title: "Linha interativa com 4 tratamentos de destaque"
category: evolution
date: 2026-07-24
source: "https://r-graph-gallery.com/412-customize-css-in-interactive-ggiraph.html"
interactive: true
resumo: "Séries temporais em que quatro modos diferentes de destaque — escolhidos por um seletor — mostram formas distintas de isolar uma categoria."
veredito_uso: "há muitas linhas sobrepostas (gráfico de espaguete) e você quer comparar formas de destacar uma categoria."
veredito_evita: "o destino final é impressão ou PDF — nesse caso invista no gráfico estático."
pacotes: ["ggplot2", "tidyverse", "jsonlite", "d3"]
dados: "3 colunas — tempo, categoria e valor (uma linha por combinação)"
nivel: intermediário
tags: ["temporal"]
---

## O que é

Um gráfico de linhas comum — várias séries temporais na mesma tela, uma cor por
categoria — com um problema clássico quando o número de séries cresce: linhas se
cruzam, cores próximas se confundem, e seguir uma categoria específica de ponta a
ponta fica difícil só de olho.

Esta página mostra quatro tratamentos diferentes de interação sobre exatamente o
mesmo gráfico, alternáveis pelos botões acima dele:

1. **Hover simples** — a linha sob o cursor fica amarela; clicar fixa uma seleção
   em vermelho, que persiste até clicar de novo.
2. **Destacar e apagar as outras** — a linha sob o cursor ganha destaque e as
   demais são esmaecidas e dessaturadas.
3. **Hover avançado** — traço tracejado, sombra e pontos maiores na linha sob o
   cursor, com as demais atenuadas.
4. **Tooltip e zoom** — role o scroll para ampliar um trecho do eixo do tempo, o
   ponto mais próximo do cursor cresce, e clicar num item da legenda soma ele a
   uma seleção múltipla.

**Para que serve**: comparar a evolução de várias categorias ao longo do tempo, e
mostrar como a escolha da interação muda completamente a experiência de leitura,
partindo do mesmo gráfico e dos mesmos dados.

## Quando usar (e quando evitar)

**Use o tratamento 2 quando** houver muitas linhas sobrepostas — o clássico
"gráfico de espaguete". Esmaecer as demais é a forma mais eficaz de tornar um
gráfico poluído legível sem remover nenhuma linha.

**Use o 4 quando** a série for longa ou os valores exatos importarem — o zoom
deixa investigar um período específico sem perder a visão geral por perto.

**Use o 1 quando** quiser uma seleção que persista enquanto quem está lendo
examina os números, sem precisar manter o mouse parado.

**Evite o 3 em uso sério**: sombra e traço tracejado chamam atenção para o efeito, não para o dado.

<div class="pull-quote">está aqui como demonstração do que é possível, não como recomendação</div>

**Evite qualquer interatividade quando** o destino final for impressão ou PDF —
nesse caso invista no gráfico estático.

## Que dados você precisa

- **Tempo** — a coluna do eixo horizontal.
- **Categoria** — o que separa uma linha da outra.
- **Valor** — a grandeza numérica.

Formato longo/tidy: uma linha por combinação tempo × categoria.

## Como ler o gráfico

- **Eixo horizontal**: o tempo.
- **Eixo vertical**: o valor do índice.
- **Cor**: a categoria (país), repetida na legenda abaixo do gráfico.
- **Cada linha** acompanha uma categoria ao longo do período.

Troque o modo nos botões acima do gráfico e observe a diferença: o modo 2 é o
que mais ajuda quando as linhas se cruzam bastante; o 4 é o único com zoom
(role o scroll sobre o gráfico) e seleção múltipla (clique nos itens da
legenda).

## Como foi feito

O gráfico estático vem de `ggplot2` comum (`geom_line()` + `geom_point()`), sem
nada de especial — a técnica interessante está só na versão interativa.

A versão anterior desta página gerava os 4 tratamentos com CSS puro do
`ggiraph` (`opts_hover()`, `opts_hover_inv()`, `opts_selection()`,
`opts_zoom()` — cada um só um texto CSS passado pra função). Isso não tem
equivalente direto em D3: lá, toda interatividade é código JavaScript por
natureza, não existe um "modo CSS". Os 4 tratamentos foram reconstruídos como
4 blocos de lógica em D3, ativados por um estado (`modoAtivo`) trocado nos
botões — mesmo efeito final, escrito na linguagem que o D3 realmente tem.

Duas simplificações conscientes em relação ao original: o botão de exportar
PNG do modo 4 não foi recriado (baixo valor pedagógico frente à complexidade de
serializar o SVG num canvas); e a superfície de zoom do modo 4 precisa cobrir
o gráfico inteiro pra capturar o scroll, o que bloquearia o hover por linha
dos outros 3 modos — por isso ela só fica "ativa" (`pointer-events`) quando o
modo 4 está selecionado, e usa sua própria lógica de "ponto mais próximo do
cursor" (compara todas as séries de uma vez, não só a que está sob o mouse).

Dois detalhes técnicos que valem pra qualquer um dos 4 modos: (1) a linha
visível tem só ~2px de espessura, um alvo de ponteiro pequeno demais — por
cima de cada linha existe uma segunda linha invisível e bem mais larga, só
para capturar o hover; (2) o ponto que acompanha o cursor usa `d3.bisector()`
para achar a data mais próxima da posição horizontal do cursor — sem isso o
tooltip só conseguiria mostrar o valor do ponto exato onde o SVG foi clicado.

Dados fictícios: índice de sentimento econômico de 6 países ao longo de 24
meses, gerado como passeio aleatório com `set.seed(3311)`.

## Possíveis problemas pelo caminho

- **Problema**: o hover não registra quase nunca, mesmo passando o cursor bem
  em cima da linha. **Por quê**: o traço visível é fino (~2px) e a área
  clicável de um `<path>` em SVG é literalmente o traço, sem nenhuma margem de
  tolerância. **Solução**: desenhar uma segunda cópia do mesmo path, invisível
  (`stroke: transparent`) e bem mais larga, só para receber os eventos de
  ponteiro.

- **Problema**: o tooltip mostra o valor de um mês qualquer, não o mais
  próximo de onde o cursor está. **Por quê**: sem nenhum cálculo extra, o
  único jeito de saber "qual ponto" seria o cursor estar exatamente em cima de
  um `<circle>` — o que raramente acontece. **Solução**: converter a posição
  horizontal do cursor de volta para uma data (`escalaX.invert()`) e usar
  `d3.bisector()` pra achar o ponto da série mais próximo dessa data.

- **Problema**: trocar de modo deixa "sobras" visuais do modo anterior — uma
  linha ainda vermelha, um filtro de sombra grudado. **Por quê**: cada modo
  aplica seus próprios atributos/estilos por cima do estado neutro, e nada os
  desfaz automaticamente ao trocar de modo. **Solução**: uma função
  `aplicarNeutro()` chamada sempre que o seletor muda, que redefine cor,
  espessura, `stroke-dasharray` e `filter` de todas as linhas pro estado
  base, antes do novo modo aplicar o que for seu.

- **Problema**: girar o scroll sobre o gráfico no modo 4 rola a página inteira
  em vez de dar zoom no gráfico. **Por quê**: sem capturar o evento de
  `wheel`, o navegador trata o scroll normalmente. **Solução**: `d3.zoom()`
  anexado a uma superfície (`<rect>` transparente) sobre a área de plotagem —
  ela intercepta o scroll só quando está com `pointer-events: all`, o que só
  acontece no modo 4.

- **Problema**: um `Rplots.pdf` indesejado aparece na pasta junto do PNG.
  **Por quê**: o plot foi deixado para imprimir sozinho no fim do script.
  **Solução**: atribuir o gráfico a uma variável (`p <- ggplot(...) + ...`) e
  passá-la explicitamente para `ggsave()`.

## Variações possíveis

- Combinar o modo 2 com o zoom do modo 4 — destacar e apagar as demais séries
  ajuda ainda mais depois de ampliar um trecho específico.
- Adicionar uma segunda camada de destaque por grupo (ex: países vizinhos),
  quando as categorias tiverem uma hierarquia natural entre si.
- Trocar o destaque por hover por um pequeno múltiplo (`facet_wrap` no
  estático, um painel por série no D3) quando o número de categorias for
  grande demais até para os 4 modos ajudarem.
- Ligar este gráfico a outro pelo mesmo identificador de categoria, como em
  [dashboard interativo: mapa + dispersão + barras](../../map/dashboard-inovacao-ggiraph).

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../serie-temporal-customizada-dygraphs" style="--cat-link: var(--cat-evolution); --cat-link-ink: var(--cat-evolution-ink);">
    <span class="parecido-cat">evolution</span>
    <span class="parecido-titulo">Série temporal interativa customizada</span>
    <span class="parecido-razao">Mesma técnica de base (linhas temporais em D3) e o mesmo par de pegadinhas de fuso horário — os dois compartilham o helper que evita esse bug.</span>
  </a>
  <a class="parecido-item" href="../../map/dashboard-inovacao-ggiraph" style="--cat-link: var(--cat-map); --cat-link-ink: var(--cat-map-ink);">
    <span class="parecido-cat">map</span>
    <span class="parecido-titulo">Dashboard interativo: mapa + dispersão + barras</span>
    <span class="parecido-razao">A mesma ideia de coordenar destaque entre elementos, levada a três painéis ligados por um identificador comum em vez de um seletor de modo.</span>
  </a>
</div>

## Notas do coletor

Um tooltip mostrava "jul." com o valor numérico de agosto — um mês inteiro
de diferença, sempre na mesma direção. A data vinha certa do `data.json`
(string `"2024-08-01"`), e o código de formatação também parecia certo:
`toLocaleDateString('pt-BR', {...})` sobre o `Date` correspondente.

O problema tinha duas causas empilhadas, não uma. Primeiro: uma string de
data sem fuso horário explícito (`AAAA-MM-DD`) é interpretada como
**meia-noite UTC** — e formatar esse instante sem passar `timeZone: 'UTC'`
usa o fuso do navegador (`America/Sao_Paulo`, UTC−3), o que empurra meia-noite
de 1º de agosto em UTC pra 21h de 31 de julho no horário local — daí o mês
errado no tooltip. Corrigir só o `toLocaleDateString()` resolveu o tooltip,
mas o eixo continuou errado: `d3.scaleTime()`, usado pra posicionar e
formatar os ticks do eixo, tem exatamente o mesmo problema por baixo, e
corrigir um lado sem o outro só move o sintoma.

A correção completa trocou `d3.scaleTime()` por `d3.scaleUtc()` na escala
do eixo — não só o `toLocaleDateString()` isolado — e centralizou as duas
partes (escala + formatação) num helper compartilhado depois que o mesmo
par de correções teve que ser refeito do zero em mais dois gráficos deste
acervo. Qualquer eixo de tempo novo em D3 importa desse helper agora, em
vez de reimplementar as duas metades da correção de novo.
