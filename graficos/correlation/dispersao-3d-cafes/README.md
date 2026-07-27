---
title: "Dispersão 3D de cafés especiais (rgl)"
category: correlation
date: 2026-07-27
source: "https://r-graph-gallery.com/3d_scatter_plot.html"
interactive: false
resumo: "Três variáveis numéricas ao mesmo tempo, posicionadas nos três eixos de um cubo, coloridas por grupo."
pacotes: ["rgl", "png"]
dados: "3 variáveis numéricas + 1 variável categórica de grupo"
nivel: intermediário
tags: ["estático", "3D", "correlação"]
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
etapa exploratória, sobretudo na versão interativa (que permite girar e checar se
os grupos realmente se separam ou só parecem separados de um ângulo).

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

Como esta é a versão estática, a câmera está fixa num ângulo padrão: parte da
estrutura pode estar escondida atrás de outros pontos. É exatamente essa
limitação que motiva a versão interativa, adicionada em seguida.

## Como foi feito

O gráfico vem de `rgl::plot3d()`, que recebe três vetores numéricos e desenha o
cubo com os pontos posicionados e coloridos por grupo.

Uma particularidade deste ambiente: o script roda sem uma janela gráfica real
(`Rscript` não-interativo), então é preciso `options(rgl.useNULL = TRUE)` antes de
carregar o pacote — isso troca o dispositivo gráfico por um renderizador nulo que
ainda produz a cena corretamente, só sem abrir janela na tela.

A legenda não usa a função nativa `legend3d()`: em modo headless ela não aparece
no resultado exportado. A solução foi compor a imagem em duas etapas — primeiro
`snapshot3d()` captura só a cena 3D para um arquivo temporário, depois esse
arquivo é reaberto como imagem e uma legenda comum (`legend()`, do R base) é
desenhada por cima, gerando o `output.png` final.

Dados fictícios: avaliação sensorial de cafés especiais — acidez, corpo e doçura
(escala 0–10) — por nível de torra (`set.seed(3005)`), 30 observações por grupo.
Os valores foram gerados com médias diferentes por torra, seguindo uma tendência
real do mundo do café (torras claras tendem a ser mais ácidas e menos encorpadas,
torras escuras o oposto), embora os números em si sejam inventados.

## Possíveis problemas pelo caminho

- **Problema**: o script trava, ou tenta abrir uma janela gráfica e falha. **Por
  quê**: o `rgl` por padrão espera um dispositivo gráfico real (OpenGL). **Solução**:
  definir `options(rgl.useNULL = TRUE)` antes de `library(rgl)` — troca para um
  renderizador que funciona sem tela.

- **Problema**: `legend3d()` não aparece na imagem final. **Por quê**: a função
  depende de capturar e re-compor a cena internamente, algo que falha no
  renderizador nulo. **Solução**: compor a legenda manualmente por cima do
  `snapshot3d()`, com `rasterImage()` + `legend()` do R base.

- **Problema**: o ângulo da câmera esconde o padrão principal. **Por quê**: a
  posição inicial de `plot3d()` é arbitrária. **Solução**: ajustar com
  `view3d(theta, phi)` antes do `snapshot3d()`, ou usar a versão interativa e
  girar manualmente até o ângulo certo.

- **Problema**: os pontos de um grupo ficam visualmente misturados com outro.
  **Por quê**: pode ser que a separação real exista, mas fique escondida naquele
  ângulo específico. **Solução**: girar o gráfico (na versão interativa) antes de
  concluir que os grupos não se separam.

## Variações possíveis

- Ajustar `size` e adicionar transparência (`alpha`) quando os pontos se
  sobrepuserem muito.
- Trocar pontos por superfícies de contorno (`persp3d()`), quando o interesse for
  uma função contínua em vez de observações discretas.
- Adicionar uma quarta dimensão via tamanho do ponto, mapeando uma variável extra.
- Girar e capturar vários ângulos como pequenos múltiplos, quando uma imagem
  estática for realmente necessária e nenhum ângulo único bastar.
