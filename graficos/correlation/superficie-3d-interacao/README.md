---
title: "Superfície 3D de interação (rgl)"
category: correlation
date: 2026-08-18
source: "https://r-graph-gallery.com/167-animated-3d-plot-imagemagick.html"
interactive: true
resumo: "Uma superfície contínua ligando duas variáveis a um resultado, com a cor reforçando a altura — gire pra ver se elas interagem."
veredito_uso: "você tem um resultado contínuo em função de duas variáveis, e o que importa é a FORMA da relação."
veredito_evita: "uma das variáveis é categórica, ou o destino é só uma imagem fixa impressa."
pacotes: ["rgl", "RColorBrewer"]
dados: "2 variáveis numéricas contínuas (grade) + 1 resultado calculado pra cada combinação"
nivel: avançado
tags: ["3D", "correlação", "interação"]
---

## O que é

Uma superfície 3D contínua: em vez de pontos isolados, o gráfico desenha uma
"folha" ligando duas variáveis numéricas (eixos X e Y) a um resultado (altura,
eixo Z) para cada combinação possível das duas. A cor reforça a altura, do
mesmo jeito que um mapa topográfico usa cor pra reforçar elevação. **Para que
serve**: mostrar como um resultado responde a *duas* variáveis ao mesmo
tempo — e, principalmente, se elas **interagem** (o efeito de uma muda
dependendo do valor da outra) ou agem de forma independente.

## Quando usar (e quando evitar)

**Use quando** você tem (ou calculou, por exemplo a partir de um modelo de
regressão) um resultado numérico contínuo em função de duas variáveis
numéricas contínuas, e o que importa é a *forma* da relação — não só se ela é
positiva ou negativa, mas se é plana (efeitos independentes) ou torcida
(interação).

**Evite quando** uma das variáveis é categórica (nesse caso, várias linhas 2D
coloridas por categoria comunicam melhor que uma superfície) ou quando o
destino for só uma imagem fixa impressa — mesmo problema de qualquer 3D
estático: um ângulo de câmera mal escolhido esconde justamente a curvatura
que você quer mostrar.

## Que dados você precisa

- **duas variáveis numéricas contínuas** — os dois eixos da base da superfície
- **uma função (ou modelo) que calcule um resultado** pra cada combinação das
  duas — aqui, uma grade regular cobrindo o intervalo de interesse

Formato: uma **grade completa** (todo valor de X combinado com todo valor de
Y), não uma amostra dispersa de observações — a função espera um valor de
altura por célula da grade, organizado como matriz.

## Como ler o gráfico

- **Eixos X/Y (base)**: as duas variáveis de entrada
- **Eixo Z (altura)**: o resultado
- **Cor**: reforça a altura — mais escuro/avermelhado é mais alto, mais claro/
  amarelado é mais baixo

Se a superfície fosse um plano perfeitamente reto, as duas variáveis teriam
efeitos independentes (a contribuição de uma não muda com o valor da outra):
qualquer torção visível na malha é a interação entre elas.

<div class="pull-quote pull-quote-direita clearfix">qualquer torção visível na malha é a interação entre elas</div>

Vale girar a versão interativa: de um ângulo a superfície pode parecer quase
plana, e de outro a torção fica óbvia — a miniatura estática mostra só um
ângulo fixo.

## Como foi feito

**Superfície**: `rgl::persp3d()` desenha a partir de dois vetores (os eixos)
e uma **matriz** de alturas — um valor por célula da grade, mesmo formato que
a função `persp()` do R base espera. A cor de cada célula vem de uma paleta
sequencial (`RColorBrewer::brewer.pal(9, "YlOrRd")`) mapeada pela própria
altura e aplicada como matriz de cores (`col = ...`).

**Malha**: uma linha por linha e por coluna da grade (`lines3d()`), desenhada
por cima da superfície colorida — reproduz o efeito de "superfície com
grade" sem depender do pacote do exemplo original.

**Dado fictício**: rendimento de uma safra (sacas/ha) em função de
fertilizante (kg/ha) e irrigação (mm/semana), com um termo de interação
propositalmente embutido entre os dois (`set.seed(714)`), no lugar da
superfície matemática sem contexto do exemplo original.

**Na versão interativa**: reaproveita exatamente a mesma cena (mesmos dados,
mesma cor, mesmo ângulo inicial) — `rglwidget()` converte pra WebGL, dando
controle de rotação de verdade. No lugar de uma animação pré-gravada
(quadros PNG num GIF, girando sempre no mesmo caminho fixo), dá pra girar
pra qualquer ângulo, parar, dar zoom — mais informação com menos peça móvel.

## Possíveis problemas pelo caminho

- **Problema**: a superfície sai quase preta, sem mostrar a paleta de cores.
  **Por quê**: com a superfície vista quase de perfil, o sombreamento
  especular padrão do `rgl` escurece boa parte da área visível, mascarando a
  cor real de cada célula. **Solução**: usar `specular = "black"` pra tirar o
  brilho especular, e escolher um ângulo de câmera que mostre a superfície de
  frente o bastante pra cor aparecer.
- **Problema**: a superfície parece um plano fino, quase de lado. **Por
  quê**: o ângulo inicial da câmera pode alinhar a linha de visão quase
  paralela à superfície, escondendo a curvatura inteira. **Solução**: testar
  o ângulo *padrão* do `rgl` (sem `view3d()` customizado) antes de tentar
  ajustar manualmente — neste gráfico o padrão já mostrava a superfície de um
  ângulo razoável, e um ajuste manual mal calculado piorou o resultado.
- **Problema**: a matriz de cores sai desalinhada da superfície depois de
  `cut()`. **Solução**: reconstrua a matriz de cores explicitamente com
  `matrix(paleta[faixa], nrow = nrow(z))` — a história completa está em
  "Notas do coletor", no fim da página.
- **Problema**: o script trava ou falha tentando abrir uma janela gráfica.
  **Por quê**: sem `options(rgl.useNULL = TRUE)` antes de `library(rgl)`, o
  pacote espera um dispositivo OpenGL real, que não existe num `Rscript`
  não-interativo. **Solução**: sempre definir essa opção primeiro — mesmo
  padrão já usado no outro gráfico `rgl` deste acervo.

## Variações possíveis

- Trocar os coeficientes lineares/de interação por um modelo de regressão de
  verdade ajustado nos próprios dados (`predict()` numa grade de valores), em
  vez de uma fórmula inventada.
- Sobrepor uma segunda superfície semitransparente pra comparar dois
  cenários (por exemplo, com e sem alguma intervenção).
- Reduzir a resolução da grade (menos pontos por eixo) se a superfície ficar
  pesada demais pra girar suavemente no navegador.
- Cortar a superfície num plano horizontal (mostrando só onde o resultado
  passa de um limite) pra destacar uma faixa de interesse específica, em vez
  da superfície inteira.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../dispersao-3d-cafes" style="--cat-link: var(--cat-correlation); --cat-link-ink: var(--cat-correlation-ink);">
    <span class="parecido-cat">correlation</span>
    <span class="parecido-titulo">Dispersão 3D de cafés especiais (rgl)</span>
    <span class="parecido-razao">Mesma técnica (rgl, mesmo modo headless, mesma armadilha de legenda) — mas pontos discretos de observações reais em vez de uma superfície contínua calculada.</span>
  </a>
  <a class="parecido-item" href="../../distribution/superficie-3d-densidade" style="--cat-link: var(--cat-distribution); --cat-link-ink: var(--cat-distribution-ink);">
    <span class="parecido-cat">distribution</span>
    <span class="parecido-titulo">Superfície 3D de densidade (plotly + MASS::kde2d)</span>
    <span class="parecido-razao">O mesmo formato — superfície 3D colorida por altura — noutro pacote (plotly) e outro domínio: densidade de uma distribuição, não interação entre variáveis.</span>
  </a>
</div>

## Notas do coletor

A matriz de cores saía desalinhada da superfície depois de um `cut()`
aparentemente inofensivo — células que deveriam ser vermelho-escuras (pico
alto) apareciam amarelo-claras, e vice-versa, espalhadas sem padrão óbvio
pela grade. O código parecia direto: cortar a matriz de altura em faixas e
mapear cada faixa pra uma cor da paleta.

O problema é que `cut()` trata a matriz de entrada como um **vetor simples**
— o resultado sai igualmente na forma de vetor, sem a dimensão (linhas ×
colunas) original da grade. Reatribuir esse vetor direto como se ainda fosse
a matriz de cores desalinha tudo, porque a correspondência célula a célula
se perde no meio do caminho, mesmo com a contagem de valores batendo.

A correção foi reconstruir a matriz explicitamente depois do `cut()`
(`matrix(paleta[faixa], nrow = nrow(z))`) — a ordem dos valores (coluna a
coluna) é a mesma nos dois lados, então reconstruir com a dimensão certa
recupera a correspondência. Vale desconfiar de qualquer operação do R que
"achata" uma matriz sem avisar — `cut()`, `sapply()`, `unlist()` fazem isso
com frequência, e o resultado continua tendo o número certo de valores, só
não a forma certa.
