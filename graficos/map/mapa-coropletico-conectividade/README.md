---
title: "Mapa coroplético: acesso à internet banda larga"
category: map
date: 2026-08-24
source: "https://r-graph-gallery.com/327-chloropleth-map-from-geojson-with-ggplot2.html"
interactive: true
resumo: "Percentual fictício de domicílios com internet banda larga fixa em cada estado brasileiro, colorido por intensidade."
pacotes: ["ggplot2", "sf", "rnaturalearthdata"]
dados: "1 variável geográfica (polígono do estado) + 1 numérica (percentual)"
nivel: básico
tags: ["geoespacial", "coroplético"]
---

## O que é

Um mapa coroplético pinta cada região de um território (país, estado,
município...) com uma cor proporcional a um valor numérico associado
àquela região. **Para que serve**: responder "onde esse valor é alto e onde
é baixo", aproveitando a geografia real como eixo — a posição de cada
região já é dada pelo próprio mapa, sem precisar de eixo X/Y.

## Quando usar (e quando evitar)

**Use quando** a variável faz sentido ser medida "por região" (percentual,
taxa, índice — algo comparável entre regiões de tamanhos diferentes) e a
distribuição espacial em si é parte da pergunta.

**Evite quando** a variável é uma contagem bruta, não uma taxa (população
total, por exemplo) — regiões maiores tendem a "vencer" só por serem
maiores, não por terem o valor mais alto de verdade; normalize por área ou
população primeiro. Evite também quando as regiões têm tamanhos MUITO
desiguais (aqui, os estados do Norte ocupam boa parte do mapa mas têm menos
gente) — um estado pequeno com valor extremo pode passar despercebido só
por ocupar pouco espaço visual; um cartograma (área proporcional a outra
variável, não à área real) resolve esse problema quando ele for crítico.

## Que dados você precisa

- **região** — identificador que bate com um polígono geográfico conhecido
  (nome do estado, código IBGE, sigla...)
- **valor** — variável numérica, idealmente uma taxa/percentual/índice, uma
  linha por região

Formato esperado: uma tabela simples (região + valor) que se junta ao
contorno geográfico pela chave em comum — o contorno em si (os polígonos)
não faz parte da tabela de dados, vem de uma fonte geoespacial à parte.

## Como ler o gráfico

- **Cor de cada estado**: intensidade do valor ali — quanto mais escuro,
  maior o percentual (escala sequencial: só a intensidade muda, não o
  matiz).
- **Sigla no centro**: identifica o estado sem precisar de tooltip pra
  leitura básica.
- **Padrão espacial**: blocos de cor parecida entre estados vizinhos
  indicam uma tendência regional, não só uma coincidência estado a estado.

## Como foi feito

`geom_sf(aes(fill = valor))` do `ggplot2` desenha o polígono de cada estado
já pintado — não precisa de `geom_polygon()` manual como em mapas sem
suporte nativo a `sf`. O contorno + nome + sigla + centroide de cada estado
vêm do Natural Earth Admin-1 (`rnaturalearthdata::states50`, 1:50m),
embutido no pacote, 100% offline. `scale_fill_distiller(palette = "PuBu")`
dá a escala sequencial de cor.

Dados fictícios: percentual de domicílios com internet banda larga por
estado (`set.seed(9137)`), gerado com uma base por **região** brasileira
(Sul e Sudeste mais altos, Norte e Nordeste mais baixos — o padrão real de
desigualdade de infraestrutura no país) mais ruído por estado — pra o mapa
ter um padrão geográfico plausível (estados vizinhos parecidos entre si) em
vez de cores sorteadas sem relação nenhuma com a vizinhança.

A versão interativa desenha o mesmo GeoJSON em D3 (`d3.geoMercator()`
ajustado ao território + `d3.geoPath()`), a mesma técnica já usada no painel
de mapa do dashboard mapa+dispersão+barras deste acervo — incluindo a
correção de enrolamento dos anéis que o `sf`/GDAL exporta de forma
inconsistente entre estados (ver `shared/mapa.ts`).

## Possíveis problemas pelo caminho

- **Problema**: uma junção espacial ou outra operação topológica falha com
  "Loop 0 is not valid", mesmo o mapa desenhando normalmente sem erro
  nenhum antes disso. **Por quê**: o dado Natural Earth 1:50m tem pelo
  menos um anel com vértice duplicado (autointerseção), que o motor
  esférico `s2` do pacote `sf` rejeita em teste topológico, embora o
  desenho simples (sem topologia) não seja afetado. **Solução**: rodar
  `sf::st_make_valid()` no objeto assim que ele é carregado, antes de
  qualquer operação que dependa de topologia.
- **Problema**: no navegador, um estado aparece como "o mapa inteiro
  preenchido, com um buraco no formato dele" em vez da forma sozinha.
  **Por quê**: o GeoJSON escrito pelo `sf`/GDAL sai com o sentido de
  enrolamento dos anéis inconsistente entre features, e o `d3-geo` depende
  desse sentido pra saber o que é "dentro" e "fora" da forma. **Solução**:
  corrigir o sentido de cada anel no próprio D3 antes de desenhar (função
  `corrigirEnrolamento()`, já extraída como utilitário compartilhado deste
  acervo).

## Variações possíveis

- Trocar a escala sequencial por uma divergente (`RdBu`, `PuOr`) quando o
  valor tem um ponto central com significado — por exemplo, "acima/abaixo
  da média nacional" em vez de um percentual absoluto.
- Agrupar estados por macrorregião (contorno mais grosso entre regiões,
  mais fino entre estados vizinhos da mesma região) pra reforçar a leitura
  regional sem precisar de tabela nem legenda extra.
- Trocar o mapa de estados por um de municípios do mesmo estado — mesma
  técnica, granularidade geográfica menor.
