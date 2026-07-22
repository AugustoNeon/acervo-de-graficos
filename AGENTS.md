# AGENTS.md

> Contrato vivo deste projeto. Leia este arquivo primeiro em qualquer sessão nova, antes de fazer qualquer coisa. Mantenha-o enxuto — se uma seção crescer demais, mova o detalhe pra dentro de `docs/` e deixe aqui só um link.

## Sobre o projeto

Duas partes:
1. Galeria pessoal de gráficos em R, replicados a partir do [R Graph Gallery](https://r-graph-gallery.com/), adicionados aos poucos ao longo do tempo. Ver [README.md](README.md) para visão geral e estrutura de pastas.
2. Um site (`site/`, Astro) que exibe essa galeria de forma navegável e interativa. Contexto de produto/design completo em [PRODUCT.md](PRODUCT.md) — leia antes de mexer no site.

## Como rodar

Ambiente R já configurado (R + pacotes). Detalhes completos, caminhos e como instalar pacotes novos: [docs/SETUP.md](docs/SETUP.md). Não reinstale nada sem checar esse arquivo primeiro.

Site (`site/`): `cd site && npm run dev`.

## Adicionando um gráfico novo

Processo passo a passo: [docs/WORKFLOW.md](docs/WORKFLOW.md). Resumo: escolher gráfico não repetido → criar pasta em `graficos/<categoria>/<slug>/` a partir de `_template/` → copiar/rodar script → tentar versão interativa (prioridade, ver [PRODUCT.md](PRODUCT.md)) → preencher frontmatter+README da pasta → registrar em [docs/PROGRESS.md](docs/PROGRESS.md).

## Git e commits

**Eu (a IA) nunca rodo `git add`/`git commit`/`git push` neste projeto — só o usuário commita**, pra manter o histórico de commits do repositório público (https://github.com/AugustoNeon/acervo-de-graficos.git) com autoria só dele. No fim de cada sessão onde algo mudou, eu forneço os comandos `git` prontos pra ele copiar e rodar, de forma simples e direta, sem executar nada sozinha.

## Primeira sessão — protocolo do agente

Ao abrir este repositório pela primeira vez numa sessão nova:

1. Leia este `AGENTS.md` inteiro.
2. Leia [docs/PROGRESS.md](docs/PROGRESS.md) pra saber o que já foi feito e não repetir gráfico.
3. Se for rodar ou instalar algo em R, leia [docs/SETUP.md](docs/SETUP.md) antes — não assuma caminhos padrão de instalação (ver "Lições aprendidas" abaixo).
4. Se for adicionar gráfico novo, siga [docs/WORKFLOW.md](docs/WORKFLOW.md) do início ao fim.
5. Cada informação mora em UM arquivo só — os outros linkam, não duplicam. Se notar algo desatualizado aqui ou em `docs/`, corrija na mesma sessão em que perceber, não deixe pra depois.

## Convenções

- Um gráfico = uma pasta (`script.R` + `output.png` + `README.md`), nunca vários gráficos no mesmo script.
- Não refatorar/"melhorar" o código do R Graph Gallery — o objetivo é replicar e entender, não redesenhar.
- Categorias de `graficos/` espelham a navegação do próprio site — crie uma categoria nova só se nenhuma existente encaixar.

## Lições aprendidas

_(mais recente no topo — poda entradas muito antigas/óbvias de tempos em tempos)_

- **2026-07-22**: no pacote `networkD3`, o binding JS de `sankeyNetwork()` (`sankeyNetwork.js`, funções `color_node`/`color_link`) aplica `d.group.replace(/ .*/, "")` antes de chamar o `colourScale` — ou seja, só a **primeira palavra** do nome do nó vira a chave de cor, o resto é descartado. Nomes tipo `"Fonte A"`/`"Fonte B"`/`"Fonte C"` caem todos no mesmo grupo (`"Fonte"`) e ganham a mesma cor, mesmo com `NodeGroup` default (= nome inteiro). Se quiser cada nó com cor individual, use nomes sem espaço. Detectado no gráfico de sankey ([graficos/flow/sankey-networkd3-simplificado](graficos/flow/sankey-networkd3-simplificado)).
- **2026-07-22**: também no `networkD3`/`htmlwidgets`, passar um nome de scheme de cor do d3 que não existe no bundle (ex: `d3.schemeSet2`, que é do módulo `d3-scale-chromatic` e não vem no `d3.min.js` empacotado pelo `networkD3`, só tem `schemeCategory10/20/20b/20c`) falha **silenciosamente** — sem erro no console, o gráfico só cai pro preto/cinza padrão. Mais seguro usar `colourScale = JS("d3.scaleOrdinal().range([...hex...]);")` com cores explícitas em vez de depender de um nome de scheme.
- **2026-07-22**: este worktree é separado da instalação original — `site/node_modules` não existe nele até rodar `npm install` manualmente (por isso `astro` não era reconhecido ao rodar `npm run dev`). Sempre que abrir uma sessão num worktree novo, rode `npm install` dentro de `site/` antes de tentar `npm run dev`.
- **2026-07-22**: `htmlwidgets::saveWidget(..., selfcontained = FALSE)` (necessário quando `pandoc` não está instalado — ver [SETUP.md](docs/SETUP.md)) gera uma pasta `widget_files/` ao lado do `widget.html` com as dependências JS/CSS (d3, jquery etc.) — sem ela o iframe do widget quebra (404 nos assets). O `site/scripts/sync-assets.mjs` original só copiava `output.png`/`widget.html`; corrigido pra também copiar `widget_files/` recursivamente (`ASSET_DIRS` no script). Detectado no gráfico de streamgraph ([graficos/evolution/streamgraph-legenda-interativo](graficos/evolution/streamgraph-legenda-interativo)).
- **2026-07-21**: a ferramenta de screenshot do browser (Claude Browser) deu timeout consistente nesta sessão, em abas diferentes, mesmo com a página carregando 100% (confirmado via `get_page_text`, `read_page`, `read_network_requests` e `javascript_tool` — todos funcionando normal). Se isso se repetir: não insista em `computer{action:"screenshot"}`, valide por texto/DOM/JS em vez disso, e avise o usuário que a verificação visual ficou por conta dele rodando `npm run dev` localmente.
- **2026-07-21**: `import.meta.env.BASE_URL` no Astro (com `base: '/acervo-de-graficos'` no config, sem barra final) retorna a string SEM barra no final. Concatenar direto tipo `` `${base}graficos/...` `` gera uma URL quebrada (`acervo-de-graficosgraficos/...`). Sempre concatenar com barra explícita: `` `${base}/graficos/...` ``.
- **2026-07-21**: `z.coerce.date()` no schema da content collection, combinado com `Intl.DateTimeFormat` sem `timeZone` explícito, mostra a data errada (um dia a menos) dependendo do fuso local da máquina — a data YAML `2026-07-21` vira `Date` em UTC meia-noite, e formatar em fuso local pode voltar pro dia anterior. Corrigido passando `timeZone: 'UTC'` no `Intl.DateTimeFormat` (ver `site/src/lib/format.ts`).
- **2026-07-21**: o Astro 7 CLI (`astro dev`) gerencia um daemon próprio em background (mensagens tipo "Dev server already running... (pid X)"; comandos `astro dev status`/`astro dev logs`/`astro dev stop` disponíveis). Rodar `npm run dev` via Bash com `run_in_background` pode "completar" quase instantaneamente porque o processo real já se desacoplou pro daemon do Astro — isso é esperado, não é falha. Pra checar se está de pé: `npx astro dev status` dentro de `site/`.
- **2026-07-21**: em gráficos de `ggraph` que usam `geom_conn_bundle()`/`get_con()` (hierarchical edge bundling) com conexões geradas aleatoriamente via `sample(..., replace=T)`, sempre filtre auto-conexões antes de montar os índices: `connect <- connect[connect$from != connect$to, ]`. Se `from == to` sobrar em alguma linha, o cálculo interno de spline do `geom_conn_bundle` (`ggraph:::getSplines`) degenera com um path de 1 ponto só e produz coordenadas absurdas (ex: `1e+252`), estourando a escala do gráfico inteiro — o resultado visual vira uma linha esticada em vez do círculo esperado, sem nenhum erro/warning que aponte a causa direto. Detectado no primeiro gráfico do projeto ([graficos/network/hierarchical-edge-bundling-labels](graficos/network/hierarchical-edge-bundling-labels)).
- **2026-07-21**: sintaxe antiga do ggplot2 tipo `aes(colour=..index..)` (usada em exemplos mais antigos do R Graph Gallery) deve ser trocada por `aes(colour=after_stat(index))` — o ggplot2 4.x instalado neste projeto não quebra com a sintaxe antiga necessariamente, mas a nova é a forma suportada/recomendada.
- **2026-07-21**: sempre atribua o plot final a uma variável (`p <- ggplot(...) + ...`) antes do `ggsave()`. Se o plot for deixado para "imprimir sozinho" (auto-print no fim do script), o R gera um `Rplots.pdf` residual na pasta junto do `output.png`. Já corrigido no `_template/script.R`.
- **2026-07-21**: a instalação do R via `winget install RProject.R` **não** vai para `C:\Program Files\R` nem entra no `PATH` automaticamente. Ficou em `C:\Users\<usuário>\AppData\Local\Programs\R\R-4.6.1`. Pra redescobrir o caminho real após instalar, consulte o registro em vez de assumir o padrão: `Get-ItemProperty "HKCU:\SOFTWARE\R-core\R64\*" | Select-Object InstallPath`.

## Decisões fechadas

_(mais recente no topo, formato: decisão. Por quê. Custo.)_

- **2026-07-21**: todo gráfico replicado troca a paleta de cores em relação ao exemplo original do R Graph Gallery, e muda os valores/dados quando possível (seed diferente, estrutura/quantidade diferente etc.) — nunca copiamos técnica + visual idênticos. Por quê: pedido explícito do usuário, que notou o primeiro gráfico saindo com aparência idêntica ao tutorial original (mesma paleta `RdPu`/`Paired`, mesmo `set.seed(1234)`). Custo: mais um passo manual por gráfico (escolher paleta nova e ajustar a geração de dado fictício) — ver [`WORKFLOW.md`](docs/WORKFLOW.md).
- **2026-07-21**: o site (`site/`) nunca cita/linka o R Graph Gallery publicamente nas páginas renderizadas (nem o masthead, nem a página de detalhe, nem o corpo do README que vira conteúdo da página). Por quê: pedido explícito do usuário. Custo: o link da fonte original (`source` no frontmatter de cada README) vira metadado só de uso interno/histórico — o README, ao ser retrofit, teve o H1 + bullets de fonte/categoria/data removidos do corpo (ficam só no frontmatter), sobrando só a seção `## Observações` como conteúdo público.
- **2026-07-21**: content collection do Astro (`site/src/content.config.ts`) lê `graficos/<categoria>/<slug>/README.md` diretamente via `glob()` loader (Content Layer API), sem duplicar dado em outro lugar — o README de cada gráfico é a fonte de verdade tanto pra documentação quanto pro site. `output.png`/`widget.html` são copiados (não importados) pra `site/public/graficos/` por um script (`site/scripts/sync-assets.mjs`, rodado automaticamente via `predev`/`prebuild`) porque ficam fora de `site/`, fora do que o Vite processa nativamente. Por quê: evita duplicar/mover os arquivos originais de `graficos/`. Custo: um passo de sync extra (automático, mas existe).
- **2026-07-21**: deploy via GitHub Actions (`.github/workflows/deploy.yml`, usando `withastro/action`) publicando em GitHub Pages a cada push na `main`. Requer um passo manual único do usuário no GitHub: Settings → Pages → Source = "GitHub Actions" (a IA não tem como fazer isso).
- **2026-07-21**: gráficos organizados por categoria (`graficos/<categoria>/<slug>/`) em vez de por data de criação. Por quê: espelha a navegação do R Graph Gallery, facilita achar exemplos parecidos na hora de escolher o próximo gráfico. Custo: perde ordem cronológica direta na estrutura de pastas — compensado pelo log em [docs/PROGRESS.md](docs/PROGRESS.md).
- **2026-07-21**: escolhido R (em vez de portar pra Python) pra replicar os gráficos do gallery. Por quê: os exemplos já vêm prontos em R (`ggplot2`/`ggraph`/etc.); portar pra Python exigiria reescrever a maior parte do código de qualquer forma, já que não há equivalente 1:1 nas bibliotecas. Custo: nenhuma integração nativa com pipelines Python, caso vire necessário no futuro.

## Aviso de defasagem

Este arquivo pode ficar desatualizado conforme o projeto cresce. Se perceber qualquer divergência entre o que está escrito aqui e o estado real do projeto, corrija no mesmo momento em que notar.
