---
title: "Linha do tempo densa: histórico de releases de um software"
category: timeline
date: 2026-09-02
source: "https://r-graph-gallery.com/web-time-line-with-ggplot2.html (domínio bloqueado nesta sessão; URL não conferida) — técnica de empacotamento vem de ggbeeswarm, não da página original"
interactive: true
resumo: "53 versões de um software fictício entre 2022 e 2024, empacotadas num enxame ao longo de um único eixo de tempo — dezenas de eventos sem colidir, sem esconder nenhum."
veredito_uso: "você tem DEZENAS de eventos discretos com data e precisa ver tanto o padrão geral quanto rajadas de atividade concentrada."
veredito_evita: "menos de 20 eventos — a linha do tempo de marcos desta mesma categoria já resolve isso sem precisar de zoom."
pacotes: ["ggplot2", "ggbeeswarm"]
dados: "1 data + 1 rótulo + 1 tipo por evento (dezenas de linhas, não poucas)"
nivel: intermediário
tags: ["temporal", "eventos", "densidade", "zoom"]
---

## O que é

Uma variação da linha do tempo pensada pra volume: em vez de alternar rótulo
acima/abaixo de um eixo (que só cabe bem com poucos eventos), cada ponto é
empacotado num **enxame** — desviado na vertical só o suficiente pra não
colidir com o vizinho mais próximo no tempo. A posição vertical não
significa nada por si só; a posição horizontal (a data) continua sendo o
único dado real. **Para que serve**: mostrar dezenas de eventos discretos
de uma vez, revelando tanto o ritmo geral quanto **rajadas** — vários
eventos concentrados numa janela curta — que uma lista ou um eixo simples
esconderiam.

## Quando usar (e quando evitar)

**Use quando** você tem dezenas de eventos com data (releases de software,
tickets fechados, posts publicados) e quer ver tanto a visão geral quanto
os agrupamentos densos sem cortar nenhum evento de fora.

**Evite quando** você tem poucos eventos (menos de ~20) — a [linha do tempo
de marcos](../linha-do-tempo-startup-ficticia) desta mesma categoria já
resolve isso de forma mais simples, sem precisar de zoom nem de
empacotamento. Também evite se cada evento tem **duração** (início e fim)
em vez de ser um instante — aí o gráfico certo é o
[Gantt](../cronograma-lancamento-app).

## Como ler o gráfico

- **Posição horizontal**: a data real do release — a única posição que
  carrega dado.
- **Posição vertical (dentro do enxame)**: só existe pra separar pontos
  que colidiriam na mesma data aproximada — não codifica nada.
- **Cor**: o tipo do release.

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#2B5B7A"></span> Major — mudança grande, quebra compatibilidade</div>
  <div><span class="swatch" style="background:#4F9A8B"></span> Minor — funcionalidade nova, compatível</div>
  <div><span class="swatch" style="background:#C9A24B"></span> Patch — correção pequena de rotina</div>
  <div><span class="swatch" style="background:#B34747"></span> Hotfix — correção emergencial fora do ciclo normal</div>
</div>

- **Rótulo com o número da versão**: só aparece perto de cada ponto quando
  poucos releases estão visíveis ao mesmo tempo (zoom suficiente) — com
  dezenas visíveis de uma vez, o rótulo de todos ao mesmo tempo viraria
  ilegível, então a densidade em si (quantos pontos, quão perto) é o que se
  lê primeiro.
- **Faixa compacta abaixo**: o histórico inteiro em miniatura, sempre no
  mesmo zoom — arraste sobre ela pra selecionar um intervalo e ampliar o
  painel principal.

## Como foi feito

**Estático**: `ggbeeswarm::geom_beeswarm()` desenha o empacotamento —
truque de eixo invertido: o pacote espera um eixo categórico (aqui, uma
única categoria "todos" pra todo mundo) e um eixo de valor contínuo
preservado exatamente (aqui, a data); o empacotamento acontece no eixo
categórico, que `coord_flip()` depois deita, fazendo o eixo com sentido
real (tempo) ficar horizontal como em qualquer outro gráfico desta
categoria.

**Dado fictício**: histórico de releases de um software entre 2022 e 2024
(53 no total) — 4 versões *major* cadenciadas ao longo dos 3 anos, e uma
**rajada de 5 hotfixes em 9 dias** logo após o `v2.0.0`, simulando um
lançamento com bug sério que precisou de correção emergencial dia sim, dia
não. Essa rajada é escrita à mão, não sorteada — é o próprio motivo de a
técnica de empacotamento existir: numa linha do tempo comum, 5 eventos tão
próximos colidiriam num ponto só. As *minor* (16) e *patch* (28) restantes
vêm de sorteio (`set.seed(9102)`) espalhado pelos 3 anos, com patch bem
mais frequente que minor — cadência típica de um projeto de software real.

**Na versão interativa**: a posição vertical do estático (calculada pelo
`ggbeeswarm`) **não** é reaproveitada — o D3 recalcula seu próprio
empacotamento (algoritmo de camadas por colisão, mesmo princípio já usado
na linha-do-tempo-startup-ficticia, mas sem lado fixo: aqui a própria
densidade local decide quantas camadas cada ponto precisa). Isso é
necessário porque o layout depende do **zoom atual** — quantos pontos
cabem visíveis muda a cada vez que o usuário arrasta a faixa de seleção, e
o empacotamento é refeito nesse momento. Zoom via `d3.brushX()` sobre uma
faixa de contexto (mesmo padrão já usado na série temporal com dygraphs
deste acervo) — arrastar seleciona um intervalo, duplo clique no painel
principal volta pro histórico inteiro.

## Possíveis problemas pelo caminho

- **Problema**: `ggbeeswarm::geom_beeswarm()` não aceita eixo X contínuo
  (data) com jitter no Y diretamente. **Por quê**: o pacote foi desenhado
  pra distribuição categórica (violino/enxame por grupo), sempre
  empacotando no eixo categórico. **Solução**: inverter os papéis —
  `aes(x = "todos", y = data)` com uma única categoria constante, depois
  `coord_flip()` pra devolver o tempo ao eixo horizontal.

## Variações possíveis

- Empacotar por linha de tipo (uma faixa horizontal por categoria major/
  minor/patch/hotfix) em vez de um enxame único, quando comparar o ritmo
  entre categorias importa mais do que ver o volume total combinado.
- Trocar o duplo clique de reset por um botão explícito "Ver tudo",
  quando o público-alvo não tiver o hábito de duplo clique como gesto de
  navegação (ex: dispositivos majoritariamente touch).
- Colorir a faixa de contexto por densidade (heatmap de contagem) em vez
  de pontos individuais, útil quando o total de eventos crescer a ponto
  de nem os pontos pequenos da faixa caberem sem sobrepor.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../linha-do-tempo-startup-ficticia" style="--cat-link: var(--cat-timeline); --cat-link-ink: var(--cat-timeline-ink);">
    <span class="parecido-cat">timeline</span>
    <span class="parecido-titulo">Linha do tempo: marcos de uma startup fictícia</span>
    <span class="parecido-razao">A mesma pergunta (quando cada coisa aconteceu) resolvida sem empacotamento nem zoom — a escolha certa quando os eventos são poucos.</span>
  </a>
</div>

## Notas do coletor

<div class="pull-quote">a posição vertical do estático não é reaproveitada — o D3 recalcula seu próprio empacotamento a cada zoom</div>

A parte mais fácil deste gráfico foi a mais óbvia (colorir por tipo,
desenhar círculos); a parte que exigiu mais decisão foi o que **não**
tentar sincronizar entre estático e interativo. Os outros dois gráficos
desta categoria seguem à risca a regra de "a cor/layout nasce uma vez no R
e nunca é recalculada no D3" — aqui essa regra some de propósito pra
posição vertical, porque ela nunca teve um único valor certo: o
`ggbeeswarm` empacota pensando no PNG estático (1500px, todos os 53 pontos
de uma vez); a versão interativa precisa reempacotar a cada nível de zoom,
já que o número de pontos visíveis — e portanto quantas camadas cabem —
muda a cada arrasto da faixa de seleção. Tentar herdar a posição do R
teria sido tanto impossível (o R não sabe em que zoom o usuário vai
parar) quanto sem propósito (a posição vertical nunca foi dado, só
anti-colisão).

A rajada de hotfixes foi a única parte dos dados escrita à mão em vez de
sorteada, pelo mesmo motivo que outras rajadas isoladas já registradas
neste acervo (o recesso de julho do calendário de commits, a sobreposição
proposital do Gantt): um sorteio puramente aleatório produz aglomerados
por acaso, às vezes, sem nada específico pra ensinar sobre quando eles
importam — aqui ela existe justamente pra dar ao empacotamento algo
resistente pra revelar.
