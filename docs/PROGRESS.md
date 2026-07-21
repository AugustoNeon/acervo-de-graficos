# Progresso

> **Escopo**: log de gráficos já adicionados + histórico do projeto. **Leia se**: quiser saber o estado atual antes de continuar. **Não use para**: decisões de arquitetura do projeto (ver "Decisões fechadas" em [`AGENTS.md`](../AGENTS.md)).

Log de todos os gráficos adicionados ao projeto. Atualize sempre que um gráfico novo for concluído (ver [`WORKFLOW.md`](WORKFLOW.md), passo 6).

| Data       | Categoria | Gráfico | Pasta | Fonte |
|------------|-----------|---------|-------|-------|
| 2026-07-21 | network   | Hierarchical Edge Bundling com labels, cores e tamanhos | [graficos/network/hierarchical-edge-bundling-labels](../graficos/network/hierarchical-edge-bundling-labels) | [r-graph-gallery.com/311](https://r-graph-gallery.com/311-add-labels-to-hierarchical-edge-bundling.html) |

## Histórico do projeto

- **2026-07-21**: site da galeria (`site/`, Astro) criado — home com filtro por categoria, página de detalhe por gráfico (widget interativo ou imagem com zoom), paleta editorial própria, deploy configurado via GitHub Actions pra GitHub Pages. Detalhes em [`PRODUCT.md`](../PRODUCT.md) e "Decisões fechadas" em [`AGENTS.md`](../AGENTS.md).
- **2026-07-21**: primeiro gráfico adicionado (hierarchical edge bundling). Corrigido bug de auto-conexão (`from == to`) que quebrava `geom_conn_bundle` — ver [`AGENTS.md`](../AGENTS.md) "Lições aprendidas".
- **2026-07-21**: projeto criado. Ambiente configurado (R 4.6.1 + tidyverse, ggraph, igraph, RColorBrewer — ver [`SETUP.md`](SETUP.md)). Estrutura de pastas e documentação inicial criadas.
