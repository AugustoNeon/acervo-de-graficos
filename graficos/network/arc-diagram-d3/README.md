---
title: "Arc diagram (com versão interativa em D3.js)"
category: network
date: 2026-07-23
source: "https://www.data-to-viz.com/graph/arc.html"
interactive: true
---

## Observações

- **Pedido do usuário**: tentar tornar esse gráfico interativo, "mesmo que use outra linguagem". Não existe pacote R (nem `networkD3`, nem `plotly`/`ggplotly`) com um layout de arc diagram pronto — o `ggraph` só produz a versão estática (`layout = "linear"` + `geom_edge_arc()`). Por isso, pela primeira vez no projeto, o `widget.html` **não foi gerado por um pacote R**: foi escrito à mão em D3.js puro (v7), enquanto o `output.png` continua vindo do `script.R`/`ggraph` normalmente, os dois usando exatamente os mesmos dados fictícios (pra ficarem comparáveis).
- Dados 100% fictícios: 14 nós em 3 grupos (`A1`-`A5`, `B1`-`B5`, `C1`-`C4`), 17 conexões (majoritariamente dentro do grupo + 4 pontes entre grupos). Ordem dos nós é agrupada de propósito — o próprio tutorial original alerta que uma ordem aleatória deixa o arc diagram ilegível (um dos 3 exemplos da página demonstra esse erro comum).
- Paleta customizada por grupo (`#e07a5f`/`#3d5a80`/`#8dbf6d`), igual nas duas versões (estática e interativa). O exemplo original não tem grupo nenhum — usa uma única cor sólida (`"#69b3a2"`) pra tudo.
- **Interatividade extra, além do pedido original**: hover num nó destaca todos os arcos conectados a ele (e mostra tooltip com nome/grupo/número de conexões), hover num arco mostra tooltip "origem → destino", e uma legenda de grupos no topo — nada disso existe na página original (nem na versão estática nem na ideia geral do gráfico), foi acrescentado pra aproveitar a interatividade de verdade.
- `widget_files/d3.v7.min.js`: baixado localmente (`d3@7.9.0`) em vez de referenciar via CDN, seguindo o mesmo padrão self-contained dos outros widgets do projeto (funciona offline, sem depender de internet no momento de visualizar).
- Testado via DOM/JS (disparando eventos `mouseover`/`mouseout` manualmente) em vez de captura de tela, porque a ferramenta de screenshot do Browser deu timeout nesta sessão (mesmo problema já registrado em [AGENTS.md](../../../AGENTS.md) "Lições aprendidas") — comportamento de hover conferido e correto.
