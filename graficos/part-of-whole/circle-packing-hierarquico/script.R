# Libraries
library(ggraph)
library(igraph)

# Dados ficticios: catalogo de streaming (midia > genero > titulo), horas
# assistidas/ouvidas num mes ficticio -- no lugar do dataset real "flare"
# (hierarquia de pacotes de software) do exemplo original
dados <- data.frame(
  midia = rep(c("Filmes", "Series", "Musica", "Podcasts"), each = 6),
  genero = c(
    rep(c("Acao", "Comedia", "Drama"), each = 2),
    rep(c("Ficcao Cientifica", "Documentario", "Sitcom"), each = 2),
    rep(c("Pop", "Rock", "MPB"), each = 2),
    rep(c("Noticias", "True Crime", "Educacao"), each = 2)
  ),
  titulo = c(
    "Trovao Final", "Ronda de Aco", "Risada Geral", "Zoeira Nacional", "Lagrimas de Vidro", "Segunda Chance",
    "Orbita Zero", "Simulacro", "Fundo do Mar", "Era Glacial", "Vizinhos Terriveis", "Escritorio Vazio",
    "Verao Sem Fim", "Luz de Neon", "Estrada de Ferro", "Ruido Branco", "Violao e Chuva", "Samba Novo",
    "Resumo do Dia", "Manchetes", "Caso Encerrado", "Arquivo Aberto", "Aprenda Rapido", "Ciencia Simples"
  ),
  horas = c(
    82, 54, 61, 39, 47, 33,
    95, 58, 42, 36, 70, 45,
    120, 88, 66, 40, 58, 44,
    30, 22, 77, 51, 35, 28
  )
)

# Monta a hierarquia como grafo (raiz -> midia -> genero -> titulo). Cada
# nome e unico globalmente (nenhum genero se repete entre midias), entao da
# pra usar os nomes direto como id dos vertices, sem precisar concatenar
# caminho -- ver AGENTS.md "Licoes aprendidas" se isso mudar no futuro
edges <- rbind(
  data.frame(from = "Catalogo", to = unique(dados$midia)),
  setNames(unique(dados[, c("midia", "genero")]), c("from", "to")),
  data.frame(from = dados$genero, to = dados$titulo)
)

# "horas" so existe nas folhas (titulos); nos internos ficam 0 e o layout
# circlepack soma os descendentes sozinho pra definir a area de cada anel
# (0, nao NA -- o layout_igraph_circlepack faz uma comparacao != 0 internamente)
vertices <- data.frame(
  name = c("Catalogo", unique(dados$midia), unique(dados$genero), dados$titulo),
  horas = c(
    0, rep(0, length(unique(dados$midia))), rep(0, length(unique(dados$genero))),
    dados$horas
  )
)

mygraph <- graph_from_data_frame(edges, vertices = vertices)

# Paleta por profundidade, definida UMA vez e reaproveitada pelas duas versoes
# (estatica aqui, interativa no fim do script) -- evita as duas dessincronizarem
# quando uma cor muda. Paleta trocada em relacao ao original (viridis) por
# tons teal/dourado/terracota
cor_nivel <- c("0" = "white", "1" = "#2a9d8f", "2" = "#e9c46a", "3" = "#e76f51")

# Esconde o primeiro nivel: a raiz recebe a mesma cor do fundo, entao ainda
# ocupa espaco mas fica invisivel (o layout nao tem opcao de omitir nivel).
# set.seed imediatamente antes do layout: o "circlepack" do ggraph e
# estocastico (duas chamadas seguidas, com os mesmos dados, produzem arranjos
# diferentes), entao sem semente o output.png muda a cada execucao
set.seed(2907)
p <- ggraph(mygraph, layout = "circlepack", weight = horas) +
  geom_node_circle(aes(fill = as.factor(depth), color = as.factor(depth))) +
  scale_fill_manual(values = cor_nivel) +
  scale_color_manual(values = c("0" = "white", "1" = "black", "2" = "black", "3" = "black")) +
  theme_void() +
  theme(legend.position = "none")

ggsave("output.png", plot = p, width = 7, height = 7, dpi = 150)

# Versao interativa: circlepackeR permite clicar pra dar zoom num galho da
# hierarquia (o ggraph estatico so mostra tudo de uma vez, sem navegacao)
library(data.tree)
library(circlepackeR)
library(htmltools)

# pathString usa os nomes originais (curtos) -- o data.tree aceita nomes
# repetidos em galhos diferentes, entao aqui nem precisaria da unicidade
# global exigida pelo grafo acima; mantida mesmo assim por consistencia
dados$pathString <- paste("Catalogo", dados$midia, dados$genero, dados$titulo, sep = "/")
populacao <- as.Node(dados)

# width/height explicitos (em vez de deixar NULL) -- o widget calcula seu
# proprio diametro como o MENOR entre largura e altura do container
# (ver htmlwidgets/circlepackeR.js), entao uma altura fixa e razoavel evita
# depender do fallback de altura do iframe do site.
#
# color_min/color_max sao os EXTREMOS de um gradiente continuo de 2 cores: o
# widget nao aceita uma cor por nivel. Vao no tom certo (teal -> terracota) so
# pra degradar bem caso o JS abaixo nao rode; as cores finais de cada nivel
# quem manda sao o CSS e o JS.
widget <- circlepackeR(
  populacao,
  size = "horas",
  color_min = cor_nivel[["1"]],
  color_max = cor_nivel[["3"]],
  width = "100%",
  height = 480
)

# O circlepackeR pinta os circulos por um gradiente continuo de DUAS cores
# (dominio fixo de profundidade -1 a 5), e as folhas vem brancas do CSS do
# proprio pacote -- nenhum parametro da funcao permite uma cor por nivel como
# no grafico estatico. Duas camadas resolvem, aplicadas sobre o widget salvo:
#
# 1. CSS pra raiz (invisivel) e folhas -- estas nao tem cor inline, entao
#    basta a regra normal; a raiz tem, por isso o !important.
# margin: 0 auto no svg centraliza o desenho: o widget usa como diametro o
# MENOR entre largura e altura do container, entao num container largo e baixo
# o svg sai quadrado e sobra vazio de um lado so se nao centralizar
folha_css <- tags$style(HTML(sprintf("
  body { margin: 0; }
  .circlepackeR > svg        { display: block; margin: 0 auto; }
  .circlepackeR .node        { stroke: #1a1a1a; stroke-width: 0.6px; }
  .circlepackeR .node--root  { fill: %s !important; stroke: %s; }
  .circlepackeR .node--leaf  { fill: %s; }
", cor_nivel[["0"]], cor_nivel[["0"]], cor_nivel[["3"]])))

# 2. JS pros niveis do meio (midia/genero), que recebem cor inline do
#    gradiente e por isso nao podem ser resolvidos por CSS. O d3 deixa o dado
#    de cada circulo em `__data__`, entao da pra reler a profundidade e
#    repintar. setInterval (e nao requestAnimationFrame) porque o widget
#    renderiza depois desta tag, e um timer roda mesmo em aba fora de foco.
#    A funcao de zoom do pacote so anima posicao/raio, nunca o preenchimento,
#    logo repintar uma vez basta -- o clique-pra-ampliar continua igual.
#
# O mesmo script tambem conserta um segundo defeito do pacote: ele mede o
# container UMA vez, no render, e o handler de resize dele e uma funcao VAZIA
# -- ele nunca reage a mudancas de tamanho depois do primeiro desenho. Isso da
# dois sintomas possiveis, dependendo de QUANDO a medicao acontece: se o
# container ainda nao tem layout (diametro 0), o widget fica vazio pra sempre;
# se o container tem um tamanho so PROVISORIO nesse instante (ex: o script da
# pagina ainda vai ajustar a altura do iframe, ou uma fonte carrega por ultimo
# e remexe o layout por alguns px), o SVG fica desenhado pro tamanho antigo e
# sai desalinhado/cortado em relacao a caixa final -- intermitente, porque
# depende de uma corrida contra esses outros ajustes de layout.
#
# Um ResizeObserver no proprio container resolve os dois de uma vez, no lugar
# do polling anterior (que so tentava redesenhar enquanto o SVG media 0): o
# primeiro callback do observer ja cobre 'container sem layout ainda' (o
# ResizeObserver dispara de novo assim que o tamanho deixar de ser 0x0), e os
# callbacks seguintes cobrem qualquer resize depois disso -- inclusive os que
# a pagina do site faz depois do primeiro desenho. Redesenhar e seguro: o
# renderValue do pacote limpa o container antes de desenhar de novo.
nivel_js <- tags$script(HTML(sprintf("
  (function () {
    var cor = { 1: '%s', 2: '%s' };

    function pintarNiveis(el) {
      el.querySelectorAll('circle').forEach(function (c) {
        var d = c.__data__;
        if (d && cor[d.depth]) c.style.fill = cor[d.depth];
      });
    }

    function redesenhar(el) {
      var reg = (window.HTMLWidgets && HTMLWidgets.widgets || []).filter(
        function (w) { return w.name === 'circlepackeR'; }
      )[0];
      var carga = document.querySelector('script[data-for=\"' + el.id + '\"]');
      if (!reg || !carga) return;
      var x = JSON.parse(carga.textContent).x;
      reg.renderValue(el, x, reg.initialize(el, el.offsetWidth, el.offsetHeight));
      pintarNiveis(el);
    }

    var el = document.querySelector('.circlepackeR');
    if (!el || typeof ResizeObserver === 'undefined') return;

    var pendente = null;
    var ultimoW = 0;
    var ultimoH = 0;
    var ro = new ResizeObserver(function (entries) {
      var caixa = entries[0].contentRect;
      var w = Math.round(caixa.width);
      var h = Math.round(caixa.height);
      if (w <= 0 || h <= 0 || (w === ultimoW && h === ultimoH)) return;
      ultimoW = w;
      ultimoH = h;
      clearTimeout(pendente);
      pendente = setTimeout(function () { redesenhar(el); }, 60);
    });
    ro.observe(el);
  })();
", cor_nivel[["1"]], cor_nivel[["2"]])))

# save_html (em vez de saveWidget) porque precisamos de CSS/JS proprios junto
# do widget no mesmo arquivo -- mesmo padrao dos graficos de ggiraph do acervo
save_html(tagList(folha_css, widget, nivel_js), file = "widget.html", libdir = "widget_files")
