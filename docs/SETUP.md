# Setup do ambiente

> **Escopo**: ambiente de desenvolvimento (R, pacotes, caminhos de instalação). **Leia se**: for rodar/instalar algo em R. **Não use para**: processo de adicionar gráfico (ver [`WORKFLOW.md`](WORKFLOW.md)).

Registro do que já foi instalado/configurado nesta máquina, para não reinstalar à toa em sessões futuras.

## R

> **2026-07-29**: sessão rodando numa máquina diferente da de 2026-07-21 (usuário
> `augus`, não `augusto.ryba`) — R não estava instalado nela, reinstalado do
> zero via `winget`. Desta vez o instalador colocou em `C:\Program Files\R\`
> (instalação de máquina) em vez de `AppData\Local\Programs` (instalação
> por-usuário, o que saiu da vez anterior). Os caminhos abaixo já refletem a
> máquina atual; se abrir numa terceira máquina e os caminhos não baterem, não
> assuma nenhum dos dois — confira com o comando de registro logo abaixo.

Instalado via `winget install --id RProject.R -e --silent --accept-package-agreements --accept-source-agreements`.

- Pacote winget: `RProject.R` (versão 4.6.1)
- Caminho de instalação real: `C:\Program Files\R\R-4.6.1`
- Executáveis:
  - `C:\Program Files\R\R-4.6.1\bin\R.exe`
  - `C:\Program Files\R\R-4.6.1\bin\Rscript.exe`

> Nota: o instalador do winget não necessariamente adiciona R ao `PATH` do sistema. Se `Rscript` não for reconhecido direto no terminal, use o caminho completo acima.

Para checar se ainda está instalado e achar o caminho novamente, caso algo mude:
```powershell
Get-ItemProperty "HKCU:\SOFTWARE\R-core\R64\*" -ErrorAction SilentlyContinue | Select-Object InstallPath
# se vazio (instalacao de maquina, nao por-usuario, feita como administrador),
# procure direto em Program Files:
Get-ChildItem "C:\Program Files\R" -ErrorAction SilentlyContinue
```

> **Biblioteca de pacotes do usuário não existe por padrão**: quando o R fica em
> `C:\Program Files\R\...`, `install.packages()` sem `lib=` explícito tenta
> gravar na biblioteca do próprio R (`C:/Program Files/R/R-4.6.1/library`), que
> não é gravável sem privilégio de admin — falha com "não é possível instalar
> pacotes" num `Rscript` não-interativo (numa sessão interativa normal do R,
> ele perguntaria e criaria a biblioteca pessoal sozinho; `Rscript` não
> pergunta nada, só falha). Solução: criar a pasta pessoal (`R_LIBS_USER`)
> antes do primeiro `install.packages()` da sessão:
> ```powershell
> New-Item -ItemType Directory -Force -Path "$env:LOCALAPPDATA\R\win-library\4.6"
> ```
> Depois de criada, `.libPaths()` passa a incluir essa pasta automaticamente
> nas próximas chamadas de `Rscript` (o R só adiciona `R_LIBS_USER` à lista se
> a pasta já existir em disco no momento em que inicia).

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
- `webshot2` + `chromote` (CRAN) — tiram screenshot de um `widget.html` pra gerar `output.png` em gráficos que só existem como htmlwidget (sem equivalente `ggplot2`), e também servem pra **conferir visualmente** um widget já existente sem abrir o navegador na mão. Usa um navegador Chromium da máquina via CDP, não precisa de PhantomJS.
  > **2026-07-29**: esta máquina **não tem Google Chrome** — o `webshot2` falha com "Google Chrome was not found". Tem Edge (também Chromium), em `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, e funciona igual apontando a variável de ambiente antes de chamar o R:
  > ```powershell
  > $env:CHROMOTE_CHROME = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
  > ```
  > Vale checar quais navegadores existem antes de assumir o Chrome (`Test-Path` nos caminhos de Chrome/Edge).
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

Adicionado em 2026-07-27 (bubble map interativo do Brasil):
- `leaflet` (CRAN) — mapas interativos (`addProviderTiles`, `addCircleMarkers`, `addLegend`). Traz `sf`/`terra`/`s2`/`raster`/`units`/`classInt` como dependências transitivas. Mesmo padrão de thumbnail via `webshot2` (sem equivalente `ggplot2` direto).

Adicionado em 2026-07-27 (dashboard mapa+dispersão+barras com ggiraph):
- `spData` (CRAN) — fornece o objeto `sf` `world` (177 países, geometria + continente) pronto pra uso, sem precisar baixar shapefile externo. Usado com `geom_sf_interactive()` do `ggiraph` + `patchwork` pra combinar mapa coroplético com outros paineis `ggplot` interativos.

Adicionado em 2026-07-27 (dispersão 3D de cafés especiais):
- `rgl` (CRAN) — gráficos 3D (`plot3d()`, `open3d()`), com widget interativo via `rglwidget()`. Funciona headless (sem janela gráfica real) com `options(rgl.useNULL = TRUE)` **definido antes de `library(rgl)`** — sem isso o script espera um dispositivo OpenGL real e pode travar/falhar num `Rscript` não-interativo. Detalhe importante: `legend3d()` **não renderiza** nesse modo headless (limitação conhecida), nem no `output.png` nem dentro do `rglwidget()` — a legenda do `output.png` é composta manualmente por cima do `snapshot3d()` com gráficos base do R (`png` + `rasterImage()` + `legend()`), e a do widget interativo vira uma lista HTML comum (`htmltools`) ao lado do gráfico em vez de dentro da cena. O pacote `png` (CRAN) é usado só pra essa composição do `output.png`. Outro detalhe: o canvas WebGL do `rglwidget()` nasce com largura fixa em pixels (herdada do `open3d(windowRect=...)`) e estoura a largura da página — precisa de `max-width: 100%` via CSS no canvas pra virar responsivo.

Adicionado em 2026-07-29 (circle packing, um nível — `graficos/part-of-whole/circle-packing-simples`):
- `packcircles` (CRAN) — calcula o layout (posição + raio) de círculos compactados sem sobreposição a partir de um vetor de valores (`circleProgressiveLayout()` + `circleLayoutVertices()`). Combinado com `ggiraph` (já usado antes neste projeto) pra versão interativa via `geom_polygon_interactive()`.

Adicionado em 2026-07-29 (circle packing hierárquico — `graficos/part-of-whole/circle-packing-hierarquico`):
- `data.tree` (CRAN) — representa hierarquias como árvore em R (`as.Node()` a partir de uma coluna `pathString`, ex: `"raiz/grupo/subgrupo"`). Aceita nomes repetidos em galhos diferentes (cada nó é distinguido pela posição na árvore, não só pelo nome) — ao contrário de `igraph::graph_from_data_frame()`, que exige nome único por vértice em todo o grafo.
- `circlepackeR` (só GitHub, não está no CRAN): `remotes::install_github("jeromefroe/circlepackeR")`. Widget interativo de circle packing hierárquico com zoom por clique, construído sobre um objeto `data.tree::Node`. Calcula o próprio diâmetro como o menor valor entre largura e altura do container (`Math.min(rect.width, rect.height)` no JS do widget) — passar `width`/`height` explícitos em vez de deixar `NULL` evita depender do tamanho padrão do container.
- `ggraph`/`igraph` já estavam no projeto desde 2026-07-21 (ver início desta seção) — só precisaram ser reinstalados nesta máquina nova.

> Nota: `pandoc` **não está instalado** nesta máquina. `htmlwidgets::saveWidget(..., selfcontained = TRUE)` depende dele e falha sem — use `selfcontained = FALSE` (gera uma pasta `<nome>_files/` ao lado do HTML com as dependências, precisa manter as duas juntas).

### Instalando pacotes adicionais

Gráficos diferentes no R Graph Gallery podem pedir pacotes extras (ex: `treemapify`, `ggalluvial`, `circlize`, `sf` para mapas, `networkD3`, `viridis`, `patchwork`). Antes de rodar um script novo, olhe os `library(...)` no topo e instale o que faltar:

```r
install.packages("nome_do_pacote", repos="https://cloud.r-project.org")
```

Atualize esta seção com pacotes novos relevantes de uso frequente, se fizer sentido.

## Como rodar um script

```powershell
& "C:\Program Files\R\R-4.6.1\bin\Rscript.exe" caminho\para\script.R
```

(Confirme o caminho real do `Rscript.exe` no início da seção "R" acima antes de assumir este — já mudou de máquina pra máquina neste projeto.)

O script deve salvar a imagem final com `ggsave()` (ou equivalente) dentro da própria pasta do gráfico, como `output.png`.
