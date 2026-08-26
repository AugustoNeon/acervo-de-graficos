---
title: "Sankey diagram simplificado"
category: flow
date: 2026-07-22
source: "https://r-graph-gallery.com/323-sankey-diagram-with-the-networkd3-library.html"
interactive: true
resumo: "Fluxos entre estágios desenhados como faixas cuja espessura é proporcional à quantidade que passa por ali."
veredito_uso: "o fluxo tem poucos estágios bem definidos e o interesse é a proporção entre caminhos."
veredito_evita: "há dezenas de nós, ou os fluxos formam ciclos — o layout pressupõe direção única."
pacotes: ["networkD3", "jsonlite", "d3"]
dados: "lista de nós + lista de ligações (origem, destino, valor)"
nivel: intermediário
tags: ["fluxo", "rede"]
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

A miniatura estática ainda vem do `networkD3::sankeyNetwork()`: como não há
equivalente em `ggplot2`, o script gera o widget uma vez só pra tirar um
screenshot (`webshot2::webshot()`) e descarta os arquivos dele na sequência
— não sobra nenhum `widget.html` na pasta do gráfico.

A versão interativa é desenhada em D3 (`d3-sankey`, o mesmo algoritmo de
layout que o `networkD3` usa por baixo dos panos), dentro do runtime do
site. O script exporta nós e fluxos pelo **nome** (em vez dos índices
0-based que o `networkD3` exige) e a cor de cada nó; a posição de cada nó na
coluna e a espessura de cada fluxo são recalculadas no D3, não herdadas do R.

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

- **Problema**: nós com nomes diferentes recebem a mesma cor. **Solução**: use
  nomes sem espaço se quiser cor por nó — mas aqui o "problema" virou decisão
  de design; a história completa está em "Notas do coletor", no fim da
  página.

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

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../chord-transferencias-clubes" style="--cat-link: var(--cat-flow); --cat-link-ink: var(--cat-flow-ink);">
    <span class="parecido-cat">flow</span>
    <span class="parecido-titulo">Diagrama de cordas: transferências entre clubes</span>
    <span class="parecido-razao">O oposto direto: quando o fluxo é mútuo (todo mundo pode mandar e receber) em vez de direcional com estágios em colunas.</span>
  </a>
  <a class="parecido-item" href="../alluvial-trajetoria-eleitoral" style="--cat-link: var(--cat-flow); --cat-link-ink: var(--cat-flow-ink);">
    <span class="parecido-cat">flow</span>
    <span class="parecido-titulo">Diagrama aluvial: trajetória de voto</span>
    <span class="parecido-razao">Mesma técnica por baixo dos panos — um Sankey em várias colunas — mas com a restrição extra de que todas as colunas representam a MESMA unidade sendo rastreada.</span>
  </a>
</div>

## Notas do coletor

A cor de cada nó, no widget original do `networkD3`, saía errada de um jeito
específico: nós com nomes diferentes acabavam com exatamente a mesma cor.
"Fonte A", "Fonte B" e "Fonte C" — pensados pra ter três tons distintos —
todos saíam idênticos. Ler o código-fonte do binding JS do pacote
(`sankeyNetwork.js`) explicou o motivo: antes de calcular a cor, o script
aplica `d.group.replace(/ .*/, "")` no nome do nó — uma expressão regular
que descarta tudo depois do primeiro espaço. "Fonte A" e "Fonte B" viram
ambos só "Fonte" antes mesmo de chegar na escala de cor.

Isso poderia ter sido "corrigido" trocando os nomes pra algo sem espaço
(`"FonteA"`), recuperando uma cor por nó. Mas olhando o resultado visual do
comportamento "errado" — todos os nós de um mesmo estágio (Fonte/Canal/
Resultado) com a mesma cor —, ficou mais limpo do que oito tons
individuais teriam ficado: a cor passou a comunicar **estágio**, não nó
individual, o que é exatamente a pergunta que "de onde veio, pra onde foi"
faz mais sentido responder por cor.

A versão em D3 não tem essa limitação técnica — poderia dar uma cor por nó
sem esforço nenhum — mas reproduz o mesmo efeito visual de propósito: o
`data.json` já exporta a cor de cada nó atribuída por estágio, não por nó
individual. Um comportamento que nasceu de uma regex e um espaço no nome
virou decisão de design mantida deliberadamente do outro lado da
implementação, mesmo sem a restrição original que o gerou.
