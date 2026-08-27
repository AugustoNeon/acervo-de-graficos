---
title: "Matriz de adjacência: tags que aparecem juntas"
category: network
date: 2026-08-26
source: "https://r-graph-gallery.com/adjacency-matrix.html"
interactive: true
resumo: "A mesma rede que um diagrama de nós desenharia, escrita como grade — onde reordenar as linhas faz as comunidades aparecerem."
veredito_uso: "a rede é densa e a pergunta é sobre grupos, não sobre caminhos."
veredito_evita: "a pergunta envolve seguir um caminho entre dois nós específicos."
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

**Use quando** a rede for densa — é onde o [diagrama de nós](../rede-densa-hairball)
deste acervo fracassa de propósito: centenas de arestas viram uma bola de fios
ilegível. A matriz não tem esse limite — cada célula ocupa sempre o mesmo
espaço, com muitas ou poucas arestas.

**Evite quando** a pergunta for sobre **caminhos**: "como chego de A até C?",
"esse nó é uma ponte entre dois grupos?". Isso é imediato num diagrama de nós
e quase impossível numa matriz, que exige pular de linha em coluna
repetidamente pra seguir um caminho.

Resumindo: **matriz para densidade e blocos, diagrama de nós para caminhos e
topologia**.

- Redes pequenas e esparsas quase sempre ficam melhores como diagrama.
- A matriz cresce ao quadrado — com 40 nós já são 1.600 células, e os rótulos
  param de caber bem antes disso.

## Que dados você precisa

- **uma matriz quadrada de pesos** — nós nas linhas e nas colunas, e em cada
  célula a força da ligação (zero quando não há ligação)

Se o dado vier como lista de arestas (`origem`, `destino`, `peso`) — o formato
usual — basta preencher uma matriz vazia a partir dela.

- **Rede não direcionada**: a matriz é simétrica (A×B = B×A) — metade do
  desenho é redundante.
- **Rede direcionada**: os dois triângulos carregam informações diferentes —
  a matriz inteira é necessária.

A diagonal costuma ficar vazia: um nó não se liga a si mesmo, e o total do nó
não é comparável aos demais valores, então preenchê-la distorceria a escala de
cor.

## Como ler o gráfico

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#FBF1E2;border:1px solid #ddd"></span> Célula clara — poucas ou nenhuma coocorrência entre as duas tags</div>
  <div><span class="swatch" style="background:#B4531F"></span> Célula escura — muitas coocorrências</div>
  <div><span class="swatch" style="background:#DCD8D2"></span> Diagonal cinza — não é dado (tag com ela mesma)</div>
</div>

<div class="pull-quote pull-quote-direita clearfix">a matriz não tem uma ordem natural</div>

A cor sozinha diz a força de um par — mas o achado da matriz está no **padrão**
que os pares formam juntos:

- **Blocos escuros na diagonal**: grupos de nós que se ligam muito entre si —
  as comunidades da rede.
- **Manchas escuras fora dos blocos**: pontes, ligações fortes entre grupos
  diferentes. Costumam ser o achado mais interessante do gráfico.
- **Simetria em torno da diagonal**: confirma que a rede é não direcionada.

Trocar a ordem das linhas e colunas não muda nenhum número, mas muda
completamente o que se enxerga — agrupadas por afinidade, as comunidades
saltam como blocos; em ordem alfabética, os mesmos valores viram um chuvisco
sem padrão — a matriz não tem uma ordem natural. Escolher a ordem aqui é o
equivalente a escolher o layout num diagrama de nós, e é por isso que a
versão interativa deixa trocar entre elas.

## Como foi feito

**Células**: `geom_tile()` sobre um quadro de dados em formato longo (uma
linha por célula, via `expand.grid()`), com `coord_fixed()` pra manter as
células quadradas independentemente da proporção da figura.

**Cor**: calculada à mão com `colorRampPalette()` e aplicada via
`scale_fill_identity()`, em vez de deixar o `ggplot2` mapear os valores —
assim a versão interativa recebe a cor pronta, sem calcular a própria (a
história completa está em "Notas do coletor"). Sem legenda automática,
então ela é desenhada como um segundo gráfico — uma faixa de tiles da mesma
rampa, composta abaixo com `patchwork`.

**Divisórias**: `geom_vline()`/`geom_hline()` nas fronteiras acumuladas dos
grupos, pra ninguém ter que descobrir sozinho onde um bloco termina.

**Dado fictício**: coocorrência de 16 tags num fórum de tecnologia — quatro
grupos de quatro tags, pesos altos dentro do grupo e baixos entre grupos, mais
algumas pontes postas à mão. São essas pontes que impedem a matriz de virar
quatro blocos perfeitamente isolados — bonito e irreal.

**Na versão interativa**: passar o cursor sobre uma célula acende a linha e a
coluna inteiras — resolve o maior incômodo de ler uma matriz grande, achar a
que par uma célula no meio da grade corresponde. Um modo esconde metade da
matriz, tornando visível a redundância da simetria.

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
- **Problema**: a versão estática e a interativa divergem de cor. **Solução**:
  calcule a cor uma vez só e exporte-a junto com o dado — a história completa
  está em "Notas do coletor", no fim da página.

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

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../rede-densa-hairball" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Rede densa (hairball)</span>
    <span class="parecido-razao">O oposto direto: o mesmo tipo de dado (nós e arestas), mas exatamente o cenário em que a matriz vence e o diagrama de nós perde — muitas arestas, layout ilegível.</span>
  </a>
  <a class="parecido-item" href="../../correlation/correlograma-indicadores" style="--cat-link: var(--cat-correlation); --cat-link-ink: var(--cat-correlation-ink);">
    <span class="parecido-cat">correlation</span>
    <span class="parecido-titulo">Correlograma: indicadores municipais</span>
    <span class="parecido-razao">Mesma técnica — a mesma grade de células e leitura por blocos — mas a força na célula vem de correlação estatística, não de coocorrência numa rede.</span>
  </a>
</div>

## Notas do coletor

<div class="pull-quote">a cor nasce uma vez, no R, e viaja como dado</div>

A primeira versão calculava a cor duas vezes: uma em R (`colorRampPalette()`),
outra em D3, cada uma com seu próprio interpolador. As duas liam a mesma
matriz de pesos e deveriam sair idênticas — saíram visivelmente diferentes
lado a lado, mesmo usando os mesmos dois extremos da rampa.

O motivo: interpolar entre duas cores não tem resposta única.
`colorRampPalette()` interpola em RGB; o D3 interpola em Lab por padrão. Os
extremos batem, mas os tons do meio — onde caem a maioria dos pesos da rede —
divergem, porque os dois espaços de cor não são uma transformação linear um
do outro.

A correção não foi escolher "o interpolador certo" — nenhum dos dois é mais
certo. Foi parar de calcular duas vezes: a cor nasce uma vez, no R, e viaja
como dado dentro do `data.json`. `ggplot2` e D3 só pintam o valor que
recebem. Virou o padrão do acervo pra qualquer gráfico com duas versões.
