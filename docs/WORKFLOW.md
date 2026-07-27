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
& "C:\Users\augusto.ryba\AppData\Local\Programs\R\R-4.6.1\bin\Rscript.exe" "graficos\<categoria>\<slug>\script.R"
```

Confirme que `output.png` foi gerado corretamente na pasta.

## 5. Tentar uma versão interativa (prioridade, ver PRODUCT.md)

Antes de aceitar a versão estática como final: veja se existe um pacote R que gera uma versão **interativa** (widget HTML) pro mesmo tipo de gráfico, sem precisar escrever JS na mão. Exemplos:
- `plotly::ggplotly(p)` — funciona pra praticamente qualquer gráfico ggplot2 (barra, dispersão, linha, boxplot...), poucas linhas a mais.
- `networkD3` / `visNetwork` — redes, sankey.
- `chorddiag` — chord diagrams.

Se existir e for razoável de aplicar, salve o widget como `widget.html` na mesma pasta do gráfico (além do `output.png`, que continua sendo o preview/thumbnail). Se não houver equivalente razoável pro tipo de gráfico, siga só com o `output.png` — não é obrigatório em todos.

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
pacotes: ["ggplot2", "ggiraph"]          # vira chips na ficha técnica
dados: "1 variável categórica + 1 numérica"
nivel: básico             # básico | intermediário | avançado
tags: ["interativo", "geoespacial"]
---
```

`resumo`, `pacotes`, `dados`, `nivel` e `tags` alimentam a **ficha técnica** renderizada no topo da página — são obrigatórios, o build do site falha sem eles.

### Seções do corpo (nesta ordem)

| Seção | O que entra |
|---|---|
| `## O que é` | Definição do tipo de gráfico + para que serve (que pergunta responde) |
| `## Quando usar (e quando evitar)` | Cenários em que é a escolha certa, e em que engana/polui — com a alternativa |
| `## Que dados você precisa` | Variáveis exigidas e formato esperado (tidy? agregado? matriz?) |
| `## Como ler o gráfico` | O que cada elemento visual codifica (posição, cor, tamanho) |
| `## Como foi feito` | Técnica, papel de cada pacote, decisões não óbvias, o que é dado fictício |
| `## Possíveis problemas pelo caminho` | Armadilhas em formato **Problema / Por quê / Solução** |
| `## Variações possíveis` | O que dá pra mudar dali (layout, agrupamento, interatividade, facets) |

### Regras de escrita

- **Nunca citar a fonte original** (R Graph Gallery, data-to-viz ou qualquer outra) em texto renderizado — nem nome, nem link, nem "o exemplo original". O site é material autoral; a fonte vive só no `source` do frontmatter. Ver "Decisões fechadas" em [`AGENTS.md`](../AGENTS.md).
- **Escreva pra quem chega de fora**, não pra nós: nada de "detectei que", "tive dificuldade com", "reaproveitei do gráfico X". A seção de problemas é aviso pra quem vai reproduzir, não diário de bordo.
- **Não cole o código no README.** O site lê `script.R` direto e renderiza com destaque de sintaxe + botão de copiar — código duplicado no README dessincroniza na primeira edição.
- Comparações entre gráficos do próprio acervo podem ser linkadas normalmente (é conteúdo nosso).

## 7. Atualizar o log geral

Adicione uma linha nova na tabela de [`PROGRESS.md`](PROGRESS.md) com: data, categoria, nome do gráfico, link da pasta, link da fonte.

## 8. Conferir no site

Se o site (`site/`) já estiver montado, rode `npm run dev` dentro de `site/` e confirme que o gráfico novo aparece na galeria (categoria certa, imagem certa, widget interativo se houver).

## 9. Commitar

**Importante**: quem faz `git commit`/`git push` é sempre o usuário, nunca a IA (ver `AGENTS.md`). No fim da sessão, a IA deve te dar os comandos prontos pra copiar, algo como:
```powershell
git add graficos/<categoria>/<slug> docs/PROGRESS.md
git commit -m "add: <nome do gráfico> (<categoria>)"
git push
```

## Convenções gerais

- Um gráfico = uma pasta. Não misture múltiplos gráficos no mesmo script.
- Sempre versionar o `script.R` original de forma que ele rode do zero sem depender de estado de sessões anteriores (sem `rm(list=ls())` necessário, mas sem dependências externas escondidas).
- Não é necessário reescrever ou "melhorar" o código do gallery — o objetivo é replicar e entender, não refatorar.
- Se um gráfico exigir dado externo (CSV, geojson etc.) que o próprio gallery disponibiliza, salve esse dado dentro da pasta do gráfico (`data/` dentro da pasta, se necessário) em vez de depender de link externo no `script.R`.
