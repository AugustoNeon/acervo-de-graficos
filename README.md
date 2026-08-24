# Graficos

Galeria pessoal de gráficos em R. O objetivo é adicionar gráficos novos periodicamente, aprendendo diferentes tipos de visualização e construindo uma referência reutilizável de código.

Projeto inspirado e baseado no [R Graph Gallery](https://r-graph-gallery.com/), replicando e adaptando exemplos de lá com dados fictícios próprios.

## Site

O acervo navegável, publicado a partir de `site/`: **[augustoneon.github.io/acervo-de-graficos](https://augustoneon.github.io/acervo-de-graficos/)**

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
- `script.R` — código fonte
- `output.png` — imagem gerada
- `README.md` — notas, data

## Categorias

As categorias em `graficos/` cobrem os principais tipos de visualização, o que facilita achar exemplos parecidos quando for adicionar um novo.
