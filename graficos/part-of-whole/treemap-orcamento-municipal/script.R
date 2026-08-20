# Libraries
library(ggplot2)
library(treemapify)
library(RColorBrewer)
library(jsonlite)

# Dados ficticios: orcamento anual de uma prefeitura ficticia, em milhoes de
# reais, quebrado em 3 niveis -- secretaria > programa > acao. Valores bem
# espalhados (de ~0.9 a ~28 milhoes) de proposito, pro treemap mostrar bem a
# forca dele: comparar area de itens de escalas bem diferentes de uma vez so.
secretarias <- list(
  "Educação" = list(
    "Ensino Fundamental" = c("Merenda escolar" = 12.4, "Reforma de escolas" = 8.1, "Material didático" = 4.3),
    "Ensino Infantil" = c("Creches" = 9.8, "Capacitação de professores" = 3.2)
  ),
  "Saúde" = list(
    "Atenção Básica" = c("Postos de saúde" = 15.6, "Vacinação" = 5.4, "Agentes comunitários" = 6.7),
    "Hospitalar" = c("Pronto-socorro" = 22.3, "UTI" = 18.9)
  ),
  "Infraestrutura" = list(
    "Mobilidade" = c("Asfaltamento" = 17.2, "Ciclovias" = 3.5, "Sinalização" = 2.1),
    "Saneamento" = c("Rede de esgoto" = 14.8, "Drenagem pluvial" = 6.9)
  ),
  "Segurança" = list(
    "Guarda Municipal" = c("Efetivo e viaturas" = 9.1, "Câmeras de monitoramento" = 4.6),
    "Defesa Civil" = c("Prevenção de enchentes" = 5.3, "Treinamento" = 1.8)
  ),
  "Cultura" = list(
    "Equipamentos Culturais" = c("Bibliotecas" = 3.1, "Teatro municipal" = 2.4),
    "Eventos" = c("Festival de inverno" = 1.9, "Feira de artesanato" = 0.9)
  ),
  "Administração" = list(
    "Gestão" = c("Folha de pagamento" = 28.4, "Tecnologia da informação" = 6.2),
    "Planejamento" = c("Consultoria e projetos" = 3.7)
  )
)

linhas <- do.call(rbind, lapply(names(secretarias), function(sec) {
  programas <- secretarias[[sec]]
  do.call(rbind, lapply(names(programas), function(prog) {
    acoes <- programas[[prog]]
    data.frame(secretaria = sec, programa = prog, acao = names(acoes), valor = unname(acoes))
  }))
}))

# Uma cor por secretaria, fixa em toda a hierarquia (programa/acao herdam a
# cor da secretaria-mae) -- "Set3" ainda nao usada em nenhum outro grafico
# do acervo.
paleta_secretarias <- setNames(brewer.pal(6, "Set3"), names(secretarias))

# ---------------------------------------------------------------------------
# Estatico: treemap com os 3 niveis de uma vez -- preenchimento por
# secretaria, borda grossa separando secretaria, borda fina separando
# programa, rotulo so nas acoes (folhas).
# ---------------------------------------------------------------------------
p <- ggplot(linhas, aes(area = valor, fill = secretaria, subgroup = secretaria, subgroup2 = programa, label = acao)) +
  geom_treemap(color = "white") +
  geom_treemap_subgroup_border(color = "white", linewidth = 2.2) +
  geom_treemap_subgroup2_border(color = "white", linewidth = 0.8) +
  geom_treemap_subgroup_text(color = "#2b2b2b", fontface = "bold", alpha = 0.55, place = "topleft", grow = FALSE, min.size = 0) +
  geom_treemap_text(color = "#2b2b2b", place = "bottomright", grow = FALSE, reflow = TRUE, size = 9) +
  scale_fill_manual(values = paleta_secretarias, guide = "none") +
  theme_minimal(base_size = 10)

ggsave("output.png", plot = p, width = 10, height = 6.5, dpi = 150)

# ---------------------------------------------------------------------------
# Versao interativa: D3, treemap com zoom (clique numa secretaria pra ver os
# programas dela, clique num programa pra ver as acoes, breadcrumb pra
# voltar) -- o R so exporta a arvore aninhada bruta; o D3 calcula o layout
# do treemap inteiro sozinho (nao existe um layout de treemap pronto vindo
# do R nesta versao).
# ---------------------------------------------------------------------------
construir_arvore <- function() {
  list(
    nome = "Orçamento",
    filhos = lapply(names(secretarias), function(sec) {
      programas <- secretarias[[sec]]
      list(
        nome = sec,
        filhos = lapply(names(programas), function(prog) {
          acoes <- programas[[prog]]
          list(
            nome = prog,
            filhos = lapply(names(acoes), function(ac) {
              list(nome = ac, valor = unname(acoes[[ac]]))
            })
          )
        })
      )
    })
  )
}

viz <- list(
  meta = list(
    paletaSecretarias = as.list(paleta_secretarias),
    nota = "Clique numa secretaria pra ver os programas, e num programa pra ver as ações. Use o caminho acima pra voltar."
  ),
  arvore = construir_arvore()
)

write_json(viz, "data.json", auto_unbox = TRUE, digits = NA)
