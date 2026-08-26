---
title: "Pequenos múltiplos: receita por categoria"
category: comparison
date: 2026-08-25
source: "https://r-graph-gallery.com/web-area-chart-with-small-multiple.html"
interactive: true
resumo: "A mesma evolução de receita mensal por categoria, lida painel por painel em vez de empilhada — cada categoria com sua própria escala."
veredito_uso: "o que importa é a trajetória de cada categoria (sobe, desce, estabiliza), não o total somado."
veredito_evita: "o total somado das categorias também importa — aí uma área empilhada resolve melhor."
pacotes: ["ggplot2", "dplyr"]
dados: "1 variável de tempo + 1 categórica + 1 numérica"
nivel: básico
tags: ["área", "facetas", "small multiples"]
---

## O que é

Pequenos múltiplos (small multiples) é uma grade de gráficos idênticos em
estrutura — mesmo tipo de gráfico, mesmos eixos — um por categoria de uma
variável, em vez de sobrepor ou empilhar todas as categorias num único
painel. **Para que serve**: comparar a forma da evolução de vários grupos ao
longo do tempo sem que a leitura de um grupo dependa de onde os outros estão
desenhados.

## Quando usar (e quando evitar)

**Use quando** você tem várias séries temporais (ou categorias) e o que
importa é a trajetória de cada uma — sobe, desce, estabiliza, muda de
direção — mais do que o valor exato acumulado num instante.

**Evite quando** o total somado das categorias também importa (ex: receita
total da empresa mês a mês) — nesse caso um gráfico de área empilhada
resolve melhor, porque a soma das alturas fica visível de uma vez. Também
evite com dezenas de categorias: a grade fica pequena demais pra ler cada
painel.

## Que dados você precisa

- **variável de tempo** — um ponto por período (aqui, um mês)
- **variável categórica** — o que separa os painéis (aqui, categoria de
  produto)
- **variável numérica** — o valor plotado em cada painel (aqui, receita)

Formato longo/tidy: uma linha por combinação de categoria e período. É o
mesmo formato exigido por um gráfico de área empilhada — a diferença está
inteira na forma de desenhar, não no dado.

## Como ler o gráfico

- **Posição horizontal**: o mês, igual em todos os painéis.
- **Posição vertical**: o valor da categoria daquele painel — **a escala
  muda de painel pra painel**, ajustada ao alcance de cada categoria.
- **Cor**: uma cor por categoria, só pra reforçar a separação visual — não
  codifica nenhuma informação adicional, já que cada categoria já tem seu
  próprio painel.

<div class="pull-quote pull-quote-direita clearfix">não dá pra comparar a altura entre dois painéis</div>

Como cada painel tem sua própria escala vertical, isso vale mesmo que os dois
pareçam do mesmo tamanho — pra saber qual categoria vale mais é preciso olhar
o número no eixo de cada um, não a altura da curva.

## Como foi feito

`ggplot2::facet_wrap(~categoria, scale = "free_y")` desenha um painel por
nível da variável categórica automaticamente, e o `scale = "free_y"` deixa
cada painel calcular seu próprio domínio no eixo Y — sem isso, o painel de
menor magnitude (aqui, "Marketplace") ficaria achatado perto do zero,
esmagado pela escala da categoria maior.

Dados fictícios: a mesma receita mensal de um SaaS fictício, por categoria
de produto, ao longo de 24 meses, já usada no gráfico de área empilhada
deste acervo — de propósito, pra comparar lado a lado a mesma evolução lida
das duas formas. Cada categoria segue uma tendência própria (uma em queda,
duas em crescimento em ritmos diferentes, uma estável) mais ruído aleatório.

## Possíveis problemas pelo caminho

- **Problema**: esquecer `scale = "free_y"` (ou deixar o padrão `"fixed"`).
  **Por quê**: todos os painéis dividem o mesmo eixo Y, calculado pelo maior
  valor entre todas as categorias. **Solução**: categorias de menor
  magnitude ficam visualmente achatadas, mesmo tendo uma trajetória
  interessante — ajuste pra `"free_y"` quando o objetivo for comparar forma,
  não valor absoluto.
- **Problema**: a versão interativa e a estática divergirem de cor.
  **Solução**: a paleta é definida uma única vez no `script.R` (`cores`) e
  exportada como parte do `data.json`, alimentando as duas versões a partir
  da mesma fonte.

## Variações possíveis

- Trocar `scale = "free_y"` por `"fixed"` quando a comparação de valor
  absoluto entre categorias importar mais do que a forma de cada trajetória.
- Aumentar `ncol`/`nrow` do `facet_wrap` pra reorganizar a grade quando o
  número de categorias mudar.
- Combinar com uma linha de referência (média geral, meta) repetida em todos
  os painéis, pra dar um ponto de comparação comum apesar da escala livre.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../../evolution/area-receita-saas-ficticio" style="--cat-link: var(--cat-evolution); --cat-link-ink: var(--cat-evolution-ink);">
    <span class="parecido-cat">evolution</span>
    <span class="parecido-titulo">Área sobreposta, empilhada e empilhada 100%</span>
    <span class="parecido-razao">O oposto direto, de propósito: o mesmo dado exato, lido empilhado em vez de painel por painel — aqui o total importa, ali é a trajetória de cada categoria.</span>
  </a>
</div>

## Notas do coletor

Este gráfico usa exatamente o mesmo dado fictício da área empilhada deste
acervo — mesmos 24 meses, mesmas quatro categorias, mesmos valores. Não foi
economia de trabalho: foi decisão deliberada, pra que os dois gráficos
respondessem à mesma pergunta de formas diferentes e desse pra comparar as
duas leituras lado a lado, com a certeza de que qualquer diferença percebida
vem da técnica, não do dado.

Isso também expôs o problema que `scale = "free_y"` resolve: com a mesma
escala pra todos os painéis (o padrão do `facet_wrap`), a categoria
"Marketplace" — a de menor magnitude — ficava achatada perto do zero,
esmagada pela escala da categoria maior, mesmo tendo uma trajetória de
crescimento tão real quanto as outras. A escala livre por painel é o que
faz "pequenos múltiplos" cumprir a proposta de comparar forma, não valor.
