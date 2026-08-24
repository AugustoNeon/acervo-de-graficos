---
title: "Barplot agrupado e empilhado"
category: part-of-whole
date: 2026-08-18
source: "https://r-graph-gallery.com/barplot.html"
interactive: true
resumo: "As mesmas 24 células gênero × plataforma se reorganizando entre agrupado, empilhado e empilhado 100%."
pacotes: ["ggplot2", "patchwork", "RColorBrewer", "jsonlite", "d3"]
dados: "2 variáveis categóricas (categoria + subgrupo) + 1 numérica"
nivel: intermediário
tags: ["interativo", "composição", "animação"]
---

## O que é

O barplot clássico compara uma categoria contra outra. Quando cada categoria
na verdade é a soma de **subgrupos**, três variações respondem perguntas
diferentes sobre a mesma composição: agrupado (comparar os subgrupos entre
si, categoria a categoria), empilhado (comparar os totais, sem perder a
decomposição) e empilhado 100% (comparar só a **proporção** de cada
subgrupo, ignorando o tamanho absoluto do total).

**Para que serve**: decompor um total em partes e escolher, com um clique,
qual das três perguntas você quer que salte aos olhos primeiro.

## Quando usar (e quando evitar)

**Use quando** cada categoria principal for a soma de duas ou mais
subcategorias e você quiser comparar tanto os totais quanto a composição
interna.

**Evite quando** houver muitos subgrupos por categoria (acima de 5–6, o
empilhado vira difícil de ler segmento a segmento — cores demais competindo
por atenção) ou quando os subgrupos não tiverem uma soma que faça sentido
como total (nesse caso, um agrupado simples, sem opção de empilhar, é mais
honesto).

## Que dados você precisa

- **uma variável categórica principal** — os grupos a comparar (aqui,
  gêneros musicais).
- **uma variável categórica de subgrupo** — a decomposição de cada grupo
  (aqui, plataforma de streaming).
- **uma variável numérica** — o valor de cada combinação categoria × subgrupo
  (aqui, horas de audição).

Uma linha por combinação categoria × subgrupo — o formato "longo", não uma
matriz.

## Como ler o gráfico

- **Agrupado**: uma barra por subgrupo, lado a lado dentro do espaço de cada
  categoria — comprimentos comparam diretamente entre subgrupos, mas o total
  da categoria não tem uma única barra que o represente.
- **Empilhado**: os subgrupos empilhados numa única barra por categoria — a
  altura total da barra é o total da categoria; comparar um subgrupo
  específico entre categorias fica mais difícil, porque cada segmento começa
  numa altura diferente.
- **Empilhado 100%**: mesma pilha, mas cada barra normalizada pro mesmo
  tamanho — todas terminam em 100%. Aqui o total desaparece da leitura;
  sobra só a proporção interna de cada subgrupo.
- **Cor**: identifica a **plataforma** (subgrupo) em todos os três estados —
  passe o cursor sobre um item da legenda pra realçar essa plataforma em
  todas as barras ao mesmo tempo.

## Como foi feito

O `output.png` é um pôster de três painéis via `patchwork`, cada um o mesmo
`ggplot2` com `position_dodge2()`, `position_stack()` e `position_fill()`
respectivamente — a diferença entre os três estados, no `ggplot2`, é
literalmente um argumento de posição.

A versão interativa reproduz essa mesma ideia em D3: as 24 células (gênero ×
plataforma) nunca entram ou saem entre os três botões — só sua posição e
tamanho mudam, com uma chave estável (`genero+plataforma`) garantindo que
cada célula seja "a mesma" célula se movendo, não uma recriada do zero. A
posição empilhada (nos estados "empilhado" e "empilhado 100%") vem de
`d3.stack()`, com `stackOffsetExpand` fazendo a normalização pra 100% — o
mesmo mecanismo por trás de `position_fill()` no lado R, só que calculado de
novo no navegador a partir do dado bruto por célula, não importado pronto.
Passar o cursor sobre uma célula ou sobre um item da legenda aciona a mesma
função de realce: opacidade reduzida em tudo que não for aquela plataforma,
em qualquer um dos três estados.

Dados fictícios: as mesmas seis categorias e a mesma decomposição por
plataforma dos gráficos irmãos [barplot clássico](../../ranking/barplot-classico)
e [lollipop](../../ranking/lollipop-streaming) (mesma seed, mesma lógica de
geração) — aqui a granularidade completa é o próprio assunto do gráfico, não
um detalhe reservado ao hover.

## Possíveis problemas pelo caminho

- **Problema**: no agrupado, é difícil saber qual categoria tem o maior
  total. **Por quê**: nenhuma barra única representa o total — é preciso
  somar visualmente os subgrupos. **Solução**: para essa pergunta
  específica, o estado empilhado (ou o [barplot clássico](../../ranking/barplot-classico))
  responde melhor.
- **Problema**: no empilhado 100%, duas categorias parecem "iguais" mesmo
  tendo totais bem diferentes. **Por quê**: a normalização remove o total de
  propósito, sobrando só a proporção — é o trade-off do estado, não um erro.
  **Solução**: alternar para "empilhado" (absoluto) sempre que o tamanho do
  total também importar pra comparação.
- **Problema**: com muitas categorias e subgrupos, as cores do meio da pilha
  ficam com pouquíssima altura pra segurar um rótulo. **Por quê**: espaço
  vertical finito dividido por muitos segmentos. **Solução**: usar o hover
  (ou, aqui, o realce pela legenda) em vez de depender de rótulo fixo dentro
  de cada segmento.

## Variações possíveis

- Ordenar as categorias por total (do maior pro menor) em vez da ordem
  original, útil quando o ranking entre categorias também importa.
- Facetar por subgrupo em pequenos múltiplos, quando comparar o mesmo
  subgrupo entre categorias for a pergunta principal — em vez de comparar
  subgrupos dentro de uma categoria.
- Adicionar uma quarta variação com os subgrupos ordenados por valor dentro
  de cada pilha (em vez de sempre na mesma ordem), destacando qual subgrupo é
  dominante em cada categoria.
