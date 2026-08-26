---
title: "Nuvem de palavras: avaliações de um app"
category: ranking
date: 2026-08-24
source: "https://r-graph-gallery.com/wordcloud.html"
interactive: true
resumo: "46 termos fictícios extraídos de avaliações de um app bancário, com o tamanho de cada palavra pela frequência de menção."
veredito_uso: "o objetivo é uma impressão geral rápida e informal de um texto — feedback de usuários, respostas abertas — não precisão de leitura."
veredito_evita: "a comparação exata entre frequências importa, ou o texto não foi normalizado antes (plural/singular, maiúsculas, palavras de função)."
pacotes: ["wordcloud"]
dados: "1 variável textual (palavra) + 1 numérica (frequência)"
nivel: básico
tags: ["texto", "frequência"]
---

## O que é

Uma nuvem de palavras posiciona um conjunto de termos livremente no espaço,
com o tamanho de cada palavra proporcional à sua frequência (quantas vezes
ela aparece num texto ou conjunto de textos). **Para que serve**: dar uma
primeira impressão rápida de quais termos dominam um corpo de texto — é
essencialmente um ranking (a pergunta é "quais palavras aparecem mais"),
só que lido pelo tamanho da fonte em vez de pela altura de uma barra.

<div class="pull-quote pull-quote-direita clearfix">essencialmente um ranking, só que lido pelo tamanho da fonte em vez de pela altura de uma barra</div>

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
- **Cor**: nesta versão, o sentimento associado à palavra — verde para
  positivo, vermelho para negativo, azul para neutro — não é um padrão
  universal de nuvem de palavras, é uma escolha específica deste gráfico
  (a versão clássica costuma colorir só pela própria frequência, sem uma
  dimensão a mais). A mesma paleta vale no `output.png` e na versão
  interativa.
- **Posição/rotação**: não codificam nada — são só o resultado de um
  algoritmo de encaixe tentando aproveitar o espaço sem sobrepor palavras.

## Como foi feito

`wordcloud::wordcloud()` calcula o próprio layout (posicionamento em
espiral a partir do centro, com detecção de colisão pra não sobrepor
palavras) e desenha direto — não existe um parâmetro pra pedir o resultado
sem desenhar. `scale` controla o tamanho da maior/menor palavra,
`rot.per` a fração de palavras giradas 90°. A cor de cada palavra vem de
`colors = cores_sentimento[dados$sentimento]` combinado com
`ordered.colors = TRUE` — sem esse parâmetro, o `wordcloud()` reinterpreta
o vetor de cores como uma RAMPA por frequência (o comportamento padrão,
pensado pra colorir por frequência, não por categoria arbitrária).

Dados fictícios: frequência de 46 termos comuns em avaliações de um app
bancário fictício (`set.seed(6289)`), seguindo uma distribuição tipo Zipf
(poucas palavras muito frequentes, cauda longa de palavras citadas poucas
vezes — o padrão estatístico real de frequência de palavras em texto
livre), com cada termo também classificado manualmente como
positivo/negativo/neutro. A paleta por sentimento é definida **uma vez só**
numa variável e usada tanto no `output.png` quanto exportada pro
`data.json` da versão interativa — nunca repetir o hexadecimal em dois
lugares, pra as duas versões nunca divergirem de cor por acidente.

A versão interativa NÃO reaproveita o layout do R (ele não é exportável) —
calcula o próprio, do zero, com o pacote `d3-cloud` (mesma família de
algoritmo: espiral + detecção de colisão), o mesmo princípio de "layout caro
recalculado no navegador em vez de exportado do R" já usado nos gráficos de
rede deste acervo. Passar o cursor numa palavra apaga as outras 45; clicar
num sentimento na legenda isola aquele grupo.

## Possíveis problemas pelo caminho

- **Problema**: a miniatura do gráfico na galeria (`output.png`) mostra uma
  cor pra cada palavra, mas a versão interativa colore as mesmas palavras
  de forma diferente — mesmo as duas estando "certas" isoladamente, a
  divergência lê como bug pra quem vê a miniatura antes de clicar.
  **Por quê**: cada versão calculou sua própria paleta separadamente.
  **Solução**: definir a paleta uma única vez — a história completa, e por
  que esse é um padrão recorrente neste acervo, está em "Notas do coletor".
- **Problema**: passar um vetor de cores do mesmo tamanho que as palavras
  pro `wordcloud()` não gera o resultado esperado — as cores saem
  embaralhadas ou aplicadas por faixa de frequência, não por palavra.
  **Por quê**: por padrão, `wordcloud()` trata o vetor `colors` como uma
  RAMPA (interpolada pela frequência), não como uma cor fixa por palavra.
  **Solução**: passar `ordered.colors = TRUE` junto — só assim o vetor de
  cores é pareado 1 a 1 com `words`/`freq`, na mesma ordem em que foram
  passados.
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

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../barplot-classico" style="--cat-link: var(--cat-ranking); --cat-link-ink: var(--cat-ranking-ink);">
    <span class="parecido-cat">ranking</span>
    <span class="parecido-titulo">Barplot clássico: cinco variações</span>
    <span class="parecido-razao">O substituto de mais precisão quando a comparação exata entre frequências importar: comprimento de barra em vez de área de texto.</span>
  </a>
  <a class="parecido-item" href="../../network/rede-densa-hairball" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Rede densa (hairball)</span>
    <span class="parecido-razao">Outro gráfico deste acervo com o mesmo tipo de bug de paridade de cor entre a miniatura estática e a versão interativa — mesma causa raiz, dado bem diferente.</span>
  </a>
</div>

## Notas do coletor

A cor de uma palavra divergindo entre `output.png` e o widget não foi um
caso isolado deste gráfico — é um padrão que já apareceu em pelo menos
três outros gráficos deste acervo, cada um com sua própria versão do
mesmo erro de raiz: calcular a cor duas vezes, uma vez por implementação,
em vez de calcular uma vez e reaproveitar. Aqui, especificamente, o
`output.png` colore por `sentimento` (positivo/negativo/neutro) e a versão
em D3 recebe seus próprios dados — bastaria um `hexadecimal` diferente
escrito à mão num dos dois lados pra as cores nunca mais baterem, mesmo
sem nenhum erro de execução em nenhuma das partes.

A correção que se tornou padrão neste acervo, repetida gráfico após
gráfico: a paleta nasce **uma única vez**, como uma variável no `script.R`
— aqui, `cores_sentimento` — e alimenta tanto o `ggsave()` da miniatura
quanto o `data.json` exportado pro D3. Nenhuma das duas implementações
"decide" uma cor por conta própria; as duas leem do mesmo lugar. A lição
generaliza bem além de nuvens de palavra: sempre que um dado é desenhado
duas vezes, em duas linguagens ou bibliotecas diferentes, qualquer valor
"derivado" dos dados brutos (cor, mas também poderia ser um layout ou uma
escala) precisa ser calculado uma vez só e exportado pronto — nunca
recalculado de forma independente dos dois lados, por mais que a fórmula
pareça simples o bastante pra repetir sem risco.
