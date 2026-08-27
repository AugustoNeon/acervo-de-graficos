# Reformulação da página de gráfico — pendências

> **Status: concluído em 2026-08-27.** O retrofit dos 55 READMEs (item 7/8 da lista de pendências abaixo) terminou — todos os gráficos têm as duas zonas, veredito, e "Gráficos parecidos". Este arquivo vira registro histórico da discussão de produto/design que levou até aqui; não há mais pendência ativa nele. **Leia se**: quiser entender por que a página de gráfico tem o formato que tem, ou por que a "interativo"/datas sumiram do site numa sessão anterior. **O padrão de página em vigor agora é o descrito aqui** — `WORKFLOW.md` (passo 6) já foi atualizado pra refletir as duas zonas, não é mais preciso ler os dois.

Aberto em 2026-08-26/27, numa sessão de conversa (não de código) sobre como reformular tudo que fica abaixo do gráfico numa página de espécime — as 7 seções fixas do README, decididas em 2026-07-27 (ver "Decisões fechadas" no [AGENTS.md](../AGENTS.md)) e nunca atualizadas desde então. O template, o schema e as 3 docs (`WORKFLOW.md`/`PRODUCT.md`/`AGENTS.md`) já foram atualizados numa sessão seguinte, no mesmo dia — ver "Pendências pra próxima sessão" abaixo pro que ainda falta (o retrofit dos 54 READMEs restantes).

## Como a conversa chegou aqui

1. Pedido inicial: reformular o texto abaixo do gráfico — ideias de seções novas, seções a cortar, seções a reformular.
2. Antes de desenhar layout, paramos pra decidir **propósito**: a página de gráfico deveria provar competência técnica (referência), critério de projeto (portfólio), ou as duas coisas? E quem chega numa página específica, vindo de onde?
3. Respostas do usuário (perguntas feitas via `AskUserQuestion`, decisão final, não em aberto):
   - **Propósito**: as duas coisas, **em zonas separadas da página** — não misturadas no mesmo tom.
   - **Audiência de uma página isolada**: alguém que chegou **direto por um link** (currículo, busca, indicação) — nunca navegou o resto do site, a página precisa fazer sentido sozinha.
4. Construído um protótipo visual (ver "Onde ver o protótipo" abaixo) com os tokens reais do site, pra reagir em cima de conteúdo de verdade em vez de descrição abstrata.
5. Usuário reagiu ao protótipo com decisões concretas (ver "Decisões tomadas" abaixo) e pediu mais uma coisa nova: um bloco de "gráficos parecidos", linkando pra outros espécimes do acervo.
6. No meio da mesma conversa, três pedidos **paralelos e independentes** da reformulação de conteúdo, que **já foram implementados** (ver seção própria abaixo).

## Onde ver o protótipo

Artifact **"Verso do Espécime"**: `https://claude.ai/code/artifact/e09ec399-9219-4e2e-9cba-dab6c3a9d525` (privado, na conta do usuário — não precisa recriar, só reabrir; se a sessão que o publicou não for a mesma que continuar isso, use `action: "read"` na URL, ou peça a URL de novo se tiver sumido do histórico).

O protótipo usa o gráfico real da [matriz de adjacência](../graficos/network/matriz-adjacencia-tags) (imagem, ficha técnica e conteúdo verdadeiros) e replica os tokens de `site/src/styles/tokens.css` (mesmas cores oklch, mesmas fontes Bitter/Public Sans/Courier Prime/Caveat) — não é uma ideia abstrata, é como a página ficaria de verdade. A versão publicada por último já reflete as decisões desta seção (não mostra mais A/B em aberto, mostra a versão escolhida com uma nota do que foi descartado e por quê).

## Decisões tomadas (prontas pra virar código)

### 1. Duas zonas na página, de cima pra baixo (não lado a lado)

Lado a lado misturaria os dois tons no mesmo campo de visão — o oposto de "separado". Cima pra baixo deixa quem só quer a referência técnica parar de ler antes do bastidor, sem que ele "grite" durante a leitura principal.

- **Zona de referência** (topo): tudo que já existe hoje, reformulado — enxuta, sem narrativa, tom de manual técnico.
- **Zona de bastidor** ("Notas do coletor"): critério de projeto e a história real de 1 decisão/bug por gráfico — só aqui a regra "nunca escreva como diário de bordo" do AGENTS.md **não vale** (ver "Pendências" abaixo, item sobre atualizar essa regra).

### 2. Orientação pro visitante frio

Uma linha pequena, em mono, logo abaixo do link "« voltar ao caderno", dizendo o que é o site inteiro numa frase (ex: "Acervo de Gráficos — catálogo pessoal de tipos de gráfico em R, cada um replicado e documentado"). Resolve o problema de alguém chegando direto num gráfico específico sem contexto nenhum do resto do site.

### 3. Veredito rápido — **decidido: texto com ✓/✕**

Duas linhas logo abaixo do resumo/ficha técnica: "✓ Use quando..." / "✕ Evite quando...", cada uma uma frase só. **Descartado**: a mesma informação em formato de pílula/chip colorido — perdeu porque combinava menos com o texto corrido logo abaixo.

### 4. "Como ler o gráfico" — **decidido: legenda de swatches** (cor + uma linha)

Mesmo vocabulário visual que a própria versão interativa já usa (`.viz-legenda`/`.viz-swatch`) — consistência entre o gráfico e o texto que o explica. **Descartado**: uma tabela-chave de duas colunas (marca visual → significado), que descreveria melhor *padrão espacial* (bloco, mancha) em gráficos tipo a matriz de adjacência, onde cor sozinha não conta a história toda. Vale reabrir esse formato alternativo especificamente para um gráfico futuro cujo "como ler" dependa de padrão espacial, não só de cor — não é proibido, só não é o padrão.

### 5. Zona de bastidor — **decidido: carimbo + cartão kraft**

Um selo reaproveitando o visual do carimbo de entrada (borda + leve rotação + mono, na cor da categoria) com o texto "Notas do coletor", seguido de um cartão no mesmo material kraft da ficha técnica (com uma fita washi de canto). **Descartado**: uma nota de margem discreta (borda esquerda na cor da categoria, sem kraft, sem rotação) — mais quieta, mas perdeu.

**Risco aceito, não resolvido**: duas fichas kraft na mesma página (a ficha técnica no topo, o cartão de bastidor no fim) podem competir por atenção visual. Só dá pra julgar isso de verdade com mais de um gráfico usando bastidor extenso lado a lado — vale reabrir a discussão quando isso acontecer.

### 6. "Como foi feito" — técnica separada da história do dado fictício

A seção fica só com técnica reutilizável (por que `geom_rect()` em vez de `geom_col()`, etc.). A frase que hoje explica por que o dado fictício tem tal formato/tamanho/estrutura migra pra **legenda da imagem** (abaixo do gráfico, no mesmo lugar de uma legenda de foto de campo) — não fica nem em "como foi feito" nem no bastidor.

### 7. "Possíveis problemas" — mais curto, aponta pro bastidor

Vira aviso prático puro (Problema/Por quê/Solução, 1 item quando só há 1 de verdade — não forçar 3 pra "preencher"). Quando existir uma história mais rica por trás de um desses problemas, uma frase aponta pra "Notas do coletor" em vez de contar a história ali.

### 8. "Que dados você precisa" — condicional, não mais obrigatória sempre

Só aparece quando há nuance real de formato pra explicar (ex: matriz quadrada vs. lista de arestas, longo vs. largo). Quando a resposta cabe inteira no campo "Dados" da ficha técnica (a maioria dos gráficos simples — halteres, cascata), a seção **não existe** — o campo da ficha já resolve sozinho.

### 9. "Variações possíveis" — chips, não parágrafos

Lista de frases curtas em formato de chip (mesmo visual das tags da ficha técnica), uma por variação. Só ganha frase completa a variação que realmente precisa de explicação — a maioria não precisa.

### 10. Novo: "Gráficos parecidos" (não existia antes desta conversa)

Bloco no fim da zona de referência, depois de "Variações possíveis". Cada gráfico ganha **1 a 3 links escolhidos à mão** (nunca por tag em comum — duas tags iguais não garantem que os gráficos resolvem problemas parecidos) pra outros espécimes do acervo, com uma frase de razão cada. Dois tipos de link, exemplificados no protótipo com a matriz de adjacência:

- **"O oposto direto"**: o gráfico que resolveria o mesmo problema de outro jeito, ou que a própria seção "Quando evitar" já menciona em texto (ex: matriz de adjacência → [rede densa (hairball)](../graficos/network/rede-densa-hairball)). Agora esse link vira clicável, não só citado em prosa.
- **"Mesma técnica, outro domínio"**: mostra que a técnica não é exclusiva daquele tipo de dado (ex: matriz de adjacência → [correlograma](../graficos/correlation/correlograma-indicadores), mesma grade de células, mas correlação estatística em vez de rede).

**Ainda não decidido**: o mecanismo. Vira um campo novo no frontmatter (`parecidos: ["network/rede-densa-hairball", ...]`) ou fica escrito à mão dentro do corpo do README como uma seção comum? Um campo estruturado permite validar links quebrados no build e teria estilo consistente automaticamente; escrever à mão no corpo dá mais liberdade de frase por link mas arrisca divergência de formato entre gráficos. Recomendo campo estruturado (mais barato de manter em 55+ arquivos), mas fica pra decidir na próxima sessão.

## Já implementado nesta sessão (não faz parte da reformulação de conteúdo — pedidos paralelos)

Três pedidos que saíram da mesma conversa, mas são independentes da reformulação de zonas — já estão prontos, testados (build + typecheck + screenshot) e commitados na `main`:

1. **Tag "interativo" removida de todas as fichas técnicas** (53 dos 55 READMEs tinham; os outros 2 nunca tiveram). Motivo: os 55 gráficos do acervo já são interativos — a tag parou de distinguir qualquer coisa. Commit `e207873`.
2. **Selo "interativo" removido do card da galeria** (`GraphCard.astro`, mesmo motivo do item 1) — junto com a prop `interactive` que só alimentava esse selo (o campo `interactive` do frontmatter **continua existindo e sendo usado** em `[slug].astro`, que decide com ele se mostra `widget.html` num iframe ou a imagem estática — isso é lógica de verdade, não decoração, não foi tocado). Commit `95bbd73`.
3. **Data visível removida dos dois lugares que a mostravam** — card da galeria (`specimen-date`) e carimbo de entrada da página do gráfico (`entry-date`, ao lado do que era o "Nº 0XX"). Commits `95bbd73` e `02ae204`.
4. **"Nº 0XX" removido também**, não só a data — o carimbo de entrada inteiro saiu da página do gráfico. O cálculo do número sequencial (`numeroDaEntrada`, em `getStaticPaths`) virou código morto sem o carimbo pra mostrá-lo, então foi removido junto, e `site/src/lib/format.ts` (só usado pelas duas telas de data agora removidas) foi apagado por inteiro. Commit `02ae204`.
   - **Nota de interpretação, sinalizada ao usuário na hora mas sem confirmação explícita depois**: o pedido original foi digitado de forma um pouco ambígua ("tire a data visivel dos dois lugares e não mantenha sem o N°"). Interpretei como "remova a data E o Nº, os dois" — é a leitura que resolve a pergunta que eu tinha feito antes ("o número de entrada também deveria sumir junto?"). Se a intenção era **manter o Nº e remover só a data**, é reverter só o commit `02ae204` (os outros dois ficam de pé).
   - O campo `date` do frontmatter **continua existindo** no schema e nos 55 READMEs — não foi removido nada de dado, só a exibição. Ele ainda decide a ordem cronológica da home (mais recente primeiro).

Todos os três verificados com `astro check` (sem erros novos) e `npm run build` (56 páginas), mais screenshot real via Playwright/Chromium confirmando ausência visual do selo, da data e do carimbo — não só ausência no código.

## Pendências pra próxima sessão (a reformulação de verdade) — todas resolvidas

**Atualizado em 2026-08-26**, mesmo dia, sessão seguinte: itens 1-6 abaixo saíram do papel. O usuário confirmou "quanto mais commit melhor" como critério pro retrofit dos 55 (item 7) — cada gráfico retrofitado vira commit(s) próprio(s), não um lote.

**Atualizado em 2026-08-27**: itens 7, 8 e 9 (os únicos que seguiam abertos) fecharam. Os 55 READMEs estão retrofitados, cada um com "Gráficos parecidos" escolhido à mão, e o risco do item 9 (duas fichas kraft competindo) foi observado ao longo de dezenas de gráficos com bastidor lado a lado sem virar problema visual — não precisou de mudança de layout.

**Correção no mesmo dia, ainda a mesma sessão**: a primeira implementação simplificou 3 peças em relação ao protótipo já decidido (item 3: veredito ficou sem cor; item 4: "como ler" ficou só bullets, sem swatches; item 10: "gráficos parecidos" virou lista markdown simples, sem cartão/borda colorida) — usuário comparou com o protótipo (`https://claude.ai/code/artifact/e09ec399-9219-4e2e-9cba-dab6c3a9d525`) e apontou a divergência. Corrigido: veredito ✓ usa a cor da categoria (`--cat-ink`), ✕ usa `--paper-margin` (a régua vermelha do caderno); "como ler" ganhou suporte a legenda de swatches via HTML cru no README (`.legenda-swatches`/`.swatch`, ver `WORKFLOW.md`); "gráficos parecidos" virou cartão com borda esquerda na cor da categoria de destino (`.parecidos-lista`/`.parecido-item`, também HTML cru). Lição: quando existe um protótipo já aprovado, conferir a implementação contra ele elemento por elemento antes de dar por encerrado — não só contra a descrição em texto das decisões.

1. ~~Atualizar `[slug].astro`~~ — **feito**. Linha de orientação, veredito ✓/✕ (renderizado só se os campos existirem), e o cartão de "Notas do coletor" (identificado em tempo de execução pelo H2 com esse texto exato — ver decisão abaixo — e vestido de carimbo + kraft via script, reaproveitando o padrão visual da ficha técnica). "Gráficos parecidos" **não** virou peça de template: ver decisão do item 2.
2. **Mecanismo decidido**: `veredito_uso`/`veredito_evita` viraram campos de frontmatter (curtos, posição fixa fora do fluxo do Markdown, precisavam ser). **"Gráficos parecidos" NÃO virou campo estruturado** como a sessão anterior recomendava — motivo descoberto na implementação: o corpo do README é renderizado de uma vez só por `<Content />` (astro:content), e "Gráficos parecidos" precisa aparecer **entre** "Variações possíveis" e "Notas do coletor" dentro desse mesmo fluxo — um campo de frontmatter renderizado por fora do `<Content/>` só conseguiria aparecer antes ou depois do bloco inteiro, nunca no meio. Virou seção Markdown comum (`## Gráficos parecidos`), mesmo mecanismo de "Notas do coletor". Fica mais barato de escrever (nenhum campo novo no schema), mas sem validação de link quebrado no build — risco aceito.
3. ~~Atualizar o schema~~ — **feito**: só `veredito_uso`/`veredito_evita` (opcionais) entraram em `content.config.ts`. "Gráficos parecidos" não precisou de schema (é Markdown).
4. ~~Atualizar `docs/WORKFLOW.md` passo 6~~ — **feito**: tabela de seções nova (com zona de cada uma, "Que dados" marcada condicional, "Gráficos parecidos" e "Notas do coletor" descritas), frontmatter de exemplo com os campos novos, regra de escrita com a ressalva do bastidor.
5. ~~Atualizar `PRODUCT.md`~~ — **feito**: o bullet do esqueleto editorial agora descreve as duas zonas; a regra "escrito pra quem chega de fora" ganhou a exceção do bastidor.
6. ~~Atualizar `AGENTS.md`~~ — **feito**: nova entrada em "Decisões fechadas" (2026-08-26), registrando a mudança e por que substitui a de 2026-07-27.
7. ~~Retrofit dos 55 READMEs já publicados~~ — **feito em 2026-08-27**, um commit por gráfico (critério confirmado pelo usuário: "quanto mais commit melhor"), começando pelo piloto [matriz-adjacencia-tags](../graficos/network/matriz-adjacencia-tags) e cobrindo as 10 categorias inteiras (comparison, correlation, distribution, evolution, flow, general, map, network, part-of-whole, ranking). Verificado ao final com `astro check` (60 erros — mesma baseline pré-existente, nenhum novo) e `npm run build` (56 páginas).
8. ~~Escolher os links de "Gráficos parecidos"~~ — **feito**: cada um dos 55 ganhou 1-3 links à mão (nunca por tag em comum), a maioria recíproca (o gráfico linkado também linka de volta). Exemplos de padrão usado: "oposto direto" (ex: matriz de adjacência → rede densa hairball), "mesma técnica, outro domínio" (ex: matriz de adjacência → correlograma), e "próximo passo natural" (ex: circle packing simples → circle packing hierárquico).
9. ~~Revisitar o risco do item 5 das decisões~~ (duas fichas kraft competindo) — **observado, sem virar problema**: com os 55 gráficos tendo bastidor, a combinação ficha técnica + cartão "Notas do coletor" não gerou nenhuma reclamação nem pareceu competir por atenção nos builds/screenshots verificados ao longo do retrofit. Sem mudança de layout necessária.

## Lições que vieram dessa sessão de conversa (não de código)

- **Perguntar propósito antes de layout evitou trabalho perdido de verdade**: a primeira leitura errada (achar que "opção A" valia pros três pares de A/B) foi corrigida só porque perguntei explicitamente em vez de assumir — a resposta real trocou a decisão do bastidor de A pra B, o oposto do que eu tinha inferido da frase solta "gostei da opção A". Vale sempre confirmar quando uma resposta do usuário é ambígua o bastante pra admitir duas leituras que levam a trabalho diferente, mesmo quando isso significa uma pergunta a mais antes de agir.
- **Protótipo em Artifact com os tokens reais do site** (não um mockup genérico) foi o que permitiu decisão rápida e concreta — decisão de design em texto solto ("prefiro uma abordagem mais discreta") teria sido muito mais lenta e ambígua de confirmar do que reagir a duas versões renderizadas lado a lado.
