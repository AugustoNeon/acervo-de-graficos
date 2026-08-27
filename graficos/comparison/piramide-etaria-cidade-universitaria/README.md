---
title: "Pirâmide etária de uma cidade universitária fictícia"
category: comparison
date: 2026-08-27
source: "https://r-graph-gallery.com/pyramid-plot.html"
interactive: true
resumo: "Homens e mulheres por faixa etária, em barras espelhadas que se abrem a partir do centro — o formato do conjunto conta a história demográfica."
veredito_uso: "duas contagens (dois grupos, dois momentos) repetidas na mesma categoria ordenada, quando o FORMATO do conjunto interessa tanto quanto cada barra isolada."
veredito_evita: "só há uma ou duas categorias, ou os dois lados não compartilham a mesma escala ordenada — aí um barplot agrupado comum já resolve, sem a barra espelhada."
pacotes: ["ggplot2", "jsonlite", "d3"]
dados: "1 variável categórica ordenada (faixa etária) + 2 numéricas (uma por gênero, na mesma unidade)"
nivel: básico
tags: ["comparação", "distribuição", "demografia"]
---

## O que é

Uma pirâmide etária espelha duas contagens — geralmente homens e mulheres —
em barras horizontais que crescem para lados opostos a partir de um eixo
central comum, com as categorias (faixas de idade) empilhadas em ordem, a
mais jovem embaixo. **Para que serve**: comparar a distribuição de dois
grupos ao longo da mesma escala ordenada de uma só vez — não só "qual grupo
é maior em cada faixa", mas o **formato** que os dois lados desenham juntos.

É um histograma feito duas vezes, um de cada lado do zero: a técnica não
tem nada de exclusivo de demografia, qualquer par de distribuições sobre a
mesma escala ordenada pode usá-la.

## Quando usar (e quando evitar)

**Use quando** os dois grupos compartilham exatamente a mesma escala
categórica ordenada (faixas de idade, décadas, níveis de um funil) e o que
importa é o **contorno** que a comparação desenha — um alargamento no meio,
uma base larga, uma assimetria entre os lados — não só o número de uma
categoria isolada.

**Evite quando** houver só uma ou duas categorias: a barra espelhada não
ganha nada sobre um barplot agrupado comum, e ainda perde a leitura direta
do eixo numérico (a metade esquerda fica "de cabeça pra baixo" a menos que o
leitor já conheça a convenção). Evite também quando os dois grupos não
tiverem tamanho total parecido — comparar uma cidade de 5 mil habitantes com
uma de 5 milhões na mesma escala absoluta esconde um lado inteiro; o modo
percentual desta página existe justamente para esse caso.

## Que dados você precisa

- **variável categórica ordenada** — o eixo compartilhado pelos dois lados
  (aqui, a faixa etária); precisa ter uma ordem natural, não só nomes
- **duas variáveis numéricas** — uma por grupo (aqui, homens e mulheres), na
  **mesma unidade e escala**

Formato longo (uma linha por categoria × grupo) ou largo (uma linha por
categoria, uma coluna por grupo) funcionam — a diferença é só de onde o
sinal que separa os dois lados é aplicado: no formato longo, numa coluna de
valor assinado calculada a mais; no largo, direto ao desenhar cada metade.

## Como ler o gráfico

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#2E5FA3"></span> Homens — cresce para a esquerda</div>
  <div><span class="swatch" style="background:#D9622B"></span> Mulheres — cresce para a direita</div>
</div>

- **Comprimento da barra**: o tamanho da população naquela faixa etária e
  gênero — a mesma leitura de qualquer barplot horizontal, só que a barra
  nasce no centro em vez de na borda.
- **Posição vertical**: a faixa etária, da mais jovem (embaixo) à mais
  velha (em cima) — a ordem é a própria escala, nunca reordenada por valor.
- **Lado**: qual gênero, não uma escala — a distância até o centro é o dado,
  o lado é só o rótulo de qual grupo.

<div class="pull-quote pull-quote-direita clearfix">o que salta aos olhos não é uma barra isolada, é o inchaço no meio da pirâmide</div>

Numa pirâmide etária "de livro didático" — base larga, topo estreito — cada
faixa é um pouco menor que a de baixo. Aqui não: as faixas de 20 a 29 anos
são visivelmente mais largas que as de baixo E as de cima, porque o que
salta aos olhos não é uma barra isolada, é o inchaço no meio da pirâmide —
gente que a cidade não "produziu" (não nasceu nem cresceu ali), mas atraiu.

## Como foi feito

**Geometria**: um único `geom_col()` sobre dado em formato longo, com um
valor **assinado** só para posicionar a barra (negativo para homens,
positivo para mulheres) — o rótulo e o tooltip sempre mostram o valor
absoluto, o sinal é um truque geométrico interno, nunca aparece pro leitor.
`scale_x_continuous(labels = function(x) ...)` reformata os rótulos do eixo
tirando esse sinal de volta.

**Ordem do eixo**: a faixa etária vira `factor` com os níveis já na ordem
"0-4" → "80+" — o mesmo cuidado do gráfico de halteres desta categoria: sem
isso o `ggplot2` ordenaria alfabeticamente ("0-4", "10-14", "15-19"...) em
vez de numericamente.

**Dado fictício**: pirâmide de uma cidade universitária pequena (~35 mil
habitantes), com um excesso deliberado nas faixas de 20-24 e 25-29 —
estudantes de fora + gente que fica depois de formar. Sem esse inchaço
construído de propósito, o gráfico reproduziria a forma genérica que
qualquer pirâmide de livro didático já mostra, e não haveria nada
específico para ler.

**Na versão interativa**: o mesmo par de barras alterna entre valor
**absoluto** (habitantes) e **percentual** — a fração que aquela faixa
representa dentro do total do próprio gênero. O formato da pirâmide não
muda de um modo pro outro (é a mesma proporção interna), só a escala do
eixo; é o que torna o percentual útil pra comparar cidades de tamanhos bem
diferentes sem que uma delas vire uma faixa fina demais pra ler. Clicar na
legenda isola um gênero; passar o cursor numa barra mostra a contagem exata
e o percentual dela dentro do próprio gênero.

## Possíveis problemas pelo caminho

- **Problema**: o eixo central (zero) muda de posição horizontal ao trocar
  entre os modos absoluto e percentual. **Por quê**: se cada modo calcular
  seu próprio domínio como `[min, max]` dos valores daquele modo, os dois
  lados raramente ficam simétricos — o maior valor de qualquer um dos
  gêneros empurra o zero pro lado errado. **Solução**: usar um domínio
  **simétrico** (`[-máximo, máximo]`) nos dois modos, não o intervalo
  natural dos dados — garante que x=0 caia sempre no mesmo pixel,
  independente de qual gênero tem o valor mais extremo naquele modo.

## Variações possíveis

- Trocar os dois gêneros por dois **momentos no tempo** (a mesma cidade,
  dois censos) — a técnica é idêntica, muda só o que cada lado representa.
- Empilhar uma terceira dimensão dentro de cada barra (ex: urbano/rural
  dentro de cada gênero), virando uma pirâmide com barras empilhadas.
- Sobrepor uma segunda pirâmide semitransparente (outra cidade, ou a média
  nacional) para comparar formatos diretamente, em vez de alternar entre
  páginas.
- Normalizar pelo total geral (não pelo total de cada gênero) quando o que
  importa for a composição etária inteira, não a distribuição interna de
  cada lado.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../halteres-espera-especialidades" style="--cat-link: var(--cat-comparison); --cat-link-ink: var(--cat-comparison-ink);">
    <span class="parecido-cat">comparison</span>
    <span class="parecido-titulo">Halteres: espera antes e depois por especialidade</span>
    <span class="parecido-razao">Mesma categoria, problema espelhado: o halteres compara dois MOMENTOS do mesmo grupo; a pirâmide compara dois GRUPOS na mesma escala ordenada.</span>
  </a>
  <a class="parecido-item" href="../../distribution/histograma-largura-de-bin" style="--cat-link: var(--cat-distribution); --cat-link-ink: var(--cat-distribution-ink);">
    <span class="parecido-cat">distribution</span>
    <span class="parecido-titulo">Histograma: largura de bin variável</span>
    <span class="parecido-razao">Mesma técnica, outro domínio: uma pirâmide etária é literalmente dois histogramas desenhados de costas um pro outro sobre o mesmo eixo.</span>
  </a>
</div>

## Notas do coletor

A primeira versão da versão interativa calculava o domínio do eixo X
separadamente em cada modo, do jeito mais óbvio: `[0, máximo daquele modo]`
espelhado. Funcionava — até trocar de "Absoluto" pra "Percentual" e ver a
linha central pular alguns pixels pro lado, porque o percentual máximo de
mulheres e o de homens não coincidem exatamente com a proporção que os
valores absolutos tinham. Nada quebrado, nenhum erro — só um eixo que
"tremia" na transição, perceptível justamente por causa da animação suave
entre os dois estados.

A correção não foi ajustar a transição — foi perceber que o problema era o
domínio em si: forçar `[-máximo, máximo]` simétrico nos dois modos garante
que x=0 caia no mesmo pixel sempre, por construção, em vez de depender de
uma coincidência numérica entre os dois lados. A mesma ideia que já vale
pra qualquer gráfico deste acervo com mais de um modo de leitura sobre o
mesmo eixo: quando dois estados compartilham um ponto de referência visual
(aqui, o centro), vale a pena fixar esse ponto de propósito, não confiar
que ele vai coincidir sozinho.
