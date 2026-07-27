---
title: "Linha interativa com CSS customizado (ggiraph)"
category: evolution
date: 2026-07-24
source: "https://r-graph-gallery.com/412-customize-css-in-interactive-ggiraph.html"
interactive: true
resumo: "Séries temporais em que a interação é definida por CSS puro, com quatro estilos de destaque alternáveis por botões."
pacotes: ["ggplot2", "ggiraph", "tidyverse", "htmltools"]
dados: "3 colunas — tempo, categoria e valor (uma linha por combinação)"
nivel: intermediário
tags: ["interativo", "temporal", "CSS"]
---

## O que é

Um gráfico de linhas comum, com uma diferença importante: ele é gerado como SVG em
que **cada elemento carrega um identificador**, e o comportamento de hover, seleção
e tooltip é definido por **CSS**, não por JavaScript escrito à mão.

Na prática, isso significa que transformar um `ggplot2` em gráfico interativo custa
trocar `geom_line()` por `geom_line_interactive()` e adicionar duas estéticas.

Esta página mostra quatro tratamentos de interação sobre exatamente o mesmo
gráfico, alternáveis pelos botões acima dele:

1. **Hover simples** — realce ao passar o mouse, clique para fixar.
2. **Destacar e apagar as outras** — a linha sob o cursor ganha destaque e as demais
   são esmaecidas e dessaturadas.
3. **Hover avançado** — preenchimento translúcido, traço tracejado e sombra, com
   transição suave.
4. **Tooltip e zoom** — tooltip estilizado, pontos que crescem, seleção múltipla,
   zoom por rolagem e botão de exportar.

**Para que serve**: mostrar como a escolha do CSS muda completamente a experiência
de leitura, partindo do mesmo gráfico e dos mesmos dados.

## Quando usar (e quando evitar)

**Use o tratamento 2 quando** houver muitas linhas sobrepostas — o clássico
"espaguete". Esmaecer as demais é a forma mais eficaz de tornar um gráfico
poluído legível sem remover dado nenhum.

**Use o 4 quando** os valores exatos importarem e o leitor precisar investigar
períodos específicos.

**Use o 1 quando** quiser interatividade discreta, que não distraia.

**Evite o 3 em uso sério**: sombras, tracejados e transições chamam atenção para o
efeito, não para o dado. Ele está aqui como demonstração do que é possível.

**Evite qualquer interatividade quando** o destino final for impressão ou PDF —
nesse caso invista no gráfico estático.

## Que dados você precisa

- **Tempo** — a coluna do eixo horizontal.
- **Categoria** — o que separa uma linha da outra.
- **Valor** — a grandeza numérica.

Formato longo/tidy: uma linha por combinação tempo × categoria.

Além disso, a interatividade exige duas estéticas: `data_id`, que agrupa os
elementos que devem ser destacados juntos (aqui, a categoria), e `tooltip`, com o
texto exibido — aceita HTML.

## Como ler o gráfico

- **Eixo horizontal**: o tempo.
- **Eixo vertical**: o valor do índice.
- **Cor**: a categoria (país).
- **Cada linha** acompanha uma categoria ao longo do período.

Passe o mouse sobre qualquer linha para destacá-la. Troque o estilo nos botões
acima do gráfico e observe a diferença: o estilo 2 é o que mais ajuda quando as
linhas se cruzam muito.

## Como foi feito

O gráfico é construído uma única vez em `ggplot2`, usando
`geom_line_interactive()` e `geom_point_interactive()`. Esses geoms se comportam
como os normais quando o objeto é passado direto para `ggsave()` — as estéticas de
interatividade são simplesmente ignoradas —, então o mesmo objeto serve para a
imagem estática e para as quatro versões interativas, sem duplicar código.

Cada estilo é o mesmo gráfico embrulhado em `girafe()` com um `girafe_options()`
diferente: `opts_hover()`, `opts_hover_inv()` (que estiliza tudo que **não** está
sob o cursor), `opts_tooltip()`, `opts_selection()` e `opts_zoom()`. Todos recebem
CSS em texto.

Os quatro widgets são reunidos num único arquivo com `htmltools::save_html()`, que
aceita uma `tagList()` combinando vários widgets mais HTML, CSS e JS próprios — algo
que `saveWidget()` não faz, por salvar apenas um widget por vez.

A barra de botões é JavaScript puro: cada painel fica oculto exceto o ativo,
alternado por classe no clique.

Dados fictícios: índice de sentimento econômico de 6 países ao longo de 24 meses,
gerado como passeio aleatório com `set.seed(3311)`.

## Possíveis problemas pelo caminho

- **Problema**: o hover destaca só um segmento da linha, não a série inteira. **Por
  quê**: falta o `data_id`, ou ele está apontando para a observação em vez da
  categoria. **Solução**: usar `data_id = categoria` — ele é o que agrupa os
  elementos.

- **Problema**: `saveWidget()` não consegue salvar os quatro estilos juntos. **Por
  quê**: ele aceita um widget por arquivo. **Solução**: usar
  `htmltools::save_html()` com uma `tagList()`.

- **Problema**: as dependências vão parar numa pasta `lib/` e o site não as
  encontra. **Por quê**: é o padrão do `save_html()`. **Solução**: passar
  `libdir = "widget_files"` explicitamente.

- **Problema**: o CSS não surte efeito. **Por quê**: as regras são aplicadas a
  classes geradas dinamicamente, e propriedades erradas para SVG não fazem nada —
  em SVG a cor de preenchimento é `fill`, não `background-color`. **Solução**: usar
  propriedades SVG (`fill`, `stroke`, `stroke-width`, `opacity`).

- **Problema**: texto muito pequeno ou desproporcional no widget. **Por quê**:
  `width_svg`/`height_svg` definem o sistema de coordenadas, e o SVG é reescalado
  para caber no container. **Solução**: ajustar essas dimensões em vez do tamanho
  da fonte.

## Variações possíveis

- Combinar `opts_hover()` com `opts_hover_inv()` para destacar e esmaecer ao mesmo
  tempo — costuma ser o melhor resultado prático.
- Usar `opts_selection(type = "multiple")` para permitir comparar categorias
  escolhidas com clique.
- Aplicar a mesma técnica a outros geoms: barras, dispersão e mapas aceitam as
  versões `_interactive` da mesma forma.
- Ligar vários gráficos pelo mesmo `data_id`, como em
  [dashboard interativo: mapa + dispersão + barras](../../map/dashboard-inovacao-ggiraph).
