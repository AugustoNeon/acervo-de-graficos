---
title: "Calendário de commits de um projeto de código aberto fictício"
category: general
date: 2026-08-28
source: "https://r-graph-gallery.com/calendar-heatmap.html"
interactive: true
resumo: "Um ano de atividade diária, um quadrado por dia, colorido por intensidade — a grade revela padrões semanais e sazonais que uma linha do tempo esconde."
veredito_uso: "você tem uma série diária ao longo de meses ou anos e quer revelar padrões cíclicos — dia da semana, sazonalidade, uma janela específica — que uma linha do tempo apaga."
veredito_evita: "a série for curta (poucas semanas) ou o que importa for ler o valor exato de cada ponto — aí uma linha ou barras é mais precisa."
pacotes: ["ggplot2", "jsonlite", "d3"]
dados: "1 variável de data diária (contínua, sem lacunas) + 1 numérica (a métrica do dia)"
nivel: básico
tags: ["temporal", "matriz", "sazonalidade"]
---

## O que é

Um calendário de commits (*calendar heatmap*) dispõe um ano inteiro como uma
grade de quadrados — uma coluna por semana, uma linha por dia da semana —
com cada quadrado colorido pela intensidade daquele dia. **Para que
serve**: revelar o **ritmo** de uma série diária — onde ela acelera, onde
para, que dias da semana concentram mais atividade — de um jeito que uma
linha do tempo comum, que só mostra altura, não mostra.

É a técnica popularizada pelo próprio calendário de contribuições do
GitHub, generalizada pra qualquer métrica diária: vendas, passos,
temperatura, chamados de suporte — qualquer coisa que aconteça todo dia e
tenha padrão de calendário por trás.

## Quando usar (e quando evitar)

**Use quando** a pergunta for sobre **padrão**, não sobre o valor exato de
um dia isolado: um projeto acelera às terças? cai todo fim de semana? tem um
mês de pico previsível? A grade responde essas perguntas de relance — o
olho agrupa cor antes de ler número.

**Evite quando** a série for curta: com poucas semanas de dado a grade fica
estreita demais pra qualquer padrão semanal ou sazonal aparecer, e uma
linha do tempo comum já mostra tudo sem precisar de uma legenda de cor.
Evite também quando o valor exato de cada dia importar mais do que o
padrão — a cor comunica ordem de grandeza bem, mas ler "12" versus "13"
numa célula pequena exige o tooltip, não a cor sozinha.

## Que dados você precisa

- **uma data por linha, diária e sem lacunas** — um dia sem registro
  precisa aparecer como zero, não sumir da grade, senão a semana inteira
  desalinha
- **uma métrica numérica** — a intensidade que vira cor (aqui, commits por
  dia)

O período coberto não precisa ser um ano civil completo, mas cobrir um ano
é o que deixa os padrões sazonais (uma época do ano mais parada, um mês de
pico recorrente) aparecerem — poucos meses só revelam o padrão semanal.

## Como ler o gráfico

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#EDEAE3;border:1px solid #ddd"></span> Sem commits, ou quase</div>
  <div><span class="swatch" style="background:#E5A2B5"></span> Poucos commits</div>
  <div><span class="swatch" style="background:#CA5E87"></span> Dia acima da média</div>
  <div><span class="swatch" style="background:#5C1140"></span> Dia de pico</div>
</div>

- **Coluna**: uma semana do ano, da esquerda (janeiro) pra direita
  (dezembro).
- **Linha**: o dia da semana — domingo no topo, sábado embaixo.
- **Cor**: quantos commits naquele dia, na mesma rampa nos dois lados
  (estático e interativo) — nunca calculada duas vezes.

## Como foi feito

**Geometria**: um `geom_tile()` só, com a posição de cada dia calculada a
mão — número de dias corridos desde o início do ano, mais o deslocamento do
primeiro dia da semana, dividido por 7 (`%/%`), dá o índice da coluna; o dia
da semana (`%w`, 0 a 6) dá a linha. Nenhum pacote de calendário é
necessário, é aritmética de data comum.

**Paleta**: uma rampa sequencial própria (creme quase neutro → vinho-magenta
escuro), gerada uma vez com `colorRampPalette()` e reaproveitada nos dois
lados — inclusive as 5 cores de faixa da versão interativa vêm da MESMA
rampa, só amostrada em menos pontos, nunca um hexadecimal novo escolhido à
parte.

**Dado fictício**: um ano de commits de um projeto de código aberto
imaginário, com duas janelas fixadas de propósito (não só ruído de
Poisson): um sprint de lançamento em março (três semanas bem acima do
normal, inclusive fins de semana) e um recesso de meio de ano em julho
(quase zero, todo santo dia). Sem essas duas janelas a grade mostraria só
textura aleatória, sem nenhum período específico pra apontar.

**Na versão interativa**: o mesmo dado ganha um segundo modo de cor —
**faixas** fixas (5 degraus, a mesma lógica do calendário de contribuições
que inspirou a técnica) em vez de **contínuo** (a rampa interpolada,
igual ao `output.png`). A posição de cada quadrado nunca muda entre os
modos, só o preenchimento.

## Possíveis problemas pelo caminho

- **Problema**: o painel do gráfico saiu bem menor que a altura reservada
  da imagem, sobrando uma faixa em branco entre o título e a grade.
  **Por quê**: `coord_fixed(ratio = 1)` força 1 unidade de dado a ocupar o
  mesmo tamanho físico nos dois eixos — com ~53 semanas de largura contra 7
  dias de altura, o painel resultante é bem mais raso que a proporção do
  `ggsave()` pedido, e o `ggplot2` centraliza o espaço sobrando em vez de
  esticar o painel. **Solução**: trocar por `coord_cartesian()` (sem
  proporção fixa) e ajustar a altura do `ggsave()` pra já bater com a
  proporção natural da grade.

## Variações possíveis

- Trocar a paleta sequencial por uma **divergente**, quando o dado tiver um
  ponto de referência natural (ex: variação em relação à média do ano) em
  vez de só "mais ou menos".
- Separar dias úteis de fins de semana em duas grades lado a lado, quando a
  distinção entre os dois for o próprio ponto do gráfico, não um detalhe de
  textura.
- Sobrepor um contorno nas células de um período específico (um lançamento,
  uma campanha) pra apontar diretamente a janela, em vez de esperar o
  leitor notar sozinho.
- Estender pra vários anos empilhados verticalmente, quando o padrão
  interessante for comparar a mesma época em anos diferentes.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../../network/matriz-adjacencia-tags" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Matriz de adjacência: tags que aparecem juntas</span>
    <span class="parecido-razao">Mesma técnica, outro domínio: uma grade de células coloridas por valor — lá linha/coluna são categorias livres, aqui são fixadas pelo calendário (semana × dia).</span>
  </a>
  <a class="parecido-item" href="../../evolution/serie-temporal-customizada-dygraphs" style="--cat-link: var(--cat-evolution); --cat-link-ink: var(--cat-evolution-ink);">
    <span class="parecido-cat">evolution</span>
    <span class="parecido-titulo">Série temporal interativa customizada</span>
    <span class="parecido-razao">O oposto direto: a mesma pergunta ("como a atividade varia no tempo") respondida como linha contínua — perde o padrão semanal, ganha o valor exato de cada ponto.</span>
  </a>
</div>

## Notas do coletor

O primeiro `output.png` renderizado saiu com os meses em **inglês** — "Jan,
Feb, Mar" — apesar do resto do script, dos rótulos dos eixos e de todo o
resto do site estar em português. O código parecia certo:
`format(primeiros_dias, "%b")`, a forma padrão de pedir o nome abreviado do
mês em R. Nenhum erro, nenhum aviso — o script rodava limpo do início ao
fim.

A causa: `format()` com `"%b"` não traduz nada sozinho, ele lê o **locale de
tempo** do sistema operacional (`LC_TIME`) e devolve o nome do mês nesse
idioma. Este container roda em `C.UTF-8`, um locale sem idioma nenhum
associado — e o `%b` cai de volta pro inglês como padrão. Trocar o locale
do sistema seria a correção "certa" em teoria, mas frágil na prática (exige
o pacote de locale pt-BR instalado, e o resultado passaria a depender de
configuração de máquina de novo — exatamente a fragilidade que o
`SETUP.md` já registra sobre caminho de instalação do R variando entre
ambientes). Mais simples e mais robusto: abandonar `%b` de vez e usar uma
lista de abreviações escrita à mão, indexada pelo número do mês
(`format(..., "%m")`) — não depende de locale nenhum, roda igual em
qualquer máquina. Fica valendo pra qualquer script futuro que formate data
pra exibição: `%b`/`%B` são armadilha de locale, não de tradução.
