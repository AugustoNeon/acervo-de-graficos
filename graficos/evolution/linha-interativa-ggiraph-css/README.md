---
title: "Linha interativa com CSS customizado (ggiraph)"
category: evolution
date: 2026-07-24
source: "https://r-graph-gallery.com/412-customize-css-in-interactive-ggiraph.html"
interactive: true
---

## Observações

- Pacote extra usado (além dos já no ambiente): `ggiraph`.
- A página original mostra 5 variações de código incrementais, mas todas em cima do **mesmo gráfico** (linha interativa de série temporal) — só o CSS de interação muda (hover simples → hover com destaque/esmaecimento das outras linhas → tooltip estilizado → zoom/seleção/toolbar). Por serem muito parecidas entre si, viraram **um gráfico só**, combinando as técnicas mais úteis de cada variação em vez de uma pasta por variação (ver [`AGENTS.md`](../../../AGENTS.md), regra do usuário: dividir em páginas separadas só quando os gráficos mudam muito entre si).
- Técnicas combinadas: hover destaca a linha/ponto (`opts_hover`) e esmaece + tira saturação das demais (`opts_hover_inv`, útil pra "despoluir" um spaghetti chart), tooltip com fundo escuro/cantos arredondados (`opts_tooltip`), clique fixa uma linha selecionada (`opts_selection`), zoom por scroll (`opts_zoom`) e botão de exportar PNG (`opts_toolbar`).
- `geom_line_interactive()`/`geom_point_interactive()` funcionam como os `geom_*` normais quando o `plot` é passado direto pro `ggsave()` (fora do `girafe()`) — as estéticas de interatividade (`tooltip`, `data_id`) são só ignoradas. Por isso `output.png` e `widget.html` vêm do mesmo objeto `plot`, sem duplicar código.
- Dado fictício (índice de sentimento econômico, passeio aleatório) em vez do CSV real do tutorial (~9 países, dado de confiança do consumidor real).
