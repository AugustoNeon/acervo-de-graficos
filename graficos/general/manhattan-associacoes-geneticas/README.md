---
title: "Manhattan plot: associações genéticas"
category: general
date: 2026-08-25
source: "https://r-graph-gallery.com/101_Manhattan_plot.html"
interactive: true
resumo: "Milhares de marcadores genéticos testados contra um desfecho, organizados por cromossomo — dois agrupamentos cruzam a linha de significância."
pacotes: ["ggplot2", "dplyr"]
dados: "1 variável categórica (cromossomo) + 1 posicional + 1 numérica (p-valor)"
nivel: intermediário
tags: ["dispersão", "genômica", "interativo", "limiar de significância"]
---

## O que é

Um Manhattan plot é um gráfico de dispersão especializado, criado para
estudos de associação genética (GWAS): cada ponto é um marcador testado
contra um desfecho, posicionado no eixo X pela sua localização no genoma
(concatenando os cromossomos numa única linha) e no eixo Y pela força da
evidência estatística — geralmente `-log10(p-valor)`, de forma que
associações mais fortes aparecem mais **altas**. **Para que serve**: separar
visualmente um punhado de sinais estatisticamente fortes em meio a dezenas
de milhares de testes simultâneos, o que dá ao gráfico seu nome (os
agrupamentos que ultrapassam a linha de significância lembram os arranha-céus
do horizonte de Manhattan).

## Quando usar (e quando evitar)

**Use quando** você testa uma mesma hipótese repetidas vezes ao longo de uma
variável posicional/ordenada (o caso clássico é o genoma, mas a mesma ideia
serve pra qualquer varredura de milhares de testes organizados por posição)
e precisa mostrar tanto os resultados individuais quanto onde eles se
agrupam.

**Evite quando** você tem poucos testes (dezenas, não milhares) — nesse caso
um gráfico de barras ou um forest plot com intervalo de confiança comunica
mais informação por ponto. Também evite sem uma linha de referência clara
(o limiar de significância): sem ela, o leitor não tem como saber o que
conta como "alto" no eixo Y.

## Que dados você precisa

- **cromossomo** (ou qualquer variável categórica/posicional que agrupe os
  testes) — define a cor alternada e a ordem no eixo X
- **posição** — a coordenada dentro de cada grupo, usada pra calcular a
  posição cumulativa no eixo X
- **p-valor** — o resultado de cada teste estatístico, transformado em
  `-log10(p)` pro eixo Y

Formato longo/tidy: uma linha por marcador testado.

## Como ler o gráfico

- **Posição horizontal**: a localização do marcador, com os cromossomos
  concatenados em sequência (o rótulo embaixo marca o centro de cada um).
- **Posição vertical**: `-log10(p-valor)` — quanto mais alto, mais forte a
  evidência estatística contra a hipótese nula.
- **Cor**: alterna entre dois tons a cada cromossomo, só pra ajudar o olho a
  separar onde um termina e o outro começa — não codifica um valor.
- **Linhas horizontais tracejadas**: limiares de referência. A cinza marca
  um nível "sugestivo" de evidência; a vermelha marca o limiar de
  significância mais rigoroso (aqui, o padrão genômico de `5×10⁻⁸`). Só os
  pontos acima da vermelha são candidatos a associação real.

## Como foi feito

A técnica central é transformar uma posição-dentro-do-grupo em uma posição
cumulativa: cada cromossomo "emenda" no fim do anterior (soma cumulativa do
comprimento dos cromossomos anteriores), formando uma única linha contínua
no eixo X em vez de sobrepor todos os cromossomos na mesma origem. O rótulo
de cada cromossomo é posicionado no ponto médio do intervalo que ele ocupa
nessa linha.

Dados fictícios: 22 cromossomos fictícios com 90 marcadores cada, a maioria
com p-valor uniforme entre 0 e 1 (o comportamento esperado quando não existe
associação real). Dois agrupamentos de marcadores vizinhos (nos cromossomos
6 e 16) tiveram o p-valor construído em curva de sino a partir de um pico
central, imitando o desequilíbrio de ligação que faz vários marcadores
próximos de uma associação real aparecerem elevados juntos, em vez de um
único ponto isolado.

## Possíveis problemas pelo caminho

- **Problema**: a soma cumulativa das posições de cromossomo "estoura" e
  vira `NA` silenciosamente, sem erro. **Por quê**: gerar posições com
  `sample.int()` devolve um vetor inteiro (32 bits); somar o comprimento de
  vários cromossomos grandes ultrapassa o limite de ~2,1 bilhões desse tipo.
  **Solução**: converter a posição pra numérica (`as.numeric()`) antes de
  qualquer soma cumulativa.
- **Problema**: o eixo Y fica dominado por um único ponto extremo, achatando
  todo o resto perto de zero. **Por quê**: `-log10(p)` cresce rápido pra
  p-valores muito pequenos. **Solução**: aqui não foi necessário (o pico
  ficou moderado), mas em dados reais costuma-se aceitar a distorção — é o
  preço de mostrar milhares de testes na mesma escala.

## Variações possíveis

- Anotar com rótulo de texto os SNPs/marcadores que ultrapassam o limiar de
  significância, em vez de deixar só a posição falar.
- Combinar com um QQ-plot (p-valores observados vs. esperados sob a
  hipótese nula) ao lado, prática comum em GWAS pra checar se o excesso de
  pontos significativos é real ou um artefato de inflação estatística.
- Trocar a variável posicional por outra completamente diferente (ex: hora
  do dia, id de sensor) sempre que o problema for "muitos testes repetidos,
  organizados por uma variável ordenada".
