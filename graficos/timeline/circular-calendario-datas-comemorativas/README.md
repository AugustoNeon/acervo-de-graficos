---
title: "Calendário circular de datas comemorativas"
category: timeline
date: 2026-09-04
source: "https://r-graph-gallery.com/circular-barplot.html (domínio bloqueado nesta sessão; URL não conferida)"
interactive: true
resumo: "18 datas comemorativas reais do Brasil dispostas em círculo, como um calendário de parede — janeiro no topo, sentido horário. O eixo circular mostra de graça uma continuidade que um eixo linear esconderia: 31 de dezembro emenda direto em 1o de janeiro."
veredito_uso: "seus dados são posições dentro de um ciclo que se repete (dias do ano, horas do dia, dias da semana) e a costura do ciclo — o ponto em que ele reinicia — importa pra leitura."
veredito_evita: "seu eixo temporal não é cíclico (tem um início e um fim de verdade, sem voltar ao começo) — um eixo linear comum já resolve, sem a curvatura atrapalhar a comparação de distâncias."
pacotes: ["ggplot2"]
dados: "1 data + 1 categoria por evento (datas fixas de calendário, não série temporal)"
nivel: avançado
tags: ["calendário", "circular", "sazonalidade", "feriados"]
---

## O que é

Um calendário circular posiciona cada evento no ângulo correspondente ao seu
dia do ano — janeiro no topo, sentido horário, como um relógio de doze
posições em vez de doze horas. **Para que serve**: mostrar a distribuição de
eventos ao longo do ano de um jeito que revela a **costura do calendário**
(31 de dezembro encostado em 1o de janeiro) em vez de escondê-la atrás de um
corte arbitrário — o problema que qualquer eixo linear tem com um dado que é
genuinamente cíclico.

## Quando usar (e quando evitar)

**Use quando** a posição no ciclo importa mais que a distância desde um
início fixo — sazonalidade, feriados, padrões de hora do dia ou dia da
semana. O círculo deixa claro que dezembro e janeiro são vizinhos, uma
relação que um eixo X reto de "dia 1" a "dia 365" corta ao meio.

**Evite quando** seu eixo temporal tem começo e fim de verdade, sem
reinício — a evolução de uma métrica ano a ano, por exemplo. Nesse caso a
curvatura do círculo só torna mais difícil comparar duas distâncias (a
mesma diferença em dias ocupa arcos de tamanho diferente dependendo de
onde caem no círculo), sem ganhar nada em troca.

## Como ler o gráfico

- **Posição angular**: dia do ano do evento — topo é 1o de janeiro, sentido
  horário, uma volta completa por ano.
- **Cor**: categoria do evento (nacional, religioso, comercial, cultural,
  internacional).
- **Ponto**: a data real — nunca se move, mesmo quando o rótulo ao lado
  precisou ser afastado (ver abaixo).
- **Linha-guia fina**: só aparece quando o nome do evento foi deslocado pra
  outro ângulo por causa de um vizinho próximo no calendário — liga o ponto
  (data real) ao texto (posição de leitura).

## Como foi feito

**Estático**: `coord_polar(theta = "x")` sobre um eixo X de 1 a 365 (dia do
ano). Nenhuma geometria de calendário pronta no `ggplot2` — o "relógio" é
só um `geom_segment()` por mês (spoke) mais `geom_point()`/`geom_text()`
para os eventos.

**Dado real, não fictício**: 18 feriados e datas comemorativas brasileiras
de 2025 — datas de calendário são fatos, não estatísticas inventadas.
Carnaval e Sexta-feira Santa são móveis e usam as datas reais de um ano
específico.

**Rótulo alinhado ao raio, como raio de roda**: cada nome de evento é
desenhado rotacionado para apontar radialmente (pra fora do centro),
mesma convenção de outro gráfico circular deste acervo — sem isso o texto
ficaria sempre na horizontal, ilegível na metade do círculo perto do
"meio-dia"/"meia-noite" do relógio.

**Colisão de rótulo, resolvida no eixo ANGULAR**: duas datas próximas no
calendário (Natal e Véspera de Ano Novo, 6 dias) têm texto colidindo se
ficarem no mesmo raio com o mesmo ângulo. A correção afasta o rótulo
colidente pra **outro dia** (nunca o ponto, que fica sempre na data real),
ligando os dois por uma linha-guia fina. Ver "Possíveis problemas pelo
caminho" abaixo para a primeira tentativa (raio, não ângulo) e por que ela
não funcionou.

**Na versão interativa**: o D3 recebe só dia-do-ano/categoria brutos (nunca
ângulo ou posição de rótulo prontos) e recalcula a mesma trigonometria e o
mesmo algoritmo de espalhamento angular do script.R — mesmo princípio já
usado no gráfico ternário desta categoria, aplicado aqui a ângulo em vez de
coordenada cartesiana. Tooltip mostra a data por extenso; legenda clicável
acende os eventos de uma categoria.

## Possíveis problemas pelo caminho

- **Problema**: colisão circular — o "vizinho anterior" do primeiro evento
  do ano (1o de janeiro) é o ÚLTIMO evento (31 de dezembro), não o
  segundo. **Por quê**: qualquer algoritmo de colisão que percorra os
  eventos ordenados por dia numa única passada linear quebra bem na costura
  do calendário: o primeiro elemento da passada dependeria de um valor
  (o do último elemento) que a mesma passada só calcula no final —
  uma dependência circular genuína, não um bug de lógica comum.
  **Solução**: "cortar" o círculo no maior vão vazio entre dois eventos
  consecutivos (com 18 eventos espalhados pelo ano, sempre sobra um vão
  bem maior que o limiar de colisão) e começar a passada logo ali — o
  vizinho anterior do primeiro elemento da passada fica garantidamente
  longe, e nenhum índice depende de um valor calculado depois dele na
  mesma passada.
- **Problema**: a primeira tentativa de separar rótulos colidentes
  empurrava o texto pra um RAIO maior (mais longe do centro), e não deu
  certo mesmo depois de calibrar o espaçamento com cuidado. **Por quê**:
  nesse gráfico o rótulo já sai rotacionado alinhado com o próprio raio —
  tipo raio de roda, em qualquer ponto do círculo, não só nos polos. Isso
  significa que "abrir espaço empurrando pelo raio" empurra o texto bem na
  direção em que ele **já se estende sozinho**: o comprimento do próprio
  nome ("Confraternização Universal", 27 letras) competia direto com a
  distância aberta, e a única forma de garantir espaço suficiente era um
  raio enorme (a maior parte dele vazia, só pros piores casos). **Solução**:
  espalhar o rótulo colidente no eixo ANGULAR (outro dia do ano só pro
  texto) em vez do raio — o comprimento do nome não compete com essa
  direção, então um deslocamento pequeno (na casa de 10 dias) já resolve,
  com uma linha-guia deixando claro a qual ponto o texto pertence.
- **Problema**: usar 2024 (ano bissexto) como referência fazia a Véspera de
  Ano Novo (dia 366) sumir silenciosamente do gráfico. **Por quê**:
  `scale_x_continuous(limits = c(0, 365))` corta qualquer ponto fora da
  faixa sem erro, só um aviso genérico de "linhas removidas". **Solução**:
  usar 2025 (não-bissexto) como ano de referência — e por tabela corrigir
  as datas de Carnaval/Sexta-feira Santa, que tinham sido copiadas do
  rascunho inicial em 2024 e não eram mais as datas reais de 2025.

- **Problema (só na versão interativa)**: a página, ao contrário do
  `output.png` (sempre 1500px), vive num container de largura variável —
  em telas estreitas o círculo some quase por completo se a fonte do
  rótulo ficar fixa em px reais. **Por quê**: o raio disponível encolhe em
  telas estreitas, mas o texto (dimensionado em px reais pra não ficar
  ilegível) não — o nome mais comprido ("Dia das Crianças / N. Sra.
  Aparecida", quase 40 caracteres) devora o raio inteiro. **Solução**:
  em vez de encolher o círculo pra abrir espaço (o que faria os PONTOS se
  aglomerarem de novo, trocando um problema por outro pior em tela
  pequena), o D3 encolhe a FONTE — mede o rótulo mais comprido de verdade
  (`getComputedTextLength()`) e reduz o tamanho até ele caber no raio
  disponível, convergindo em poucas tentativas. Mesmo assim, com muitos
  eventos próximos e nomes compridos, sobra alguma sobreposição residual
  nos aglomerados mais densos em telas estreitas — o tooltip continua
  dando o nome exato de qualquer ponto, então a informação nunca se perde,
  só a leitura por cima fica mais apertada que no `output.png`.

## Variações possíveis

- Usar horas do dia (0-24h) em vez de dias do ano, útil pra visualizar
  padrão de uso/tráfego que se repete diariamente — mesma lógica circular,
  período menor.
- Adicionar um segundo anel mais interno com uma métrica contínua (ex:
  temperatura média, volume de vendas) como uma linha fechada, comparando
  sazonalidade de uma métrica com a posição dos eventos que a explicam.
- Filtrar por categoria via um controle além da legenda, útil quando o
  número de eventos crescer o bastante pra "todos de uma vez" virar denso
  demais mesmo com o espalhamento angular.

## Notas do coletor

<div class="pull-quote">o comprimento do próprio nome competia direto com a distância aberta</div>

Quarta entrada da categoria `timeline`, e a primeira com geometria
realmente circular (as outras três — marcos, Gantt, enxame — são todas
variações de eixo linear). A escolha de dado real (feriados brasileiros de
2025) em vez de fictício, pela primeira vez nesta categoria, foi
deliberada: datas de calendário são fatos verificáveis, não pedem
invenção nenhuma, e um calendário de feriados inventado não ensinaria nada
que um real não ensine melhor.

O bug mais instrutivo desta entrada não foi de sintaxe nem de tipo — foi
uma dependência circular genuína, do tipo que só aparece quando o próprio
domínio dos dados é cíclico. Uma passada linear simples ("ordena por dia,
compara cada um com o anterior") é o algoritmo natural pra detectar
colisão numa lista — e é exatamente o que quebra na costura de um
calendário, porque o "anterior" do primeiro elemento do ano é o último, e
esse ainda não foi calculado. A correção (cortar o círculo no maior vão
vazio antes de percorrer) generaliza pra qualquer problema de colisão ou
camada sobre um domínio circular/periódico — vale registrar como padrão
pra próxima vez que aparecer.

O segundo bug — tentar separar texto colidente pelo raio, quando o próprio
texto já se estende radialmente — só apareceu depois de medir com precisão
(usando o layout real, não uma estimativa de cabeça) e descobrir que
mesmo um raio bem generoso não bastava: o comprimento do nome mais longo
crescia junto com qualquer tentativa de calibrar a distância entre
camadas, porque as duas coisas competem pelo mesmo eixo. Mudar o eixo do
deslocamento (angular em vez de radial) resolveu de vez, sem precisar de
calibração nenhuma — a lição maior é notar, antes de calibrar uma
constante, se a direção do deslocamento não está competindo estruturalmente
com a coisa que ele tenta abrir espaço para.
