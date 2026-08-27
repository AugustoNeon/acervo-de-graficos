---
title: "Coordenadas paralelas: perfil sensorial de vinhos"
category: correlation
date: 2026-08-24
source: "https://r-graph-gallery.com/parallel-plot-ggally.html"
interactive: true
resumo: "90 vinhos fictícios comparados em 5 variáveis ao mesmo tempo — acidez, corpo, tanino, doçura e preço — cada um como uma linha atravessando os cinco eixos."
veredito_uso: "há 4+ variáveis numéricas e a pergunta é sobre o perfil completo de cada observação."
veredito_evita: "há centenas/milhares de observações sem interatividade — vira um emaranhado ilegível."
pacotes: ["ggplot2", "GGally", "patchwork"]
dados: "5 variáveis numéricas (um eixo cada) + 1 categórica (cor)"
nivel: intermediário
tags: ["multivariado", "correlação"]
---

## O que é

Um gráfico de coordenadas paralelas desenha um eixo vertical por variável,
lado a lado, e liga o valor de cada observação nos N eixos com uma linha —
uma polilinha por linha da tabela. **Para que serve**: comparar muitas
variáveis numéricas ao mesmo tempo (mais do que cabe em X/Y/tamanho/cor de
uma dispersão comum), revelando padrões como "quem é alto no eixo 1 tende a
ser baixo no eixo 3" pela inclinação das linhas entre dois eixos vizinhos.

## Quando usar (e quando evitar)

**Use quando** há 4 ou mais variáveis numéricas por observação e a pergunta
é sobre o PERFIL completo de cada uma (não só a correlação entre duas de
cada vez) — comparar grupos, encontrar outliers que se destacam em algum
eixo específico, ou ver se um cluster visível num eixo se mantém coerente
nos outros.

**Evite quando** há muitas observações (centenas ou milhares) sem
interatividade — o excesso de linhas sobrepostas vira um emaranhado
ilegível ("spaghetti plot"), problema que só interatividade (destacar uma
linha por vez) ou agregação (mostrar só a média por grupo) resolve de
verdade. Evite também mais de 8–10 eixos: a ordem em que os eixos aparecem
passa a importar demais, e reordenar todos pra testar todo par de eixos
vizinhos fica inviável manualmente.

## Que dados você precisa

- **variáveis numéricas** — pelo menos 3, idealmente 4–8, uma por eixo
- **grupo** (opcional) — variável categórica pra colorir as linhas

Formato esperado: uma linha por observação, uma coluna por variável — dado
já "largo" (wide), ao contrário da maioria dos gráficos deste acervo que
pedem formato longo.

## Como ler o gráfico

- **Posição vertical em cada eixo**: valor daquela observação naquela
  variável.
- **Inclinação do segmento entre dois eixos vizinhos**: relação entre as
  duas variáveis — segmentos todos paralelos entre si indicam correlação
  forte entre esse par de eixos; segmentos cruzando em todas as direções
  indicam pouca relação.
- **Cor**: identifica o grupo de cada linha — grupos com perfil parecido
  formam "feixes" de linhas próximas em vários eixos ao mesmo tempo.

## Como foi feito

`GGally::ggparcoord()` faz o trabalho pesado: recebe a tabela larga, o
índice das colunas numéricas e a coluna de agrupamento, e desenha uma
polilinha por linha. O parâmetro `scale` decide COMO cada eixo é
reescalado antes de desenhar — `"uniminmax"` (usado aqui) comprime cada
variável pro próprio intervalo 0–1, o padrão da técnica, porque as 5
variáveis têm escalas bem diferentes entre si (0–10 pras sensoriais,
R$ 12–220 pro preço).

Dados fictícios: 90 vinhos fictícios (`set.seed(4471)`, 30 de cada tipo —
tinto, branco, rosé), cada tipo com um perfil sensorial próprio nas 5
variáveis (tinto com corpo e tanino altos, branco com acidez alta e tanino
baixo, rosé intermediário) — pensado pra que os três grupos formem feixes
visualmente separados em pelo menos alguns eixos, o mesmo tipo de padrão
que torna esse gráfico útil de verdade (não só decorativo).

A versão interativa desenha os mesmos 5 eixos em D3, cada um com sua PRÓPRIA
escala em unidade real (não normalizada 0–1) — no navegador dá pra mostrar
um eixo Y com ticks legíveis por variável, o que o `ggparcoord()` não
consegue com um único eixo Y compartilhado. Passar o cursor numa linha
apaga as outras 89, isolando visualmente o perfil daquele vinho específico
— a técnica que resolve o problema de sobreposição citado acima. Clicar
numa cor da legenda isola o grupo inteiro em vez de uma linha só.

## Possíveis problemas pelo caminho

- **Problema**: uma variável com escala bem maior que as outras (aqui, o
  preço em dezenas/centenas contra variáveis sensoriais de 0 a 10) esmaga
  visualmente todos os outros eixos quando o gráfico não reescala por
  eixo — as linhas ficam quase retas e coladas na base em todo o resto do
  gráfico, escondendo qualquer padrão que exista nas outras variáveis.
  **Por quê**: sem reescalar, todos os eixos compartilham o mesmo Y em
  valor absoluto, então a variável de maior amplitude numérica domina o
  espaço vertical inteiro. **Solução**: sempre reescalar cada eixo pro seu
  próprio intervalo (`scale = "uniminmax"` no `GGally`, ou uma
  `d3.scaleLinear()` com domínio próprio por eixo no D3) — nunca uma escala
  Y global compartilhada entre variáveis de unidades diferentes. O
  `output.png` deste gráfico mostra os dois lados lado a lado de propósito,
  como ilustração do problema.
- **Problema**: passar o cursor perto de uma linha fina não ativa o
  tooltip. **Solução**: desenhe uma segunda cópia invisível da mesma linha,
  com traço bem mais grosso, só pra capturar o ponteiro — a história
  completa está em "Notas do coletor", no fim da página.

## Variações possíveis

- Trocar linhas por um "boxplot paralelo" (`ggparcoord(boxplot = TRUE)`) —
  mostra a distribuição de cada grupo em cada eixo, em vez de cada
  observação individual; perde o rastro de uma linha específica, mas ganha
  legibilidade quando há centenas de observações.
- Adicionar um eixo categórico (não numérico) no meio dos outros,
  representando cada categoria como uma posição igualmente espaçada no
  eixo — útil pra incluir uma variável categórica como mais uma dimensão
  de comparação, não só como cor.

<div class="pull-quote">a ordem dos eixos é uma decisão de design, não só estética</div>

A ordem dos eixos é uma decisão de design, não só estética: reordenar os
eixos manualmente pra colocar variáveis correlacionadas lado a lado ajuda —
a leitura de correlação só funciona bem entre eixos VIZINHOS.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../../ranking/radar-multiplos-grupos" style="--cat-link: var(--cat-ranking); --cat-link-ink: var(--cat-ranking-ink);">
    <span class="parecido-cat">ranking</span>
    <span class="parecido-titulo">Radar chart com múltiplos grupos</span>
    <span class="parecido-razao">O mesmo problema — comparar o perfil de um grupo em várias variáveis de uma vez — resolvido em layout circular em vez de eixos paralelos.</span>
  </a>
</div>

## Notas do coletor

Passar o cursor perto de uma linha do gráfico não ativava o tooltip, mesmo
mirando bem em cima dela visualmente — e o problema piorava justo onde mais
importava, no meio de um feixe de 30 linhas próximas do mesmo grupo. A área
de detecção de ponteiro de um `<path>` de 1-2px de largura é pequena demais
pra mirar com precisão, e reduzir a densidade de linhas não era opção (é o
próprio dado).

A correção não foi engrossar a linha visível — isso mudaria a aparência do
gráfico pra resolver um problema de interação, trade-off ruim. Em vez disso,
cada linha ganhou uma segunda cópia invisível por baixo, com o mesmo
caminho SVG mas `stroke: transparent` e um traço bem mais grosso, só pra
capturar o ponteiro. A linha visível continua fina exatamente como
desenhada; a área clicável é maior sem que ninguém veja isso.
