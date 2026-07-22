# Progresso

> **Escopo**: log de gráficos já adicionados + histórico do projeto. **Leia se**: quiser saber o estado atual antes de continuar. **Não use para**: decisões de arquitetura do projeto (ver "Decisões fechadas" em [`AGENTS.md`](../AGENTS.md)).

Log de todos os gráficos adicionados ao projeto. Atualize sempre que um gráfico novo for concluído (ver [`WORKFLOW.md`](WORKFLOW.md), passo 6).

| Data       | Categoria | Gráfico | Pasta | Fonte |
|------------|-----------|---------|-------|-------|
| 2026-07-21 | network   | Hierarchical Edge Bundling com labels, cores e tamanhos | [graficos/network/hierarchical-edge-bundling-labels](../graficos/network/hierarchical-edge-bundling-labels) | [r-graph-gallery.com/311](https://r-graph-gallery.com/311-add-labels-to-hierarchical-edge-bundling.html) |

## Em andamento (retomar na próxima sessão)

**Gráfico**: chord diagram de "interação entre personagens", baseado em [r-graph-gallery.com/character-interaction-analysis.html](https://r-graph-gallery.com/character-interaction-analysis.html) (usa `circlize::chordDiagram()`; o tutorial original usa dados reais das falas de "The Office" via pacote `schrute`).

- Pasta já criada, ainda vazia: `graficos/flow/chord-diagram-personagens/` (categoria `flow`, não `network`).
- **Decidido com o usuário**: não usar dados reais minerados de texto. Usar um elenco de uma série/livro real (nomes reais), mas com matriz de menções/interações **inventada por mim** (não minerada de transcrição real) — evita instalar `schrute`/`tidytext`/`ggtext`/`here` (pesados, só servem pra minerar texto real). Cogitei elenco de Harry Potter como opção, mas **isso ainda não foi confirmado com o usuário** — perguntar antes de escrever o script.
- **Interatividade (prioridade #1, ver PRODUCT.md)**: usar pacote `chorddiag` (widget D3 interativo) pra gerar `widget.html`, além do `circlize::chordDiagram()` base R pro `output.png` estático.
- Pacotes já instalados: `circlize`, `htmlwidgets`, `remotes`. **Falta instalar** `chorddiag`, que não está no CRAN — precisa `remotes::install_github("mattflor/chorddiag")`.
- Paleta: usar algo diferente do `pal_office` do tutorial original (cores customizadas hex) — ainda não escolhida.
- Depois de pronto: seguir o resto do [`WORKFLOW.md`](WORKFLOW.md) normalmente (README com frontmatter, sync pro site, registrar aqui, dar os comandos git pro usuário).

## Histórico do projeto

- **2026-07-21**: site da galeria (`site/`, Astro) criado — home com filtro por categoria, página de detalhe por gráfico (widget interativo ou imagem com zoom), paleta editorial própria, deploy configurado via GitHub Actions pra GitHub Pages. Detalhes em [`PRODUCT.md`](../PRODUCT.md) e "Decisões fechadas" em [`AGENTS.md`](../AGENTS.md).
- **2026-07-21**: primeiro gráfico adicionado (hierarchical edge bundling). Corrigido bug de auto-conexão (`from == to`) que quebrava `geom_conn_bundle` — ver [`AGENTS.md`](../AGENTS.md) "Lições aprendidas".
- **2026-07-21**: projeto criado. Ambiente configurado (R 4.6.1 + tidyverse, ggraph, igraph, RColorBrewer — ver [`SETUP.md`](SETUP.md)). Estrutura de pastas e documentação inicial criadas.
