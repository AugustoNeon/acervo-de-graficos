---
title: "Mapa de conexões: intercâmbio de pesquisadores"
category: map
date: 2026-08-20
source: "https://r-graph-gallery.com/how-to-draw-connecting-routes-on-map-with-r-and-great-circles.html"
interactive: true
resumo: "Mapa-múndi mostrando rotas de intercâmbio entre 10 centros de pesquisa, com o traçado real de cada rota calculado como caminho mais curto sobre a esfera."
pacotes: ["ggplot2", "sf", "geosphere"]
dados: "cidades com coordenadas (lon/lat) + pares origem-destino com um valor numérico por par"
nivel: avançado
tags: ["geoespacial", "rede"]
---

## O que é

Um mapa de conexões desenha ligações entre pontos geográficos sobre um mapa
de fundo — a técnica certa quando o que importa não é só *onde* algo
acontece (como num mapa de bolhas comum), mas *entre onde e onde* um fluxo se
move: rotas, migrações, trocas, viagens.

## Quando usar (e quando evitar)

**Use quando** os dados são pares origem-destino com coordenadas reais, e a
geografia da ligação em si é parte da informação — por exemplo, ver que duas
rotas cruzam o mesmo oceano por caminhos diferentes.

**Evite quando** o número de conexões passa de algumas dezenas — linhas
cruzando o mapa inteiro colidem umas com as outras e o resultado vira
ilegível (o problema clássico de "spaghetti map"); nesses casos, um diagrama
de rede sem geografia de fundo, ou agregar por região em vez de por ponto,
comunica melhor. Evite também quando a posição exata não importa — um
diagrama de fluxo (Sankey, cordas) sem mapa é mais direto quando a origem e o
destino já são a informação suficiente, sem precisar do "onde no globo".

## Que dados você precisa

- **pontos** — nome + coordenadas (longitude, latitude) de cada local
- **pares origem-destino** — duas colunas apontando pra nomes da tabela de
  pontos, mais um valor numérico por par (aqui, pesquisadores trocados/ano)

Formato esperado: duas tabelas separadas (pontos e pares), unidas só na hora
de calcular a geometria de cada rota — não uma tabela só.

## Como ler o gráfico

- **Posição dos pontos**: localização real de cada centro de pesquisa
- **Tamanho do ponto**: total de pesquisadores por ano somando todas as rotas
  daquele centro (o quanto ele funciona como polo da rede)
- **Traçado da linha**: o caminho mais curto entre as duas cidades sobre a
  esfera (não uma reta na tela) — por isso as rotas de longa distância
  aparecem curvadas, arqueando em direção aos polos
- **Espessura e opacidade da linha**: quantidade de pesquisadores naquela
  rota especificamente
- **Cor da linha**: região de origem da rota

## Como foi feito

Cada rota vira um caminho de **grande círculo** — a distância mais curta
entre dois pontos sobre uma esfera — calculado por
`geosphere::gcIntermediate()`, que devolve uma sequência de pontos
intermediários entre a origem e o destino. Isso é diferente de simplesmente
ligar dois pontos com uma reta na tela: numa projeção comum, o caminho mais
curto real entre lugares distantes frequentemente curva visivelmente em
direção ao polo mais próximo (é por isso que voos entre América do Norte e
Ásia costumam passar perto do Alasca no mapa, embora pareçam "desnecessários"
numa reta). Rotas que cruzam o antimeridiano (a linha de ±180° de longitude,
no meio do Pacífico) são quebradas em dois trechos — sem isso, o trecho final
salta de um lado do mapa pro outro numa linha reta atravessando o globo
inteiro.

Dados fictícios: 10 centros de pesquisa em cidades reais (coordenadas
verdadeiras) e 17 rotas de intercâmbio entre eles, com um número fictício de
pesquisadores trocados por ano (`set.seed(2417)`) — a rede de conexões em si
(quais cidades trocam pesquisadores com quais) também é inventada.

A versão interativa recebe os pontos de cada rota já calculados pelo R
(nenhuma trigonometria esférica é refeita no navegador) e projeta cada um com
a mesma projeção do mapa de fundo. Passar o cursor numa rota ou numa cidade
aciona realce ligado: a rota (ou todas as rotas daquela cidade) fica em
destaque, as outras apagam, e as cidades envolvidas ganham rótulo em negrito
— uma forma de isolar visualmente uma conexão específica sem precisar
seguir a linha com o olho por cima de todas as outras.

## Possíveis problemas pelo caminho

- **Problema**: uma rota aparece como uma linha reta absurda cruzando o mapa
  inteiro de ponta a ponta. **Por quê**: a rota cruza o antimeridiano e o
  cálculo de grande círculo não foi quebrado em dois trechos — o ponto final
  de um lado do mapa liga direto ao primeiro ponto do outro lado.
  **Solução**: `gcIntermediate(..., breakAtDateLine = TRUE)` devolve uma
  lista de trechos em vez de um caminho só quando isso acontece; desenhar
  cada trecho como uma linha separada resolve.
- **Problema**: o mapa de fundo aparece como um borrão cobrindo a tela
  inteira em vez do contorno dos países. **Por quê**: o GeoJSON que o `sf`
  escreve tem o sentido de rotação (enrolamento) dos anéis inconsistente
  entre países, e o `d3-geo` é sensível a isso pro recorte esférico.
  **Solução**: corrigir o enrolamento por polígono no próprio código de
  desenho (função compartilhada entre os mapas deste acervo), não depender
  do R/GDAL exportarem sempre no sentido certo.

## Variações possíveis

- Adicionar setas ou gradiente de espessura ao longo da linha pra indicar
  direção (origem → destino), quando o fluxo não for simétrico
- Trocar a projeção do mundo inteiro por uma regional (zoom num continente),
  útil quando todas as conexões ficam concentradas numa área
- Colorir as rotas por volume em vez de por região, quando a pergunta for
  "quais são as rotas mais fortes" em vez de "de onde vêm as conexões"
