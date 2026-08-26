---
title: "Comparação de layouts de rede (Fruchterman-Reingold, DrL, Aleatório)"
category: network
date: 2026-07-24
source: "https://www.data-to-viz.com/graph/network.html"
interactive: true
resumo: "A mesma rede, com os mesmos dados, desenhada por três algoritmos de posicionamento diferentes — e três leituras diferentes."
veredito_uso: "você está escolhendo como apresentar uma rede — rodar 2-3 layouts antes de decidir evita conclusões acidentais."
veredito_evita: "a rede é pequena e óbvia o bastante pra qualquer layout razoável mostrar a mesma coisa."
pacotes: ["ggraph", "igraph", "patchwork", "jsonlite", "d3"]
dados: "uma lista de conexões (origem, destino)"
nivel: intermediário
tags: ["estático", "rede", "comparação"]
---

## O que é

Três painéis mostrando **exatamente o mesmo grafo** — mesmos nós, mesmas conexões,
nenhum dado alterado — desenhado por três algoritmos de layout distintos:

- **Fruchterman-Reingold** (`fr`): simulação de forças, o padrão para redes
  pequenas e médias. Tende a revelar agrupamentos.
- **DrL**: também baseado em forças, mas projetado para redes grandes; separa
  comunidades de forma mais agressiva.
- **Aleatório**: posições sorteadas, sem nenhuma otimização. Serve de controle.

**Para que serve**: demonstrar que o layout não é detalhe estético.

<div class="pull-quote pull-quote-direita clearfix">é parte da análise</div>

A mesma rede pode parecer organizada, agrupada ou caótica dependendo apenas
de onde os pontos foram colocados.

## Quando usar (e quando evitar)

**Use esta comparação quando** estiver escolhendo como apresentar uma rede: rodar
dois ou três layouts antes de decidir é barato e evita conclusões acidentais.

Na prática do dia a dia, **Fruchterman-Reingold** é a escolha padrão para redes de
até algumas centenas de nós; **DrL** vale quando a rede é grande e o objetivo é
separar comunidades. O **aleatório** não serve para nada além de ilustrar o
contraste — está aqui exatamente para isso.

**Evite** tirar conclusões a partir da posição absoluta dos nós em qualquer layout
de forças: coordenadas não têm significado, só a proximidade relativa tem — e ainda
assim de forma aproximada.

## Que dados você precisa

- **Uma lista de conexões** — origem e destino.

Nada além disso: layouts de rede trabalham só com a topologia. Nenhum dos três
algoritmos usa atributo de nó ou peso de aresta neste exemplo — o que muda entre os
painéis é apenas o algoritmo.

## Como ler o gráfico

Em cada painel:

- **Círculos**: os nós.
- **Linhas**: as conexões.
- **Posição**: definida pelo algoritmo do painel, não pelos dados.

A leitura interessante é a **comparação entre painéis**. Note que:

- em `fr`, nós muito conectados se aproximam e formam regiões visíveis;
- em `drl`, as separações tendem a ficar mais marcadas;
- no aleatório, as mesmas conexões existem, mas nenhum padrão aparece.

Se um agrupamento se mantém visível em mais de um layout, é sinal de que ele
existe na estrutura da rede — e não é artefato do desenho.

## Como foi feito

O grafo é gerado uma vez com `igraph::sample_pa()` (modelo de ligação
preferencial, que produz redes com poucos nós muito conectados) e desenhado três
vezes com `ggraph`, mudando só o argumento `layout`, que aceita os nomes do
`igraph` diretamente como texto: `"fr"`, `"drl"` e `"randomly"`.

Os três painéis são combinados num único arquivo com `patchwork`. Este é um
dos poucos gráficos do acervo sem versão interativa — decisão deliberada,
não uma que faltou tempo de fazer; ver "Notas do coletor".

## Possíveis problemas pelo caminho

- **Problema**: rodar o script duas vezes produz desenhos diferentes. **Por quê**:
  layouts de força partem de posições aleatórias. **Solução**: fixar a semente antes
  de cada chamada, se a reprodutibilidade importar.

- **Problema**: `drl` falha ou devolve resultado estranho em redes muito pequenas.
  **Por quê**: foi projetado para redes grandes e precisa de massa crítica para se
  comportar bem. **Solução**: usar `fr` em redes pequenas.

- **Problema**: você "vê" comunidades que não existem. **Por quê**: algoritmos de
  força criam agrupamentos visuais mesmo em redes sem estrutura real de comunidade.
  **Solução**: confirmar com um algoritmo de detecção de comunidade antes de
  afirmar qualquer coisa — e é exatamente o que o painel aleatório ajuda a
  desconfiar.

- **Problema**: em redes grandes, todos os layouts viram um emaranhado. **Por quê**:
  densidade alta demais. **Solução**: filtrar arestas fracas, agregar nós, ou trocar
  por outra representação — uma matriz de adjacência ou um arc diagram.

## Variações possíveis

- Acrescentar layouts com significado externo (`layout = "circle"`, `"grid"`, ou
  coordenadas geográficas reais), em que a posição passa a ter interpretação.
- Colorir os nós por comunidade detectada e observar se os layouts concordam.
- Dimensionar os nós por grau, tornando os concentradores visíveis nos três painéis
  ao mesmo tempo.
- Repetir a comparação com uma rede que tenha comunidades reais e verificar quais
  algoritmos as revelam melhor.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../arc-diagram-d3" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Arc diagram</span>
    <span class="parecido-razao">O oposto direto: nós numa ordem imposta com significado, em vez de posicionados por um algoritmo de força que pode ou não revelar estrutura real.</span>
  </a>
  <a class="parecido-item" href="../rede-densa-hairball" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Rede densa (hairball)</span>
    <span class="parecido-razao">O que acontece quando NENHUM layout de força resolve — mesmo o melhor algoritmo empacota numa bola de fios quando a rede é densa demais.</span>
  </a>
</div>

## Notas do coletor

Este acervo tem uma regra de projeto quase sem exceção: interatividade é
prioridade número um em todo gráfico novo, e a versão estática existe
principalmente como fallback de progressive enhancement. Este gráfico é
uma das poucas exceções deliberadas — e a razão não é técnica (não faltou
biblioteca nem tempo), é conceitual.

O ponto inteiro deste gráfico é a comparação simultânea entre três
layouts do mesmo dado. Um widget interativo — mesmo um bom, com seletor de
algoritmo — mostraria um layout de cada vez, escondendo os outros dois. Isso
destruiria exatamente a coisa que o gráfico existe pra provar: que a MESMA
rede muda de aparência conforme o algoritmo escolhido, um fato que só se
sustenta vendo os três ao mesmo tempo, lado a lado, comparáveis num único
olhar. Trocar isso por um seletor não seria uma versão "melhorada e
interativa" do mesmo gráfico — seria um gráfico diferente, respondendo uma
pergunta mais pobre ("como fica com o layout X?" em vez de "o layout
importa?").

A lição generaliza: "interatividade é prioridade" não significa
interatividade sempre, em qualquer gráfico — significa que a ausência dela
precisa ser uma decisão consciente sobre o que o gráfico está tentando
provar, não um padrão aplicado sem pensar, nem uma exceção por preguiça.
