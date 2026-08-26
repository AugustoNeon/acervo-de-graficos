---
title: "Circle packing hierárquico"
category: part-of-whole
date: 2026-07-29
source: "https://r-graph-gallery.com/315-hide-first-level-in-circle-packing.html"
interactive: true
resumo: "Círculos aninhados dentro de círculos maiores, cada camada representando um nível de uma hierarquia, do todo até a menor subcategoria."
pacotes: ["ggraph", "igraph", "jsonlite", "d3"]
dados: "Uma hierarquia de categorias (vários níveis) + 1 variável numérica nas folhas"
nivel: intermediário
tags: ["parte-do-todo", "hierarquia"]
---

## O que é

Circle packing hierárquico é a versão com múltiplos níveis do circle packing
simples: em vez de bolhas soltas lado a lado, cada círculo fica **dentro** do
círculo do seu grupo pai, formando camadas aninhadas — o todo (raiz) contém as
categorias principais, que contêm subcategorias, que contêm os itens
individuais. **Para que serve**: mostrar ao mesmo tempo a estrutura de uma
hierarquia (quem pertence a quem) e a magnitude relativa de cada item dentro
dela — como um treemap, mas com círculos em vez de retângulos.

## Quando usar (e quando evitar)

**Use quando** os dados tiverem uma hierarquia de verdade (categoria >
subcategoria > item) e a mensagem exigir mostrar as duas coisas ao mesmo
tempo: a estrutura de agrupamento **e** o tamanho relativo de cada item
dentro do seu grupo.

**Evite quando** a hierarquia tiver muitos níveis (mais de 4) ou muitos itens
por grupo — círculos aninhados desperdiçam bastante espaço em branco entre um
nível e o próximo (ao contrário de um treemap, que aproveita toda a área
disponível), então a leitura fica difícil com volume grande de dados. Evite
também quando não existir hierarquia real — nesse caso, a versão de um nível
deste acervo já resolve.

## Que dados você precisa

- **Uma cadeia de categorias hierárquicas** — ex: mídia > gênero > título,
  cada nível aninhado dentro do anterior.
- **Uma variável numérica**, presente só nas folhas (o item mais específico)
  — o valor de cada categoria pai é a soma dos seus filhos, calculada
  automaticamente pelo layout.

Formato: uma linha por folha, com uma coluna para cada nível da hierarquia
(dado "largo", não longo).

## Como ler o gráfico

- **Aninhamento**: um círculo dentro de outro significa "pertence a". A raiz
  (o círculo mais externo, que conteria tudo) fica escondida neste gráfico —
  ela não carrega nenhuma informação própria, só o resto da hierarquia
  importa.
- **Área de cada círculo**: soma dos valores de tudo que está dentro dele —
  folhas somam seu próprio valor, categorias somam os filhos.
- **Cor**: representa a profundidade na hierarquia (mídia, gênero ou título),
  não uma variável dos dados — todos os círculos do mesmo nível compartilham
  a mesma cor.

## Como foi feito

A hierarquia é montada como um grafo em árvore: uma tabela de arestas
(`from`/`to`) ligando raiz → mídia → gênero → título, mais uma tabela de
vértices com o valor numérico (preenchido só nas folhas, zero nos demais).
`ggraph(..., layout = "circlepack", weight = <valor>)` calcula o layout
sozinho — inclusive a soma dos valores das folhas pra definir a área dos
círculos pai, sem precisar somar nada manualmente. Esconder a raiz é um
truque visual, não uma opção do layout: ela recebe a mesma cor branca do
fundo (`scale_fill_manual`), então ainda ocupa espaço mas fica invisível.

A versão interativa é desenhada em D3, com o layout recalculado do zero por
`d3.hierarchy()`+`d3.pack()` — o `circlepack` do `ggraph` é estocástico
(duas rodadas com os mesmos dados dão arranjos diferentes), então não faz
sentido tentar herdar a posição exata do R; o que o script exporta pro
`data.json` é só a árvore (estrutura + valor de cada folha) e a paleta por
profundidade, pra manter a mesma cor dos dois lados. A interatividade aqui é
de navegação: clicar num círculo dá zoom nele (a área dele passa a preencher
o espaço todo); clicar fora volta pra visão geral.

Dados fictícios: um catálogo de streaming (Filmes, Séries, Música, Podcasts),
cada um com 3 gêneros e 2 títulos por gênero, com horas assistidas/ouvidas
inventadas — no lugar da hierarquia de pacotes de software do exemplo
original.

## Possíveis problemas pelo caminho

- **Problema**: erro "valor ausente onde TRUE/FALSE necessário" ao montar o
  gráfico. **Por quê**: o layout `circlepack` espera `0` (não `NA`) como
  valor nos nós que não são folha — ele soma os filhos por baixo dos panos,
  mas só funciona se todo nó já começar com um número válido. **Solução**:
  preencher a coluna de valor com `0` em vez de `NA` em todo nó que não for
  folha.
- **Problema**: cada execução do script produz um arranjo diferente dos
  círculos, mesmo com os dados idênticos. **Por quê**: o layout `circlepack`
  do `ggraph` é estocástico — duas chamadas seguidas, na mesma sessão, já
  devolvem coordenadas diferentes. **Solução**: fixar a semente
  (`set.seed()`) imediatamente antes da chamada do layout, se a
  reprodutibilidade importar. Vale lembrar que a versão interativa nunca vai
  ter o mesmo arranjo da estática de qualquer forma: são implementações
  diferentes do mesmo algoritmo de empacotamento.

- **Problema**: dois círculos de galhos diferentes colidem, ou o grafo nem
  chega a construir. **Por quê**: `graph_from_data_frame()` identifica cada
  nó pelo nome — dois nós com o mesmo nome em galhos diferentes da hierarquia
  (ex: a mesma subcategoria repetida em dois grupos) colapsam num vértice só.
  **Solução**: usar nomes únicos em toda a árvore, concatenando com o nome do
  pai quando precisar repetir um rótulo em grupos diferentes.
- **Problema**: a cor de um nível não bate entre o `output.png` e a versão
  interativa. **Por quê**: são dois códigos em duas linguagens desenhando o
  mesmo dado — se a paleta por profundidade for definida separadamente em
  cada lado, a primeira mudança em um deles diverge do outro. **Solução**: a
  paleta (`cor_nivel`) é definida uma única vez no `script.R` e exportada no
  `data.json`; o D3 só lê `meta.paleta[profundidade]`, nunca embute um
  hexadecimal próprio.
- **Problema**: ao dar zoom numa bolha, as outras (fora do foco) vazam pra
  fora do card do gráfico. **Por quê**: o SVG dos gráficos do site nasce com
  `overflow: visible` por padrão (pensado pra rótulo de rede não cortar na
  borda), e as bolhas fora do foco do zoom recebem coordenadas bem fora do
  `viewBox` enquanto ficam "escondidas" atrás da bolha ampliada.
  **Solução**: sobrescrever `overflow: hidden` direto no `<svg>` deste
  gráfico.
- **Problema**: a raiz escondida (nível 0) aparece como um círculo visível de
  cor sólida. **Por quê**: a técnica antiga (herdada do widget) era pintar a
  raiz da mesma cor do fundo — o que quebra em qualquer fundo que não seja
  exatamente aquela cor (ex: modo escuro). **Solução**: no D3, a raiz
  simplesmente não é desenhada (`root.descendants().filter(d => d.depth > 0)`)
  — ela continua ocupando espaço no layout, mas nunca vira um `<circle>` na
  tela, então não depende de acertar nenhuma cor de fundo.

## Variações possíveis

- Mostrar a raiz em vez de escondê-la, com uma cor própria — útil quando o
  total geral também for uma informação relevante.
- Adicionar rótulos de texto nos círculos maiores (`geom_node_text()`), em
  vez de depender só da cor e do tooltip da versão interativa.
- Limitar a profundidade exibida (ex: só até gênero, sem descer a título)
  quando a hierarquia for grande demais pra caber legível de uma vez.
- Trocar por um treemap quando o espaço em branco entre círculos for um
  problema — mesma lógica de hierarquia + magnitude, sem desperdiçar área.
