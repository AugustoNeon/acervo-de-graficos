---
title: "Bubble map interativo do Brasil (leaflet)"
category: map
date: 2026-07-27
source: "https://r-graph-gallery.com/19-map-leafletr.html"
interactive: true
resumo: "Bolhas posicionadas por coordenadas geográficas, com tamanho e cor proporcionais a um valor, sobre um mapa navegável."
pacotes: ["leaflet", "htmltools", "webshot2"]
dados: "latitude, longitude e um valor numérico por ponto"
nivel: básico
tags: ["geoespacial", "mapa"]
---

## O que é

Um mapa em que cada observação vira um círculo posicionado por suas coordenadas, com
**tamanho e cor proporcionais a um valor**. O mapa por baixo é navegável: dá para
arrastar, aproximar e afastar.

**Para que serve**: responder perguntas em que "onde" e "quanto" importam ao mesmo
tempo. Concentrações regionais, pontos fora da curva geográficos e a distribuição
espacial de uma grandeza aparecem imediatamente.

## Quando usar (e quando evitar)

**Use quando** os dados estiverem associados a pontos específicos (cidades, lojas,
estações, ocorrências) e a localização for parte da análise.

**Evite quando** o dado se referir a **áreas** e não a pontos — população por
estado, por exemplo. Nesse caso o mapa coroplético, que pinta a área inteira, é a
representação correta; reduzir um estado a um ponto no centro distorce a leitura.

**Cuidado com a sobreposição**: em regiões densas as bolhas se cobrem e as de baixo
somem. E lembre-se de que área de círculo cresce com o quadrado do raio — mapear o
valor direto no raio exagera as diferenças, o que torna a escala de cores um apoio
importante para a leitura correta.

## Que dados você precisa

- **Latitude** e **longitude** — em graus decimais (no Brasil, ambas negativas em
  quase todo o território).
- **Um valor numérico** por ponto — o que define tamanho e cor.
- **Opcional: um rótulo** — nome do ponto, exibido ao passar o mouse.

Não é preciso arquivo geoespacial nem shapefile: coordenadas soltas em um data
frame bastam.

## Como ler o gráfico

- **Posição**: a localização real do ponto no mapa.
- **Tamanho da bolha**: o valor — quanto maior, maior o valor.
- **Cor da bolha**: o mesmo valor, em faixas discretas definidas na legenda.

Tamanho e cor codificam **a mesma variável**, de propósito: é uma redundância que
facilita a leitura, já que comparar áreas de círculo é impreciso e a cor resolve a
ambiguidade.

Aproxime o mapa para separar bolhas sobrepostas e passe o mouse sobre qualquer uma
para ver nome e valor exato.

## Como foi feito

O mapa é montado encadeando funções do `leaflet`: `addProviderTiles()` define a
camada de fundo, `setView()` centraliza e define o zoom inicial,
`addCircleMarkers()` desenha as bolhas e `addLegend()` gera a legenda.

A cor vem de `colorBin()`, que divide os valores em faixas discretas — mais fácil
de ler numa legenda do que um gradiente contínuo. O raio usa a **raiz quadrada** do
valor, justamente para compensar o crescimento quadrático da área do círculo.

Os rótulos são HTML, montados com `sprintf()` e convertidos com `htmltools::HTML()`
para que as quebras de linha sejam interpretadas.

Como não há equivalente estático em `ggplot2`, a miniatura veio de uma captura de
tela do widget com `webshot2::webshot()`.

Dados fictícios: vendas mensais inventadas (`set.seed(2026)`) para 20 capitais e
grandes cidades brasileiras. As coordenadas das cidades são reais; os valores, não.

## Possíveis problemas pelo caminho

- **Problema**: os pontos aparecem no lugar errado, ou no oceano. **Por quê**:
  latitude e longitude foram trocadas, ou o sinal está invertido. **Solução**: no
  Brasil, latitude e longitude são negativas em praticamente todo o território;
  conferir uma cidade conhecida é o teste mais rápido.

- **Problema**: as bolhas grandes escondem as pequenas. **Por quê**: sobreposição em
  regiões densas, com as maiores desenhadas por cima. **Solução**: reduzir a
  opacidade, ordenar do maior para o menor antes de plotar, ou agrupar pontos
  próximos.

- **Problema**: as diferenças parecem maiores do que são. **Por quê**: o valor foi
  mapeado diretamente no raio, e a área cresce ao quadrado. **Solução**: usar a raiz
  quadrada do valor no raio.

- **Problema**: o mapa aparece cinza, sem a camada de fundo. **Por quê**: as
  imagens do mapa base vêm de um serviço externo e exigem conexão — ao contrário do
  restante do widget, elas não ficam salvas junto. **Solução**: nenhuma para uso
  offline; é uma limitação real de mapas com camada de terceiros.

- **Problema**: salvar o widget falha por falta de `pandoc`. **Solução**: usar
  `selfcontained = FALSE` e manter a pasta `widget_files/` junto do HTML.

## Variações possíveis

- Trocar a camada de fundo: mapas claros e neutros deixam as bolhas em evidência,
  imagens de satélite dão contexto geográfico.
- Usar `addPopups()` no lugar dos rótulos para exibir conteúdo ao clicar, com mais
  espaço e formatação.
- Agrupar pontos próximos automaticamente com `clusterOptions`, resolvendo a
  sobreposição em bases grandes.
- Sobrepor polígonos de estados ou municípios e combinar bolhas com coroplético.
- Adicionar controle de camadas (`addLayersControl`) para o leitor alternar entre
  diferentes métricas.
