# Setup do ambiente

> **Escopo**: ambiente de desenvolvimento (R, pacotes, caminhos de instalação). **Leia se**: for rodar/instalar algo em R. **Não use para**: processo de adicionar gráfico (ver [`WORKFLOW.md`](WORKFLOW.md)).

Registro do que já foi instalado/configurado nesta máquina, para não reinstalar à toa em sessões futuras.

## R

Instalado via `winget` em 2026-07-21.

- Pacote winget: `RProject.R` (versão 4.6.1)
- Caminho de instalação real: `C:\Users\augusto.ryba\AppData\Local\Programs\R\R-4.6.1`
- Executáveis:
  - `C:\Users\augusto.ryba\AppData\Local\Programs\R\R-4.6.1\bin\R.exe`
  - `C:\Users\augusto.ryba\AppData\Local\Programs\R\R-4.6.1\bin\Rscript.exe`

> Nota: o instalador do winget não necessariamente adiciona R ao `PATH` do sistema. Se `Rscript` não for reconhecido direto no terminal, use o caminho completo acima, ou rode:
> ```powershell
> $env:PATH += ";C:\Users\augusto.ryba\AppData\Local\Programs\R\R-4.6.1\bin"
> ```

Para checar se ainda está instalado e achar o caminho novamente, caso algo mude:
```powershell
Get-ItemProperty "HKCU:\SOFTWARE\R-core\R64\*" -ErrorAction SilentlyContinue | Select-Object InstallPath
```

## Pacotes R instalados

Instalados via CRAN (`repos = "https://cloud.r-project.org"`):

- `tidyverse` (inclui ggplot2, dplyr, etc.)
- `ggraph`
- `igraph`
- `RColorBrewer`

Comando usado:
```r
install.packages(c("tidyverse","ggraph","igraph","RColorBrewer"), repos="https://cloud.r-project.org")
```

Adicionados em 2026-07-22 (gráfico de streamgraph):
- `webshot2` + `chromote` (CRAN) — tiram screenshot de um `widget.html` pra gerar `output.png` em gráficos que só existem como htmlwidget (sem equivalente `ggplot2`). Usa o Chrome já instalado na máquina (`C:\Program Files\Google\Chrome\Application\chrome.exe`) via CDP, não precisa de PhantomJS.
- `streamgraph` (só GitHub, não está no CRAN): `remotes::install_github("hrbrmstr/streamgraph")`.

Adicionado em 2026-07-22 (gráfico de rede interativa):
- `networkD3` (CRAN) — `simpleNetwork()`/`forceNetwork()`, redes interativas D3. Mesmo padrão do streamgraph pra thumbnail: sem equivalente `ggplot2`, `output.png` via `webshot2` sobre o `widget.html`.

Adicionados em 2026-07-22 (gráfico de heatmap):
- `heatmaply` + `plotly` + `hrbrthemes` (CRAN) — `heatmaply()` gera heatmap interativo (via plotly) com clustering hierárquico. Traz `dendextend`/`seriation`/`webshot` (antigo) como dependências transitivas.

Adicionados em 2026-07-24 (gráficos de rede vindos de data-to-viz.com/graph/network.html):
- `patchwork` (CRAN) — combina múltiplos plots `ggplot`/`ggraph` num único `output.png` (grid de painéis lado a lado), usado nos gráficos de comparação (layouts, tipos básicos de rede).
- `visNetwork` (CRAN) — rede interativa via `vis.js`, com suporte nativo a setas (grafo direcionado) e espessura de linha por peso (`value=`), além de nós arrastáveis com física ligada. Mesmo padrão de thumbnail via `webshot2` quando não há equivalente `ggplot2` direto.

Adicionado em 2026-07-24 (gráfico de linha interativo com CSS via ggiraph):
- `ggiraph` (CRAN) — extensão do `ggplot2` com `geom_*_interactive()` (drop-in dos `geom_*` normais, aceitam `tooltip`/`data_id`/`onclick`) e `girafe()`/`girafe_options()` pra customizar hover/tooltip/seleção/zoom via CSS puro. Traz `gdtools`/`fontquiver`/`fontBitstreamVera`/`fontLiberation` como dependências transitivas (fontes pro SVG). Mesmo objeto `ggplot` funciona pro `output.png` (via `ggsave()` normal, as aes de interatividade são ignoradas) e pro `widget.html` (via `girafe()`), sem precisar duplicar o plot.

> Nota: `pandoc` **não está instalado** nesta máquina. `htmlwidgets::saveWidget(..., selfcontained = TRUE)` depende dele e falha sem — use `selfcontained = FALSE` (gera uma pasta `<nome>_files/` ao lado do HTML com as dependências, precisa manter as duas juntas).

### Instalando pacotes adicionais

Gráficos diferentes no R Graph Gallery podem pedir pacotes extras (ex: `treemapify`, `ggalluvial`, `circlize`, `sf` para mapas, `networkD3`, `viridis`, `patchwork`). Antes de rodar um script novo, olhe os `library(...)` no topo e instale o que faltar:

```r
install.packages("nome_do_pacote", repos="https://cloud.r-project.org")
```

Atualize esta seção com pacotes novos relevantes de uso frequente, se fizer sentido.

## Como rodar um script

```powershell
& "C:\Users\augusto.ryba\AppData\Local\Programs\R\R-4.6.1\bin\Rscript.exe" caminho\para\script.R
```

O script deve salvar a imagem final com `ggsave()` (ou equivalente) dentro da própria pasta do gráfico, como `output.png`.
