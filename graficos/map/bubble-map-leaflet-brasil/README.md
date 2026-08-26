---
title: "Bubble map interativo do Brasil (leaflet)"
category: map
date: 2026-07-27
source: "https://r-graph-gallery.com/19-map-leafletr.html"
interactive: true
resumo: "Bolhas posicionadas por coordenadas geográficas, com tamanho e cor proporcionais a um valor, sobre um mapa navegável."
veredito_uso: "os dados estão associados a pontos específicos (cidades, lojas, estações), e a localização é parte da análise."
veredito_evita: "o dado se refere a áreas, não a pontos — um mapa coroplético é a representação correta pra isso."
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
somem.

<div class="pull-quote pull-quote-direita clearfix">área de círculo cresce com o quadrado do raio</div>

Mapear o valor direto no raio exagera as diferenças, o que torna a escala de
cores um apoio importante para a leitura correta.

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
tela do widget com `webshot2::webshot()`. Este é também um dos poucos gráficos
do acervo que a versão interativa NÃO reencena em D3 — ver "Notas do coletor".

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

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../mapa-coropletico-conectividade" style="--cat-link: var(--cat-map); --cat-link-ink: var(--cat-map-ink);">
    <span class="parecido-cat">map</span>
    <span class="parecido-titulo">Mapa coroplético: acesso à internet banda larga</span>
    <span class="parecido-razao">O oposto direto quando o dado é sobre ÁREAS, não pontos: pinta o polígono inteiro em vez de reduzir cada região a uma bolha no centro.</span>
  </a>
  <a class="parecido-item" href="../../correlation/bolhas-investimento-startups" style="--cat-link: var(--cat-correlation); --cat-link-ink: var(--cat-correlation-ink);">
    <span class="parecido-cat">correlation</span>
    <span class="parecido-titulo">Bubble chart: investimento x crescimento x porte</span>
    <span class="parecido-razao">Mesma técnica de bolha (raio em raiz quadrada, redundância entre tamanho e cor), sem a geografia — os eixos aqui são variáveis quaisquer, não latitude/longitude.</span>
  </a>
</div>

## Notas do coletor

Quase todo gráfico interativo deste acervo segue o mesmo padrão: o
`script.R` exporta um `data.json` com os números, e um módulo D3 desenha a
versão interativa dentro do próprio fluxo da página, herdando fonte e
paleta do site — sem `<iframe>`. Este gráfico é uma das exceções
deliberadas: a versão interativa continua sendo o widget `leaflet` puro,
dentro de um iframe, exatamente como o R gerou.

O motivo não é preguiça, é que o mapa de fundo — as ruas, os limites, o
relevo — não é dado que dá pra exportar num JSON e redesenhar: são ladrilhos
de imagem (*tiles*) buscados de um serviço de mapas externo em tempo real,
conforme o usuário arrasta e dá zoom. Recriar isso em D3 significaria
reimplementar um cliente de tiles inteiro, ou depender do mesmo serviço
externo de qualquer forma — nenhuma das duas opções ganha nada em relação a
simplesmente manter o widget que o `leaflet` já gera pronto, testado e
completo.

A consequência prática, coerente com essa escolha: sem conexão de internet,
o mapa de fundo não aparece (fica cinza), mesmo com o resto do widget
funcionando offline — é uma limitação real de qualquer mapa com camada de
terceiros, aceita de propósito em vez de escondida atrás de uma
reimplementação que teria a mesma dependência de qualquer jeito.
