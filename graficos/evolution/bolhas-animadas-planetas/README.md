---
title: "Bolhas animadas (estilo Gapminder)"
category: evolution
date: 2026-08-18
source: "https://r-graph-gallery.com/271-ggplot2-animated-gif-chart-with-gganimate.html"
interactive: true
resumo: "Doze planetas fictícios avançando ano a ano — posição, tamanho e cor mudando juntos pra contar a história completa de uma vez."
pacotes: ["ggplot2", "RColorBrewer", "jsonlite", "d3"]
dados: "1 identificador + 1 categórica (grupo) + 3 numéricas (2 de posição + 1 de tamanho), repetidas por período de tempo"
nivel: avançado
tags: ["interativo", "animação", "evolução", "bolhas"]
---

## O que é

Um gráfico de dispersão em que cada bolha se move, cresce ou encolhe ao longo
do tempo — codificando posição X, posição Y, tamanho e cor de uma vez, com o
tempo como uma quinta dimensão. **Para que serve**: contar uma história de
mudança pra vários itens ao mesmo tempo — não só "o que mudou", mas como
diferentes grupos evoluíram em ritmos e direções diferentes.

## Quando usar (e quando evitar)

**Use quando** você tem itens (pessoas, empresas, países, neste caso
planetas) medidos em pelo menos duas variáveis numéricas ao longo de várias
janelas de tempo, e quer mostrar tanto o estado num momento quanto a
trajetória. Funciona melhor com relativamente poucos itens — dezenas, não
milhares — senão as bolhas se sobrepõem demais pra acompanhar.

**Evite quando** só um instante importa (nesse caso uma dispersão comum já
resolve, sem a complexidade extra) ou quando o destino for só uma imagem
impressa — um quadro congelado perde justamente a interatividade que faz esse
formato valer a pena: pausar, comparar dois anos específicos, isolar um
grupo.

## Que dados você precisa

- **identificador** — o item (aqui, o planeta)
- **categórica de grupo** — vira a cor (aqui, o setor galáctico)
- **duas variáveis numéricas contínuas** — posição X e Y
- **uma terceira variável numérica** — o tamanho da bolha
- **uma variável de tempo** (ano, mês, período) — quando cada combinação de
  valores foi medida

Formato longo: uma linha por item × período.

## Como ler o gráfico

- **Posição X/Y**: as duas variáveis principais
- **Tamanho da bolha**: a terceira variável
- **Cor**: o grupo
- **Movimento entre anos**: a trajetória de cada item — pra onde ele está
  indo, não só onde está agora

Vale acompanhar bolhas individuais entre anos tanto quanto olhar o conjunto
de uma vez — um padrão de grupo (um setor inteiro subindo junto) só aparece
observando várias bolhas da mesma cor ao mesmo tempo, algo que a legenda
(isolando um setor) ajuda a enxergar.

## Como foi feito

No exemplo original, `gganimate::transition_time()` interpola os dados entre
os anos observados e renderiza cada quadro intermediário, empacotando tudo
num GIF com `gifski`. Aqui a mesma ideia — interpolar posição e tamanho entre
estados — é feita pelas próprias `.transition()` do D3 no navegador: não
precisa pré-renderizar nenhum quadro, e quem vê o gráfico controla a
velocidade e a direção em vez de assistir um loop fixo.

O botão de reproduzir usa um `setInterval` simples que avança o índice do
ano e redesenha; ele para sozinho se a régua for arrastada manualmente, e o
script cuida de nunca deixar dois timers rodando ao mesmo tempo (necessário
porque o gráfico pode ser redesenhado por trás quando a janela é
redimensionada, e um timer esquecido do desenho anterior dobraria a
velocidade do play).

Dados fictícios: 12 planetas em 4 setores galácticos, com índice tecnológico,
expectativa de vida dos colonos e população geradas por um crescimento
composto ano a ano mais um pequeno ruído acumulado (pra a trajetória parecer
orgânica, não uma reta perfeita), `set.seed(2094)` — no lugar do dataset real
do Gapminder (países/continentes/PIB per capita/expectativa de vida real) do
exemplo original. A miniatura estática usa pequenos múltiplos (6 anos
amostrados) em vez de congelar um único ano — do contrário a imagem parada
perderia a própria ideia de "evolução" que o gráfico existe pra mostrar.

## Possíveis problemas pelo caminho

- **Problema**: o play "acelera" depois de a janela ser redimensionada.
  **Por quê**: cada redesenho do gráfico (inclusive por resize) roda o
  código do zero, incluindo o `setInterval` do play — sem parar o anterior,
  dois ou mais ficam avançando o ano ao mesmo tempo. **Solução**: guardar a
  referência do timer num lugar que sobrevive ao redesenho (o próprio
  elemento raiz do gráfico) e limpar explicitamente no início de cada
  desenho novo.
- **Problema**: bolhas de população baixa somem ou ficam pequenas demais pra
  clicar. **Por quê**: uma escala de raio proporcional à área (`scaleSqrt`) é
  a correta estatisticamente, mas comprime bastante os valores baixos perto
  de zero. **Solução**: um raio mínimo garante que toda bolha continue
  visível e clicável, mesmo a menor população do conjunto.
- **Problema**: sem escala logarítmica, todos os planetas ficam amontoados
  num canto do eixo X. **Por quê**: crescimento composto (multiplicativo)
  produz valores que se espalham em ordens de grandeza, não em intervalos
  regulares. **Solução**: escala logarítmica no eixo X, mesma técnica do
  exemplo original.

## Variações possíveis

- Trocar o agrupamento por setor por outra categórica, reagrupando as cores
  sem mudar mais nada.
- Pequenos múltiplos por grupo em vez de por ano (a segunda técnica do
  exemplo original) — um painel por setor, todos animando o mesmo intervalo
  de anos ao mesmo tempo, pra comparar ritmos entre grupos lado a lado.
- Adicionar uma trilha (linha fina atrás da bolha) mostrando o caminho
  percorrido nos últimos anos, não só a posição atual.
- Deixar a velocidade do play ajustável, em vez de um intervalo fixo.
