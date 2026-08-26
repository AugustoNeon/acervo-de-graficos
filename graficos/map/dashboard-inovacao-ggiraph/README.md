---
title: "Dashboard interativo: mapa + dispersão + barras"
category: map
date: 2026-07-27
source: "https://r-graph-gallery.com/414-map-multiple-charts-in-ggiraph.html"
interactive: true
resumo: "Três gráficos diferentes ligados pela mesma chave: passar o mouse em um destaca o mesmo dado nos outros dois."
veredito_uso: "a mesma entidade tem várias dimensões relevantes, e a pergunta é de comparação cruzada."
veredito_evita: "dois gráficos já bastam, ou o leitor está numa tela pequena — a ligação depende de ver os três painéis ao mesmo tempo."
pacotes: ["sf", "spData", "dplyr", "patchwork", "jsonlite", "d3"]
dados: "geometria por país + 2 variáveis numéricas"
nivel: avançado
tags: ["geoespacial", "dashboard"]
---

## O que é

Três gráficos que mostram o mesmo conjunto de dados por ângulos diferentes — um
mapa coroplético, um gráfico de dispersão e um de barras — **ligados entre si**.
Passar o mouse sobre um país no mapa destaca o ponto dele na dispersão e a barra
dele no ranking, simultaneamente.

Essa ligação é o que caracteriza a técnica, conhecida como *brushing* ou destaque
vinculado. O mecanismo é simples: todos os elementos que representam a mesma
entidade compartilham um identificador, e a biblioteca cuida do resto.

Cinco tratamentos de interação estão disponíveis nos botões acima do gráfico:
destaque por país, destaque por continente (que realça o grupo inteiro), CSS
customizado, brilho avançado e esmaecimento dos não-selecionados.

**Para que serve**: responder perguntas que nenhum gráfico isolado responde. "Onde
fica o país que mais investe?" exige o mapa; "investir mais leva a inovar mais?"
exige a dispersão; "quem lidera?" exige o ranking. Ligados, permitem circular entre
as três perguntas sem perder o fio.

## Quando usar (e quando evitar)

**Use quando** a mesma entidade tiver várias dimensões relevantes e a pergunta
principal for de comparação cruzada — geografia, relação entre variáveis e ranking
ao mesmo tempo.

**Use o destaque por grupo** (o segundo botão) quando a pergunta for sobre blocos e
não indivíduos: realçar um continente inteiro nos três painéis revela padrões
regionais que passariam despercebidos país a país.

**Evite quando** dois gráficos já bastarem — cada painel adicional divide a atenção
e reduz o espaço dos demais. Evite também em telas pequenas: a ligação depende do
leitor ver os três painéis ao mesmo tempo, e num celular isso não acontece.

E vale o alerta usual: em dados fictícios como estes, qualquer correlação aparente
é artefato da geração, não achado.

## Que dados você precisa

- **Geometria por entidade** — os polígonos dos países, num objeto espacial.
- **Duas variáveis numéricas** — uma para colorir o mapa, ambas para a dispersão.
- **Uma variável de agrupamento** — o continente, usada no destaque por grupo.
- **Um identificador estável** — o nome do país, que é o que liga os três painéis.

O ponto crítico é esse identificador: ele precisa ser **exatamente o mesmo** nos
três gráficos. Se o mapa usa "Brazil" e o ranking usa "Brasil", a ligação não
acontece.

<div class="pull-quote">é a causa mais comum de falha silenciosa nesse tipo de gráfico, em qualquer linguagem</div>

## Como ler o gráfico

**Mapa** — cor de cada país indica o investimento em P&D; países mais escuros
investem mais.

**Dispersão** — posição horizontal é o investimento, vertical é o índice de
inovação. Pontos acima e à direita têm as duas grandezas altas.

**Barras** — os 15 países com maior índice de inovação, do maior para o menor.

Passe o mouse sobre qualquer elemento de qualquer painel: o mesmo país é destacado
nos três. Troque para "Por continente" e o realce passa a atingir o bloco inteiro —
é o modo mais revelador de padrão regional.

## Como foi feito

O gráfico é desenhado em D3, no próprio runtime do site — os três painéis (mapa,
dispersão, ranking) moram no mesmo `<svg>`, cada um seu próprio sistema de eixos,
mas todos lendo do mesmo array de países.

O `script.R` gera o `output.png` com `ggplot2`+`patchwork` normalmente e, à parte,
exporta a geometria dos países como **GeoJSON** dentro do `data.json` — cada
`feature` já carrega as duas variáveis (`investimento`, `inovacao`) nas próprias
`properties`, então a dispersão e o ranking são derivados no D3 das mesmas
`features` do mapa, sem duplicar o dado em arrays à parte. A geometria é
simplificada no R (`sf::st_simplify()`) antes de exportar — o mapa não precisa da
resolução de vértices que uma análise espacial exigiria, só da forma reconhecível
de cada país, e isso corta bastante o tamanho do `data.json`.

O mapa usa `d3.geoNaturalEarth1()` (a projeção do próprio D3, sem depender da
projeção que o `sf`/`ggplot2` escolheu) e `d3.geoPath()` pra converter a geometria
em atributo `d` de `<path>` — o mesmo par que desenha qualquer mapa em D3, do mapa
mais simples ao mais complexo.

**A ligação entre os três painéis** (a técnica que dá nome ao gráfico) é uma
função só, chamada no hover de qualquer elemento em qualquer painel: ela decide
quais países "batem" com a chave do elemento sob o cursor (o próprio país, no modo
"por país"; todo o continente, no modo "por continente") e aplica o estilo de
destaque a esses elementos nos **três** painéis ao mesmo tempo — mapa, pontos e
barras compartilham a mesma função de realce, só o array de elementos muda.

Os "5 estilos" da versão anterior existiam porque a interatividade do `ggiraph`
é só CSS — "interatividade via CSS, não JS" não é um conceito que existe em D3,
onde toda interação já é JS (mesma situação, e mesma solução, do
[linha interativa com CSS customizado](../../evolution/linha-interativa-ggiraph-css)).
Os 5 modos viraram estados escolhidos por um seletor, cada um combinando uma chave
de agrupamento (país ou continente) com um tratamento visual (cor sólida, glow,
esmaecer o resto) — a mesma função de realce, parametrizada.

Dados fictícios: investimento em P&D e índice de inovação por país
(`set.seed(1414)`), gerados a partir de um valor base por continente mais ruído. A
geometria dos países é real; os valores, não.

## Possíveis problemas pelo caminho

- **Problema**: o destaque não se propaga entre os painéis. **Por quê**: a chave
  usada num painel não bate com a de outro — nomes escritos de forma diferente,
  espaço a mais, maiúscula/minúscula. **Solução**: os três painéis precisam ler a
  chave da mesma propriedade, sem transformação no meio do caminho; é a causa mais
  comum de falha silenciosa nesse tipo de gráfico, em qualquer linguagem.

- **Problema**: o arquivo de dado fica grande. **Por quê**: geometria de país em
  resolução alta vira milhares de vértices por polígono. **Solução**: simplificar
  antes de exportar (`sf::st_simplify()`, como já é feito aqui) — a diferença
  visual em escala mundial é imperceptível, e o arquivo cai bastante de tamanho.

- **Problema**: o mapa sai distorcido, cortado ou vazio. **Por quê**: no D3, isso
  costuma ser a projeção (`d3.geoPath()`) sem uma geometria de referência pra
  calcular escala/centro — `fitSize()` precisa da coleção de países inteira, não
  de um único país. **Solução**: chamar `fitSize()` sempre com a `FeatureCollection`
  completa, mesmo que o desenho seja de um subconjunto dela.

- **Problema**: o mapa inteiro vira um "blob" sólido cobrindo o mundo, com cada
  país virando um buraco quase invisível nele, em vez de países coloridos.
  **Solução**: normalize o sentido dos anéis do GeoJSON antes de desenhar — a
  investigação completa está em "Notas do coletor", no fim da página.

- **Problema**: o hover fica lento com muitos países. **Por quê**: o realce
  reavalia todo o conjunto (mapa + dispersão + barras) a cada `pointerenter`.
  **Solução**: pra um conjunto do tamanho de países do mundo (~175) não chega a
  ser perceptível; se a entidade fosse muito mais numerosa (milhares), valeria
  pré-indexar os elementos por chave num `Map` em vez de filtrar a seleção inteira
  a cada hover.

## Variações possíveis

- Trocar a chave de agrupamento por outra coluna (região, faixa de renda) e obter
  um novo modo de leitura sem mexer no desenho dos três painéis.
- Substituir um dos painéis por um histograma ou boxplot, mantendo a ligação — a
  função de realce não sabe nem precisa saber que tipo de gráfico está destacando.
- Trocar o hover por seleção por clique, pra fixar uma comparação em vez de
  depender do cursor continuar sobre o elemento.
- Aplicar a mesma técnica sem mapa — a ligação funciona entre quaisquer gráficos,
  como em
  [linha interativa com CSS customizado](../../evolution/linha-interativa-ggiraph-css).

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../mapa-conexoes-pesquisa" style="--cat-link: var(--cat-map); --cat-link-ink: var(--cat-map-ink);">
    <span class="parecido-cat">map</span>
    <span class="parecido-titulo">Mapa de conexões: intercâmbio de pesquisadores</span>
    <span class="parecido-razao">Mesma técnica de base (geometria real em GeoJSON, projeção e path calculados em D3), mas o mapa é o protagonista sozinho, não um painel entre três.</span>
  </a>
  <a class="parecido-item" href="../../evolution/linha-interativa-ggiraph-css" style="--cat-link: var(--cat-evolution); --cat-link-ink: var(--cat-evolution-ink);">
    <span class="parecido-cat">evolution</span>
    <span class="parecido-titulo">Linha interativa com 4 tratamentos de destaque</span>
    <span class="parecido-razao">A mesma ideia de coordenar destaque entre elementos, num seletor de modos de interação em vez de três painéis ligados por identificador.</span>
  </a>
</div>

## Notas do coletor

O mapa foi publicado e só depois alguém notou o problema: em vez de 175
países coloridos, a tela mostrava um "blob" sólido cobrindo o mundo
inteiro, cada país virando um buraco quase invisível nele — como um
negativo do mapa esperado. Não havia erro no console, e inspecionar
qualquer `<path>` individual mostrava um atributo `d` perfeitamente válido.
O bug só apareceu numa captura de tela real, comparada contra a
expectativa.

A causa exigiu isolar um único país (Uruguai, escolhido por não ter nada
de especial — nenhum antimeridiano, nenhuma geometria exótica) e inverter
manualmente a ordem dos pontos do polígono até o blob sumir. O que isso
revelou: o GeoJSON que `sf::st_write()` escreve tem o **sentido de
enrolamento dos anéis inconsistente entre países** — uns anti-horário,
uns horário, sem um padrão simples (não é "todo mundo invertido", nem
algo geográfico óbvio). Nenhuma opção do driver GDAL testada mudou isso
pra esse conjunto de dados específico.

O motivo de isso quebrar especificamente no `d3.geoPath()`: ao contrário
de um gerador de path plano, ele faz **clipping esférico**, e decide
"dentro vs. fora" do polígono pelo sentido do anel. Com o sentido errado,
ele desenha "o globo inteiro preenchido, menos um buraco no formato do
país" — daí o blob cobrindo tudo. A correção não ficou no lado R: ficou
no próprio módulo D3, com uma função que calcula a área com sinal de cada
anel (fórmula do cadarço/shoelace) e força o anel externo pro sentido que
o `d3-geo` espera, cada furo pro sentido oposto — corrigindo por conta
própria, não importa o que veio de cada país específico. Vale testar de
novo em qualquer mapa novo: um GeoJSON que abre sem erro não é garantia
de que o sentido dos anéis está certo pro `d3-geo`.
