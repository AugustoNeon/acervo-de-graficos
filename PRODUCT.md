# Product

## Users

Por enquanto, só o próprio Augusto — uma ferramenta pessoal de consulta pra navegar e comparar os gráficos R que ele vai adicionando ao longo do tempo. Está sendo construída sabendo que vai virar um portfólio compartilhável no futuro, então a qualidade visual não deve ser tratada como descartável mesmo enquanto o uso é só interno.

## Product Purpose

Ser um **acervo de referência sobre tipos de gráfico que dá pra criar** — não uma vitrine de resultados nem um log técnico pessoal. Cada entrada responde, pra quem chega de fora: o que é esse gráfico, pra que serve, quando usar e quando evitar, que dado ele exige, como lê-lo, como foi construído, que armadilhas esperar e como reproduzir (código completo na página). Organizado por categoria. Sucesso = alguém que nunca viu aquele tipo de gráfico entende se ele serve pro problema que tem em mãos, e consegue reproduzir.

## Brand Personality

Este é um acervo autoral que vira portfólio — o design **é** parte do produto, não só serve a ele. A página tem presença visual própria, não precisa desaparecer atrás da tarefa.

Desde o redesign de 2026-08-14, o mundo visual é o **"caderno de campo"**: um caderno de laboratório/naturalista, não um site de produto. Decisão completa e sistema visual (paleta, tipografia, materiais, motion) em [DESIGN.md](DESIGN.md) — não duplicar aqui.

> **Histórico:** a versão de 2026-07-21 pedia "fundo claro/neutro, decoração mínima"; a de 2026-07-31 reagiu contra isso pedindo cor viva e movimento, mas ainda dentro do vocabulário de "site de produto" (cards, filtros, tokens neutros com sotaque de cor). O redesign de 2026-08-14 foi além: trocou o **mundo** inteiro, a pedido explícito do usuário ("redesign TOTAL", "irreconhecível"), não só a paleta em cima da mesma estrutura.

## Anti-references

O r-graph-gallery.com original: sidebar de categorias à esquerda, fundo branco genérico, grid de cards padrão, estética de tutorial/documentação técnica. O site precisa ser claramente diferente na execução visual — a organização por categoria é reaproveitada (é útil pra navegação), mas o visual é autoral.

Também evitar, desde o redesign de 2026-08-14: o próprio visual anterior do site (cards uniformes, fundo neutro com sotaque de cor) — virou o segundo anti-reference, não só o r-graph-gallery.com original.

## Design Principles

- **Cada gráfico muda paleta de cores E, quando possível, os valores/dados** em relação ao exemplo original do R Graph Gallery — nunca sai idêntico visualmente, mesmo copiando a técnica/estrutura do código. Isso vale tanto pro gráfico em si quanto pro site ao redor (ver Anti-references).
- **Paleta de dados da casa, viva.** Existe uma paleta categórica/sequencial própria do acervo, de croma alto, definida uma vez e usada por todos os gráficos — em vez de cair no `RColorBrewer`/`viridis` default a cada gráfico novo. Ela vive no `script.R` (que exporta a cor no `data.json`), pra que estático e interativo nunca divirjam. Isso continua satisfazendo a regra de "nunca sair igual ao exemplo original", e ainda dá unidade visual ao acervo inteiro.
- **Movimento é material, não acabamento.** Gráfico entra desenhando-se, mudança de estado é transicionada, o site responde ao scroll e à navegação. Decidido junto com o gráfico, não adicionado depois. Sempre com alternativa em `prefers-reduced-motion`, e sem nunca condicionar a *existência* do conteúdo à animação — o gráfico já está correto na tela antes de qualquer transição rodar.
- **Interatividade real é prioridade #1**: ao adicionar cada gráfico novo, priorizar ativamente gerar um widget HTML interativo direto do R (`plotly::ggplotly()`, `networkD3`, `chorddiag`, `visNetwork`, etc.) quando existir um pacote adequado pro tipo de gráfico — mesmo que dê mais trabalho por gráfico. Quando não houver equivalente interativo razoável, cai para imagem estática com interação leve de vitrine (hover/zoom/lightbox) via CSS/JS da própria galeria.
- Construir para o portfólio que isso vai virar, não só pra ferramenta de consulta de hoje — decisões de design não são descartáveis.
- Categorias espelham a navegação do R Graph Gallery original, mas a execução visual é autoral, não um clone.
- **O site nunca cita/linka a fonte original publicamente** — nem no texto, nem como fonte visível, nem como "o exemplo original". A referência fica só como metadado interno (frontmatter `source` de cada README, para uso nosso), nunca renderizada nas páginas do site. O material precisa se sustentar como autoral.
- **Toda página de gráfico segue o mesmo esqueleto editorial**, sem exceção: ficha técnica (pacotes, dado exigido, nível, tags) → o que é / para que serve → quando usar e evitar → que dados precisa → como ler → como foi feito → possíveis problemas → variações → código completo. Padrão detalhado no passo 6 do [`docs/WORKFLOW.md`](docs/WORKFLOW.md). Consistência entre páginas é o que separa "acervo" de "pasta de exemplos".
- **Texto escrito pra quem chega de fora**, nunca pra nós mesmos — sem "detectei", "tive dificuldade", "reaproveitei do gráfico anterior".

## Accessibility & Inclusion

Sem requisito formal específico — boas práticas razoáveis (contraste legível, navegação básica por teclado) bastam; não é prioridade do projeto.
