---
title: "Waffle chart: participação de mercado"
category: part-of-whole
date: 2026-09-09
source: "https://r-graph-gallery.com/waffle.html"
interactive: true
resumo: "O mercado de smartphones dividido em 100 quadrados, um por ponto percentual, coloridos por fabricante."
veredito_uso: "as categorias somam 100% (ou é fácil normalizar pra isso) e você quer que o leitor consiga CONTAR a participação de cada uma, não só comparar áreas."
veredito_evita: "há muitas categorias pequenas — dezenas de quadrados isolados de 1% cada viram ruído visual antes de virarem informação."
pacotes: ["ggplot2", "dplyr", "tidyr"]
dados: "1 variável categórica + 1 numérica (participação em pontos percentuais, somando 100)"
nivel: básico
tags: ["waffle", "pictograma", "composição"]
---

## O que é

Um waffle chart divide o todo numa grade fixa de unidades — aqui, 100
quadrados — e preenche cada uma com a cor da categoria correspondente,
na proporção exata que ela representa. **Para que serve**: mostrar a
composição de um total de um jeito que dá pra **contar**, não só comparar
visualmente — 28 quadrados azuis são literalmente 28%, sem precisar
estimar um ângulo ou julgar uma área.

## Quando usar (e quando evitar)

**Use quando** as categorias somarem 100% (ou for fácil normalizar pra
isso) e a audiência se beneficiar de uma leitura mais literal do que a de
uma pizza ou rosca — cada unidade discreta é mais fácil de contar do que
um arco é de medir a olho. Funciona bem também como pictograma: trocar o
quadrado por um ícone (uma pessoa, um item) reforça ainda mais a ideia de
"cada unidade é uma coisa real".

**Evite quando** houver muitas categorias pequenas — cada uma abaixo de
uns 3 pontos percentuais vira 1, 2 quadrados isolados espalhados pela
grade, difíceis de agrupar visualmente. Nesse caso, uma [barra
única empilhada](../barplot-agrupado-empilhado) ordena as fatias pequenas
lado a lado e lê melhor. Evite também quando a precisão importar mais do
que a contagem — a grade força arredondamento pro ponto percentual mais
próximo, perdendo casas decimais que uma barra ou pizza convencional
preservariam.

## Como ler o gráfico

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#2E6E8E"></span> Vertex — 28%</div>
  <div><span class="swatch" style="background:#3F9C6E"></span> Nébula — 22%</div>
  <div><span class="swatch" style="background:#D4A537"></span> Aeris — 18%</div>
  <div><span class="swatch" style="background:#C15A3E"></span> Kaion — 12%</div>
</div>

- **Cada quadrado**: 1 ponto percentual do total — nunca uma unidade real
  de contagem (não são "100 smartphones", são 100 fatias iguais do bolo).
- **Cor**: o fabricante — a mesma paleta da legenda abaixo da grade.
- **Ordem de preenchimento**: da esquerda pra direita e de baixo pra cima,
  fabricante por fabricante, na ordem da legenda — não tem significado
  geográfico nem temporal, é só a convenção de leitura do gráfico.

## Como foi feito

**Sem pacote específico**: existe um pacote `waffle` no CRAN, mas ele não
estava disponível nesta sessão (ver nota de bloqueio de rede em
`docs/SETUP.md`) — a grade foi montada à mão com `tidyr::uncount()`
(transforma uma linha "Vertex, 28%" em 28 linhas repetidas, uma por
quadrado) seguido de `geom_tile()`, calculando linha/coluna de cada
unidade por divisão inteira e resto sobre um índice sequencial. A mesma
técnica de "sem widget pronto, desenha na mão" já usada no [gráfico
ternário](../../general/ternario-composicao-nutricional) e no [UpSet](../../general/upset-combinacoes-transporte)
desta base.

**Dado fictício**: participação de mercado de seis fabricantes de
smartphone somando exatamente 100 — um `stopifnot()` no início do script
garante isso antes de gerar a grade, porque qualquer soma diferente de
100 deixaria buracos ou sobras na grade 10×10.

**Na versão interativa**: o `data.json` carrega só a lista
fabricante+participação, nunca a grade já preenchida — o D3 "estoura" essa
lista em 100 unidades e calcula linha/coluna da mesma forma que o R,
formula compartilhada em vez de geometria pronta. Cada quadrado nasce como
um ponto no próprio centro e cresce até o tamanho final, escalonado um a
um na ordem de preenchimento.

## Possíveis problemas pelo caminho

- **Problema**: a grade final sobra ou falta quadrados. **Por quê**: a soma
  das participações não fecha em exatamente 100 (arredondamento de
  porcentagens reais raramente fecha sozinho). **Solução**: ajuste a maior
  categoria (ou uma categoria "outras") pra absorver a diferença antes de
  gerar a grade — nunca deixe o preenchimento silenciosamente parar antes
  do fim ou estourar o total de células.

## Variações possíveis

- Trocar o quadrado por um ícone (pessoa, item, ⬤) usando uma fonte de
  ícone ou um `<symbol>` SVG — vira um pictograma clássico sem mudar nada
  da lógica de preenchimento.
- Usar uma grade diferente de 10×10 (por exemplo, 20×5) quando o espaço
  disponível for mais largo que alto — muda só `LADO` e a proporção do
  gráfico, a lógica de preenchimento continua igual.
- Agrupar visualmente as categorias pequenas numa faixa "outras" antes de
  montar a grade, quando houver muitas categorias residuais de 1-2%.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../pizza-matriz-energetica" style="--cat-link: var(--cat-part-of-whole); --cat-link-ink: var(--cat-part-of-whole-ink);">
    <span class="parecido-cat">part-of-whole</span>
    <span class="parecido-titulo">Pizza clássica: matriz de geração elétrica</span>
    <span class="parecido-razao">O oposto direto: mesma pergunta de composição, mas codificada por ângulo contínuo em vez de unidades contáveis.</span>
  </a>
  <a class="parecido-item" href="../../general/upset-combinacoes-transporte" style="--cat-link: var(--cat-general); --cat-link-ink: var(--cat-general-ink);">
    <span class="parecido-cat">general</span>
    <span class="parecido-titulo">UpSet: combinações de meios de transporte</span>
    <span class="parecido-razao">Mesma filosofia de "sem pacote pronto, monta na mão com geom_tile" aplicada a um problema de composição bem diferente (interseções, não partes de um todo).</span>
  </a>
</div>
