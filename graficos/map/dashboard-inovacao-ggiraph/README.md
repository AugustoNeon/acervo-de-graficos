---
title: "Dashboard interativo: mapa + dispersão + barras (ggiraph)"
category: map
date: 2026-07-27
source: "https://r-graph-gallery.com/414-map-multiple-charts-in-ggiraph.html"
interactive: true
---

## Observações

- Dashboard com **mapa coroplético + gráfico de dispersão + gráfico de barras**, ligados por interatividade (`ggiraph` + `patchwork`) — passar o mouse num painel destaca o mesmo dado nos outros dois.
- Dados 100% fictícios: investimento em P&D (US$ bi) e índice de inovação (0–100) por país, gerados com `set.seed(1414)` (baseline por continente + ruído aleatório), no lugar do PIB x índice de felicidade reais (dataset Gapminder) do tutorial original. Geografia real (`spData::world`), valores inventados.
- Paleta trocada para `YlGnBu` (o original usava um gradiente azul simples), reforçando o tema "inovação/tecnologia".
- A página original tem 6 variações de interatividade crescente, a primeira delas (mtcars, sem mapa) só introdutória; as outras 5 (todas com o mapa-múndi) viraram os botões deste gráfico, a pedido do usuário — igual ao padrão já usado no gráfico [linha interativa com CSS customizado (ggiraph)](../../evolution/linha-interativa-ggiraph-css):
  1. **Por país** — hover simples destaca o país sob o mouse nos 3 painéis (`data_id = name_long`).
  2. **Por continente** — hover destaca todos os países do mesmo continente ao mesmo tempo (`data_id = continent`).
  3. **CSS customizado** — hover com transição suave + tooltip escuro customizado.
  4. **Glow avançado** — brilho via `filter: drop-shadow(...)` + tooltip em gradiente.
  5. **Esmaecer não-selecionado** — `opts_hover_inv()` dessatura/apaga tudo que não está sob hover.
- Pacote novo: `spData` (CRAN) — fornece o objeto `sf` `world` (177 países, geometria + continente) sem precisar baixar shapefile externo; usado só como fonte de geometria/nomes, os valores numéricos são todos inventados. Ver [SETUP.md](../../../docs/SETUP.md).
- `output.png` gerado via `ggsave()` direto da combinação "por país" (as aes de interatividade são ignoradas fora do `girafe()`, mesmo objeto `patchwork` serve pras duas saídas). `widget.html` combina os 5 widgets `girafe` numa `tagList` só via `htmltools::save_html()`, com a mesma barra de botões (HTML/CSS/JS puro) do gráfico de linha interativa.
