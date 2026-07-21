# Graficos

Galeria pessoal de gráficos em R, replicados a partir de [R Graph Gallery](https://r-graph-gallery.com/). O objetivo é adicionar gráficos novos periodicamente, aprendendo diferentes tipos de visualização e construindo uma referência reutilizável de código.

## Para IAs continuando este projeto

Comece por [`AGENTS.md`](AGENTS.md) — é o contrato vivo do projeto (protocolo de primeira sessão, lições aprendidas, decisões fechadas). Ele aponta para os demais docs conforme necessário:
1. [`docs/SETUP.md`](docs/SETUP.md) — ambiente já configurado (R, pacotes, caminhos). Confira antes de rodar qualquer script.
2. [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — passo a passo para adicionar um novo gráfico.
3. [`docs/PROGRESS.md`](docs/PROGRESS.md) — log do que já foi feito, para não repetir gráficos e saber o estado atual.

## Estrutura

```
Graficos/
  docs/
    SETUP.md       -> ambiente (R, pacotes, paths)
    WORKFLOW.md     -> como adicionar um novo gráfico
    PROGRESS.md     -> log/índice de tudo que foi adicionado
  graficos/
    distribution/   -> histogramas, densidade, boxplot, violin...
    correlation/     -> scatter, bubble, heatmap de correlação...
    ranking/          -> barplot, lollipop, parallel coords...
    part-of-whole/    -> pie, donut, treemap, dendrogram...
    evolution/        -> line chart, area chart, stream graph...
    map/               -> mapas coropléticos, cartogramas...
    flow/              -> sankey, chord diagram, network arc...
    comparison/        -> radar, spider, small multiples...
    network/           -> grafos, hierarquia (ggraph/igraph)...
    general/           -> o que não se encaixa nas categorias acima
  _template/          -> modelo para criar um novo gráfico
```

Cada gráfico vive em `graficos/<categoria>/<slug-do-grafico>/` com três arquivos:
- `script.R` — código fonte (adaptado do R Graph Gallery)
- `output.png` — imagem gerada
- `README.md` — fonte original, notas, data

## Categorias (baseadas no R Graph Gallery)

As categorias em `graficos/` espelham a navegação do próprio site, o que facilita achar exemplos parecidos quando for adicionar um novo.
