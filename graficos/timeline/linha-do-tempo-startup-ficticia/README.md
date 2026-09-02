---
title: "Linha do tempo: marcos de uma startup fictícia"
category: timeline
date: 2026-09-01
source: "https://r-graph-gallery.com/web-time-line-with-ggplot2.html (domínio bloqueado nesta sessão; URL não conferida)"
interactive: true
resumo: "Marcos de uma startup fictícia entre 2019 e 2024, posicionados por data real ao longo de um eixo e coloridos por categoria (fundação/produto/financeiro/crescimento) — o espaçamento mostra o ritmo, a cor mostra a frente de cada marco."
veredito_uso: "os eventos são discretos e o espaçamento real entre eles importa (o que aconteceu rápido, o que demorou)."
veredito_evita: "o que você tem é uma métrica contínua mudando no tempo — isso é gráfico de evolução, não linha do tempo."
pacotes: ["ggplot2"]
dados: "1 data + 1 rótulo + 1 categoria por marco (lista de eventos, não série temporal)"
nivel: básico
tags: ["temporal", "eventos", "narrativa", "categorização"]
---

## O que é

Uma linha do tempo desenha uma sequência de eventos discretos — marcos com
data e nome — como pontos ao longo de um eixo temporal único, com o rótulo de
cada um alternando acima e abaixo da linha pra não se sobrepor. **Para que
serve**: mostrar quando cada coisa aconteceu e, principalmente, o **espaço
real entre elas** — dois marcos próximos no calendário aparecem próximos no
desenho, dois anos de silêncio aparecem como um vão vazio.

## Quando usar (e quando evitar)

**Use quando** você tem uma lista de eventos com data, não uma métrica que
varia continuamente — a fundação de uma empresa, os lançamentos de um
produto, os marcos de um projeto.

**Evite quando** o que muda é um número contínuo ao longo do tempo (receita
mês a mês, temperatura por dia) — isso é gráfico de evolução (linha, área),
que este acervo já cobre em outra categoria. Uma linha do tempo trata cada
ponto como um evento nomeado, não como uma amostra de uma série.

- Poucos eventos (menos de 20) cabem bem alternando acima/abaixo. Com muitos
  mais, os rótulos colidem mesmo alternando — vale agrupar por período ou
  cortar pra só os marcos mais importantes.

## Como ler o gráfico

- **Posição horizontal**: a data real do marco — o espaçamento entre pontos
  é proporcional ao tempo entre eles, não uma ordem igualmente espaçada.
- **Haste + lado (acima/abaixo)**: só resolve onde o rótulo cabe sem
  sobrepor o vizinho — não codifica nenhum dado.
- **Ponto**: marca a data exata sobre o eixo; a data curta aparece perto
  dele, o nome do marco no fim da haste.
- **Cor**: a categoria do marco — o eixo em si (a linha horizontal)
  continua neutro, só o evento carrega cor.

<div class="legenda-swatches">
  <div><span class="swatch" style="background:#4A7B6D"></span> Fundação</div>
  <div><span class="swatch" style="background:#3B6E8F"></span> Produto</div>
  <div><span class="swatch" style="background:#C1673A"></span> Financeiro</div>
  <div><span class="swatch" style="background:#8B5FA8"></span> Crescimento</div>
</div>

## Como foi feito

**Estático**: `geom_hline()` desenha o eixo, `geom_segment()` desenha cada
haste (`yend = lado * altura`, onde `lado` é 1 ou -1 pré-calculado nos
dados), e dois `geom_text()` colocam o nome do marco e a data curta em
alturas diferentes da mesma haste. `coord_cartesian(clip = "off")` +
`scale_x_date(expand = expansion(mult = 0.1))` evitam que o primeiro/último
rótulo saia cortado na borda — sem os dois, o marco mais recente ficava com
o texto cortado na lateral direita. A cor de cada categoria (`cor_categoria`,
um vetor nomeado) alimenta só a haste e o ponto — o eixo horizontal e o
texto dos rótulos continuam numa cor neutra, pra cor ficar reservada ao
evento em si.

**Dado fictício**: 8 marcos de uma startup entre 2019 e 2024, com datas
propositalmente irregulares (não um marco por trimestre) — é o que torna
visível a diferença de ritmo entre os intervalos. Cada marco também carrega
uma categoria (Fundação/Produto/Financeiro/Crescimento) que conta a mesma
história por um segundo ângulo: rodadas de investimento puxando o próximo
patamar de produto, que puxa o próximo patamar de usuários.

**Na versão interativa**: o `lado` de cada marco vem pronto do `data.json`
(calculado uma vez em R), nunca recalculado em D3 — pra estático e
interativo nunca discordarem de qual marco fica de que lado. A cor de cada
categoria também nasce uma única vez em R (`meta.cores`) e alimenta as duas
versões. A entrada anima as hastes crescendo a partir do eixo em ordem
cronológica; passar o cursor sobre um ponto mostra categoria e data
completa; apontar ou clicar um ponto (ou a legenda) acende todos os marcos
da mesma categoria e apaga o resto.

## Possíveis problemas pelo caminho

- **Problema**: o rótulo do primeiro ou do último marco sai cortado na
  borda da imagem. **Por quê**: o `ggplot2` recorta qualquer texto que
  passe do painel por padrão. **Solução**: `coord_cartesian(clip = "off")`
  junto com uma expansão maior no eixo X (`expand = expansion(mult = 0.1)`)
  — sem os dois juntos, o clipe volta.
- **Problema**: acentos saem corrompidos no `output.png` ou no
  `data.json` (ex: "Fundação" virando bytes ilegíveis). **Por quê**: a
  sessão R roda em locale `C` puro (ASCII), sem suporte a UTF-8, nesta
  máquina. **Solução**: `Sys.setlocale("LC_CTYPE", "C.utf8")` no início do
  script — `locale -a` confirma que o `C.utf8` existe no sistema mesmo
  quando não é o padrão da sessão.

## Variações possíveis

- Trocar o alternado fixo (par/ímpar) por um algoritmo que decide o lado
  observando a distância pro vizinho mais próximo, útil quando os eventos
  não estão espalhados de forma tão regular quanto neste exemplo.
- Trocar a haste reta por uma curva suave (S-curve) entre o eixo e o
  rótulo, estética comum em linhas do tempo de storytelling.
- Agrupar marcos muito próximos numa única "faixa" expansível, pra caber
  mais eventos sem lotar o eixo — o gráfico [linha do tempo
  densa](../linha-do-tempo-densa-releases) desta mesma categoria resolve
  esse mesmo problema, só que para dezenas de eventos em vez de poucos.

## Notas do coletor

<div class="pull-quote">a sessão R roda em locale C puro (ASCII), sem suporte a UTF-8, nesta máquina</div>

Esta é a primeira entrada da categoria `timeline`, e ela expôs um problema
de ambiente que os 58 gráficos anteriores nunca tinham revelado: o
`data.json` saiu com todo acento corrompido (`"Fundação"` virou uma
sequência de bytes ilegível) na primeira execução do script. A causa não
era o `jsonlite`, era o R inteiro rodando em locale `C` (ASCII puro,
`Sys.getlocale()` confirmando `"C"` e `l10n_info()$"UTF-8"` como `FALSE`) —
qualquer string com acento vira bytes crus antes mesmo de chegar no
`write_json()`.

A correção foi de uma linha (`Sys.setlocale("LC_CTYPE", "C.utf8")` logo no
início do script, com `C.utf8` confirmado disponível via `locale -a`), mas
o motivo de valer registrar aqui é que essa sessão específica veio sem R
instalado — precisou de `apt-get install r-base-core` do zero — e o
container resultante trouxe locale ASCII por padrão, diferente de sessões
anteriores deste mesmo projeto (que já mencionavam `C.UTF-8`, com suporte,
no ambiente delas). O ambiente de container não é garantidamente o mesmo
entre sessões, mesmo pro mesmo projeto — vale testar uma string acentuada
de verdade (não só rodar sem erro) em qualquer script novo neste tipo de
ambiente, antes de assumir que UTF-8 "só funciona".

**2026-09-02**: evoluído a pedido do usuário com uma categoria por marco.
A decisão mais deliberada não foi a cor em si, mas onde ELA não entra: o
eixo horizontal continua neutro. Testado mentalmente colorir a linha
inteira por segmento entre marcos — descartado antes de implementar,
porque o eixo representa o tempo em si (contínuo, sem categoria própria),
e colori-lo criaria uma leitura falsa de "trecho de tempo pertence a uma
categoria", quando na verdade é o evento pontual que carrega a categoria,
não o intervalo entre eventos.
