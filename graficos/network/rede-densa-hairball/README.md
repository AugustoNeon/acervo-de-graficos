---
title: "Rede densa (hairball)"
category: network
date: 2026-07-24
source: "https://www.data-to-viz.com/graph/network.html"
interactive: true
---

## Observações

- Pacote extra usado (além dos já no ambiente): `visNetwork` (widget interativo).
- Ilustra o "erro comum" citado na página original: quando a rede tem muitos nós/conexões sem padrão evidente, o layout vira uma bola de linhas emaranhadas ("hairball") difícil de ler. Rede gerada de propósito assim — `igraph::sample_gnp()` (Erdos-Rényi), 65 nós, sem estrutura de grupo/comunidade.
- Sem labels na versão estática (ilegíveis nessa densidade); cor/tamanho do nó por grau só pra dar alguma leitura de hub.
- `igraph::as_data_frame()` precisa do prefixo `igraph::` explícito — o `dplyr` (carregado via `tidyverse`) mascara a função de mesmo nome (`dplyr::as_data_frame()`), que não aceita o argumento `what=` usado aqui.
- Widget interativo com física ligada e nós arrastáveis, pra permitir "desemaranhar" a rede manualmente — algo impossível na versão estática.
