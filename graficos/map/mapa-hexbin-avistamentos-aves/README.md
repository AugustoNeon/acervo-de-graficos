---
title: "Mapa hexagonal: densidade de avistamentos"
category: map
date: 2026-08-21
source: "https://r-graph-gallery.com/328-hexbin-map-of-the-usa.html"
interactive: true
resumo: "Avistamentos de aves migratórias reportados no Brasil, agregados em células hexagonais coloridas pela quantidade — a densidade real por região, em vez de um ponto por avistamento."
veredito_uso: "você tem muitos pontos geográficos brutos (centenas a milhares) e o interesse é a CONCENTRAÇÃO espacial."
veredito_evita: "há poucos pontos (dezenas), ou a unidade do dado já é uma região definida (aí um coroplético é mais direto)."
pacotes: ["ggplot2", "maps", "hexbin", "sf", "rnaturalearthdata", "RColorBrewer", "jsonlite", "d3"]
dados: "2 variáveis numéricas de coordenada (longitude, latitude), uma linha por evento/observação"
nivel: intermediário
tags: ["densidade", "hexbin"]
---

## O que é

Um mapa hexagonal de densidade divide a área do mapa numa grade de hexágonos
e conta quantos pontos brutos (eventos, observações, ocorrências) caem dentro
de cada um, colorindo cada célula pela contagem. **Para que serve**:
responder "onde a coisa acontece MAIS" quando o dado de entrada é uma nuvem
de pontos individuais grande demais pra plotar um por um sem virar uma
mancha ilegível — o hexágono resume centenas de pontos próximos numa única
cor, sem perder a noção de "onde".

## Quando usar (e quando evitar)

**Use quando** você tiver muitos pontos geográficos brutos (centenas a
milhares) e o interesse for a CONCENTRAÇÃO espacial, não cada ocorrência
individual — avistamentos, chamados, transações, ocorrências policiais,
qualquer evento com coordenada.

**Evite quando** houver poucos pontos (dezenas): a grade hexagonal fica mais
vazia que informativa, e um bubble map com um círculo por ponto comunica
melhor. Evite também quando a UNIDADE do dado já for uma região definida
(país, estado, bairro) com um valor por região — nesse caso um coroplético
("país pintado por indicador", como o mapa do dashboard deste acervo) é
direto, sem precisar inventar uma grade artificial por cima.

## Que dados você precisa

- **longitude e latitude** — uma linha por evento, coordenada bruta (não
  agregada).

Formato esperado: uma tabela "longa", um evento por linha — o próprio
gráfico faz a agregação (contagem por célula), você não precisa somar nada
antes.

## Como ler o gráfico

- **Hexágono**: uma célula da grade geográfica — todos do mesmo tamanho,
  cobrindo a mesma área real.
- **Cor**: quantos avistamentos caíram naquela célula. Mais escuro = mais
  avistamentos.
- **Linha fina entre hexágonos**: fronteira estadual — deixa dá pra situar
  cada aglomerado num estado, sem precisar decorar a geografia do Brasil.
- **Sigla (ex: "SP", "BA")**: o estado, marcada no centroide dele.
- **Ausência de hexágono**: nenhum avistamento reportado ali — não significa
  "zero aves", só "zero avistamentos DESTE app nessa célula".

<div class="pull-quote pull-quote-direita clearfix">não significa "zero aves", só "zero avistamentos DESTE app nessa célula"</div>

Passe o cursor num hexágono pra ver a contagem exata e o estado onde ele está.

## Como foi feito

A miniatura estática usa `ggplot2::geom_hex()` sobre os pontos brutos, com
`scale_fill_distiller(trans = "sqrt")` (raiz quadrada comprime a escala de
cor pra células muito densas não ofuscarem todo o resto — sem isso, os 4-5
hexágonos dos pontos-quentes ficariam saturados e o resto do mapa sairia
quase todo branco) e `coord_quickmap()` por cima do contorno do Brasil (via
`maps::map_data("world", region = "Brazil")`, dado que já vem embutido no
pacote `maps`, sem precisar baixar shapefile nenhum) e das fronteiras
estaduais (via `rnaturalearthdata::states50`, a malha Admin-1 do Natural
Earth em 1:50m, também embutida no pacote — inclui nome, sigla e centroide
de cada estado prontos, sem precisar calcular nada).

A versão interativa **não recalcula o binning do zero** — ela lê de volta a
própria célula que o `ggplot2` já calculou (`ggplot_build(p)$data[[i]]`:
centro, contagem e cor final de cada hexágono) e o formato exato de UM
hexágono (`hexbin::hexcoords()`, os 6 vértices em torno do centro, iguais
pra toda a grade — a fórmula certa não foi óbvia, ver "Notas do coletor").
O D3 só projeta longitude/latitude pra pixel — com a mesma correção de
aspecto do `coord_quickmap()` — e desenha cada hexágono nesse ponto. Sem
esse reaproveitamento, reproduzir a MESMA grade numa segunda implementação
em D3 arriscaria uma grade sutilmente diferente da estática. Em qual
estado cada hexágono cai também é resolvido **uma vez só no R**
(`sf::st_join()`) e exportado pronto.

Dados fictícios: ~2500 avistamentos de aves migratórias (`set.seed(6114)`)
concentrados em 5 áreas úmidas/estuários reais onde observação de aves
migratórias de fato se concentra no Brasil (Pantanal, Lagoa dos Patos,
Reentrâncias Maranhenses, Baixada Santista, Foz do Amazonas), mais um ruído
de fundo mais esparso pelo resto do país — filtrado por
`sf::st_within()` pra cair só dentro do território (gerar direto num
retângulo de coordenadas espalharia pontos pela Bolívia/oceano, sem sentido
geográfico nenhum).

## Possíveis problemas pelo caminho

- **Problema**: o ruído de fundo, gerado como coordenadas uniformes num
  retângulo (longitude × latitude mínima e máxima do Brasil), aparecia
  espalhado por cima da Bolívia, Paraguai e do oceano Atlântico — a
  bounding box de um país com litoral irregular é bem maior que o próprio
  território. **Por quê**: um retângulo lon/lat nunca é o formato real de
  nenhum país. **Solução**: converter o contorno do `maps` pra um polígono
  `sf` (`sf::st_as_sf(maps::map(..., fill = TRUE))`) e filtrar os pontos
  candidatos com `sf::st_within()` antes de aceitar — só ficam os que caem
  de fato dentro da terra firme.

- **Problema**: hexágonos muito densos (os 4-5 pontos-quentes) dominavam a
  escala de cor a ponto do resto do mapa virar uma única cor quase branca,
  escondendo a variação real de densidade no "ruído de fundo".
  **Por quê**: escala de cor linear sobre uma distribuição de contagem bem
  assimétrica (poucas células com centenas de pontos, a maioria com 1-5).
  **Solução**: `trans = "sqrt"` no `scale_fill_distiller()` comprime a
  ponta alta da escala sem esconder o contraste na ponta baixa.

- **Problema**: `sf::st_join()` (o teste ponto-em-polígono pra descobrir o
  estado de cada hexágono) falhava com `Loop 0 is not valid: Edge 58 has
  duplicate vertex with edge 74`. **Por quê**: a malha 1:50m do Natural
  Earth tem pelo menos um anel com vértice duplicado (auto-interseção) —
  inofensivo pra só DESENHAR o polígono, mas o motor de geometria esférica
  (`s2`) que o `sf` usa por padrão pra testes topológicos é mais rígido e
  rejeita. **Solução**: `sf::st_make_valid()` no polígono dos estados antes
  do `st_join()` — corrige o anel sem mudar a forma visível.

## Variações possíveis

- Trocar a contagem bruta por uma MÉDIA de outra variável por célula (ex:
  tamanho médio do bando avistado), mudando só a estatística agregada por
  hexágono, não a técnica.
- Ajustar o número de `bins` pra uma grade mais fina (mais detalhe, mais
  ruído) ou mais grossa (mais suave, esconde padrões pequenos) — é o
  parâmetro mais sensível da técnica.
- Usar quadrados em vez de hexágonos (`geom_bin2d()`) quando o alinhamento
  com uma grade cartesiana (ex: latitude/longitude redondas) importar mais
  do que a distribuição mais uniforme de distância que o hexágono garante.
- Aplicar a mesma técnica sobre qualquer nuvem de pontos geográfica —
  chamados de suporte, ocorrências de trânsito, localização de lojas.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../mapa-coropletico-conectividade" style="--cat-link: var(--cat-map); --cat-link-ink: var(--cat-map-ink);">
    <span class="parecido-cat">map</span>
    <span class="parecido-titulo">Mapa coroplético: acesso à internet banda larga</span>
    <span class="parecido-razao">O oposto direto quando a unidade do dado já é uma região definida: pinta fronteiras políticas reais em vez de agregar numa grade artificial de hexágonos.</span>
  </a>
</div>

## Notas do coletor

Reconstruir o formato de um hexágono em D3 a partir do que o
`ggplot2::geom_hex()` já tinha calculado exigia uma fórmula que não estava
documentada em lugar nenhum acessível. `hexbin::hexcoords()` recebe uma
largura e uma altura e devolve os 6 vértices de um hexágono — mas as duas
tentativas mais óbvias de largura/altura saíram erradas, e de formas
diferentes: passar `width`/`height` direto desenhava um hexágono 2x largo e
4x alto demais; a correção "óbvia" de dividir os dois por 2 ainda saía
73% alto demais. Nenhuma das duas dava erro — a tesselação simplesmente
ficava visualmente quebrada, hexágonos virando losangos verticais
sobrepostos, só perceptível comparando um screenshot real contra o
esperado.

A fórmula certa só apareceu lendo o código-fonte instalado do próprio
`ggplot2` (`asNamespace("ggplot2")$GeomHex$draw_group`, já que
`hexcoords()` não tem página de ajuda própria que explique a relação):
`dx = width/2, dy = height/sqrt(3)/2`. O fator `1/sqrt(3)` no `dy` não
aparece em nenhuma leitura ingênua dos nomes das colunas — é geometria de
hexágono regular (a razão entre o lado e a altura de um hexágono não é
1:1), embutida na implementação sem estar no nome de nenhum parâmetro.

A técnica que resolveu isso generaliza: quando uma função de geometria de
um pacote R/ggplot2 não tem página de ajuda que explique a relação entre
parâmetros e resultado, `asNamespace("<pacote>")$<função>` mostra o
código-fonte de verdade, instalado na máquina — muitas vezes mais rápido
do que adivinhar por tentativa e erro, e a única forma confiável quando as
duas tentativas óbvias já saíram erradas.
