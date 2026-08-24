---
title: "Nuvem de palavras: avaliações de um app"
category: ranking
date: 2026-08-24
source: "https://r-graph-gallery.com/wordcloud.html"
interactive: true
resumo: "46 termos fictícios extraídos de avaliações de um app bancário, com o tamanho de cada palavra pela frequência de menção."
pacotes: ["wordcloud", "RColorBrewer"]
dados: "1 variável textual (palavra) + 1 numérica (frequência)"
nivel: básico
tags: ["interativo", "texto", "frequência"]
---

## O que é

Uma nuvem de palavras posiciona um conjunto de termos livremente no espaço,
com o tamanho de cada palavra proporcional à sua frequência (quantas vezes
ela aparece num texto ou conjunto de textos). **Para que serve**: dar uma
primeira impressão rápida de quais termos dominam um corpo de texto — é
essencialmente um ranking (a pergunta é "quais palavras aparecem mais"),
só que lido pelo tamanho da fonte em vez de pela altura de uma barra.

## Quando usar (e quando evitar)

**Use quando** o objetivo é uma visão geral rápida e informal de um texto
— feedback de usuários, respostas abertas de uma pesquisa, título de
notícias — e o público entende que é uma leitura de impressão, não de
precisão.

**Evite quando** a comparação exata entre frequências importa: o olho
humano compara ÁREA de texto pior do que compara comprimento de barra, e
palavras com número de letras diferente do mesmo tamanho de fonte ocupam
áreas visuais bem diferentes — duas palavras com frequência parecida podem
parecer bem diferentes em "peso visual" só por uma ser mais longa que a
outra. Pra qualquer leitura onde a ordem exata ou a diferença precisa entre
os itens importa, um barplot horizontal ordenado por frequência comunica
melhor. Evite também com texto não tratado (plural/singular, maiúsculas,
palavras de função como "de"/"que"/"o" sem filtrar) — a nuvem amplifica
ruído de limpeza de texto tanto quanto sinal real.

## Que dados você precisa

- **palavra** — o termo em si (já normalizado: minúsculo, sem pontuação,
  singular quando fizer sentido, palavras de função já removidas)
- **frequência** — quantas vezes aquele termo aparece

Formato esperado: uma linha por palavra ÚNICA, já contada — não é o texto
corrido, é a tabela de frequência derivada dele (tipicamente calculada com
alguma ferramenta de processamento de texto antes de chegar no gráfico).

## Como ler o gráfico

- **Tamanho da palavra**: frequência de menção — quanto maior, mais vezes
  apareceu no texto de origem.
- **Cor**: nesta versão, o sentimento associado à palavra (positivo,
  negativo ou neutro) — não é um padrão universal de nuvem de palavras, é
  uma escolha específica deste gráfico (a versão clássica costuma colorir
  só pela própria frequência, sem uma dimensão a mais).
- **Posição/rotação**: não codificam nada — são só o resultado de um
  algoritmo de encaixe tentando aproveitar o espaço sem sobrepor palavras.

## Como foi feito

`wordcloud::wordcloud()` calcula o próprio layout (posicionamento em
espiral a partir do centro, com detecção de colisão pra não sobrepor
palavras) e desenha direto — não existe um parâmetro pra pedir o resultado
sem desenhar. `scale` controla o tamanho da maior/menor palavra,
`rot.per` a fração de palavras giradas 90°.

Dados fictícios: frequência de 46 termos comuns em avaliações de um app
bancário fictício (`set.seed(6289)`), seguindo uma distribuição tipo Zipf
(poucas palavras muito frequentes, cauda longa de palavras citadas poucas
vezes — o padrão estatístico real de frequência de palavras em texto
livre), com cada termo também classificado manualmente como
positivo/negativo/neutro.

A versão interativa NÃO reaproveita o layout do R (ele não é exportável) —
calcula o próprio, do zero, com o pacote `d3-cloud` (mesma família de
algoritmo: espiral + detecção de colisão), o mesmo princípio de "layout caro
recalculado no navegador em vez de exportado do R" já usado nos gráficos de
rede deste acervo. Passar o cursor numa palavra apaga as outras 45; clicar
num sentimento na legenda isola aquele grupo.

## Possíveis problemas pelo caminho

- **Problema**: um campo extra e inesperado (`_row`) aparece em cada
  entrada do JSON exportado, sem ter sido pedido em lugar nenhum do código.
  **Por quê**: indexar um vetor NOMEADO por um vetor de chaves
  (`vetor_nomeado[chaves]`) preserva os nomes originais do vetor no
  resultado; ao virar coluna de um `data.frame`, esses nomes grudam como
  `row.names`, que o `jsonlite` exporta como um campo `_row` extra.
  **Solução**: `unname()` no resultado antes de montar o `data.frame`,
  sempre que uma coluna vier de indexar um vetor nomeado por outro vetor.
- **Problema**: duas palavras de tamanho de fonte muito diferente (uma
  gigante, outra minúscula) parecem representar uma diferença de
  frequência muito maior do que a real. **Por quê**: a percepção de
  "quanto maior" cresce mais devagar que o tamanho da fonte em si (o mesmo
  princípio por trás de "escalar bolha por área, não por raio", só que
  aqui aplicado a texto). **Solução**: não usar uma escala linear direta
  entre frequência e tamanho da fonte — comprimir a faixa (por exemplo com
  raiz quadrada) evita que a palavra mais frequente pareça
  desproporcionalmente dominante.

## Variações possíveis

- Nuvem de palavras COMPARATIVA (`comparison.cloud()` no pacote
  `wordcloud`): duas cores/metades, uma por grupo, mostrando quais termos
  são exclusivos ou muito mais frequentes num grupo do que no outro — útil
  pra comparar feedback de dois produtos ou dois períodos de tempo.
- Colorir pela própria frequência (escala sequencial) em vez de por uma
  variável categórica externa — a abordagem mais comum quando não há uma
  segunda dimensão categórica disponível nos dados.
- Trocar o texto livre por n-gramas (pares ou trios de palavras, tipo "não
  funciona" ou "muito lento") em vez de palavras isoladas — captura frases
  com sentido próprio que uma palavra sozinha perde.
