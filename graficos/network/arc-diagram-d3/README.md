---
title: "Arc diagram"
category: network
date: 2026-07-23
source: "https://www.data-to-viz.com/graph/arc.html"
interactive: true
resumo: "Rede com todos os nós alinhados numa única linha e as conexões desenhadas como arcos acima dela."
veredito_uso: "existe uma ordem natural pros nós, e ler o nome de cada um importa tanto quanto ver as ligações."
veredito_evita: "a ordem dos nós é arbitrária — os arcos ficam todos parecidos e o gráfico não comunica nada."
pacotes: ["ggraph", "igraph", "jsonlite", "d3"]
dados: "lista de nós (com grupo) + lista de conexões entre eles"
nivel: avançado
tags: ["rede", "linear"]
---

## O que é

Um arc diagram simplifica radicalmente o desenho de uma rede: em vez de espalhar os
nós pelo plano, coloca **todos numa única linha** e liga os pares com arcos
semicirculares acima dela.

Ao abrir mão de uma dimensão, ganha-se algo valioso — os rótulos ficam todos
legíveis, alinhados, sem sobreposição. É o oposto da bola emaranhada típica dos
layouts por força.

**Para que serve**: mostrar conexões quando a **ordem dos nós** tem significado
(alfabética, cronológica, por grupo) e quando ler o nome de cada um importa tanto
quanto ver as ligações.

## Quando usar (e quando evitar)

**Use quando** existir uma ordem natural para os nós e você quiser conseguir ler
todos os rótulos. É excelente para revelar estrutura de agrupamento: se itens do
mesmo grupo estiverem adjacentes, as conexões internas viram arcos curtos e
densos, e as pontes entre grupos viram arcos longos que saltam à vista.

**Evite quando** a ordem dos nós for arbitrária — e aqui está a armadilha
principal da técnica: a ordenação é a análise. Com os nós embaralhados,
todos os arcos ficam com comprimentos parecidos e o gráfico não comunica
absolutamente nada, mesmo estando tecnicamente correto.

<div class="pull-quote">a ordenação é a análise</div>

Evite também com muitos nós: a linha fica longa demais e os arcos, altos demais.

## Que dados você precisa

- **Lista de nós** — nome e, idealmente, o grupo a que pertence (usado para cor e,
  principalmente, para definir a ordem).
- **Lista de conexões** — pares de nós ligados.

O campo mais importante não é nem um nem outro: é a **ordem** em que os nós entram
na lista. Ordene por grupo antes de plotar.

## Como ler o gráfico

- **Pontos na linha de base**: os nós, na ordem definida.
- **Cor do ponto**: o grupo.
- **Arcos**: as conexões.
- **Arco curto** liga vizinhos — normalmente do mesmo grupo.
- **Arco longo e alto** atravessa a linha: é uma ponte entre partes distantes da
  rede, e costuma ser o elemento mais interessante.
- **Região com muitos arcos curtos sobrepostos** é um agrupamento coeso.

Na versão interativa, passar o mouse sobre um nó destaca todas as conexões dele e
mostra nome, grupo e número de ligações; sobre um arco, mostra origem e destino.

## Como foi feito

Este gráfico tem duas implementações independentes usando exatamente os mesmos
dados.

A **estática** vem do `ggraph`, com `layout = "linear"` e `geom_edge_arc()` — a
combinação que produz o alinhamento em linha com arcos.

A **interativa** é escrita à mão em D3 — não existe pacote R que entregue um arc
diagram interativo pronto —, agora desenhada dentro do próprio runtime do site
(sem `<iframe>`), como o resto do acervo: o `script.R` exporta só a lista de
nós/arestas (na ordem que importa) e a paleta por grupo num `data.json`; a
posição de cada nó no eixo e a geometria de cada arco são calculadas no D3. Os
arcos são caminhos SVG desenhados com o comando de arco elíptico
(`A r r 0 0 sentido x2 y2`), com o raio igual à metade da distância entre os
dois nós — quanto mais distantes na linha, mais alto o arco.

Dados fictícios: 14 nós em 3 grupos (`A1`–`A5`, `B1`–`B5`, `C1`–`C4`) e 17
conexões — a maioria dentro do próprio grupo, mais 4 pontes entre grupos. A ordem
agrupada é intencional, justamente para demonstrar o que a técnica pede.

## Possíveis problemas pelo caminho

- **Problema**: o gráfico está correto mas não mostra padrão nenhum — só arcos
  parecidos espalhados. **Por quê**: os nós estão em ordem arbitrária. **Solução**:
  ordenar por grupo (ou por qualquer critério com significado) antes de desenhar.
  Esse é o erro central da técnica.

- **Problema**: os rótulos ficam ilegíveis quando a rede cresce. **Solução**:
  mantenha legendas e textos de instrução em HTML comum, fora do SVG — a
  história completa está em "Notas do coletor", no fim da página.

- **Problema**: os arcos saem cortados no topo. **Por quê**: a altura do arco mais
  longo é proporcional à distância entre os nós, e pode ultrapassar a área de
  desenho. **Solução**: reservar altura suficiente com base na maior distância
  possível entre dois nós conectados.

- **Problema**: crescer demais a rede piora tudo. **Por quê**: em versões maiores
  deste gráfico, com dezenas de nós e mais de cem conexões, o resultado ficou
  poluído mesmo com pan e zoom. **Solução**: manter a rede pequena — a legibilidade
  é a razão de existir da técnica, e escalá-la destrói exatamente isso.

## Variações possíveis

- Espessura do arco proporcional ao peso da conexão, quando as ligações tiverem
  intensidade diferente.
- Arcos abaixo da linha para um segundo tipo de relação, aproveitando os dois lados.
- Ordenar por número de conexões em vez de por grupo, evidenciando os nós centrais.
- Fechar a linha em círculo e obter um layout circular — mais compacto, ao custo de
  rótulos em ângulo.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../comparacao-layouts" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Comparação de layouts de rede (Fruchterman-Reingold, DrL, Aleatório)</span>
    <span class="parecido-razao">O oposto direto: nós posicionados por força/otimização, sem ordem imposta — bom pra revelar estrutura quando não existe uma ordem natural pra explorar.</span>
  </a>
  <a class="parecido-item" href="../hierarchical-edge-bundling-labels" style="--cat-link: var(--cat-network); --cat-link-ink: var(--cat-network-ink);">
    <span class="parecido-cat">network</span>
    <span class="parecido-titulo">Hierarchical Edge Bundling com labels, cores e tamanhos</span>
    <span class="parecido-razao">Mesma ideia — nós numa ordem com significado, ao longo de uma curva — mas fechada em círculo e com as conexões agrupadas em feixes em vez de arcos individuais.</span>
  </a>
</div>

## Notas do coletor

A legenda de grupo ficou ilegível depois que a rede deste gráfico cresceu
numa versão de teste, sem nenhum erro — o texto simplesmente encolheu até
virar um borrão de poucos pixels. O SVG usa `viewBox="0 0 W H"` com
`width="100%"` pra caber redes de tamanhos diferentes na mesma largura de
tela, e isso tem uma consequência que não é óbvia de antemão: qualquer
texto **dentro** do SVG (`<text>`, com `font-size` em unidades do próprio
viewBox) reescala junto com esse viewBox. Quanto maior `W`/`H` fica em
relação ao tamanho real exibido na tela, menor o texto aparece na
prática — o número no `font-size` continua o mesmo no código, só o
resultado visual muda.

A legenda de grupo, que na primeira versão do widget vivia dentro do
próprio `<svg>` como um `<text>` comum, passou a viver num `<div>` HTML
comum ao lado do SVG, com `font-size` de verdade em CSS — que não reescala
com o viewBox, porque não faz parte dele. A regra geral: qualquer SVG com
viewBox que cresce junto com a quantidade de dado (o caso de praticamente
todo gráfico de rede/grafo deste acervo) não deve ter texto de legenda ou
instrução vivendo dentro dele — só o desenho de dado em si, que É pra
escalar junto.
