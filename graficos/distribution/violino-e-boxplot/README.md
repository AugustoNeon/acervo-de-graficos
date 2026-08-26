---
title: "Violino + boxplot: três variações"
category: distribution
date: 2026-08-20
source: "https://r-graph-gallery.com/violin.html"
interactive: true
resumo: "Velocidade de download de cinco provedores de internet fictícios, com três variações alternáveis: violino puro, violino com uma caixa fina por dentro, e meio-violino com pontos individuais (raincloud plot)."
veredito_uso: "a FORMA da distribuição importa, não só os quartis — especialmente com risco de multimodalidade."
veredito_evita: "a amostra por categoria é pequena (menos de ~30 pontos), ou o público não conhece o formato."
pacotes: ["ggplot2", "dplyr", "forcats", "patchwork", "RColorBrewer", "ggdist", "jsonlite", "d3"]
dados: "1 variável categórica + 1 numérica contínua, várias observações por categoria"
nivel: intermediário
tags: ["distribuição", "densidade", "comparação"]
---

## O que é

Um violino é um boxplot com a forma completa da distribuição desenhada nas
laterais, em vez de resumida em cinco números — a largura em cada altura
mostra a densidade de observações naquele valor, igual a uma densidade de
kernel (KDE) espelhada dos dois lados de um eixo central. **Para que serve**:
tudo que um boxplot já responde (mediana, espalhamento, comparação entre
grupos), mais uma pergunta que o boxplot não consegue responder — "essa
distribuição tem um pico só, ou vários escondidos ali dentro?"

## Quando usar (e quando evitar)

**Use quando** a FORMA da distribuição importa, não só seus quartis —
especialmente se houver risco de multimodalidade (mais de um grupo misturado
na mesma categoria, cada um com seu próprio pico). É exatamente o caso que
motivou este gráfico: veja "ConectaSul" na variação "Violino + caixa" — a
caixa mostra uma mediana e um IQR gigante, sem avisar que existem dois grupos
de clientes bem distintos (fibra e DSL) escondidos dentro dela.

<div class="pull-quote">só o violino revela isso</div>

**Evite quando** a amostra por categoria for pequena (menos de ~30 pontos): a
curva de densidade fica instável e sugere uma forma que os dados não têm
evidência suficiente pra sustentar — nesse caso um
[boxplot com jitter](../boxplot-classico) mostra os pontos crus sem fingir
uma curva suave. Evite também quando o público não conhece o formato: um
violino exige uma explicação rápida (largura = densidade) que um boxplot
dispensa.

## Que dados você precisa

- **variável categórica** — o grupo (aqui, o provedor de internet).
- **variável numérica contínua** — o valor medido em cada observação (aqui,
  velocidade de download em Mbps).

Formato longo/tidy, com bastante observação por categoria (dezenas a
centenas) — ao contrário de um boxplot, que já funciona com poucos pontos, um
violino precisa de volume suficiente pra a estimativa de densidade fazer
sentido.

## Como ler o gráfico

- **Violino**: a largura em cada altura é proporcional à densidade de
  observações ali — mais largo = mais clientes com aquela velocidade. Cada
  violino é normalizado pelo próprio pico (`scale = "width"`), então
  larguras entre provedores diferentes não são diretamente comparáveis, só a
  FORMA de cada um.
- **Violino + caixa**: a mesma curva, com uma caixa fina (mediana + Q1/Q3 +
  whiskers) sobreposta no centro — o resumo numérico ao lado da forma
  completa.
- **Meio violino + pontos**: metade da curva de um lado, os pontos brutos
  individuais do outro — nada escondido atrás de uma estimativa, cada
  observação aparece.

Use os botões acima do gráfico pra alternar a variação; passe o cursor sobre
a forma pra ver a mediana e os quartis, ou sobre um ponto individual (no
raincloud) pra ver seu valor exato.

## Como foi feito

A miniatura estática combina `geom_violin()`, `geom_boxplot()` e
`ggdist::stat_halfeye()` (o pacote padrão pra meio-violino/raincloud em
ggplot2 — `gghalves`, a alternativa mais conhecida, não tinha build
disponível pra esta versão do R).

A versão interativa reaproveita a mesma estimativa de densidade (kernel
gaussiano, largura de banda de Silverman) já construída pro
[ridgeline](../ridgeline-avaliacoes-bairros) deste acervo — extraída para
`shared/densidade.ts` quando este segundo gráfico passou a precisar da
mesma técnica, em vez de duplicar a função.

A curva do violino é sempre o mesmo `<path>` de área, nos três estados: no
"violino"/"violino + caixa" as duas bordas (esquerda e direita) se afastam
do eixo central pela densidade; no "meio violino" a borda esquerda fica
travada no centro (achatada) e só a direita continua curvando. Como é a
MESMA forma, só mudando o que uma das duas bordas faz, a transição entre
estados morpha suavemente em vez de trocar de figura — mesma ideia do
entalhe do [boxplot clássico](../boxplot-classico) deste acervo, aplicada a
uma curva em vez de um polígono. Essa mesma decisão gerou um atrito
inesperado com o TypeScript — ver "Notas do coletor".

Dados fictícios: velocidade de download (Mbps) de clientes de 5 provedores
de internet fictícios (`set.seed(2609)`). Quatro provedores têm distribuição
unimodal (uma só tecnologia de conexão); um deles ("ConectaSul") mistura
clientes de DSL e de fibra na mesma medição de propósito, gerando uma
distribuição bimodal — o caso que motiva o gráfico inteiro.

## Possíveis problemas pelo caminho

- **Problema**: o pacote `gghalves` (a opção mais citada pra desenhar
  meio-violino) falhou ao instalar — "não está disponível for this version
  of R". **Por quê**: o binário pré-compilado do CRAN pra essa versão do R
  ainda não tinha sido publicado nesse momento. **Solução**: `ggdist`, que
  cobre o mesmo caso de uso (`stat_halfeye()`) e tinha binário disponível —
  vale checar `ggdist` primeiro da próxima vez que precisar de um raincloud.

- **Problema**: passar `number | (() => number)` direto pro `.x0()` do
  `d3.area()` — sintaxe válida em JS puro — quebra a checagem de tipos do
  TypeScript. **Solução**: use sempre a forma de função — a história
  completa está em "Notas do coletor", no fim da página.

## Variações possíveis

- Combinar violino com pontos SEMPRE visíveis (não só no estado raincloud) —
  bom quando a amostra é pequena o bastante pra mostrar cada ponto sem
  poluir.
- Violino espelhado por uma segunda variável categórica (ex: um lado para
  "residencial", outro para "empresarial" do mesmo provedor).
- Sobrepor a média (não só a mediana) quando a distribuição for assimétrica —
  a diferença entre as duas é um sinal da assimetria.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../boxplot-classico" style="--cat-link: var(--cat-distribution); --cat-link-ink: var(--cat-distribution-ink);">
    <span class="parecido-cat">distribution</span>
    <span class="parecido-titulo">Boxplot clássico: cinco variações</span>
    <span class="parecido-razao">O oposto direto: os mesmos cinco números resumidos numa caixa, sem a forma completa — rápido de ler, mas cego pra multimodalidade como a do ConectaSul.</span>
  </a>
  <a class="parecido-item" href="../ridgeline-avaliacoes-bairros" style="--cat-link: var(--cat-distribution); --cat-link-ink: var(--cat-distribution-ink);">
    <span class="parecido-cat">distribution</span>
    <span class="parecido-titulo">Ridgeline plot</span>
    <span class="parecido-razao">Mesma estimativa de densidade (literalmente o mesmo código, `shared/densidade.ts`), lida na vertical em vez de espelhada nos dois lados de um eixo.</span>
  </a>
</div>

## Notas do coletor

A curva do violino precisava fazer duas coisas diferentes dependendo do
estado: nos modos "violino"/"violino + caixa", a borda esquerda calcula sua
posição a partir da densidade, igual à direita. No "meio violino", ela
trava fixa no centro. Como as três variações usam o MESMO `<path>` de área
pra morphar suavemente entre estados, o `.x0()` do `d3.area()` precisava
aceitar as duas formas: um número fixo (modo meio violino) ou uma função
que calcula a posição (os outros dois).

Isso é sintaxe perfeitamente válida em JavaScript puro — `.x0()` aceita
número ou função, sempre aceitou. Mas os tipos do `d3-shape` declaram essas
duas possibilidades como **sobrecargas separadas**, não como um único
parâmetro de tipo união, e o TypeScript não escolhe automaticamente entre
sobrecargas a partir de uma variável cujo próprio tipo já é a união das
duas — ele exige saber, em tempo de compilação, qual das assinaturas está
sendo chamada.

A correção não foi convencer o TypeScript a aceitar a união — foi parar de
oferecer uma. A função passa a ser **sempre** uma função, com a decisão de
estado (violino cheio vs. meio violino) resolvida dentro do próprio corpo
dela, nunca fora. Do lado de fora do `.x0()`, só existe uma forma de
chamada, a que os tipos já sabem lidar. O comportamento em tempo de
execução não mudou nada — só a forma de expressar pro compilador algo que
o JavaScript já aceitava.
