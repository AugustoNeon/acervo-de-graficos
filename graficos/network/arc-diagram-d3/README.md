---
title: "Arc diagram (com versão interativa em D3.js)"
category: network
date: 2026-07-23
source: "https://www.data-to-viz.com/graph/arc.html"
interactive: true
---

## Observações

- **Pedido do usuário**: tentar tornar esse gráfico interativo, "mesmo que use outra linguagem". Não existe pacote R (nem `networkD3`, nem `plotly`/`ggplotly`) com um layout de arc diagram pronto — o `ggraph` só produz a versão estática (`layout = "linear"` + `geom_edge_arc()`). Por isso, pela primeira vez no projeto, o `widget.html` **não foi gerado por um pacote R**: foi escrito à mão em D3.js puro (v7), enquanto o `output.png` continua vindo do `script.R`/`ggraph` normalmente, os dois usando exatamente os mesmos dados fictícios (pra ficarem comparáveis).
- **Atualizado a pedido do usuário**: rede ampliada bem além da versão inicial — de 14 nós/17 conexões para **72 nós em 6 grupos / 115 conexões** (`script.R` gera essa rede via `set.seed(2027)`: um anel dentro de cada grupo + cordas extras + pontes entre grupos, 70% priorizando grupos vizinhos e 30% aleatórias entre quaisquer grupos, pra ter tanto arcos curtos quanto alguns bem longos). Ordem dos nós continua agrupada de propósito — o tutorial original alerta que ordem aleatória deixa o arc diagram ilegível.
- **Navegação adicionada**: com 72 nós a rede ficou larga demais pra caber inteira e legível ao mesmo tempo, então o widget agora tem pan (arrastar) e zoom (scroll/pinça) via `d3.zoom()`, com duplo-clique resetando a visão. Dica de uso aparece no canto do próprio gráfico.
- **`script.R` agora é a fonte única de verdade pros dois formatos**: além de gerar `output.png`, o script exporta `nodes`/`links`/`groupColor` como `widget_files/data.js` (via `jsonlite::toJSON`), que o `widget.html` carrega com uma tag `<script src>` normal (evita problema de CORS que um `fetch()` de JSON local teria se o arquivo fosse aberto direto via `file://`). Rodar `script.R` de novo regenera os dois formatos em conjunto — não edite `data.js` à mão.
- Paleta customizada por grupo (6 cores: `#e07a5f`/`#3d5a80`/`#8dbf6d`/`#f2cc8f`/`#81b29a`/`#9b5de5`), igual nas duas versões (estática e interativa). O exemplo original não tem grupo nenhum — usa uma única cor sólida (`"#69b3a2"`) pra tudo.
- Interatividade: hover num nó destaca todos os arcos conectados a ele (e mostra tooltip com nome/grupo/número de conexões), hover num arco mostra tooltip "origem → destino", legenda de grupos fixa no topo (não se move com o pan/zoom) — nada disso existe na página/técnica original.
- `widget_files/d3.v7.min.js`: baixado localmente (`d3@7.9.0`) em vez de referenciar via CDN, seguindo o mesmo padrão self-contained dos outros widgets do projeto (funciona offline).
- **Detalhe técnico do teste**: a ferramenta de screenshot do Browser deu timeout nesta sessão (mesmo problema já registrado em [AGENTS.md](../../../AGENTS.md) "Lições aprendidas"), incluindo pra confirmar a *animação* do reset por duplo-clique (o pane de preview não compõe frames, então `transition()`/`requestAnimationFrame` não avança nos testes). Por isso o reset foi implementado como `svg.call(zoom.transform, d3.zoomIdentity)` **sem** `.transition()` — instantâneo, mas 100% verificável via JS (`__zoom` muda de imediato), em vez de uma versão animada que eu não conseguiria confirmar que funciona. Zoom (wheel), pan (drag) e reset (duplo-clique) testados via eventos JS reais disparados no DOM, todos corretos.
