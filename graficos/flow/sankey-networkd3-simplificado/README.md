---
title: "Sankey diagram simplificado (networkD3)"
category: flow
date: 2026-07-22
source: "https://r-graph-gallery.com/323-sankey-diagram-with-the-networkd3-library.html"
interactive: true
resumo: "Fluxos entre estágios desenhados como faixas cuja espessura é proporcional à quantidade que passa por ali."
pacotes: ["networkD3", "webshot2", "chromote"]
dados: "lista de nós + lista de ligações (origem, destino, valor)"
nivel: intermediário
tags: ["interativo", "fluxo", "rede"]
---

## O que é

Um diagrama de Sankey mostra como uma quantidade se distribui ao atravessar
estágios. Cada nó é um ponto de passagem e cada faixa é um fluxo — e a **espessura
da faixa é proporcional ao valor** que percorre aquele caminho.

**Para que serve**: responder "de onde veio e para onde foi". É a técnica natural
para orçamentos, migração entre categorias, funis de conversão, balanços de
energia e qualquer situação em que um todo se divide e recombina.

## Quando usar (e quando evitar)

**Use quando** o fluxo tiver poucos estágios bem definidos e o interesse for a
proporção entre caminhos. Ele é especialmente bom para mostrar onde está a maior
perda ou o maior desvio de um processo.

**Evite quando** houver dezenas de nós: as faixas se cruzam, os rótulos colidem e
o gráfico vira uma massa colorida ilegível — problema muito comum na prática, e o
motivo de este exemplo usar deliberadamente poucos nós. Evite também quando os
fluxos formarem ciclos (A → B → A): o layout pressupõe direção única e não sabe
representar volta. E se você só quer comparar totais por categoria, um gráfico de
barras é mais direto.

## Que dados você precisa

Duas tabelas:

- **Nós** — uma linha por ponto de passagem, com o nome que aparecerá no rótulo.
- **Ligações** — `source`, `target` e `value`: quem liga a quem, e quanto passa.

Detalhe que costuma pegar de surpresa: `source` e `target` não são nomes, e sim
**índices numéricos começando em zero**, referentes à posição na tabela de nós. O
código precisa converter os nomes para essas posições antes de plotar.

## Como ler o gráfico

- **Colunas de blocos**: os estágios do fluxo, da origem à esquerda até o
  resultado à direita.
- **Espessura de cada faixa**: quanto passa por aquele caminho.
- **Altura de um bloco**: o total que entra (ou sai) daquele nó.
- **Cor**: o estágio a que o nó pertence.

Passe o mouse sobre um bloco ou faixa para ver o valor exato.

## Como foi feito

`networkD3::sankeyNetwork()` recebe as duas tabelas e devolve um htmlwidget
pronto, com hover e arraste de nós já embutidos — não é preciso escrever
JavaScript.

As cores vêm de uma escala ordinal declarada com `JS("d3.scaleOrdinal().range([...])")`,
com valores hexadecimais explícitos.

Como não há equivalente estático em `ggplot2`, a miniatura foi gerada com
`webshot2::webshot()` sobre o próprio widget.

Dados fictícios: um fluxo de três estágios (`Fonte A/B/C` → `Canal X/Y/Z` →
`Resultado 1/2`), 8 nós e 10 ligações, com `set.seed(99)`. O tamanho pequeno é
proposital: é o que mantém o diagrama legível.

## Possíveis problemas pelo caminho

- **Problema**: o gráfico sai todo preto ou cinza, sem nenhum erro no console.
  **Por quê**: foi passado um nome de paleta que não existe na versão de d3
  empacotada pelo pacote — ela traz apenas `schemeCategory10/20/20b/20c`, e
  esquemas do módulo colorbrewer (`schemeSet2`, `schemeSet3`) não estão lá. A
  falha é **silenciosa**. **Solução**: definir as cores explicitamente com
  `.range([...])` e valores hex, em vez de depender de um nome de esquema.

- **Problema**: nós com nomes diferentes recebem a mesma cor. **Por quê**: internamente
  a cor é calculada com `d.group.replace(/ .*/, "")`, ou seja, **só a primeira
  palavra do nome vira a chave de cor** — tudo depois do primeiro espaço é
  descartado. `"Fonte A"`, `"Fonte B"` e `"Fonte C"` viram todos `"Fonte"`.
  **Solução**: usar nomes sem espaço (`"FonteA"`) para colorir nó a nó. Aqui o
  comportamento foi mantido de propósito: uma cor por estágio ficou mais limpo do
  que oito tons distintos.

- **Problema**: as faixas não aparecem, ou aparecem nos lugares errados. **Por
  quê**: `source`/`target` foram preenchidos com nomes ou com índices começando em
  1. **Solução**: converter para índices baseados em zero.

- **Problema**: salvar o widget falha por falta de `pandoc`. **Solução**: usar
  `selfcontained = FALSE` e manter a pasta `widget_files/` junto do HTML.

## Variações possíveis

- Aumentar `nodePadding` para dar respiro entre blocos quando os rótulos colidirem.
- Colorir por fluxo em vez de por nó, destacando o caminho em vez do estágio.
- Adicionar um quarto estágio para mostrar o destino final — o layout se ajusta
  sozinho.
- Trocar por um diagrama de cordas quando as relações forem mútuas em vez de
  direcionais.
