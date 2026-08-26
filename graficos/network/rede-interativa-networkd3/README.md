---
title: "Rede interativa com networkD3 (simpleNetwork)"
category: network
date: 2026-07-22
source: "https://r-graph-gallery.com/network-interactive.html"
interactive: true
resumo: "Grafo com layout dirigido por forças, em que os nós se organizam sozinhos e podem ser arrastados pelo navegador."
veredito_uso: "você quer explorar uma rede pequena ou média e ainda não sabe o que procurar."
veredito_evita: "a rede é densa demais (centenas de ligações), ou você precisa de posições reprodutíveis — o layout muda a cada execução."
pacotes: ["ggraph", "igraph", "jsonlite", "d3"]
dados: "uma tabela de ligações com duas colunas: origem e destino"
nivel: básico
tags: ["rede", "força"]
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

<div class="pull-quote pull-quote-direita clearfix">a posição dos nós não significa nada</div>

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
  linha, ele simplesmente não existe no grafo. **Solução**: a história completa,
  com o porquê de a correção não ser tão óbvia quanto parece, está em "Notas do
  coletor".

## Variações possíveis

- Ajustar `charge` e `linkDistance` para uma rede mais compacta ou mais espalhada.
- Trocar por `forceNetwork()`, que aceita grupos coloridos, espessura de ligação
  por peso e tamanho de nó por valor — bem mais expressivo, ao custo de exigir
  tabelas separadas de nós e ligações.
- Desligar o zoom (`zoom = FALSE`) quando o gráfico for embutido numa página em
  que a rolagem importa mais.
- Se a rede tiver uma ordem natural, um arc diagram pode ser mais legível que um
  layout por forças.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../rede-direcionada-ponderada" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Rede direcionada e ponderada (fluxo entre cidades)</span>
    <span class="parecido-razao">O próximo passo natural: a mesma ideia de rede por forças, mas acrescentando sentido e intensidade a cada conexão.</span>
  </a>
  <a class="parecido-item" href="../rede-densa-hairball" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Rede densa (hairball)</span>
    <span class="parecido-razao">O que acontece quando este mesmo layout por forças é aplicado além do ponto de ruptura — uma rede densa demais em vez de uma pequena e exploratória.</span>
  </a>
</div>

## Notas do coletor

Um nó sumiu do grafo sem nenhum erro ou aviso — só ao contar visualmente
os círculos do widget contra a lista de 12 nomes esperados
(`LETTERS[1:12]`) que a ausência apareceu. A causa: `simpleNetwork()` não
recebe uma lista de nós separada, ela **infere** os nós inteiramente a
partir do que aparece nas colunas `origem`/`destino` da tabela de
ligações. Um nome que por azar do sorteio nunca é escolhido nem como
origem nem como destino simplesmente não existe no grafo — não é removido,
nunca foi criado.

A correção óbvia — comparar a lista de nós esperados com os que aparecem
de fato (`setdiff()`) e adicionar uma ligação extra para o nó ausente —
tinha uma armadilha escondida: a essa ligação extra ainda precisava de um
destino, e a escolha desse destino importava. Ligar o nó órfão a outro nó
igualmente periférico criava um par fracamente conectado que o layout por
forças empurrava pra fora do centro da simulação — na miniatura estática,
essa dupla frequentemente saía cortada da borda da imagem. A correção que
funcionou foi ligar o nó ausente a um nó já bem conectado (um hub): a
força de atração desse hub mantém o par dentro do enquadramento, em vez de
deixá-lo à deriva na periferia do layout.
