---
title: "Matriz de adjacência: tags que aparecem juntas"
category: network
date: 2026-08-26
source: "https://r-graph-gallery.com/adjacency-matrix.html"
interactive: true
resumo: "A mesma rede que um diagrama de nós desenharia, escrita como grade — onde reordenar as linhas faz as comunidades aparecerem."
pacotes: ["ggplot2", "patchwork"]
dados: "1 matriz quadrada de pesos (ou uma lista de arestas com peso)"
nivel: intermediário
tags: ["rede", "matriz", "comunidades"]
---

## O que é

Uma matriz de adjacência desenha uma rede como grade: cada nó ocupa uma linha e
uma coluna, e a célula no cruzamento de dois nós recebe uma cor proporcional à
força da ligação entre eles. Nenhum nó, nenhuma aresta, nenhum layout — os
mesmos dados de um diagrama de nós e linhas, escritos de outra forma.

**Para que serve**: ler uma rede densa sem que as arestas se cruzem, e
identificar **grupos de nós fortemente ligados entre si**, que aparecem como
blocos escuros ao longo da diagonal quando a ordem das linhas é adequada.

## Quando usar (e quando evitar)

**Use quando** a rede for densa. É exatamente onde o diagrama de nós fracassa:
a partir de algumas centenas de arestas ele vira uma bola de fios em que nada é
distinguível — o problema que a [rede densa (hairball)](../rede-densa-hairball)
deste acervo mostra de propósito. Uma matriz não tem esse limite: com muitas ou
poucas arestas, cada célula continua ocupando o mesmo espaço e sendo legível.

**Evite quando** a pergunta for sobre **caminhos**. "Como chego de A até C?",
"esse nó é uma ponte entre dois grupos?", "existe um circuito aqui?" — tudo isso
é imediato num diagrama de nós e praticamente impossível numa matriz, onde
seguir um caminho exige pular de linha em coluna repetidamente.

A escolha, portanto, não é sobre gosto: **matriz para densidade e blocos,
diagrama de nós para caminhos e topologia**. Redes pequenas e esparsas quase
sempre ficam melhores como diagrama.

Um limite prático: a matriz cresce ao quadrado. Com 40 nós já são 1.600 células,
e os rótulos deixam de caber muito antes disso.

## Que dados você precisa

- **uma matriz quadrada de pesos** — nós nas linhas e nas colunas, e em cada
  célula a força da ligação (zero quando não há ligação)

Se o dado vier como lista de arestas (`origem`, `destino`, `peso`) — que é o
formato usual — basta preencher uma matriz vazia a partir dela.

Para uma rede **não direcionada**, a matriz é simétrica: o valor de A×B é o
mesmo de B×A, e metade do desenho é redundante. Numa rede **direcionada** os
dois triângulos carregam informações diferentes, e a matriz inteira é
necessária.

A diagonal costuma ficar vazia: um nó não se liga a si mesmo, e preencher essa
célula com o total do nó distorceria a escala de cor, porque esse número não é
comparável aos demais.

## Como ler o gráfico

- **Célula**: um par de nós. Quanto mais escura, mais forte a ligação.
- **Blocos escuros na diagonal**: grupos de nós que se ligam muito entre si —
  as comunidades da rede.
- **Manchas escuras fora dos blocos**: pontes, ou seja, ligações fortes entre
  grupos diferentes. Costumam ser o achado mais interessante do gráfico.
- **Simetria em torno da diagonal**: confirma que a rede é não direcionada.

A coisa mais importante de entender é que **a matriz não tem uma ordem natural**.
Trocar a ordem das linhas e colunas não muda nenhum número, mas muda
completamente o que se enxerga: agrupadas por afinidade, as comunidades saltam
como blocos; em ordem alfabética, os mesmos valores viram um chuvisco sem
padrão. Escolher a ordem é o equivalente, aqui, a escolher o layout num diagrama
de nós — e é por isso que a versão interativa desta página deixa trocar entre
elas.

## Como foi feito

A matriz é montada com `geom_tile()` sobre um quadro de dados em formato longo
(uma linha por célula, com `expand.grid()`), e `coord_fixed()` garante células
quadradas independentemente das proporções da figura.

As cores são calculadas à mão com `colorRampPalette()` e aplicadas via
`scale_fill_identity()`, em vez de deixar o `ggplot2` mapear os valores com
`scale_fill_gradientn()`. O motivo é a paridade com a versão interativa: a cor
de cada célula é exportada junto com o dado, e as duas versões do gráfico leem
exatamente o mesmo valor. A contrapartida é que `scale_fill_identity()` não
gera legenda nenhuma — ela é desenhada como um segundo gráfico, uma faixa de
tiles da mesma rampa, composta abaixo com `patchwork`.

As linhas que separam os grupos são `geom_vline()`/`geom_hline()` posicionadas
nas fronteiras acumuladas dos grupos. Sem elas o leitor precisa descobrir
sozinho onde um bloco termina e o outro começa.

Dados fictícios: coocorrência de 16 tags num fórum de tecnologia, construída a
partir de quatro grupos de quatro tags, com pesos altos dentro de cada grupo e
baixos entre grupos, mais algumas pontes postas à mão. São essas pontes que
impedem a matriz de virar quatro blocos perfeitamente isolados — bonito e
irreal.

Na versão interativa, além de trocar a ordem das linhas com as células
deslizando para as novas posições, passar o cursor sobre uma célula acende a
linha e a coluna dela inteiras, o que resolve o maior incômodo prático de ler
uma matriz grande: descobrir a que par uma célula no meio da grade corresponde.
Há também um modo que esconde metade da matriz, tornando visível a redundância
da simetria.

## Possíveis problemas pelo caminho

- **Problema**: não aparece bloco nenhum e a matriz parece ruído.
  **Por quê**: quase sempre é a **ordem**, não o dado — comunidades reais ficam
  invisíveis se os nós de um mesmo grupo estiverem espalhados pelas linhas.
  **Solução**: ordene os nós por algum critério de agrupamento antes de
  desenhar; sem isso, a matriz não tem como mostrar o que existe.
- **Problema**: a diagonal domina a escala de cor. **Por quê**: ela foi
  preenchida com o total de cada nó, um número de outra ordem de grandeza.
  **Solução**: deixe a diagonal vazia e pinte-a com um cinza neutro, fora da
  escala.
- **Problema**: as células saem retangulares em vez de quadradas.
  **Por quê**: a proporção da figura manda no painel. **Solução**:
  `coord_fixed()`.
- **Problema**: a versão estática e a interativa divergem de cor. **Por quê**:
  cada uma calculou a própria rampa, e interpoladores diferentes (RGB e Lab)
  não produzem os mesmos tons intermediários. **Solução**: calcule a cor uma vez
  só e exporte-a junto com o dado.

## Variações possíveis

- Ordenar por um algoritmo de detecção de comunidades em vez de um agrupamento
  já conhecido — a matriz vira então uma forma de **verificar** o resultado do
  algoritmo, já que blocos limpos significam comunidades bem separadas.
- Desenhar apenas um dos triângulos quando a rede for não direcionada,
  aproveitando o espaço livre para outra informação (um dendrograma dos
  agrupamentos, por exemplo).
- Usar cor divergente quando o peso puder ser negativo (correlação, saldo de
  trocas) em vez da rampa sequencial usada aqui.
- Manter a matriz e o diagrama de nós lado a lado, com realce ligado entre os
  dois — cada um responde uma metade das perguntas.
- Substituir a cor por tamanho de círculo dentro da célula, o que costuma ler
  melhor quando os pesos variam por várias ordens de grandeza.
