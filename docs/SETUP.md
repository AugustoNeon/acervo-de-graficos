# Setup do ambiente

> **Escopo**: ambiente de desenvolvimento (R, pacotes, caminhos de instalação). **Leia se**: for rodar/instalar algo em R. **Não use para**: processo de adicionar gráfico (ver [`WORKFLOW.md`](WORKFLOW.md)).

Registro do que já foi instalado/configurado nesta máquina, para não reinstalar à toa em sessões futuras.

## Ambiente Linux (sessão remota / Claude Code na nuvem)

> As seções abaixo ("R", caminhos `C:\...`, PowerShell) descrevem as máquinas
> Windows do usuário. Sessões rodando neste ambiente remoto (Ubuntu 24.04, sem
> GUI) são uma máquina **diferente** — nada de `Program Files`/`AppData`, e o
> R não vem pré-instalado.

- **Instalação do R**: `sudo apt-get install -y r-base-core r-cran-<pacote>`.
  O Ubuntu empacota várias centenas de pacotes CRAN pré-compilados como
  `r-cran-*` (`apt-cache search "^r-cran-"` lista os disponíveis) — bem mais
  rápido que `install.packages()` puxando do CRAN e compilando na hora (que
  também funciona, mas sem `sudo` grava em `~/R/...` e demora bastante mais
  pra pacotes com código C/C++, como `sf`/`igraph`). Confira o pacote `r-cran-`
  antes de cair pro `install.packages()`. `Rscript`/`R` já entram no `PATH` do
  jeito que o apt instala — sem caminho fixo pra descobrir feito no Windows.
- **`sudo apt-get update` pode falhar parcialmente** (algumas PPAs de terceiros
  fora do ar, ex: `deadsnakes`/`ondrej`) sem impedir o resto — os repositórios
  `archive.ubuntu.com` principais continuam funcionando; não é bloqueante.
- **Locale**: a sessão nasce em `LC_ALL=POSIX`/`C` (não UTF-8) por padrão.
  Rodar `Rscript` assim faz qualquer string com acento ou caractere especial
  (nomes com "ç"/"ã", ou um separador como "·") sair **corrompida** no
  `data.json`/`output.png` — sem nenhum erro, silenciosamente (bytes UTF-8
  válidos reinterpretados um a um). Sempre rodar com locale UTF-8 explícito:
  `LANG=C.UTF-8 LC_ALL=C.UTF-8 Rscript script.R` (`C.utf8` já vem disponível
  via `locale -a`, não precisa instalar nada). Vale conferir o `data.json`
  gerado (`python3 -c "import json; print(json.load(open('data.json')))"`)
  em qualquer gráfico novo com texto acentuado antes de aceitar como pronto.
- **Sem acesso de rede a `r-graph-gallery.com`/`data-to-viz.com`** — o proxy
  de saída bloqueia os dois domínios (confirmado via `curl` E via `WebFetch`,
  não é limitação de uma ferramenta só). Isso muda o processo do
  [WORKFLOW.md](WORKFLOW.md): não dá pra abrir a página de origem pra
  conferir a técnica/variações antes de replicar — o gráfico precisa ser
  montado de memória (conhecimento geral de tipos de gráfico + o que já foi
  visto de outras sessões), e o campo `source` do frontmatter fica sem
  conferência contra a URL real. Avise no README/PROGRESS.md quando isso
  acontecer, pra o usuário saber que aquele link específico não foi validado.
- **`cloud.r-project.org` (CRAN) também pode estar bloqueado** — confirmado
  em 2026-08-25 (`curl` retornou `CONNECT tunnel failed, response 403`;
  `install.packages()` falhou do mesmo jeito). Antes de depender de um
  pacote pra interatividade, confira primeiro se ele está empacotado como
  `r-cran-<nome>` via `apt-cache search "^r-cran-"` (funciona normalmente,
  é o repositório Ubuntu, não o CRAN) — só tente `install.packages()` depois,
  e não assuma que vai funcionar só porque funcionou em uma sessão anterior
  (o bloqueio pode variar por ambiente/sessão). Sem o pacote e sem CRAN, a
  saída é montar a interatividade em D3 puro a partir do `data.json`
  exportado pelo R, em vez do widget do pacote que faltou.
- **Sem Chrome/Edge instalado**, mas o **Chromium do Playwright já vem
  pronto** em `/opt/pw-browsers/chromium` (ver `CLAUDE.md` da raiz). Serve
  tanto pro papel do `webshot2`/`CHROMOTE_CHROME` (thumbnail de widget sem
  equivalente `ggplot2`) quanto pra verificar visualmente a versão D3
  interativa de um gráfico novo — sem precisar de `chromote`/R nenhum,
  basta um script Node com `require('playwright')` (o pacote fica em
  `/opt/node22/lib/node_modules/playwright`, fora do `node_modules` do
  projeto — `require()` do caminho absoluto funciona, `import` ESM não
  resolve sem esse caminho completo). Ver primeiro uso em
  [graficos/flow/alluvial-trajetoria-eleitoral](../graficos/flow/alluvial-trajetoria-eleitoral).
- **`site/node_modules` não existe** até rodar `npm install` dentro de
  `site/` (mesmo aviso já registrado em "Lições aprendidas" do
  [AGENTS.md](../AGENTS.md) pra worktrees novos) — e `npx astro check`
  pede `@astrojs/check`+`typescript` na primeira vez (`npm install -D
  @astrojs/check typescript`) antes de rodar sem prompt interativo.

## R

> **O caminho do R muda de máquina pra máquina — sempre confira antes de usar.**
> Já apareceram os dois casos neste projeto: instalação por-usuário
> (`AppData\Local\Programs\R\`, máquina do usuário `augusto.ryba`) e instalação
> de máquina (`C:\Program Files\R\`, máquina do usuário `augus`, 2026-07-29).
> Nenhum dos dois entra no `PATH` automaticamente. Não assuma nenhum dos dois:
> rode o comando de registro logo abaixo.

Instalado via `winget install --id RProject.R -e --silent --accept-package-agreements --accept-source-agreements`.

- Pacote winget: `RProject.R` (versão 4.6.1)
- Caminhos já vistos (confirme qual vale na máquina atual):
  - `C:\Users\<usuário>\AppData\Local\Programs\R\R-4.6.1` — instalação por-usuário
  - `C:\Program Files\R\R-4.6.1` — instalação de máquina
- Executáveis: `bin\R.exe` e `bin\Rscript.exe` dentro do caminho acima.

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

Adicionado em 2026-08-18 (radar chart com múltiplos grupos — `graficos/ranking/radar-multiplos-grupos`):
- `fmsb` (CRAN) — `radarchart()`, radar/spider chart em grafismo base do R (sem widget). Exige que as duas primeiras linhas do `data.frame` sejam o máximo e o mínimo de cada coluna (define a escala dos eixos).

Adicionado em 2026-08-14 (migração D3 do heatmap com clustering — `graficos/correlation/heatmap-clustering-heatmaply`):
- `pheatmap` (CRAN) — heatmap com clustering hierárquico em base graphics/grid, sem widget. `pheatmap(..., filename="output.png")` desenha direto num PNG (sem `webshot2`/pandoc) e a chamada devolve os objetos `hclust` (`$tree_row`/`$tree_col`) usados no clustering — reaproveitados pra montar a versão D3 sem recalcular nem tentar reproduzir a reordenação de outra biblioteca. Substituiu `heatmaply`+`plotly`+`hrbrthemes` (que ainda podem estar instalados, mas não são mais usados por nenhum gráfico do acervo).

Adicionado em 2026-08-18 (ridgeline plot — `graficos/distribution/ridgeline-avaliacoes-bairros`):
- `ggridges` (CRAN) — `geom_density_ridges_gradient()`, ridgeline/joyplot em cima do `ggplot2`. Instalado com `New-Item` da pasta pessoal (`R_LIBS_USER`) antes, mesma receita do topo desta seção — nesta máquina o R já é instalado no perfil do usuário, então nem sempre é necessário, mas não custa garantir.

> Nota: `pandoc` **não está instalado** nesta máquina. `htmlwidgets::saveWidget(..., selfcontained = TRUE)` depende dele e falha sem — use `selfcontained = FALSE` (gera uma pasta `<nome>_files/` ao lado do HTML com as dependências, precisa manter as duas juntas).

Adicionado em 2026-08-21 (diagrama aluvial — `graficos/flow/alluvial-trajetoria-eleitoral`, ambiente Linux):
- `ggalluvial` (`r-cran-ggalluvial` via apt) — `geom_alluvium()`/`geom_stratum()`, diagrama aluvial de eixos discretos em cima do `ggplot2`.

Adicionado em 2026-08-21 (mapa hexagonal — `graficos/map/mapa-hexbin-avistamentos-aves`, ambiente Linux):
- `maps` (`r-cran-maps` via apt, geralmente já vem como dependência transitiva de outro pacote) — base de dados de contorno de país/estado (`world`, `usa`, `france`...) embutida no próprio pacote, sem precisar de shapefile/GeoJSON externo nem acesso à internet. `ggplot2::map_data("world", region = "<país>")` usa essa base por baixo. Resolve offline o mesmo problema que motivaria `geobr`/`rnaturalearth` (indisponíveis neste ambiente — ver "Ambiente Linux" acima) pra qualquer país/região que já exista na base `world` do `maps`.
- `hexbin` (`r-cran-hexbin` via apt) — motor de binning hexagonal por trás do `ggplot2::geom_hex()`. Sozinho (sem `ggplot2`) só é útil pra reconstruir a geometria de um hexágono já calculado (`hexbin::hexcoords()`) — ver "Lições aprendidas" em [AGENTS.md](../AGENTS.md) pra fórmula exata (`dx = width/2, dy = height/sqrt(3)/2`, não documentada, lida do código-fonte de `ggplot2:::GeomHex`).
- `rnaturalearthdata` (`r-cran-rnaturalearthdata` via apt) — dados do Natural Earth (contorno de país E de estado/província, 1:110m e 1:50m) embutidos como objetos `sf` prontos (`data(states50, package="rnaturalearthdata")`), sem precisar do pacote `rnaturalearth` (que faz o download sob demanda e não está disponível neste ambiente — ver "Ambiente Linux" acima) nem de internet nenhuma. `states50` cobre o mundo inteiro (filtrar por `admin == "<país>"`) com nome, sigla (`postal`) e centroide (`latitude`/`longitude`) já resolvidos por estado — usado pra desenhar fronteira estadual do Brasil e rotular cada uma com a sigla. Atenção: pelo menos um polígono desse dataset tem um anel com vértice duplicado (auto-interseção) — `sf::st_join()`/outros testes topológicos falham com `Loop 0 is not valid` sem rodar `sf::st_make_valid()` no objeto antes (`geom_polygon()`/desenho simples não é afetado, só operação topológica).

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
