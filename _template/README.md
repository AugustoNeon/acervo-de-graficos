---
title: "Nome do gráfico"
category: categoria
date: AAAA-MM-DD
source: "link da página de referência (uso interno só, NUNCA aparece no site)"
interactive: false
resumo: "Uma frase dizendo o que esse gráfico mostra. Aparece no topo da página e no card da galeria."
# veredito_uso: "uma frase: quando esse gráfico é a escolha certa."   # opcional, preencha os dois ou nenhum
# veredito_evita: "uma frase: quando evitar."                         # opcional
pacotes: ["ggplot2"]
dados: "ex: 1 variável categórica + 1 numérica"
nivel: básico
tags: ["ex: estático", "ex: comparação"]
---

## O que é

Definição curta do tipo de gráfico, em linguagem de quem está explicando pra
alguém que nunca viu. **Para que serve**: que pergunta ele responde, que tipo de
leitura ele torna possível.

## Quando usar (e quando evitar)

**Use quando** ...

**Evite quando** ... (e o que usar no lugar nesses casos).

## Que dados você precisa

- **variável X** — o que é
- **variável Y** — o que é

Formato esperado (dado longo/tidy? agregado? matriz?) e o que o próprio código
já resolve sozinho.

## Como ler o gráfico

<!-- Preferencial quando a leitura é principalmente por cor: legenda de
     swatches (ver formato completo em docs/WORKFLOW.md), com as cores REAIS
     do script.R, não inventadas.

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#COR_REAL"></span> O que essa cor significa</div>
</div>
-->

- **Eixo/posição**: ...
- **Cor**: ...
- **Tamanho**: ...

O que um padrão visual específico significa na prática (padrões espaciais que
a cor sozinha não cobre — blocos, manchas, simetria — continuam em prosa/bullets
mesmo quando "Como ler" usa a legenda de swatches acima).

<!-- Opcional, no máximo 1 por seção longa — pull-quote com uma frase LITERAL
     tirada do parágrafo ao lado, nunca inventada. Ver docs/WORKFLOW.md pro
     formato flutuado (pull-quote-direita clearfix).

<div class="pull-quote">a frase exata copiada do texto ao redor</div>
-->

## Como foi feito

Técnica usada e por quê, pacotes principais e o papel de cada um, decisões de
construção que não são óbvias olhando só o resultado.

Dados fictícios: descrever o que foi inventado (seed, estrutura, faixas).

## Possíveis problemas pelo caminho

- **Problema**: sintoma que aparece. **Por quê**: causa. **Solução**: o que fazer.

## Variações possíveis

- O que dá pra mudar a partir daqui (layout, agrupamento, versão interativa,
  small multiples, escala...).

<!-- Opcional — 1 a 3 links escolhidos à mão pra outros gráficos do acervo,
     nunca por tag em comum. Remova este comentário e a seção se não houver
     link que valha a pena.

## Gráficos parecidos

<div class="parecidos-lista">
  <a class="parecido-item" href="../slug-do-vizinho" style="--cat-link: var(--cat-CATEGORIA); --cat-link-ink: var(--cat-CATEGORIA-ink);">
    <span class="parecido-cat">categoria</span>
    <span class="parecido-titulo">Título exato do gráfico linkado</span>
    <span class="parecido-razao">Por que é o "oposto direto" ou "mesma técnica, outro domínio".</span>
  </a>
</div>
-->

<!-- Opcional mas recomendada — a história real de 1 decisão ou bug deste
     gráfico especificamente, contada com intenção (não diário cru). Única
     seção onde isso tem permissão de aparecer — ver docs/WORKFLOW.md passo 6.
     Precisa ser SEMPRE a última seção do arquivo.

## Notas do coletor

Texto aqui.
-->
