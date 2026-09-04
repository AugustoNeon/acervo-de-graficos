---
title: "Bullet chart: painel de KPIs de suporte"
category: general
date: 2026-09-04
source: "https://r-graph-gallery.com/web-bullet-chart-with-ggplot2 (domínio bloqueado nesta sessão; URL não conferida)"
interactive: true
resumo: "6 KPIs de um time de suporte fictício, cada um com sua própria escala, valor atual e meta — a leitura é sempre a mesma pergunta: a barra passou do traço?"
veredito_uso: "você tem métricas com METAS explícitas (KPI, OKR) e quer ver de cara quem bateu a meta e quem não bateu, mesmo com unidades diferentes entre elas."
veredito_evita: "seus dados não têm uma meta de comparação — sem ela, o traço vertical (o próprio ponto do gráfico) não tem o que marcar, e um barplot comum já resolve."
pacotes: ["ggplot2"]
dados: "1 valor atual + 1 meta + 3 faixas de contexto qualitativo, por métrica (várias métricas, escalas independentes)"
nivel: intermediário
tags: ["kpi", "meta", "painel", "indicador"]
---

## O que é

Um bullet chart (criado por Stephen Few como alternativa mais densa e
honesta ao velocímetro/gauge) empilha uma linha por métrica, cada uma com
três camadas: uma faixa de fundo em tons de cinza marcando contexto
qualitativo (ruim/médio/bom), uma barra fina com o valor atual, e um
traço vertical marcando a meta. **Para que serve**: comparar várias
métricas de uma vez, cada uma com sua PRÓPRIA escala — não dá pra
comparar 82% de satisfação com 27 chamados/dia numa régua só, mas dá pra
comparar "os dois bateram a meta?" lado a lado.

## Quando usar (e quando evitar)

**Use quando** você tem métricas com meta explícita (KPI, OKR, SLA) e
quer que quem olhar veja em segundos quais bateram e quais não bateram —
um painel de controle, não uma exploração de dados.

**Evite quando** não existe meta nenhuma pra comparar — o traço vertical
é o próprio ponto do gráfico, e sem ele um bullet chart vira só uma barra
comum com fundo cinza decorativo. Também evite se as faixas
qualitativas (ruim/médio/bom) não fazem sentido pra métrica — nem toda
métrica tem um "intervalo aceitável" natural.

## Como ler o gráfico

- **Faixa de fundo (3 tons de cinza)**: contexto qualitativo da métrica —
  claro é a faixa mais fraca, escuro é a mais forte. Os limites são
  específicos de cada linha (a faixa "boa" de satisfação do cliente
  começa em 80%, a de chamados por agente/dia começa em 25 chamados).
- **Barra escura fina**: o valor atual.
- **Traço vertical**: a meta. Se a barra passa do traço, a meta foi
  batida; se não passa, ainda falta.
- **Eixo de cada linha**: sempre começa em 0, mas o valor máximo é
  diferente por linha — nunca compare o comprimento absoluto de duas
  barras de métricas diferentes, só compare cada barra com o próprio
  traço.

## Como foi feito

**Estático**: sem `geom_bullet()` pronto no `ggplot2`, cada camada é um
`geom_rect()`/`geom_segment()` desenhado à mão, com `facet_wrap(scales =
"free_x")` dando a cada KPI seu próprio eixo X independente — é
literalmente a definição de "cada linha tem sua escala" virando uma
opção do facet em vez de 6 gráficos separados montados manualmente.

**Dado fictício**: painel de 6 KPIs de suporte (satisfação, resolução no
primeiro contato, NPS, retenção, chamados por agente, SLA), com valor e
meta escritos à mão pra cobrir os três casos que um bullet chart existe
pra distinguir — bem abaixo da meta (NPS), perto dela (satisfação, SLA)
e já acima dela (retenção mensal).

**Na versão interativa**: cada linha recalcula sua própria escala em D3 a
partir de `Math.max(fimBom, valor, meta)`, e a margem esquerda (onde os
nomes dos KPIs ficam) é calculada medindo a largura real do rótulo mais
longo, não um número fixo. Tooltip mostra o valor exato, a meta e a
diferença entre eles (com seta pra cima/baixo). Entrada anima a barra
crescendo da esquerda e o traço da meta aparecendo logo depois, reforçando
a leitura "primeiro o valor, depois compare com a meta".

## Possíveis problemas pelo caminho

- **Problema**: `ggplot2` não tem uma geometria de bullet chart pronta.
  **Por quê**: é um tipo de gráfico de nicho (dashboards de KPI), sem
  demanda o bastante pra virar um `geom_*` de algum pacote popular.
  **Solução**: compor as três camadas manualmente com `geom_rect()` (faixas
  e barra) e `geom_segment()` (traço da meta), sobre `facet_wrap(scales =
  "free_x")` pra dar a cada linha sua própria escala sem código repetido.

## Variações possíveis

- Colorir a barra de valor por status (verde se bateu a meta, vermelho se
  não) em vez de uma cor única, quando o "sim/não bateu" importa mais do
  que comparar a magnitude entre KPIs diferentes.
- Adicionar uma segunda barra fina mostrando o valor do período anterior,
  pra comparar não só "bateu a meta" mas também "está melhorando".
- Ordenar as linhas por distância até a meta (quem está mais longe no
  topo) em vez de por uma ordem temática fixa, útil quando o painel serve
  pra priorizar o que atacar primeiro.

## Notas do coletor

<div class="pull-quote">a leitura é sempre a mesma pergunta: a barra passou do traço?</div>

Depois de duas sessões seguidas descobrindo a mesma classe de bug
(margem em unidade de desenho não acompanha texto em pixels reais — ver
os dois gráficos anteriores desta mesma categoria), este veio com a
margem esquerda já medida desde a primeira versão, não corrigida depois.
A diferença real de processo: em vez de "escrever, testar, descobrir que
vazou, corrigir", a pergunta "esse texto vai crescer pra fora de alguma
margem?" agora entra na hora de desenhar o gráfico, não na hora de
verificar ele.
