---
title: "Tipos básicos de rede (não-ponderada vs ponderada)"
category: network
date: 2026-07-24
source: "https://www.data-to-viz.com/graph/network.html"
interactive: true
resumo: "A mesma rede desenhada duas vezes, com e sem peso nas conexões, mostrando o que essa informação acrescenta."
veredito_uso: "você está decidindo se vale a pena coletar e representar o peso das conexões — comparar as duas versões lado a lado ajuda a decidir."
veredito_evita: "os pesos variam pouco entre si — ponderar só adiciona ruído visual sem mudar nenhuma leitura."
pacotes: ["ggraph", "igraph", "patchwork", "jsonlite", "d3"]
dados: "lista de conexões (origem, destino) + opcionalmente um peso por conexão"
nivel: básico
tags: ["estático", "rede", "comparação"]
---

## O que é

Uma comparação lado a lado de duas formas de representar exatamente a mesma rede:

- **Não-ponderada**: só interessa se existe conexão. Todas as linhas têm a mesma
  espessura.
- **Ponderada**: cada conexão carrega uma intensidade, mapeada para a espessura da
  linha.

**Para que serve**: entender a diferença conceitual entre os dois tipos de rede — e,
na prática, decidir se vale a pena coletar e representar o peso das conexões.

## Quando usar (e quando evitar)

**Use a versão não-ponderada quando** a existência da relação for o que importa
(quem conhece quem, quem cita quem) ou quando não houver intensidade confiável para
medir. Ela é mais limpa e mais fácil de ler.

**Use a versão ponderada quando** a intensidade mudar a conclusão — duas pessoas
que trocam mil mensagens não têm a mesma relação de duas que trocaram uma.

**Evite ponderar quando** os pesos estiverem em faixa muito estreita: as espessuras
ficam quase idênticas e você só adicionou ruído visual. E evite quando houver
valores extremos, porque uma única linha grossíssima achata todas as outras.

## Que dados você precisa

- **Lista de conexões** — origem e destino, uma linha por relação.
- **Peso (opcional)** — uma coluna numérica adicional, exigida só pela versão
  ponderada.

É a mesma estrutura de dados nos dois casos: a versão ponderada apenas usa uma
coluna a mais que a outra ignora.

## Como ler o gráfico

Nos dois painéis:

- **Círculos**: os nós da rede.
- **Linhas**: as conexões entre eles.
- **Posição**: resultado do algoritmo de layout, sem significado próprio.

A diferença está na espessura:

- **Painel não-ponderado**: todas as linhas iguais — a leitura é binária, existe ou
  não existe.
- **Painel ponderado**: espessura proporcional à intensidade. Linhas grossas
  concentram o que realmente acontece na rede.

Compare os dois: às vezes uma conexão visualmente irrelevante no primeiro painel se
revela a mais importante no segundo.

<div class="pull-quote pull-quote-direita clearfix">uma conexão visualmente irrelevante no primeiro painel se revela a mais importante no segundo</div>

## Como foi feito

O mesmo grafo é desenhado duas vezes com `ggraph`, mudando apenas a estética da
aresta: no primeiro painel a espessura é constante, no segundo vem de
`aes(edge_width = peso)`. Os dois são combinados num único arquivo com o pacote
`patchwork`.

Um detalhe importante para a comparação funcionar: o layout `"fr"`
(Fruchterman-Reingold) é estocástico e produziria posições diferentes em cada
painel. Chamar `set.seed(101)` imediatamente antes de cada `ggraph()` garante que
os nós caiam nos mesmos lugares — sem isso, a comparação lado a lado ficaria
impossível de fazer com os olhos.

Dados fictícios: 8 pessoas e uma topologia fixa de conexões, com pesos inventados.

## Possíveis problemas pelo caminho

- **Problema**: os dois painéis saem com os nós em posições diferentes,
  inviabilizando a comparação. **Por quê**: layouts de rede são estocásticos e
  partem de posições aleatórias. **Solução**: fixar a semente imediatamente antes
  de **cada** chamada de layout, não uma única vez no começo do script — o porquê
  disso não ser óbvio está em "Notas do coletor".

- **Problema**: as espessuras ficam todas parecidas. **Por quê**: os pesos variam
  pouco entre si. **Solução**: ajustar o intervalo com `scale_edge_width()` ou
  aceitar que, nesse caso, ponderar não acrescenta nada.

- **Problema**: uma aresta muito grossa domina o desenho. **Por quê**: há um valor
  extremo nos pesos. **Solução**: limitar o intervalo de espessura ou aplicar uma
  transformação (raiz, log) antes do mapeamento.

- **Problema**: os painéis saem com tamanhos desiguais ao combinar. **Por quê**: as
  legendas de cada painel ocupam larguras diferentes. **Solução**: usar
  `plot_layout()` do `patchwork` para controlar as proporções, ou recolher as
  legendas.

## Variações possíveis

- Mapear o peso para a **opacidade** em vez da espessura — mais discreto em redes
  densas.
- Usar o peso para influenciar o próprio layout, aproximando nós fortemente ligados.
- Acrescentar direção às conexões, chegando ao caso mostrado em
  [rede direcionada e ponderada](../rede-direcionada-ponderada).
- Dimensionar os nós pela soma dos pesos que chegam a eles, somando uma terceira
  camada de informação.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../rede-direcionada-ponderada" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Rede direcionada e ponderada (fluxo entre cidades)</span>
    <span class="parecido-razao">O próximo passo depois de decidir que o peso importa: acrescenta também a direção de cada conexão.</span>
  </a>
  <a class="parecido-item" href="../comparacao-layouts" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Comparação de layouts de rede (Fruchterman-Reingold, DrL, Aleatório)</span>
    <span class="parecido-razao">Mesma estrutura de comparação lado a lado, mas variando o algoritmo de layout em vez do que é mapeado na aresta — e por isso, ali, os nós NÃO devem cair no mesmo lugar.</span>
  </a>
</div>

## Notas do coletor

Fixar a semente do gerador aleatório uma única vez, no topo do script, é o
instinto natural para "tornar reprodutível" — e é exatamente o que não
funciona aqui. O layout `"fr"` é estocástico: cada vez que o `ggraph`
monta o layout, ele consome números aleatórios do gerador. Se a semente é
fixada só uma vez no início do script e os dois painéis são desenhados em
sequência, o segundo painel herda o estado do gerador de onde o primeiro
parou — não o mesmo ponto de partida, um ponto diferente. O resultado:
dois layouts parecidos, mas com os nós em posições sutilmente diferentes,
sabotando exatamente a comparação pixel a pixel que o gráfico existe para
permitir.

A correção foi chamar `set.seed(101)` de novo, imediatamente antes de
**cada** chamada de `ggraph()` — não confiar numa fixação única lá no
topo. A regra generaliza para qualquer comparação lado a lado que dependa
de posições idênticas entre painéis: sempre que dois desenhos estocásticos
precisam coincidir, a semente tem que ser resetada imediatamente antes de
cada um, não só uma vez no começo do script. É o oposto do caso da
[comparação de layouts](../comparacao-layouts) deste acervo, onde os três
painéis são justamente três algoritmos DIFERENTES e não devem coincidir —
ali a semente não é sequer o ponto em questão.
