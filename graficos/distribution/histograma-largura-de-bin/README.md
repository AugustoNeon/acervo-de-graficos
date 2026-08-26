---
title: "Histograma: largura de bin variável"
category: distribution
date: 2026-08-20
source: "https://r-graph-gallery.com/220-basic-ggplot2-histogram.html"
interactive: true
resumo: "Idade dos participantes de uma corrida de bairro fictícia, com um controle deslizante pro número de bins — mostra como poucos bins escondem os dois grupos etários e bins demais viram ruído."
veredito_uso: "você quer entender a forma de UMA variável numérica antes de qualquer outra análise."
veredito_evita: "precisa comparar várias categorias ao mesmo tempo — histogramas sobrepostos ficam ilegíveis rápido."
pacotes: ["ggplot2", "patchwork", "RColorBrewer", "jsonlite", "d3"]
dados: "1 variável numérica contínua, uma observação por participante"
nivel: básico
tags: ["distribuição"]
---

## O que é

Um histograma divide uma variável numérica contínua em faixas de valor
(bins) de largura igual e conta quantas observações caem em cada uma,
desenhando essa contagem como a altura de uma barra. **Para que serve**:
a primeira pergunta que se faz de qualquer variável numérica nova — "que
forma essa distribuição tem? onde ela se concentra? tem mais de um grupo
misturado aqui?"

## Quando usar (e quando evitar)

**Use quando** quiser entender a forma de uma única variável numérica antes
de qualquer outra análise — é geralmente o primeiro gráfico que se faz de um
dado novo. Também serve pra decidir se faz sentido tratar a variável como
normal, assimétrica, ou (como neste gráfico) uma mistura de grupos
diferentes.

**Evite quando** precisar comparar várias categorias ao mesmo tempo — vários
histogramas sobrepostos ficam ilegíveis rápido; um
[boxplot](../boxplot-classico) ou um [violino](../violino-e-boxplot) resolve
melhor esse caso. Evite também confiar demais numa única largura de bin: como
este gráfico mostra na prática, a MESMA distribuição pode parecer unimodal
ou bimodal dependendo só de quantos bins você escolheu — sempre vale testar
mais de uma largura antes de tirar conclusão.

## Que dados você precisa

- **uma variável numérica contínua** — uma linha por observação (aqui, a
  idade de cada participante).

Não precisa de variável categórica nenhuma — ao contrário da maioria dos
outros gráficos de `distribution` deste acervo, o histograma clássico
descreve uma distribuição só, não compara grupos.

## Como ler o gráfico

- **Barras**: altura = quantos participantes caem naquela faixa de idade.
- **Curva por cima**: densidade estimada da mesma distribuição (KDE) — não
  muda de forma quando você mexe no controle, só de escala (pra continuar do
  tamanho certo em relação ao eixo Y, que muda com o número de bins).
  Comparar a curva (fixa na forma) com as barras (que mudam) é o ponto do
  gráfico.
- **Controle deslizante**: arraste pra mudar o número de bins — poucos bins
  (esquerda) fundem os dois grupos etários numa forma só; muitos bins
  (direita) fragmentam os dados em ruído.

<div class="pull-quote">as barras são só uma forma, entre várias possíveis, de resumir a mesma distribuição</div>

Passe o cursor sobre uma barra pra ver a faixa de idade exata e quantos
participantes caem nela.

## Como foi feito

A miniatura estática é um poster com três larguras de bin fixas
(`geom_histogram(bins = 5/18/60)`) sobre o mesmo dado — cada painel
corresponde a uma posição aproximada do controle da versão interativa.

A versão interativa usa `d3.bin()` pra recalcular os bins a cada movimento do
controle, sobre os valores brutos exportados pelo R (nenhuma contagem
pré-calculada). A curva de densidade usa a mesma função de KDE gaussiano
(`shared/densidade.ts`) já compartilhada entre o
[ridgeline](../ridgeline-avaliacoes-bairros) e o
[violino](../violino-e-boxplot) deste acervo — calculada uma vez só (não
depende do slider); o que muda a cada arrasto é só o fator que converte
densidade em "contagem esperada por bin" (`densidade × n × largura do bin
atual`), pra ela continuar na mesma escala do eixo Y.

Ao contrário dos outros switchers deste acervo, as barras não usam chave
estável entre posições do slider — a história de por que está em "Notas do
coletor".

Dados fictícios: idade de 300 participantes de uma corrida de bairro
fictícia (`set.seed(918)`), misturando de propósito uma categoria infantil
(90 participantes, 6–16 anos) e uma categoria adulta (210 participantes,
18–70 anos) — o exemplo clássico de por que a largura do bin importa: os
dois grupos só aparecem separados numa faixa intermediária de bins.

## Possíveis problemas pelo caminho

- **Problema**: com poucos bins (controle todo pra esquerda), a curva de
  densidade fica visivelmente mais alta que qualquer barra. **Por quê**: a
  curva é normalizada pela largura de bin ATUAL, mas o pico da densidade
  real (perto dos participantes infantis, um grupo estreito e concentrado)
  é mais agudo do que um bin largo consegue capturar — a barra "achata" um
  pico que a curva continua mostrando fielmente. **Solução**: nenhuma — é o
  comportamento correto, e reforça visualmente o ponto do gráfico (a barra
  perde informação que a curva preserva).

## Variações possíveis

- Densidade em vez de contagem no eixo Y (`after_stat(density)`) — deixa a
  curva e as barras na mesma escala sempre, sem precisar do fator de
  conversão.
- Regra automática de bins (Freedman-Diaconis, Sturges) marcada com uma linha
  vertical no controle, pra mostrar onde a heurística "recomendada" cairia.
- Histograma + rug plot (marcas na base pra cada observação individual),
  útil quando a amostra é pequena o bastante pra não poluir.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../boxplot-classico" style="--cat-link: var(--cat-distribution); --cat-link-ink: var(--cat-distribution-ink);">
    <span class="parecido-cat">distribution</span>
    <span class="parecido-titulo">Boxplot clássico: cinco variações</span>
    <span class="parecido-razao">O oposto direto pra comparar grupos: o histograma mostra a forma de UMA distribuição em detalhe, o boxplot resume MUITAS de uma vez, perdendo forma pra ganhar comparabilidade.</span>
  </a>
  <a class="parecido-item" href="../ridgeline-avaliacoes-bairros" style="--cat-link: var(--cat-distribution); --cat-link-ink: var(--cat-distribution-ink);">
    <span class="parecido-cat">distribution</span>
    <span class="parecido-titulo">Ridgeline plot</span>
    <span class="parecido-razao">Mesma curva de densidade (literalmente o mesmo código, `shared/densidade.ts`), mas empilhada pra comparar vários grupos em vez de mostrar os bins de um só.</span>
  </a>
</div>

## Notas do coletor

Todo outro gráfico deste acervo que tem um controle de estado (trocar
ordem, alternar codificação) segue a mesma regra: cada elemento visual
ganha uma chave estável, e o D3 anima a MUDANÇA daquele elemento — a mesma
barra encolhendo, o mesmo ponto deslizando pra nova posição. É o que faz as
transições parecerem contínuas em vez de a tela inteira piscar.

Neste gráfico, tentar aplicar a mesma regra não fazia sentido. Mover o
controle de número de bins muda os LIMITES de cada bin — a barra que hoje
representa "20 aos 25 anos" pode não ter equivalente nenhum na próxima
posição do slider, porque a faixa "20 aos 25" simplesmente deixa de existir
quando o número de bins muda. Não existe "a mesma barra mudando de forma"
pra animar, porque as barras de antes e depois nem descrevem a mesma
pergunta.

A solução foi aceitar isso: as barras entram e saem pelo enter/exit comum
do D3, indexadas só por posição, sem chave estável nenhuma. A transição
fica mais abrupta que nos outros switchers do site, mas de propósito — é
a diferença real entre "o mesmo dado com uma codificação diferente" (onde
a barra de antes tem um equivalente exato depois) e "uma reagregação do
dado bruto" (onde não tem). Forçar continuidade visual aqui seria mentir
sobre o que realmente mudou.
