---
title: "Hierarchical Edge Bundling com labels, cores e tamanhos"
category: network
date: 2026-07-21
source: "https://r-graph-gallery.com/311-add-labels-to-hierarchical-edge-bundling.html"
interactive: false
resumo: "Conexões entre os itens de uma hierarquia, desenhadas como feixes curvos que acompanham a árvore em vez de cortar o círculo em linha reta."
pacotes: ["ggraph", "igraph", "tidyverse", "RColorBrewer"]
dados: "uma hierarquia (pai → filho) + uma lista de conexões entre as folhas"
nivel: avançado
tags: ["hierarquia", "rede", "circular", "estático"]
---

## O que é

Um gráfico circular que mostra **duas informações ao mesmo tempo**: a hierarquia
de um conjunto de itens (quem pertence a qual grupo, desenhado como um círculo de
rótulos agrupados) e as conexões entre esses itens (as curvas que atravessam o
meio).

O truque que dá nome à técnica é o *bundling*: em vez de ligar dois pontos com uma
reta, cada conexão é curvada para acompanhar o caminho pela árvore — subindo até o
ancestral comum dos dois itens e descendo de novo. Conexões que percorrem trajetos
parecidos acabam se encostando e formando feixes, como cabos amarrados juntos.

**Para que serve**: enxergar quais *grupos* conversam entre si numa rede grande,
não só quais itens individuais. O agrupamento visual das curvas é a resposta.

## Quando usar (e quando evitar)

**Use quando** seus dados têm uma hierarquia natural (departamentos → pessoas,
pacotes → arquivos, gêneros → espécies) e você quer mostrar relações que cruzam
essa hierarquia. Com muitas conexões, é uma das poucas técnicas que continua
legível — os feixes viram o padrão principal.

**Evite quando** não existir hierarquia de verdade: sem ela o bundling não tem por
onde curvar e o resultado vira um emaranhado circular sem ganho sobre um grafo
comum. Evite também se a pergunta for sobre pares específicos ("A está ligado a
B?") — as curvas se sobrepõem e rastrear uma conexão isolada é difícil. Nesse caso
uma matriz de adjacência ou um arc diagram responde melhor.

## Que dados você precisa

- **Uma hierarquia** — tabela de arestas `from`/`to` ligando raiz → grupos →
  folhas. Aqui: 1 raiz, 8 grupos e 96 folhas.
- **Uma lista de conexões** — pares de folhas que se relacionam. São elas que
  viram as curvas do meio.
- **Opcional: um valor por folha** — usado para o tamanho do ponto de cada rótulo.

As conexões precisam referenciar as folhas **pelo nome**, e o código converte esses
nomes para os índices que o `ggraph` espera.

## Como ler o gráfico

- **Posição no círculo**: a hierarquia. Rótulos vizinhos pertencem ao mesmo grupo.
- **Cor do ponto e do rótulo**: o grupo ao qual a folha pertence.
- **Tamanho do ponto**: o valor associado àquela folha.
- **Curvas no centro**: as conexões. O gradiente ao longo de cada curva indica o
  sentido do percurso, do início ao fim da ligação.
- **Feixes grossos** entre duas regiões do círculo significam que aqueles dois
  grupos se conectam muito — é a leitura principal do gráfico.

## Como foi feito

A hierarquia é montada como dois data frames de arestas (raiz → grupos, grupos →
folhas) e transformada em grafo com `igraph::graph_from_data_frame()`. O desenho
sai do `ggraph` com `layout = 'dendrogram', circular = TRUE`, e as conexões vêm do
par `geom_conn_bundle()` + `get_con()`, que é quem aplica o bundling.

O parâmetro `tension` controla o quanto as curvas "grudam" na árvore: perto de 1
elas seguem a hierarquia de perto e formam feixes bem definidos; perto de 0 viram
quase retas e o efeito se perde.

Os rótulos são posicionados com trigonometria manual (`angle`, `hjust`) para cada
um sair na tangente do círculo, em vez de todos na horizontal.

Dados fictícios: hierarquia gerada com `set.seed(42)` — 8 grupos, 96 folhas — e
conexões sorteadas aleatoriamente entre folhas.

## Possíveis problemas pelo caminho

- **Problema**: o gráfico sai como uma linha reta esticada em vez de um círculo,
  com valores absurdos na escala (na ordem de `1e+252`), e nenhum erro ou aviso
  aparece. **Por quê**: alguma conexão liga uma folha a ela mesma (`from == to`) —
  fácil de acontecer quando as conexões são sorteadas com `replace = TRUE`. O
  cálculo interno de spline degenera para um caminho de um ponto só e produz
  coordenadas impossíveis. **Solução**: filtrar auto-conexões antes de montar os
  índices: `connect <- connect[connect$from != connect$to, ]`.

- **Problema**: `aes(colour = ..index..)` dá aviso de sintaxe obsoleta. **Por quê**:
  a notação `..variavel..` foi substituída no ggplot2 moderno. **Solução**: usar
  `aes(colour = after_stat(index))`.

- **Problema**: um `Rplots.pdf` indesejado aparece na pasta junto do PNG. **Por
  quê**: o plot foi deixado para imprimir sozinho no fim do script. **Solução**:
  atribuir o gráfico a uma variável (`p <- ggplot(...) + ...`) e passá-la
  explicitamente para `ggsave()`.

- **Problema**: os rótulos saem cortados nas bordas. **Por quê**: eles ficam fora
  do raio do círculo e o `ggplot2` recorta pelo limite dos dados. **Solução**:
  ampliar manualmente os limites com `expand_limits()`.

## Variações possíveis

- Ajustar `tension` para comparar feixes bem amarrados com conexões quase retas.
- Colorir as curvas pelo grupo de origem em vez de por posição no percurso, para
  responder "de onde sai" em vez de "por onde passa".
- Trocar `circular = TRUE` por um dendrograma linear, que privilegia a leitura da
  hierarquia e sacrifica a das conexões.
- Destacar um único grupo de cada vez, deixando os demais em cinza — útil quando
  há muitas conexões e você quer contar uma história por vez.
