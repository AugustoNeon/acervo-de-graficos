---
title: "Linha interativa com CSS customizado (ggiraph)"
category: evolution
date: 2026-07-24
source: "https://r-graph-gallery.com/412-customize-css-in-interactive-ggiraph.html"
interactive: true
---

## Observações

- Pacote extra usado (além dos já no ambiente): `ggiraph`.
- A página original mostra 5 variações de código incrementais, mas todas em cima do **mesmo gráfico** (linha interativa de série temporal) — só o CSS de interação muda entre elas (hover simples → hover com destaque/esmaecimento das outras linhas → hover avançado com sombra/tracejado → tooltip estilizado + zoom + seleção múltipla). Por pedido do usuário, viraram **um gráfico só**: em vez de fixar um tratamento de CSS ou dividir em pastas separadas, o `widget.html` tem uma **barra de botões acima do gráfico** que troca ao vivo qual das 4 variações de interação fica visível (mesmo `plot`/dados nas 4, só o `girafe_options()` muda).
- `geom_line_interactive()`/`geom_point_interactive()` funcionam como os `geom_*` normais quando o `plot` é passado direto pro `ggsave()` (fora do `girafe()`) — as estéticas de interatividade (`tooltip`, `data_id`) são só ignoradas. Por isso `output.png` vem do mesmo objeto `plot` reaproveitado nos 4 `girafe()`, sem duplicar o código do gráfico em si.
- `htmltools::save_html()` (o mesmo usado no tutorial original) foi usado em vez de `htmlwidgets::saveWidget()` porque aceita uma `tagList()` combinando **vários** widgets `girafe` + HTML/CSS/JS customizado num único arquivo — `saveWidget()` só salva um widget por vez. `libdir = "widget_files"` explícito pra bater com a convenção do projeto (por padrão o `save_html()` usaria `lib/`).
- A barra de botões é JS puro (sem framework): cada painel (`.estilo-painel`, um por `girafe()`) fica com `display:none` exceto o ativo, alternado via `classList` no clique do botão correspondente. Testado disparando clique de verdade no DOM: a troca de painel funciona e o CSS de cada estilo (ex: `.hover_inv_svg_xxx { opacity:0.15; filter:grayscale(80%); }` do painel 2) bate exatamente com o `opts_hover_inv()` do `script.R`.
- Dado fictício (índice de sentimento econômico, passeio aleatório) em vez do CSV real do tutorial (~9 países, dado de confiança do consumidor real).
