---
title: "Área sobreposta, empilhada e empilhada 100%"
category: evolution
date: 2026-08-24
source: "https://r-graph-gallery.com/136-stacked-area-chart.html"
interactive: true
resumo: "Como a receita mensal de um SaaS fictício, decomposta em 4 categorias de produto, evolui ao longo de 24 meses — em três leituras diferentes do mesmo dado."
pacotes: ["ggplot2", "dplyr", "patchwork", "RColorBrewer"]
dados: "1 variável temporal (mês) + 1 categórica (categoria de produto) + 1 numérica (receita)"
nivel: básico
tags: ["temporal", "composição"]
---

## O que é

Um gráfico de área preenche o espaço entre uma linha e uma base (geralmente
zero) ao longo de um eixo contínuo — na prática, quase sempre o tempo.
**Para que serve**: mostrar a evolução de uma ou mais quantidades, com o
preenchimento reforçando visualmente a ideia de "volume acumulado" que uma
linha sozinha não transmite tão bem. Com várias categorias, o mesmo dado
aceita pelo menos três leituras diferentes — sobreposta, empilhada e
empilhada 100% — cada uma respondendo a uma pergunta distinta, reunidas
neste gráfico com um seletor.

## Quando usar (e quando evitar)

**Use a versão sobreposta quando** quiser comparar a trajetória de cada
categoria individualmente, sem se importar com o total. **Use a empilhada
quando** o total importa tanto quanto a composição — a altura do topo da
pilha já é a soma. **Use a 100% quando** só a proporção interessa, não o
volume absoluto — ótima pra revelar uma mudança de mix que o volume total
esconde (uma categoria pode crescer em volume e ainda assim perder
participação, se as outras crescerem mais rápido).

**Evite** a versão empilhada quando as categorias do meio da pilha
precisam ser comparadas entre si com precisão — só a categoria da base tem
uma linha de base reta (zero); todas as outras "flutuam" sobre uma linha de
base irregular, o que distorce a leitura visual da sua própria forma. Nesse
caso, a sobreposta (ou um small multiple) comunica melhor.

## Que dados você precisa

- **tempo** — variável temporal contínua (data, mês, ano...)
- **categoria** — variável categórica (uma cor/área por categoria)
- **valor** — variável numérica, uma medida por combinação tempo×categoria

Formato esperado: dado longo/tidy — uma linha por (tempo, categoria), não
uma coluna por categoria.

## Como ler o gráfico

- **Posição vertical / altura da faixa**: valor da categoria naquele
  instante — na sobreposta e na empilhada, em unidade real (R$ mil); na
  100%, em proporção do total daquele mês.
- **Cor**: identifica a categoria, consistente nos três estados.
- **Inclinação/forma ao longo do eixo X**: tendência daquela categoria no
  tempo — crescendo, caindo, estável.

## Como foi feito

`geom_area()` do `ggplot2` desenha as três variações com o mesmo dado,
mudando só o parâmetro `position`: `"identity"` (sobreposta, cada área com
sua própria base em zero e um pouco de transparência pra ver por baixo),
`"stack"` (empilhada, base zero cumulativa) e `"fill"` (empilhada 100%,
normalizada pro total de cada instante somar sempre 1). `RColorBrewer::brewer.pal(4,
"Dark2")` dá uma cor por categoria.

Dados fictícios: receita mensal de um SaaS fictício ao longo de 24 meses
(`set.seed(5566)`), decomposta em 4 categorias com tendências propositalmente
diferentes — assinaturas crescendo de forma constante, marketplace crescendo
rápido a partir de uma base pequena, consultoria em queda lenta, suporte
premium estável — pra que a leitura em proporção (100%) conte uma história
visivelmente diferente da leitura em volume (empilhada): o volume total só
sobe, mas a fatia de "Consultoria" encolhe visivelmente enquanto a de
"Marketplace" cresce.

A versão interativa recalcula o mesmo empilhamento em D3 (`d3.stack()`, com
`stackOffsetExpand` no estado percentual) e anima a transição entre os três
estados interpolando a posição em **pixel** de cada ponto — não a posição em
unidade de dado — porque os três estados usam escalas verticais com domínios
diferentes; interpolar em pixel é o que permite uma área ir suavemente de
"0 a 130" pra "45% a 100%" sem saltar no meio da transição.

## Possíveis problemas pelo caminho

- **Problema**: a legenda sai duplicada no painel estático (8 itens em vez
  de 4). **Por quê**: o painel "sobreposta" usa transparência (`alpha`) nas
  áreas, o que muda a aparência dos ícones da legenda em relação aos outros
  dois painéis — o `patchwork` só une legendas que são visualmente
  idênticas. **Solução**: `guides(fill = guide_legend(override.aes =
  list(alpha = 1)))` no painel com transparência, forçando o ícone da
  legenda a ficar igual aos dos outros painéis.
- **Problema**: ao formatar ou comparar datas no eixo/tooltip, o mês
  aparece errado (ex: um ponto de agosto rotulado como julho). **Por quê**:
  uma data no formato `AAAA-MM-DD` sem fuso horário explícito é interpretada
  como meia-noite UTC; formatá-la no fuso local do navegador pode
  "escorregar" pro dia/mês anterior. **Solução**: usar `d3.scaleUtc()` (não
  `scaleTime()`) e sempre passar `timeZone: 'UTC'` em qualquer
  `toLocaleDateString()` do eixo ou do tooltip.

## Variações possíveis

- Suavizar as curvas com uma interpolação tipo `curveMonotoneX` em vez de
  linhas retas entre os meses — ajuda quando os dados são realmente
  contínuos (não apenas amostrados mês a mês).
- Trocar o eixo do tempo por qualquer outra variável ordenada contínua
  (idade, distância, versão de um produto) — a técnica não depende de ser
  tempo de verdade, só de um eixo com ordem e continuidade.
- Adicionar uma linha vertical de "hoje"/marco de referência cortando as
  áreas, útil quando parte da série é projeção e parte é realizado.
