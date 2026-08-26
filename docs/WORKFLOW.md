# Workflow: adicionando um novo gráfico

> **Escopo**: processo passo a passo para adicionar um gráfico novo. **Leia se**: for criar um gráfico. **Não use para**: instalar ambiente (ver [`SETUP.md`](SETUP.md)) ou consultar o que já existe (ver [`PROGRESS.md`](PROGRESS.md)).

Passo a passo para adicionar um gráfico novo vindo do [R Graph Gallery](https://r-graph-gallery.com/).

## 1. Escolher o gráfico

- Navegue o site (por categoria ou "chart type") e escolha um gráfico ainda não presente em [`PROGRESS.md`](PROGRESS.md).
- Prefira variar categorias em vez de repetir a mesma (ver seção "Categorias" no [`README.md`](../README.md) principal).
- Anote a URL da página do gráfico — ela vai para o README do gráfico.

## 2. Criar a pasta do gráfico

Caminho: `graficos/<categoria>/<slug-do-grafico>/`

- `<categoria>`: uma das pastas existentes em `graficos/` (crie uma nova só se nenhuma categoria existente encaixar).
- `<slug-do-grafico>`: nome curto em kebab-case, ex: `dendrogram-circular`, `sankey-basico`.

Use `_template/` como base (copie os 3 arquivos: `script.R`, `README.md`, e crie `output.png` depois de rodar).

## 3. Copiar e adaptar o código

- Copie o código R da página do gráfico para `script.R`.
- No topo do script, confira as `library(...)`. Instale o que faltar (ver [`SETUP.md`](SETUP.md)).
- **Troque a paleta de cores** em relação ao original (ex: se usa `scale_*_distiller(palette = "RdPu")`, troque pra outra paleta do `RColorBrewer` — `YlGnBu`, `Dark2`, `Set2`, `BuPu` etc.). Nunca deixar a paleta idêntica ao exemplo do site (ver "Decisões fechadas" em [`AGENTS.md`](../AGENTS.md)).
- **Quando possível, mude os valores/dados também**: seed diferente (`set.seed(...)`), quantidade de grupos/categorias diferente, range dos dados fictícios diferente. Nem todo gráfico permite isso facilmente — faça o que for razoável sem quebrar a lógica do código.
- Adicione ao final do script uma linha salvando a imagem na própria pasta, por exemplo:
  ```r
  ggsave("output.png", plot = p, width = 8, height = 6, dpi = 150)
  ```
  (Para gráficos em base R ou não-ggplot, use `png("output.png", width=800, height=600); <código de plot>; dev.off()`.)

## 4. Rodar o script

```powershell
& "C:\Program Files\R\R-4.6.1\bin\Rscript.exe" "graficos\<categoria>\<slug>\script.R"
```

(Caminho do `Rscript.exe` pode variar por máquina — confirme em [`SETUP.md`](SETUP.md) antes de assumir este.)

Confirme que `output.png` foi gerado corretamente na pasta.

## 5. Tentar uma versão interativa (prioridade, ver PRODUCT.md)

Antes de aceitar a versão estática como final: veja se existe um pacote R que gera uma versão **interativa** (widget HTML) pro mesmo tipo de gráfico, sem precisar escrever JS na mão. Exemplos:
- `plotly::ggplotly(p)` — funciona pra praticamente qualquer gráfico ggplot2 (barra, dispersão, linha, boxplot...), poucas linhas a mais.
- `networkD3` / `visNetwork` — redes, sankey.
- `chorddiag` — chord diagrams.

Se existir e for razoável de aplicar, salve o widget como `widget.html` na mesma pasta do gráfico (além do `output.png`, que continua sendo o preview/thumbnail). Se não houver equivalente razoável pro tipo de gráfico, siga só com o `output.png` — não é obrigatório em todos.

**Checklist antes de aceitar a versão interativa como pronta** (já causou retrabalho mais de uma vez — ver AGENTS.md "Lições aprendidas", 2026-07-29):
- [ ] A paleta de cores é a **mesma** no `output.png` e na versão interativa — defina a paleta **uma vez só** (uma variável no R) e alimente as duas com ela; nunca escolha a cor de cada versão separadamente, mesmo quando são bibliotecas/motores diferentes.
- [ ] Renderize a interativa de verdade (Chromium/Playwright, não só ler o código) e compare lado a lado com o `output.png` — divergência de cor ou de layout lê como bug pro usuário, mesmo com as duas versões "corretas" isoladamente.

## 6. Preencher o README do gráfico (padrão obrigatório)

O `README.md` da pasta **é a página do gráfico no site** — não é anotação interna. Ele segue um padrão fechado, igual pra todos os gráficos; copie de [`_template/README.md`](../_template/README.md) e preencha **todas** as seções, não só as que parecerem relevantes.

### Frontmatter

```yaml
---
title: "Nome do gráfico"
category: categoria       # igual ao nome da pasta em graficos/<categoria>/
date: AAAA-MM-DD
source: "link da página de referência"   # uso interno só — NUNCA renderizado
interactive: false        # true se você criou um widget.html no passo 5
resumo: "Uma frase dizendo o que o gráfico mostra."
veredito_uso: "uma frase: quando esse gráfico é a escolha certa."    # opcional
veredito_evita: "uma frase: quando evitar."                          # opcional
pacotes: ["ggplot2", "ggiraph"]          # vira chips na ficha técnica
dados: "1 variável categórica + 1 numérica"
nivel: básico             # básico | intermediário | avançado
tags: ["interativo", "geoespacial"]
---
```

`resumo`, `pacotes`, `dados`, `nivel` e `tags` alimentam a **ficha técnica** renderizada no topo da página — são obrigatórios, o build do site falha sem eles. `veredito_uso`/`veredito_evita` alimentam o veredito rápido (✓/✕) logo abaixo do resumo — opcionais, mas preencha os dois juntos ou nenhum (não faz sentido só um lado do veredito).

### Seções do corpo (nesta ordem)

A página tem duas zonas, nessa ordem — referência (tom de manual técnico, pra quem só quer a informação) e bastidor (única zona onde processo/decisão real tem permissão de aparecer, ver ressalva em "Regras de escrita" abaixo).

| Seção | Zona | O que entra |
|---|---|---|
| `## O que é` | referência | Definição do tipo de gráfico + para que serve (que pergunta responde) |
| `## Quando usar (e quando evitar)` | referência | Cenários em que é a escolha certa, e em que engana/polui — com a alternativa |
| `## Que dados você precisa` | referência | **Condicional**: só inclua quando houver nuance real de formato a explicar (matriz vs. lista de arestas, longo vs. largo). Se o campo `dados` da ficha técnica já resolve sozinho, omita a seção inteira. |
| `## Como ler o gráfico` | referência | O que cada elemento visual codifica (posição, cor, tamanho). **Preferencialmente uma legenda de swatches** (ver abaixo) quando a leitura for principalmente por cor; bullets comuns quando não for (ex: gráfico sem canal de cor, ou cuja leitura é só de posição/forma). |
| `## Como foi feito` | referência | Técnica, papel de cada pacote, decisões não óbvias, o que é dado fictício — só a técnica reaproveitável, não a história de como você chegou nela (isso é bastidor) |
| `## Possíveis problemas pelo caminho` | referência | Armadilhas em formato **Problema / Por quê / Solução**, 1 item quando só há 1 de verdade — não force 3 pra preencher. Quando existir uma história mais rica por trás, aponte pra "Notas do coletor" em vez de contar ali. |
| `## Variações possíveis` | referência | O que dá pra mudar dali (layout, agrupamento, interatividade, facets) — frases curtas, só a variação que precisa de explicação ganha parágrafo |
| `## Gráficos parecidos` | referência | **Opcional, 1 a 3 links escolhidos à mão** pra outros espécimes do acervo — ver o formato de cartão abaixo. Nunca escolha por tag em comum, isso não garante que os gráficos resolvem problemas parecidos. Dois tipos úteis: "o oposto direto" (resolveria o mesmo problema de outro jeito) e "mesma técnica, outro domínio" |
| `## Notas do coletor` | **bastidor** | **Opcional mas recomendada.** A história real de 1 decisão ou bug por gráfico, contada com intenção — não diário cru. Sempre a última seção do arquivo: é identificada em tempo de execução pelo texto exato do título, então precisa estar sozinha ao final, sem nenhuma seção depois dela. |

### HTML cru dentro do README: legenda de swatches, pull-quotes e cartões de "Gráficos parecidos"

Markdown aceita HTML embutido, e o site repassa esse HTML sem escapar — algumas peças usam isso pra ganhar um visual mais rico do que bullets/links comuns permitem. Copie o formato exato (as classes vêm do CSS de `[slug].astro`, não têm efeito nenhum se o nome não bater):

**Pull-quote** — a frase mais forte de uma seção longa, fora do fluxo do parágrafo, na fonte de exibição. Use com moderação: 1 por seção longa, nunca em toda seção — o efeito é justamente quebrar o ritmo em pontos específicos, não virar um padrão repetitivo que o olho aprende a pular.

```html
<div class="pull-quote">a frase exata, tirada do próprio texto ao redor</div>
```

Adicione `pull-quote-direita clearfix` (`<div class="pull-quote pull-quote-direita clearfix">`) pra flutuar à direita com o parágrafo seguinte passando ao lado — bom logo no início de uma seção com texto suficiente pra rodear a citação; sem isso, a citação ocupa a própria linha, melhor quando vem entre dois parágrafos curtos ou dentro do cartão de bastidor. A frase sempre é uma **citação literal** de algo que já está escrito ao lado — nunca invente uma frase nova só pra virar pull-quote.

```html
## Como ler o gráfico

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#COR_REAL"></span> Descrição curta do que essa cor significa</div>
  <div><span class="swatch" style="background:#OUTRA_COR"></span> Outra faixa de valor</div>
</div>
```

Use as cores **reais** da paleta do gráfico (as mesmas do `script.R`/`colorRampPalette`), não cores inventadas — 2 a 4 swatches costuma bastar. Pode continuar com prosa/bullets normais depois do bloco pra explicar padrões espaciais que a cor sozinha não cobre (blocos, manchas, simetria etc.).

```html
## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../slug-do-vizinho" style="--cat-link: var(--cat-CATEGORIA); --cat-link-ink: var(--cat-CATEGORIA-ink);">
    <span class="parecido-cat">categoria</span>
    <span class="parecido-titulo">Título exato do gráfico linkado</span>
    <span class="parecido-razao">Frase dizendo por que esse é o "oposto direto" ou "mesma técnica, outro domínio".</span>
  </a>
</div>
```

`--cat-CATEGORIA`/`--cat-CATEGORIA-ink` são os tokens já definidos em `tokens.css` (`comparison`, `correlation`, `distribution`, `evolution`, `general`, `flow`, `map`, `network`, `part-of-whole`, `ranking`) — troque pela categoria do gráfico **linkado** (a borda colorida do cartão é a cor de destino, não a da página atual). Link relativo, mesma regra de sempre (`../slug` mesma categoria, `../../categoria/slug` categoria diferente).

### Regras de escrita

- **Nunca citar a fonte original** (R Graph Gallery, data-to-viz ou qualquer outra) em texto renderizado — nem nome, nem link, nem "o exemplo original". O site é material autoral; a fonte vive só no `source` do frontmatter. Ver "Decisões fechadas" em [`AGENTS.md`](../AGENTS.md).
- **Escreva pra quem chega de fora**, não pra nós: nada de "detectei que", "tive dificuldade com", "reaproveitei do gráfico X". **Essa regra vale só na zona de referência** — "Notas do coletor" é exatamente onde o processo real (decisão, bug, o porquê) tem permissão de aparecer, contado com intenção, não como diário de bordo cru.
- **Não cole o código no README.** O site lê `script.R` direto e renderiza com destaque de sintaxe + botão de copiar — código duplicado no README dessincroniza na primeira edição.
- Comparações entre gráficos do próprio acervo podem ser linkadas normalmente (é conteúdo nosso). Links relativos funcionam: `../slug-do-vizinho` pra outro gráfico da mesma categoria, `../../outra-categoria/slug` pra categoria diferente.

## 7. Atualizar o log geral

Adicione uma linha nova na tabela de [`PROGRESS.md`](PROGRESS.md) com: data, categoria, nome do gráfico, link da pasta, link da fonte.

## 8. Conferir no site

Se o site (`site/`) já estiver montado, rode `npm run dev` dentro de `site/` e confirme que o gráfico novo aparece na galeria (categoria certa, imagem certa, widget interativo se houver).

## 9. Commitar

**Importante**: a IA pode rodar `git add`/`git commit`/`git merge`/`git push` direto na `main` neste projeto, sem abrir Pull Request (ver "Git e commits" em [`AGENTS.md`](../AGENTS.md) — inclui a condição inegociável de autoria e o cuidado com branch/git config de sessões remotas).

**Quebre em commits pequenos e separados por tipo de mudança, não um commit só pra tudo.** Prática já estabelecida no histórico do projeto (2026-08-25: confirmado com o usuário que não estava escrito em lugar nenhum, apesar de já ser o padrão seguido). Pra um gráfico novo, a sequência típica é:

```powershell
git add graficos/<categoria>/<slug>/script.R graficos/<categoria>/<slug>/output.png graficos/<categoria>/<slug>/data.json
git commit -m "add: <nome do gráfico> - script.R (<categoria>)"

git add site/src/lib/viz/charts/<categoria>/<slug>.ts site/package.json site/package-lock.json
git commit -m "add: <nome do gráfico> - versao D3 interativa (<pacote/tecnica>)"
# (pule este commit se o gráfico não tiver versão interativa)

git add graficos/<categoria>/<slug>/README.md
git commit -m "docs: README d[o/a] <nome do gráfico> (<categoria>)"

git add docs/PROGRESS.md
git commit -m "docs: registra entrada d[o/a] <nome do gráfico> no PROGRESS.md"

git push
```

Se a categoria for nova no acervo (precisou de tokens em `tokens.css`/`categoria.ts`), inclua esses dois arquivos no commit da versão D3 — é o que torna a categoria visível/colorida no site. Ajuste a ordem/quebra quando fizer sentido (ex: um achado de R que valha a pena registrar no AGENTS.md "Lições aprendidas" pode virar seu próprio commit `docs:`), mas não junte tudo — cada commit deve dar pra entender e reverter isolado dos outros.

## Convenções gerais

- Um gráfico = uma pasta. Não misture múltiplos gráficos no mesmo script.
- Sempre versionar o `script.R` original de forma que ele rode do zero sem depender de estado de sessões anteriores (sem `rm(list=ls())` necessário, mas sem dependências externas escondidas).
- Não é necessário reescrever ou "melhorar" o código do gallery — o objetivo é replicar e entender, não refatorar.
- Se um gráfico exigir dado externo (CSV, geojson etc.) que o próprio gallery disponibiliza, salve esse dado dentro da pasta do gráfico (`data/` dentro da pasta, se necessário) em vez de depender de link externo no `script.R`.
