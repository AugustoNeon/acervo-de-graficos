---
title: "Tipos básicos de rede (não-ponderada vs ponderada)"
category: network
date: 2026-07-24
source: "https://www.data-to-viz.com/graph/network.html"
interactive: false
resumo: "A mesma rede desenhada duas vezes, com e sem peso nas conexões, mostrando o que essa informação acrescenta."
pacotes: ["ggraph", "igraph", "patchwork"]
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
  de **cada** chamada de layout, não uma única vez no começo do script.

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
