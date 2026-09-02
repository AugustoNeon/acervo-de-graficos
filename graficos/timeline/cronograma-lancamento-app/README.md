---
title: "Cronograma de lançamento de um app (Gantt)"
category: timeline
date: 2026-09-01
source: "https://r-graph-gallery.com/web-gantt-chart-with-ggplot2.html (domínio bloqueado nesta sessão; URL não conferida)"
interactive: true
resumo: "Doze tarefas do lançamento de um app entre janeiro e junho de 2024, cada uma com início e fim — a sobreposição entre fases vizinhas é o próprio ponto do gráfico, não um efeito colateral. Um botão revela as setas de dependência entre tarefas por cima do calendário."
veredito_uso: "cada item tem duração (início e fim), e ver o que roda em paralelo ou se atrasa é o que importa."
veredito_evita: "seus eventos são instantes sem duração — aí é a linha do tempo de marcos, o outro gráfico desta categoria."
pacotes: ["ggplot2"]
dados: "1 início + 1 fim + 1 fase por tarefa (lista de tarefas com duração, não instantes)"
nivel: básico
tags: ["temporal", "projeto", "planejamento", "gantt"]
---

## O que é

Um Gantt desenha cada tarefa de um projeto como uma barra horizontal entre a
data de início e a de fim, empilhadas por ordem cronológica. **Para que
serve**: mostrar não só quando cada tarefa acontece, mas **o que roda em
paralelo com o quê** — duas barras que se sobrepõem no eixo X estão
acontecendo ao mesmo tempo, e é essa sobreposição, impossível de ver numa
lista com datas, que o gráfico existe pra revelar.

## Quando usar (e quando evitar)

**Use quando** cada item do seu dado tem **duração** — início e fim —, não
um instante só: tarefas de um projeto, fases de uma obra, um cronograma de
contratação.

**Evite quando** cada evento é um ponto único no tempo, sem duração
nenhuma — aí o gráfico certo é a [linha do tempo de
marcos](../linha-do-tempo-startup-ficticia) já publicada nesta mesma
categoria: alternar rótulo acima/abaixo de um eixo só faz sentido pra
instantes, e forçar uma barra de duração zero não mostra nada.

- Poucas dezenas de tarefas cabem bem numa lista vertical simples como esta.
  Com centenas, vale agrupar por fase em vez de listar tarefa por tarefa, ou
  o eixo Y fica maior que a tela.

## Como ler o gráfico

- **Posição horizontal da barra**: início e fim reais da tarefa — o
  comprimento da barra é a duração.
- **Cor**: a fase do projeto (planejamento, design, desenvolvimento,
  lançamento) — tarefas da mesma fase têm a mesma cor em todo o gráfico.
- **Losango**: um marco de duração zero (ex: "lançamento público", um dia
  só) — não dá pra desenhar como barra sem largura, então vira um ponto.
- **Duas barras lado a lado no eixo X**: estão rodando ao mesmo tempo — é a
  leitura que só um Gantt entrega de cara.
- **Seta curva (só na versão interativa, atrás do botão "Mostrar
  dependências")**: liga o fim de uma tarefa ao início da que depende dela —
  não é o mesmo que "vem antes no calendário", é uma relação real
  (o backend precisa existir antes da integração de pagamento rodar em
  cima dele, por exemplo).

## Como foi feito

**Estático**: `geom_segment()` com `linewidth` grande e `lineend = "round"`
desenha cada barra (não `geom_rect()`/`geom_col()` — sem altura de barra
proporcional a nenhum valor, um segmento espesso já basta e evita ter que
inventar um `ymin`/`ymax` por tarefa). O marco de duração zero vira
`geom_point(shape = 18)` (losango) num data frame separado, porque um
segmento de comprimento zero não desenha nada visível. `factor(..., levels
= rev(...))` ordena o eixo Y cronologicamente de baixo pra cima.

**Dado fictício**: 12 tarefas do lançamento de um app entre janeiro e junho
de 2024, agrupadas em 4 fases, com sobreposição proposital entre fases
vizinhas (o design começa antes do planejamento terminar, o marketing
começa antes do QA terminar) — sem essa sobreposição o gráfico teria a
mesma informação de uma lista ordenada por data, e a razão de ser de um
Gantt é justamente mostrar o que uma lista não mostra.

**Cor por fase**: calculada uma única vez em R (`cor_fase`, um vetor
nomeado) e exportada em `meta.cores` no `data.json` — a versão interativa
nunca recalcula nem reordena essas cores, pra estático e interativo nunca
discordarem de qual cor é cada fase.

**Na versão interativa**: apontar ou clicar qualquer barra (ou a legenda de
fase) acende todas as tarefas daquela fase e apaga o resto — a fase é o
agrupamento que interessa comparar, não a tarefa isolada. A entrada anima
as barras crescendo da esquerda pra direita em ordem cronológica de início,
mesmo gesto do outro gráfico da categoria.

Um botão ("Mostrar dependências") revela uma camada de setas curvas ligando
o fim de uma tarefa ao início da que depende dela — 12 relações reais
definidas à mão (não derivadas da proximidade de datas: duas tarefas
vizinhas no calendário podem só estar rodando em paralelo, sem uma depender
da outra). A camada fica **oculta por padrão**, de propósito: o estado
inicial do widget precisa continuar idêntico ao `output.png`, e 12 setas
cruzando 12 barras por cima da leitura de sobreposição — que já é o ponto
central deste gráfico — viraria ruído se ligada sem pedir.

## Possíveis problemas pelo caminho

- **Problema**: um marco de duração zero (início = fim) não aparece no
  gráfico. **Por quê**: `geom_segment()`/uma barra com `xend == x` tem
  largura zero — existe geometricamente, mas não ocupa nenhum pixel.
  **Solução**: separar os dados em dois grupos (barras com duração > 0,
  marcos com duração = 0) e desenhar os marcos como ponto (losango), não
  como barra.
- **Problema**: acentos saem corrompidos no `output.png` ou no `data.json`
  nesta máquina. **Por quê**: a sessão R roda em locale `C` puro (ASCII),
  sem suporte a UTF-8. **Solução**: `Sys.setlocale("LC_CTYPE", "C.utf8")`
  no início do script — já registrado em "Lições aprendidas" do projeto
  em 2026-09-01. Neste gráfico em particular os nomes de tarefa
  foram escritos sem acento (ASCII puro) por precaução extra, mas a
  correção de locale continua no script porque qualquer edição futura do
  dado pode reintroduzir acento sem avisar.

## Variações possíveis

- Adicionar uma linha vertical de "hoje" fixa, útil quando o cronograma
  representa um projeto em andamento, não um histórico já fechado como
  este.
- Agrupar as barras em facetas por fase em vez de cor, quando o número de
  fases crescer o bastante pra cor sozinha não separar bem visualmente.
- Colorir por responsável/equipe em vez de por fase, quando o que importa
  comparar é carga de trabalho por pessoa, não progresso por etapa.
- Filtrar a camada de dependências por tarefa (mostrar só as setas que
  entram/saem da tarefa apontada), útil quando o número de relações
  crescer o bastante pra 12 setas ficarem visualmente densas demais mesmo
  com o botão.

## Notas do coletor

<div class="pull-quote">a sobreposição entre fases vizinhas é o próprio ponto do gráfico, não um efeito colateral</div>

Esta é a segunda entrada da categoria `timeline`, e a primeira decisão foi
justamente **o que não repetir** do primeiro gráfico (linha de marcos
pontuais): lá cada evento é um instante sem duração, e o desafio era caber
rótulos sem sobrepor; aqui cada tarefa tem começo e fim, e o desafio virou
outro — mostrar sobreposição de forma legível, não escondê-la. As datas
foram escritas à mão, não sorteadas, com sobreposição deliberada entre
fases vizinhas (design/planejamento, marketing/QA): um sorteio aleatório
de datas dentro de cada fase produziria sobreposição às vezes, por acaso,
e o gráfico não teria nada de específico pra ensinar sobre quando ela
importa.

O marco de duração zero ("lançamento público", início = fim) foi separado
das barras normais desde a primeira versão do script — um `geom_segment()`
com `xend == x` tem comprimento zero e não ocupa nenhum pixel, então
tentar desenhar as 12 linhas do mesmo jeito deixaria essa em particular
invisível, sem erro nem aviso nenhum (o mesmo tipo de "sumiço silencioso"
sem sinal de erro que outros gráficos desta categoria já registraram pra
locale/formatação). Vale conferir, em qualquer Gantt novo, se algum item
tem início igual a fim antes de escolher a geometria — só depois disso dá
pra decidir se um separa ou não em dois grupos.

**2026-09-02**: evoluído a pedido do usuário com uma camada de dependências
entre tarefas. A parte que exigiu mais cuidado não foi desenhar a seta, foi
decidir **quais pares de tarefas de fato têm uma**: duas tarefas vizinhas
no calendário (ex: "Wireframes" terminando perto de "Design visual"
começar) não implicam dependência real só por estarem perto — a lista de
12 relações foi escrita à mão como uma decisão de negócio (o que
literalmente precisa existir antes de outra coisa rodar em cima), não
derivada de proximidade de datas. A camada nasce oculta e só liga por um
botão, pela mesma razão que motivou registrar isso aqui: um Gantt já expõe
sobreposição como o próprio ponto do gráfico, e uma segunda camada de 12
setas cruzando as barras por cima, ligada sem pedir, competiria com essa
leitura em vez de complementá-la.
