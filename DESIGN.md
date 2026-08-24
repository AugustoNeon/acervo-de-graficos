# Design

> Registra o mundo visual construído em código — decisões já tomadas, lidas do que está em `site/src/`, não um plano à parte dele. Escrito na sessão do redesign de 2026-08-14 (sem subagente `impeccable-documenter` disponível neste harness — passe substituída em thread, ver nota no fim).

## O mundo: caderno de campo

O acervo é um caderno de laboratório/naturalista, não um site de produto. Cada gráfico é um espécime datado; a home é o mural onde o caderno inteiro fica pregado; a página de um gráfico é a página do caderno aberta nele. Decisão tomada contra dois anti-references: o r-graph-gallery.com original (sidebar + grid genérico de documentação) e o visual anterior deste mesmo site (cards uniformes sobre fundo neutro com sotaque de cor — ver histórico em [PRODUCT.md](PRODUCT.md)).

## As duas superfícies

Nunca uma terceira. `Base.astro` estampa `data-surface` no `<body>`; `global.css` é dono de ambas.

- **`paper`** (`--paper`, quase branco com viés azulado frio — nunca creme) — página de caderno: pauta quadriculada (`repeating-linear-gradient`, 28px desktop / 24px ≤60rem) + régua de margem vermelha (só ≥60rem). Usada pela página de gráfico e por qualquer página de leitura futura.
- **`board`** (`--board`, marrom-cortiça médio-escuro) — mural de navegação: usada só pela home. **Nenhum texto fica direto sobre o board** (tinta escura nele mede 1,93:1 de contraste — medido, reprovado); tudo que precisa ser lido mora numa ficha de papel/kraft por cima.

Uma textura de ruído via SVG `feTurbulence` foi tentada nas duas superfícies e removida: o Chromium falha em repintar ladrilhos dela em páginas longas (blocos inteiros do grid somem ao rolar — confirmado isolando a camada em `getComputedStyle` e comparando screenshots). Gradientes simples não têm esse problema; a superfície board fica só com o vinheta radial (`--board-deep` nas bordas).

## Cor

Estratégia **paleta completa**: 8 categorias, cada uma com seu matiz (`--cat-<categoria>`), mesmos ângulos de matiz herdados do sistema anterior (evitam o vale de croma do ciano, L/C iguais entre si) — o que mudou é a **aplicação**, de bloco de fundo pra objeto físico (fita washi, carimbo). Três papéis por categoria, contraste verificado em sRGB (script em `site/`, não versionado):

| papel | uso | mínimo medido |
|---|---|---|
| `--cat-X` | fita/pino — marca de área, não-textual | 3,32:1 (evolution, o mais fraco) |
| `--cat-X-ink` | texto (nome da categoria, tag ativa) | 4,94:1 contra `--paper`; 4,58:1 contra `--cat-X-wash` |
| `--cat-X-wash` | grifo/realce translúcido atrás de texto pequeno | — |

Regra dura: **`--cat-X-ink` nunca em cima de `--tag-stock`** (o kraft da ficha técnica) — cai a 3,81:1 no matiz mais fraco, abaixo dos 4,5:1 de texto normal. A ficha usa só `--color-ink`/`--color-ink-muted` (13,4:1 / 5,7:1 nela).

Papel de interface fora do sistema categórico: `--color-primary`, um azul-tinteiro (`oklch(0.4 0.15 258)`, 9:1 contra `--paper`) — foco, links, o "carimbo" de data/entrada, o badge "interativo". Nunca uma cor de categoria: foco é papel do sistema, não do acervo.

## Tipografia

Par por contraste de eixo (serifada robusta × humanista neutra), evitando deliberadamente as fontes já usadas no acervo (Fraunces/IBM Plex, versão anterior) e a lista de reflexo do treinamento (Playfair, Cormorant, Space Grotesk, DM Sans etc.):

- **Bitter Variable** (`--font-display`) — slab serif, capa de guia de campo/manual técnico. Títulos.
- **Public Sans Variable** (`--font-body`) — nasceu pro U.S. Web Design System; registro de formulário/relatório oficial. Corpo.
- **Courier Prime** (`--font-mono`) — máquina de escrever de verdade. Datas, rótulos, código (o protocolo reproduzível já É, literalmente, texto datilografado).
- **Caveat** (`--font-hand`) — letra de margem. Só no título "Ficha do espécime"; nunca em corpo de texto.

## Componentes principais

- **`GraphCard.astro`** → espécime preso por fita washi (`lib/tilt.ts` dá a inclinação, hash determinístico do id — nunca `Math.random()`, pra SSR e revisita baterem). Card `is-featured` (o mais recente) ganha `grid-column: span 2` e crop 16:10 — nunca `grid-row: span 2` (span de linha com `grid-auto-rows: auto` e conteúdo de altura variável quebra o encaixe do resto da grade).
- **`index.astro`** → mural: masthead é uma ficha de papel pregada (não texto direto no board), abas de categoria são divisórias de gaveta (`border-top` na cor da categoria, "puxam" pra cima quando ativas).
- **`[slug].astro`** → página de caderno: carimbo de entrada com número sequencial cronológico (`Nº 0XX`, calculado em `getStaticPaths` — ordem de quando o gráfico entrou no acervo, não a ordem de exibição mais-recente-primeiro da home), fita washi nos dois cantos do espécime, ficha técnica em cartolina kraft.

## Motion

Sem bounce/elastic em lugar nenhum — o papel assenta, não pula (`--ease-out-expo`/`--ease-out-quint`). Entrada escalonada dos espécimes (`pin-in`, delay por índice) e das abas; hover do card "levanta" (translateY + leve scale + sombra maior) e desfaz a inclinação, como se fosse pego pra olhar de perto. Toda animação com alternativa em `prefers-reduced-motion: reduce`; o conteúdo nunca depende da animação pra existir (ver regra geral em `AGENTS.md`).

## O que fica de fora deliberadamente

- Sem terceira superfície além de papel/board — resistir à tentação de inventar uma "mesa" ou "parede" extra por página nova.
- Sem `--cat-X-ink` em fundo kraft (ver tabela de contraste acima).
- Sem `feTurbulence`/filtro SVG em `background-image` de elemento com muita altura de rolagem — bug de repintura do Chromium, não reintroduzir sem testar em página longa de verdade.

## Nota de processo

Construído seguindo o skill `impeccable` (fluxo `new-work` pra mundo novo): direção sorteada por `concept-seed.mjs --scope direction --mode read` (candidato próprio nº3, "caderno de campo", entre 7 candidatos derivados do mundo do público — arquivo naturalista, gaveta de fichário, diário de laboratório, carta sinótica, atlas celeste, amostra de tricô, catálogo de vinil), confirmada pelo usuário contra 3 desafiantes do catálogo (mesa de edição de filme, arte de dados estilo Ikeda, j-card de fita cassete). Sem subagentes `impeccable-finish-reviewer`/`impeccable-documenter` disponíveis neste harness (tipos de agente registrados: `claude`, `claude-code-guide`, `Explore`, `general-purpose`, `Plan`, `statusline-setup`) — a revisão final e este documento foram feitos em thread pelo mesmo agente que construiu, com screenshots reais via Chrome (não o pane de preview interno, que não composita frames de forma confiável — ver memória de sessão) em vez de subagente fresco.
