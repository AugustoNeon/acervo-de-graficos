---
title: "Mapa de conexões: intercâmbio de pesquisadores"
category: map
date: 2026-08-20
source: "https://r-graph-gallery.com/how-to-draw-connecting-routes-on-map-with-r-and-great-circles.html"
interactive: true
resumo: "Mapa-múndi mostrando rotas de intercâmbio entre 10 centros de pesquisa, com o traçado real de cada rota calculado como caminho mais curto sobre a esfera."
veredito_uso: "os dados são pares origem-destino com coordenadas reais, e a geografia da ligação em si é parte da informação."
veredito_evita: "há mais de algumas dezenas de conexões, ou a posição exata não importa — um Sankey/cordas sem mapa é mais direto."
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
  aparecem curvadas, arqueando em direção aos polos: voos entre América do
  Norte e Ásia costumam passar perto do Alasca, embora pareçam
  desnecessários numa reta.
- **Espessura e opacidade da linha**: quantidade de pesquisadores naquela
  rota especificamente
- **Cor da linha**: região de origem da rota

<div class="pull-quote pull-quote-direita clearfix">voos entre América do Norte e Ásia costumam passar perto do Alasca, embora pareçam desnecessários numa reta</div>

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
  inteiro de ponta a ponta. **Solução**: `gcIntermediate(...,
  breakAtDateLine = TRUE)` — mas o jeito como isso quebra silenciosamente
  merece a história completa, em "Notas do coletor".
- **Problema**: o mapa de fundo aparece como um borrão cobrindo a tela
  inteira em vez do contorno dos países. **Solução**: corrija o enrolamento
  dos anéis do GeoJSON no próprio código de desenho — mesmo bug, mesma
  correção do [dashboard mapa + dispersão + barras](../dashboard-inovacao-ggiraph)
  deste acervo, que conta a investigação completa.

## Variações possíveis

- Adicionar setas ou gradiente de espessura ao longo da linha pra indicar
  direção (origem → destino), quando o fluxo não for simétrico
- Trocar a projeção do mundo inteiro por uma regional (zoom num continente),
  útil quando todas as conexões ficam concentradas numa área
- Colorir as rotas por volume em vez de por região, quando a pergunta for
  "quais são as rotas mais fortes" em vez de "de onde vêm as conexões"

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../dashboard-inovacao-ggiraph" style="--cat-link: var(--cat-map); --cat-link-ink: var(--cat-map-ink);">
    <span class="parecido-cat">map</span>
    <span class="parecido-titulo">Dashboard interativo: mapa + dispersão + barras</span>
    <span class="parecido-razao">Mesma base técnica (GeoJSON real, projeção e path em D3) e o mesmo bug de enrolamento de anéis — aqui o mapa é só um entre três painéis ligados.</span>
  </a>
  <a class="parecido-item" href="../../flow/chord-transferencias-clubes" style="--cat-link: var(--cat-flow); --cat-link-ink: var(--cat-flow-ink);">
    <span class="parecido-cat">flow</span>
    <span class="parecido-titulo">Diagrama de cordas: transferências entre clubes</span>
    <span class="parecido-razao">O oposto direto quando a posição geográfica exata não importa: a mesma pergunta de "quem troca com quem, quanto" sem precisar de um mapa por trás.</span>
  </a>
</div>

## Notas do coletor

`gcIntermediate()` devolve dois tipos diferentes de resultado dependendo do
próprio dado, não do código que o chama: uma matriz de pontos quando a rota
não cruza o antimeridiano, e uma **lista** de matrizes (um trecho pra cada
lado da linha de ±180°) quando cruza. Código escrito assumindo sempre-matriz
(`nrow(gc)`, iterar `gc[,1]` direto) funciona perfeitamente pra maioria das
rotas — e só quebra na primeira rota que cruzar o Pacífico, desenhando uma
linha reta absurda atravessando o mapa inteiro, sem erro nenhum no console.

É o tipo de bug que passa despercebido se os dados de teste não incluírem
essa rota específica: nada no código está "errado" pras outras 16 rotas,
só a 17ª expõe que o tipo de retorno não é fixo. A correção foi normalizar
sempre pra lista antes de iterar (`segmentos <- if (is.list(gc)) gc else
list(gc)`), tratando o caso comum (matriz) como uma lista de um elemento
só, em vez de ramificar o código em dois caminhos. Vale a mesma
desconfiança em qualquer função R que devolve tipos diferentes conforme o
dado: testar só com o caso mais comum não prova que os outros casos
funcionam.
