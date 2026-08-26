---
title: "Dispersão conectada: preço x assinantes"
category: evolution
date: 2026-08-25
source: "https://r-graph-gallery.com/connected-scatterplot.html"
interactive: true
resumo: "Preço médio da assinatura e número de assinantes de um streaming fictício, ano a ano, conectados em ordem cronológica."
veredito_uso: "a relação entre duas variáveis muda de direção ao longo do tempo — há reversões que valem destacar."
veredito_evita: "a relação é simples e monotônica — as duas variáveis só crescem juntas, sem reversão."
pacotes: ["ggplot2", "ggrepel", "dplyr"]
dados: "1 variável de tempo + 2 numéricas"
nivel: intermediário
tags: ["dispersão", "série temporal"]
---

## O que é

Uma dispersão conectada é um gráfico de dispersão comum — duas variáveis
numéricas, uma em cada eixo — com uma diferença: os pontos são ligados por
uma linha na ordem de uma terceira variável, geralmente tempo. **Para que
serve**: mostrar como a *relação* entre duas variáveis evolui, em vez de só
mostrar cada variável evoluindo separadamente. Onde um gráfico de linha
comum precisaria de dois eixos Y pra contar essa história, a dispersão
conectada usa só a posição dos pontos e a ordem do traço.

## Quando usar (e quando evitar)

**Use quando** a relação entre duas variáveis muda de direção ao longo do
tempo — períodos em que elas sobem juntas, depois um período em que uma
sobe enquanto a outra cai. É nesses momentos de reversão que a técnica
compensa o esforço de leitura extra que ela exige.

**Evite quando** a relação é simples e monotônica (as duas variáveis só
crescem juntas, sem reversão) — nesse caso a linha conectada só adiciona
ruído visual a uma dispersão comum, ou pior ainda, dois gráficos de linha
separados já contam a história com menos esforço de leitura.

## Que dados você precisa

- **variável de tempo** — define a ordem em que os pontos são ligados (não
  precisa aparecer num eixo do gráfico)
- **duas variáveis numéricas** — uma pra cada eixo

Formato longo/tidy: uma linha por período de tempo, com as duas variáveis
numéricas já na mesma linha (não é preciso pivotar).

## Como ler o gráfico

- **Posição**: o valor das duas variáveis naquele momento, como numa
  dispersão comum.
- **A linha que liga os pontos**: a ordem cronológica — não existe eixo de
  tempo explícito, a sequência é a própria história.
- **Cor do ponto**: gradiente do início ao fim do período, um reforço visual
  pra direção do tempo (do azul pro laranja), redundante com os rótulos de
  ano.
- **Pontos onde o caminho muda de direção**: o que vale mais atenção.

<div class="pull-quote pull-quote-direita clearfix">é onde a relação entre as duas variáveis mudou de regime</div>

## Como foi feito

A técnica é `geom_path()` por cima de um `geom_point()` comum —
`ggrepel::geom_text_repel()` posiciona os rótulos de ano só nos pontos de
virada, sem sobrepor os pontos vizinhos. A escolha entre `geom_path()` e o
`geom_line()` mais comum não é estética — ver "Notas do coletor".

Dados fictícios: preço médio e número de assinantes de um serviço de
streaming fictício, ano a ano entre 2009 e 2024, construídos à mão (não só
tendência + ruído) pra desenhar de propósito uma reversão: uma guerra de
preços em 2014-2016 que dispara a base de assinantes, uma recuperação
gradual de preço com a base ainda crescendo, e um reajuste forte em
2023-2024 que estagna o crescimento — o tipo de relação não-monotônica que
fica escondida se preço e assinantes forem olhados cada um no seu próprio
gráfico de linha.

## Possíveis problemas pelo caminho

- **Problema**: o gráfico vira um emaranhado de linhas cruzando o próprio
  caminho, difícil de seguir. **Por quê**: acontece quando os dados têm
  muitos pontos ou muitas reversões pequenas (ruído), não só as reversões
  que importam. **Solução**: suavizar a série (média móvel) antes de
  desenhar, ou reduzir a granularidade temporal (de mensal pra trimestral,
  por exemplo).
- **Problema**: sem nenhuma pista de direção, o leitor não sabe por qual
  ponta o caminho começa. **Solução**: rotular pelo menos o primeiro e o
  último ponto (ou, como aqui, usar uma escala de cor que varie do início ao
  fim do período).

## Variações possíveis

- Adicionar uma seta (`arrow = arrow(...)` dentro do `geom_path()`) em cada
  segmento, reforçando a direção sem depender só da cor ou dos rótulos —
  usado na versão estática deste gráfico.
- Facetar por uma variável categórica adicional, uma dispersão conectada por
  painel, quando houver mais de uma série pra comparar.
- Trocar a linha reta entre pontos por uma curva suavizada
  (`geom_path(..., lineend = "round")` combinado com interpolação), quando o
  objetivo for enfatizar a tendência geral em vez do valor exato de cada
  ano.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../serie-temporal-customizada-dygraphs" style="--cat-link: var(--cat-evolution); --cat-link-ink: var(--cat-evolution-ink);">
    <span class="parecido-cat">evolution</span>
    <span class="parecido-titulo">Série temporal interativa customizada</span>
    <span class="parecido-razao">O oposto direto quando a relação é monotônica: duas séries temporais comuns contam a história com menos esforço de leitura do que uma dispersão conectada.</span>
  </a>
</div>

## Notas do coletor

A escolha entre `geom_path()` e `geom_line()` parece um detalhe de
nomenclatura, mas é o tipo de troca que quebra o gráfico inteiro em
silêncio se sair errada. `geom_line()` **reordena os pontos pelo eixo X**
antes de desenhar a linha — é o comportamento certo pra um gráfico de linha
comum, onde X é tipicamente o eixo que já está em ordem. `geom_path()` liga
os pontos exatamente na ordem em que aparecem no dado, sem reordenar nada.

Neste gráfico, a ordem que importa é a cronológica, não a ordem crescente
de preço (o eixo X). Usar `geom_line()` por engano não geraria erro nenhum
— o R desenharia uma linha perfeitamente válida, só que conectando os anos
na ordem errada, por preço crescente em vez de por ano. O gráfico pareceria
correto pra quem não conhece os dados de cor, e a história de "guerra de
preços em 2014" que os dados foram desenhados pra contar simplesmente
desapareceria, substituída por um emaranhado sem sentido cronológico.

A regra prática: sempre que a ordem de desenho for uma variável que NÃO é
nenhum dos dois eixos (aqui, o tempo), `geom_path()` é a escolha — 
`geom_line()` só quando a própria ordem do eixo X for a ordem certa de
ligar os pontos.
