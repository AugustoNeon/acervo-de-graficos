# Setup do ambiente

> **Escopo**: ambiente de desenvolvimento (R, pacotes, caminhos de instalação). **Leia se**: for rodar/instalar algo em R. **Não use para**: processo de adicionar gráfico (ver [`WORKFLOW.md`](WORKFLOW.md)).

Registro do que já foi instalado/configurado nesta máquina, para não reinstalar à toa em sessões futuras.

## R

Instalado via `winget` em 2026-07-21.

- Pacote winget: `RProject.R` (versão 4.6.1)
- Caminho de instalação real: `C:\Users\augusto.ryba\AppData\Local\Programs\R\R-4.6.1`
- Executáveis:
  - `C:\Users\augusto.ryba\AppData\Local\Programs\R\R-4.6.1\bin\R.exe`
  - `C:\Users\augusto.ryba\AppData\Local\Programs\R\R-4.6.1\bin\Rscript.exe`

> Nota: o instalador do winget não necessariamente adiciona R ao `PATH` do sistema. Se `Rscript` não for reconhecido direto no terminal, use o caminho completo acima, ou rode:
> ```powershell
> $env:PATH += ";C:\Users\augusto.ryba\AppData\Local\Programs\R\R-4.6.1\bin"
> ```

Para checar se ainda está instalado e achar o caminho novamente, caso algo mude:
```powershell
Get-ItemProperty "HKCU:\SOFTWARE\R-core\R64\*" -ErrorAction SilentlyContinue | Select-Object InstallPath
```

## Pacotes R instalados

Instalados via CRAN (`repos = "https://cloud.r-project.org"`):

- `tidyverse` (inclui ggplot2, dplyr, etc.)
- `ggraph`
- `igraph`
- `RColorBrewer`

Comando usado:
```r
install.packages(c("tidyverse","ggraph","igraph","RColorBrewer"), repos="https://cloud.r-project.org")
```

### Instalando pacotes adicionais

Gráficos diferentes no R Graph Gallery podem pedir pacotes extras (ex: `treemapify`, `ggalluvial`, `circlize`, `sf` para mapas, `networkD3`, `viridis`, `patchwork`). Antes de rodar um script novo, olhe os `library(...)` no topo e instale o que faltar:

```r
install.packages("nome_do_pacote", repos="https://cloud.r-project.org")
```

Atualize esta seção com pacotes novos relevantes de uso frequente, se fizer sentido.

## Como rodar um script

```powershell
& "C:\Users\augusto.ryba\AppData\Local\Programs\R\R-4.6.1\bin\Rscript.exe" caminho\para\script.R
```

O script deve salvar a imagem final com `ggsave()` (ou equivalente) dentro da própria pasta do gráfico, como `output.png`.
