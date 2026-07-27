---
title: "Rede interativa com networkD3 (simpleNetwork)"
category: network
date: 2026-07-22
source: "https://r-graph-gallery.com/network-interactive.html"
interactive: true
resumo: "Grafo com layout dirigido por forças, em que os nós se organizam sozinhos e podem ser arrastados pelo navegador."
pacotes: ["networkD3", "webshot2", "chromote"]
dados: "uma tabela de ligações com duas colunas: origem e destino"
nivel: básico
tags: ["interativo", "rede", "força"]
---

## O que é

Uma rede desenhada com **layout dirigido por forças**: cada nó se repele dos
demais como se fossem cargas elétricas, e cada ligação age como uma mola que puxa
os dois pontos conectados. A simulação roda até o sistema estabilizar, e a posição
final é resultado dessa física — não de coordenadas escolhidas por alguém.

O efeito prático é que nós muito conectados entre si acabam próximos, e a estrutura
da rede aparece por conta própria.

**Para que serve**: é o ponto de partida para explorar qualquer rede — quem está
ligado a quem, o que forma agrupamento, quem ficou isolado.

## Quando usar (e quando evitar)

**Use quando** quiser explorar uma rede pequena ou média e ainda não souber o que
procurar. A interatividade ajuda: arrastar um nó revela o que vem junto com ele.

**Evite quando** a rede for densa demais — acima de algumas centenas de ligações o
resultado vira uma bola emaranhada em que nada se distingue. Evite também quando
precisar de precisão ou reprodutibilidade: **a posição dos nós não significa
nada** e muda a cada execução, então não meça distâncias nem descreva "o nó que
está à direita".

## Que dados você precisa

- **Uma tabela de ligações**, com duas colunas: origem e destino. Cada linha é uma
  aresta.

Só isso — os nós são inferidos automaticamente a partir dos nomes que aparecem nas
duas colunas, sem precisar de tabela separada. Ligações de um nó para ele mesmo
devem ser removidas antes.

## Como ler o gráfico

- **Cada círculo** é um nó, rotulado com seu nome.
- **Cada linha** é uma ligação entre dois nós.
- **Proximidade** sugere conexão: nós que se puxam mutuamente acabam perto.
- **Nós na periferia** têm poucas ligações; nós no centro, muitas.

Arraste qualquer nó para reorganizar a rede — os vizinhos vêm junto, o que ajuda a
identificar agrupamentos. Use a roda do mouse para aproximar.

## Como foi feito

`networkD3::simpleNetwork()` recebe o data frame de ligações e devolve um
htmlwidget completo, com a simulação de forças, arraste e zoom já embutidos.

Dois parâmetros controlam o layout: `linkDistance` (comprimento de repouso das
molas — maior espalha mais) e `charge` (força de repulsão entre nós; valores
negativos afastam, e quanto mais negativo, mais espaço entre eles).

Como não existe equivalente estático em `ggplot2`, a miniatura foi obtida por
captura de tela do widget com `webshot2::webshot()`.

Dados fictícios: rede aleatória entre 12 nós (`LETTERS[1:12]`) com 18 ligações
sorteadas usando `set.seed(77)`, filtrando auto-conexões.

## Possíveis problemas pelo caminho

- **Problema**: o gráfico sai minúsculo e ilegível. **Por quê**: os valores padrão
  de `height`/`width` são muito pequenos para um gráfico de página inteira.
  **Solução**: definir explicitamente algo como `height = "600px", width = "600px"`.

- **Problema**: um nó aparece com uma ligação circular estranha, ou o layout se
  comporta de forma instável. **Por quê**: existe uma linha com origem igual ao
  destino — comum quando as ligações são sorteadas com `replace = TRUE`.
  **Solução**: filtrar antes de plotar com `data[data$from != data$to, ]`.

- **Problema**: cada execução produz um desenho diferente. **Por quê**: é da
  natureza da simulação de forças, que parte de posições aleatórias. **Solução**:
  nenhuma dentro do pacote — o importante é não escrever textos que dependam da
  posição dos nós.

- **Problema**: salvar o widget falha por falta de `pandoc`. **Solução**: usar
  `selfcontained = FALSE` e manter a pasta `widget_files/` junto do HTML.

- **Problema**: o grafo mostra um nó a menos do que o esperado — silenciosamente,
  sem erro nenhum. **Por quê**: `simpleNetwork()` cria os nós só a partir do que
  aparece nas colunas de ligação; se algum nome nunca sai sorteado em nenhuma
  linha, ele simplesmente não existe no grafo. **Solução**: depois de montar as
  ligações, comparar a lista de nós esperados com os que realmente aparecem
  (`setdiff()`) e adicionar uma ligação extra para qualquer nó ausente — de
  preferência para um nó bem conectado (um "hub"), não para outro nó periférico,
  senão o layout de forças tende a empurrar essa dupla fraca pra fora do
  enquadramento da imagem estática.

## Variações possíveis

- Ajustar `charge` e `linkDistance` para uma rede mais compacta ou mais espalhada.
- Trocar por `forceNetwork()`, que aceita grupos coloridos, espessura de ligação
  por peso e tamanho de nó por valor — bem mais expressivo, ao custo de exigir
  tabelas separadas de nós e ligações.
- Desligar o zoom (`zoom = FALSE`) quando o gráfico for embutido numa página em
  que a rolagem importa mais.
- Se a rede tiver uma ordem natural, um arc diagram pode ser mais legível que um
  layout por forças.
