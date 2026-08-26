---
title: "Dispersão 3D de cafés especiais (rgl)"
category: correlation
date: 2026-07-27
source: "https://r-graph-gallery.com/3d_scatter_plot.html"
interactive: true
resumo: "Três variáveis numéricas ao mesmo tempo, posicionadas nos três eixos de um cubo, coloridas por grupo."
veredito_uso: "há exatamente três variáveis numéricas cuja relação conjunta importa, e dá pra girar o gráfico."
veredito_evita: "o destino é uma imagem fixa — profundidade 3D é ilusão de perspectiva, e um ângulo ruim esconde o padrão."
pacotes: ["rgl", "png", "htmltools"]
dados: "3 variáveis numéricas + 1 variável categórica de grupo"
nivel: intermediário
tags: ["3D", "correlação"]
---

## O que é

Um gráfico de dispersão que usa os três eixos de um cubo em vez dos dois de um
plano — cada ponto é posicionado por três coordenadas numéricas ao mesmo tempo, e
a cor marca um grupo categórico.

**Para que serve**: enxergar a relação entre três variáveis numéricas de uma vez,
em vez de precisar de três gráficos de dispersão em pares. É especialmente útil
quando os grupos formam regiões separadas no espaço tridimensional — algo que às
vezes só aparece quando as três dimensões são combinadas, e não em nenhum par
isolado.

## Quando usar (e quando evitar)

**Use quando** houver exatamente três variáveis numéricas cuja relação conjunta
importa, e uma variável categórica para colorir os grupos. Funciona bem como
etapa exploratória — gire o gráfico e verifique se os grupos realmente se separam
ou só parecem separados de um ângulo específico.

**Evite quando** o destino for uma imagem fixa: qualquer gráfico 3D estático sofre
do mesmo problema — profundidade é ilusão de perspectiva, e um ângulo mal escolhido
esconde justamente a separação que você quer mostrar. Evite também com mais de
três variáveis (nesse caso, um gráfico de pares ou uma redução de dimensionalidade
comunica melhor) e com poucos pontos (a nuvem fica esparsa demais para sugerir
qualquer estrutura).

## Que dados você precisa

- **Três variáveis numéricas contínuas** — uma para cada eixo.
- **Uma variável categórica** — usada para colorir os pontos por grupo.

Uma linha por observação. Não há exigência de os grupos terem o mesmo tamanho,
mas grupos muito desbalanceados tornam a comparação visual mais difícil.

## Como ler o gráfico

- **Três eixos do cubo**: cada um representa uma variável.
- **Posição de um ponto**: o valor das três variáveis para aquela observação.
- **Cor**: o grupo.

A leitura principal é sobre **agrupamento espacial**: se pontos da mesma cor
ocupam uma região distinta do cubo, as três variáveis juntas separam os grupos
bem — mesmo que duas delas isoladas não bastassem.

Arraste para girar e use a roda do mouse para aproximar. Isso importa de verdade
aqui: um ângulo específico pode esconder justamente a separação entre grupos que
você está procurando — a miniatura estática mostra só um ângulo fixo.

## Como foi feito

**Cena**: `rgl::plot3d()` recebe três vetores numéricos e desenha o cubo com
os pontos posicionados e coloridos por grupo. Cada observação é uma esfera de
verdade (`type = "s"`, com `radius` controlando o tamanho) em vez de um
marcador achatado — isso dá sombreamento e reflexo de luz reais, que mudam
conforme o ângulo, reforçando a sensação de profundidade ao girar.

**Modo headless**: o script roda sem janela gráfica real (`Rscript`
não-interativo), então é preciso `options(rgl.useNULL = TRUE)` antes de
carregar o pacote — troca o dispositivo por um renderizador nulo que ainda
produz a cena corretamente, só sem abrir janela na tela. A legenda não usa a
função nativa `legend3d()` por causa desse mesmo modo — a história completa
está em "Notas do coletor".

**Dado fictício**: avaliação sensorial de cafés especiais — acidez, corpo e
doçura (escala 0–10) — por nível de torra (`set.seed(3005)`), 30 observações
por grupo, com médias diferentes por torra seguindo uma tendência real do
mundo do café (torras claras mais ácidas e menos encorpadas, torras escuras o
oposto), embora os números em si sejam inventados.

**Na versão interativa**: `rgl::rglwidget()` converte a mesma cena num widget
WebGL, sem duplicar dado nem código. A legenda, de novo, não pode usar
`legend3d()` — vira uma lista HTML simples ao lado do widget, montada com
`htmltools`. O canvas WebGL nasce com largura fixa em pixels e não se adapta
ao espaço disponível; uma regra CSS (`max-width: 100%`) resolve, e o próprio
motor de renderização recalcula a resolução interna sozinho.

## Possíveis problemas pelo caminho

- **Problema**: o script trava, ou tenta abrir uma janela gráfica e falha. **Por
  quê**: o `rgl` por padrão espera um dispositivo gráfico real (OpenGL). **Solução**:
  definir `options(rgl.useNULL = TRUE)` antes de `library(rgl)` — troca para um
  renderizador que funciona sem tela.

- **Problema**: `legend3d()` não aparece nem na imagem final nem no widget.
  **Solução**: compor a legenda por fora da cena 3D — a história completa
  está em "Notas do coletor", no fim da página.

- **Problema**: o ângulo da câmera esconde o padrão principal, ou pontos de
  grupos diferentes parecem misturados. **Por quê**: a posição inicial de
  `plot3d()` é arbitrária, e a separação real pode existir escondida naquele
  ângulo específico. **Solução**: ajuste com `view3d(theta, phi)` antes do
  `snapshot3d()`, ou gire a versão interativa antes de concluir que os
  grupos não se separam.

- **Problema**: o widget aparece cortado, com barra de rolagem horizontal.
  **Por quê**: o canvas WebGL herda um tamanho fixo em pixels do dispositivo
  `rgl` original. **Solução**: force `max-width: 100%` no canvas via CSS — o
  motor de renderização recalcula a resolução sozinho.

## Variações possíveis

- Ajustar `radius` e adicionar transparência (`alpha`) quando as esferas se
  sobrepuserem muito.
- Voltar para marcadores simples (`type = "p"`) quando o volume de pontos for
  grande — esferas custam mais para renderizar que pontos achatados.
- Usar `type = "h"` (hastes até a base) quando o interesse for a "altura" de cada
  ponto em relação ao plano, não só a nuvem de pontos.
- Trocar pontos por superfícies de contorno (`persp3d()`), quando o interesse for
  uma função contínua em vez de observações discretas.
- Adicionar uma quarta dimensão via tamanho do ponto, mapeando uma variável extra.
- Girar e capturar vários ângulos como pequenos múltiplos, quando uma imagem
  estática for realmente necessária e nenhum ângulo único bastar.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="bolhas-investimento-startups" style="--cat-link: var(--cat-correlation); --cat-link-ink: var(--cat-correlation-ink);">
    <span class="parecido-cat">correlation</span>
    <span class="parecido-titulo">Bubble chart: investimento x crescimento x porte</span>
    <span class="parecido-razao">O oposto direto: a mesma necessidade de mostrar três variáveis numéricas, resolvida com tamanho de bolha num plano 2D em vez de um eixo Z de verdade.</span>
  </a>
  <a class="parecido-item" href="superficie-3d-interacao" style="--cat-link: var(--cat-correlation); --cat-link-ink: var(--cat-correlation-ink);">
    <span class="parecido-cat">correlation</span>
    <span class="parecido-titulo">Superfície 3D de interação (rgl)</span>
    <span class="parecido-razao">Mesma técnica (rgl, mesmo modo headless, mesmas armadilhas de legenda) — mas uma superfície contínua no lugar de pontos discretos.</span>
  </a>
</div>

## Notas do coletor

`legend3d()` simplesmente não aparecia — nem erro, nem aviso, o overlay de
legenda ficava ausente do `snapshot3d()` final, como se a chamada nunca
tivesse acontecido. A causa é uma limitação conhecida do mecanismo de
composição de overlay do `rgl` (`bgplot3d()`): ele depende de capturar e
recompor a cena internamente, e isso falha silenciosamente no renderizador
nulo que o modo headless exige.

A correção foi parar de pedir pro `rgl` desenhar a legenda, e desenhá-la por
fora dele. Pra imagem estática: `snapshot3d()` captura só a cena 3D pra um
arquivo temporário, esse arquivo é reaberto com `png::readPNG()` +
`rasterImage()` dentro de um device `png()` normal do R base, e uma legenda
comum (`legend()`) é desenhada por cima. Pra versão interativa, o mesmo
princípio vira uma lista HTML simples ao lado do widget WebGL, montada com
`htmltools`, em vez de dentro da cena. As duas soluções são a mesma ideia —
a legenda nunca mora dentro do que o `rgl` renderiza — e viraram o padrão
pra qualquer gráfico deste acervo que precise de legenda em modo headless.
