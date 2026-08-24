---
title: "Lollipop chart"
category: ranking
date: 2026-08-18
source: "https://r-graph-gallery.com/lollipop-plot.html"
interactive: true
resumo: "Ranking de gêneros musicais por horas de audição, com o líder destacado e o detalhamento por plataforma revelado no hover."
pacotes: ["ggplot2", "dplyr", "RColorBrewer", "jsonlite", "d3"]
dados: "1 variável categórica + 1 numérica agregada, com uma quebra opcional por subgrupo"
nivel: básico
tags: ["interativo", "comparação", "ranking"]
---

## O que é

Uma variação enxuta do gráfico de barras: em vez de um retângulo cheio, cada
categoria vira uma linha fina terminando num círculo — a "haste" e o "doce" que
dão nome ao gráfico. **Para que serve**: a mesma pergunta do barplot (comparar
uma métrica entre categorias), com menos tinta na tela e o valor exato lido
diretamente na ponta do círculo em vez de estimado pela altura de uma barra.

## Quando usar (e quando evitar)

**Use quando** o ranking entre poucas dezenas de categorias for o que importa,
e você quiser um visual mais leve que um barplot cheio — funciona
particularmente bem ordenado, com o item de maior valor destacado.

**Evite quando** as categorias forem muitas (a "haste" fica curta demais pra
segurar um círculo legível) ou quando a comparação precisar de **área**, não
só de posição — nesse caso um barplot tradicional, cujo retângulo preenche
todo o espaço até o valor, é mais direto de comparar a olho.

## Que dados você precisa

- **uma variável categórica** — os itens do ranking (aqui, gêneros musicais).
- **uma variável numérica** — o valor de cada item (aqui, horas de audição).
- Opcionalmente, uma **quebra por subgrupo** por categoria (aqui, plataforma
  de streaming), usada só no detalhamento que aparece ao passar o cursor.

## Como ler o gráfico

- **Posição/comprimento da haste**: o valor da categoria — quanto mais longe
  da base, maior.
- **Círculo**: marca o valor exato; o número ao lado confirma sem precisar
  estimar pela régua do eixo.
- **Halo ao redor de um círculo**: destaque fixo no item de maior valor —
  continua no mesmo item mesmo trocando a ordem de exibição.
- **Cor**: uma cor fixa por categoria, a mesma em toda a família de gráficos
  de barra deste acervo.

## Como foi feito

O `output.png` usa `geom_segment()` para a haste e dois `geom_point()`
sobrepostos para o destaque — um círculo grande e translúcido atrás (o halo)
e o círculo normal por cima, na mesma cor da categoria. O rótulo numérico vem
de `geom_text()` posicionado logo depois de cada ponta.

A versão interativa reaproveita o mesmo princípio de "mesmos elementos se
reorganizando" do gráfico de [barplot clássico](../barplot-classico): linha,
círculo e rótulo de cada gênero têm uma chave estável, e só sua posição
vertical muda ao alternar a ordem — nada é recriado. O halo segue o círculo
de maior valor mesmo quando ele muda de posição na tela. O que o estático não
tem espaço para mostrar é o detalhamento por plataforma: passar o cursor
sobre um círculo revela, no tooltip, a divisão daquele total entre as quatro
plataformas de streaming, ordenadas da maior para a menor.

Dados fictícios: as mesmas seis categorias e valores do
[barplot clássico](../barplot-classico) (mesma seed, mesma lógica de geração)
— os números batem entre as duas páginas de propósito, para que leiam como a
mesma família de gráficos vista de ângulos diferentes. A granularidade por
plataforma, usada só no detalhamento do hover aqui, reaparece por completo no
gráfico de [barras agrupadas/empilhadas](../../part-of-whole/barplot-agrupado-empilhado).

## Possíveis problemas pelo caminho

- **Problema**: com muitas categorias, as hastes ficam tão próximas que os
  círculos se tocam. **Por quê**: a altura disponível por item cai conforme o
  número de categorias sobe, mas o círculo tem um tamanho mínimo legível.
  **Solução**: aumentar a altura total do gráfico proporcionalmente ao número
  de itens, ou mostrar só os N maiores/menores.
- **Problema**: o halo do item de destaque parece cortado nas bordas do
  gráfico. **Por quê**: ele é maior que o círculo normal e pode ultrapassar a
  margem se o item de maior valor estiver perto do limite do eixo. **Solução**:
  reservar uma margem extra no lado onde os círculos terminam, maior que o
  raio do halo.
- **Problema**: o rótulo numérico se sobrepõe ao próximo item quando dois
  valores são muito parecidos. **Por quê**: os rótulos são posicionados em
  relação ao próprio círculo, sem checar a vizinhança. **Solução**: para
  poucos itens (como aqui) raramente é um problema visível; com muitos, vale
  remover os rótulos individuais e depender só do eixo.

## Variações possíveis

- Lollipop horizontal comparando dois momentos no tempo (dois círculos por
  haste, ligados por uma linha) — bom para mostrar "antes e depois".
  Uma versão desse tipo de comparação existe no [radar com múltiplos grupos](../radar-multiplos-grupos),
  usando outra geometria para o mesmo problema.
- Colorir a haste (não só o círculo) por um valor contínuo, quando a
  intensidade da mudança importar tanto quanto a posição final.
- Adicionar uma segunda métrica ao tamanho do círculo, transformando o
  lollipop num híbrido com gráfico de bolhas.
