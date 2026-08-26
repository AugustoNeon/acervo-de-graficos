---
title: "UpSet: combinações de meios de transporte"
category: general
date: 2026-08-26
source: "https://r-graph-gallery.com/upset-plot.html"
interactive: true
resumo: "Quais meios de transporte as pessoas usam juntos — um gráfico feito para conjuntos que se sobrepõem, onde um diagrama de Venn já não caberia."
pacotes: ["ggplot2", "patchwork"]
dados: "1 matriz de presença/ausência (uma linha por indivíduo, uma coluna por conjunto)"
nivel: intermediário
tags: ["conjuntos", "interseções", "matriz"]
---

## O que é

Um UpSet plot mostra o tamanho das **interseções entre conjuntos** quando os
conjuntos são muitos para um diagrama de Venn. Ele troca as áreas sobrepostas
do Venn por três painéis coordenados: barras com o tamanho de cada combinação
(em cima), barras com o total de cada conjunto (à esquerda) e uma matriz de
pontos (embaixo) que diz quais conjuntos cada combinação reúne.

**Para que serve**: responder "o que costuma aparecer junto com o quê" num dado
em que cada indivíduo pode pertencer a vários grupos ao mesmo tempo.

## Quando usar (e quando evitar)

**Use quando** as categorias **não são mutuamente exclusivas** — cada pessoa
pode marcar várias — e a pergunta é sobre as combinações, não sobre os totais.
Com quatro conjuntos ou mais o diagrama de Venn já vira um emaranhado de áreas
que ninguém consegue comparar de olho; o UpSet escala para dezenas.

**Evite quando** as categorias forem exclusivas (cada indivíduo pertence a
exatamente uma): aí os "conjuntos" são fatias de um todo, e um gráfico de barras
comum — ou de parte-do-todo — responde melhor e com muito menos explicação.
Evite também quando bastar saber quantos há em cada categoria: o UpSet é mais
caro de ler do que um barplot, e só se paga se as interseções importarem.

Um alerta que vale repetir: dados assim **não podem** ser desenhados como pizza,
rosca ou barra empilhada. A soma dos conjuntos é maior que o número de
indivíduos, então qualquer gráfico que trate o total como 100% está mentindo.

## Que dados você precisa

- **uma matriz de presença/ausência**: uma linha por indivíduo, uma coluna por
  conjunto, com 1/0 (ou `TRUE`/`FALSE`) indicando pertencimento

É o formato natural de uma pergunta de múltipla escolha com "marque todas que se
aplicam". A partir dele, tudo o que o gráfico precisa sai de duas agregações: a
soma de cada coluna (os totais) e a contagem de linhas idênticas (as
combinações).

Não é preciso enumerar as combinações possíveis de antemão — só as que aparecem
no dado são desenhadas, e normalmente ainda se corta a cauda de combinações
raras.

## Como ler o gráfico

- **Barra de cima**: quantos indivíduos formam **aquela combinação exata** — e
  só ela. A primeira barra deste gráfico é "só carro", não "todos que usam
  carro".
- **Pontos escuros na coluna abaixo da barra**: quais meios aquela combinação
  reúne. Pontos claros são ausência.
- **Linha ligando os pontos**: junta os pontos de uma mesma combinação, para
  que três pontos escuros leiam como uma coisa só, e não como três marcas
  soltas.
- **Barra da esquerda**: o total de cada meio, somando todas as combinações em
  que ele aparece.

A confusão mais comum está na diferença entre os dois tipos de barra. As de cima
são **exclusivas** (não se somam a nada), as da esquerda são **acumuladas**. Um
meio pode ter um total alto à esquerda sem ter nenhuma barra alta em cima, se o
uso dele estiver espalhado por muitas combinações pequenas — que é exatamente o
caso de "a pé" neste gráfico.

## Como foi feito

O gráfico é montado à mão em vez de vir de um pacote pronto de UpSet. São três
`ggplot2` independentes compostos por `patchwork` numa grade 2×2 (com o canto
superior esquerdo vazio, via `plot_spacer()`), e o alinhamento entre eles vem de
os painéis vizinhos compartilharem a mesma escala discreta — o painel de cima e
a matriz usam a mesma posição horizontal, a matriz e o painel da esquerda a
mesma posição vertical.

Toda a agregação cabe em duas linhas de R. Cada respondente vira uma assinatura
de bits (`"10110"`) com `apply(..., paste, collapse = "")`, e `table()` conta
quantas vezes cada assinatura aparece — que é precisamente a definição de
interseção exclusiva. Os totais por conjunto saem de um `colSums()`.

Na matriz, os pontos presentes são desenhados **duas vezes**: uma na camada de
todos os pontos e outra por cima da linha de conexão. Sem isso a linha corta o
meio de cada ponto cheio.

Dados fictícios: 2.222 moradores de uma cidade imaginária que usaram ao menos um
meio de transporte na semana. O sorteio é condicional, não independente — quem
usa carro tende a não usar ônibus nem metrô, e quem usa transporte público quase
sempre também anda a pé. Sorteios independentes gerariam interseções compatíveis
com o acaso, ou seja, um gráfico sem nada para mostrar.

Na versão interativa, os três painéis são desenhados num SVG só, o que resolve o
alinhamento por construção. O que ela acrescenta é percorrer a relação nos dois
sentidos: passar o cursor numa coluna acende os meios que ela reúne (inclusive
nas barras de total), e passar o cursor num meio acende todas as combinações que
o incluem. Também dá para reordenar as colunas por tamanho, por número de meios
ou agrupadas pelo meio principal, e clicar para fixar o destaque.

## Possíveis problemas pelo caminho

- **Problema**: os painéis saem desalinhados — as barras não ficam sobre as
  colunas de pontos. **Por quê**: cada painel calcula seus próprios limites, e
  basta um deles ter uma expansão de escala diferente para deslocar tudo.
  **Solução**: fixe os mesmos `limits` e `expand = c(0, 0)` nos eixos
  compartilhados dos painéis vizinhos, e deixe o compositor apenas empilhar.
- **Problema**: o conjunto vazio aparece como se fosse uma combinação.
  **Por quê**: quem não marcou nada também tem uma assinatura (`"00000"`), e ela
  costuma ser a mais frequente de todas. **Solução**: filtre as linhas sem
  nenhum pertencimento antes de contar, e diga na legenda qual é a base.
- **Problema**: o gráfico fica ilegível de tão largo. **Por quê**: com muitos
  conjuntos o número de combinações observadas cresce rápido, e a cauda de
  combinações com um ou dois indivíduos ocupa metade da largura. **Solução**:
  corte nas N maiores combinações e deixe isso explícito para o leitor.
- **Problema**: os totais somados não batem com o número de indivíduos, e
  parece erro. **Por quê**: não é erro — é a própria natureza do dado, já que
  cada indivíduo entra em vários conjuntos. **Solução**: informe a base
  separadamente, e nunca apresente esses totais como partes de um todo.

## Variações possíveis

- Ordenar as combinações por número de conjuntos em vez de por tamanho, quando
  a pergunta for sobre o *grau* de sobreposição e não sobre volume.
- Colorir as barras de combinação por um atributo externo (faixa de renda,
  região) para acrescentar uma segunda leitura sem mudar a estrutura.
- Trocar as barras de cima por proporções, quando comparar grupos de tamanhos
  diferentes for mais importante do que o número absoluto.
- Acrescentar um painel lateral com a distribuição de uma variável contínua
  dentro de cada combinação (idade, tempo de deslocamento) — o UpSet suporta
  painéis extras desde que compartilhem o eixo das combinações.
- Com poucos conjuntos (dois ou três) e público não técnico, um diagrama de Venn
  continua sendo mais imediato — vale medir o custo de explicação antes de
  escolher.
