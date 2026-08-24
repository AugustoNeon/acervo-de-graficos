---
title: "Arc diagram"
category: network
date: 2026-07-23
source: "https://www.data-to-viz.com/graph/arc.html"
interactive: true
resumo: "Rede com todos os nós alinhados numa única linha e as conexões desenhadas como arcos acima dela."
pacotes: ["ggraph", "igraph", "jsonlite", "d3"]
dados: "lista de nós (com grupo) + lista de conexões entre eles"
nivel: avançado
tags: ["interativo", "rede", "linear"]
---

## O que é

Um arc diagram simplifica radicalmente o desenho de uma rede: em vez de espalhar os
nós pelo plano, coloca **todos numa única linha** e liga os pares com arcos
semicirculares acima dela.

Ao abrir mão de uma dimensão, ganha-se algo valioso — os rótulos ficam todos
legíveis, alinhados, sem sobreposição. É o oposto da bola emaranhada típica dos
layouts por força.

**Para que serve**: mostrar conexões quando a **ordem dos nós** tem significado
(alfabética, cronológica, por grupo) e quando ler o nome de cada um importa tanto
quanto ver as ligações.

## Quando usar (e quando evitar)

**Use quando** existir uma ordem natural para os nós e você quiser conseguir ler
todos os rótulos. É excelente para revelar estrutura de agrupamento: se itens do
mesmo grupo estiverem adjacentes, as conexões internas viram arcos curtos e
densos, e as pontes entre grupos viram arcos longos que saltam à vista.

**Evite quando** a ordem dos nós for arbitrária — e aqui está a armadilha
principal da técnica. Com os nós embaralhados, todos os arcos ficam com
comprimentos parecidos e o gráfico não comunica absolutamente nada, mesmo estando
tecnicamente correto. A ordenação **é** a análise.

Evite também com muitos nós: a linha fica longa demais e os arcos, altos demais.

## Que dados você precisa

- **Lista de nós** — nome e, idealmente, o grupo a que pertence (usado para cor e,
  principalmente, para definir a ordem).
- **Lista de conexões** — pares de nós ligados.

O campo mais importante não é nem um nem outro: é a **ordem** em que os nós entram
na lista. Ordene por grupo antes de plotar.

## Como ler o gráfico

- **Pontos na linha de base**: os nós, na ordem definida.
- **Cor do ponto**: o grupo.
- **Arcos**: as conexões.
- **Arco curto** liga vizinhos — normalmente do mesmo grupo.
- **Arco longo e alto** atravessa a linha: é uma ponte entre partes distantes da
  rede, e costuma ser o elemento mais interessante.
- **Região com muitos arcos curtos sobrepostos** é um agrupamento coeso.

Na versão interativa, passar o mouse sobre um nó destaca todas as conexões dele e
mostra nome, grupo e número de ligações; sobre um arco, mostra origem e destino.

## Como foi feito

Este gráfico tem duas implementações independentes usando exatamente os mesmos
dados.

A **estática** vem do `ggraph`, com `layout = "linear"` e `geom_edge_arc()` — a
combinação que produz o alinhamento em linha com arcos.

A **interativa** é escrita à mão em D3 — não existe pacote R que entregue um arc
diagram interativo pronto —, agora desenhada dentro do próprio runtime do site
(sem `<iframe>`), como o resto do acervo: o `script.R` exporta só a lista de
nós/arestas (na ordem que importa) e a paleta por grupo num `data.json`; a
posição de cada nó no eixo e a geometria de cada arco são calculadas no D3. Os
arcos são caminhos SVG desenhados com o comando de arco elíptico
(`A r r 0 0 sentido x2 y2`), com o raio igual à metade da distância entre os
dois nós — quanto mais distantes na linha, mais alto o arco.

Dados fictícios: 14 nós em 3 grupos (`A1`–`A5`, `B1`–`B5`, `C1`–`C4`) e 17
conexões — a maioria dentro do próprio grupo, mais 4 pontes entre grupos. A ordem
agrupada é intencional, justamente para demonstrar o que a técnica pede.

## Possíveis problemas pelo caminho

- **Problema**: o gráfico está correto mas não mostra padrão nenhum — só arcos
  parecidos espalhados. **Por quê**: os nós estão em ordem arbitrária. **Solução**:
  ordenar por grupo (ou por qualquer critério com significado) antes de desenhar.
  Esse é o erro central da técnica.

- **Problema**: os rótulos ficam ilegíveis quando a rede cresce. **Por quê**: com
  um `viewBox` largo, qualquer texto **dentro** do SVG encolhe proporcionalmente ao
  ser ajustado à tela. **Solução**: manter legendas e textos de instrução em HTML
  comum, fora do SVG, com tamanho de fonte real — a legenda de grupo, que na
  primeira versão do widget vivia dentro do próprio `<svg>`, passou pra um
  `<div>` HTML comum ao entrar no runtime do site.

- **Problema**: os arcos saem cortados no topo. **Por quê**: a altura do arco mais
  longo é proporcional à distância entre os nós, e pode ultrapassar a área de
  desenho. **Solução**: reservar altura suficiente com base na maior distância
  possível entre dois nós conectados.

- **Problema**: crescer demais a rede piora tudo. **Por quê**: em versões maiores
  deste gráfico, com dezenas de nós e mais de cem conexões, o resultado ficou
  poluído mesmo com pan e zoom. **Solução**: manter a rede pequena — a legibilidade
  é a razão de existir da técnica, e escalá-la destrói exatamente isso.

## Variações possíveis

- Espessura do arco proporcional ao peso da conexão, quando as ligações tiverem
  intensidade diferente.
- Arcos abaixo da linha para um segundo tipo de relação, aproveitando os dois lados.
- Ordenar por número de conexões em vez de por grupo, evidenciando os nós centrais.
- Fechar a linha em círculo e obter um layout circular — mais compacto, ao custo de
  rótulos em ângulo.
