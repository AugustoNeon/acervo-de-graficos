/**
 * Índice de sentimento econômico — série temporal interativa.
 *
 * Reproduz o output.png (mesmas 6 séries, mesma paleta) e recria os 4
 * tratamentos de interatividade que a página original mostrava via CSS puro
 * do ggiraph — aqui como 4 modos escolhidos por um seletor, já que
 * "interatividade via CSS, não JS" não é um conceito que existe em D3 (ver
 * README, seção "Como foi feito").
 */

import {
  select,
  scaleUtc,
  scaleLinear,
  line,
  axisBottom,
  axisLeft,
  bisector,
  pointer,
  zoom,
  zoomIdentity,
  type Selection,
  type ScaleTime,
} from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface Ponto {
  pais: string;
  data: string;
  indice: number;
}

interface Dados {
  meta: { paleta: Record<string, string>; nota?: string };
  series: Ponto[];
}

interface PontoLido {
  pais: string;
  data: Date;
  indice: number;
}

type Modo = 1 | 2 | 3 | 4;

const VB_W = 900;
const VB_H = 600;
const MARGEM = { topo: 30, direita: 20, baixo: 40, esq: 46 };
const OPACIDADE_LINHA = 0.85;
const OPACIDADE_APAGADA = 0.12;
const COR_AMARELA = '#ffcf5c';
const COR_SELECAO = '#e63946';
const COR_DESTAQUE = '#2a9d8f';

const MODOS: { id: Modo; rotulo: string }[] = [
  { id: 1, rotulo: '1. Hover simples' },
  { id: 2, rotulo: '2. Destacar + apagar outras' },
  { id: 3, rotulo: '3. Hover avançado' },
  { id: 4, rotulo: '4. Tooltip + zoom' },
];

const chart: VizChart = {
  aspectRatio: 1.5,
  label:
    'Série temporal: índice de sentimento econômico de 6 países da América do Sul ao longo de ' +
    '24 meses, com 4 tratamentos de interatividade escolhidos por um seletor.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, series } = data as Dados;

    const pontos: PontoLido[] = series.map((d) => ({ ...d, data: new Date(d.data) }));
    const porPais = new Map<string, PontoLido[]>();
    pontos.forEach((d) => {
      if (!porPais.has(d.pais)) porPais.set(d.pais, []);
      porPais.get(d.pais)!.push(d);
    });
    const paises = [...porPais.keys()];
    const entradas = [...porPais.entries()];

    // scaleUtc (nao scaleTime): as datas vem do data.json como "AAAA-MM-DD",
    // que o JS parseia como meia-noite UTC -- usar uma escala UTC evita todo
    // um genero de bug de fuso horario (eixo/ticks/format calculando no fuso
    // local do navegador, ver AGENTS.md "Licoes aprendidas" 2026-07-21).
    const x = scaleUtc()
      .domain([Math.min(...pontos.map((d) => +d.data)), Math.max(...pontos.map((d) => +d.data))])
      .range([MARGEM.esq, VB_W - MARGEM.direita]);
    const y = scaleLinear()
      .domain([Math.min(...pontos.map((d) => d.indice)), Math.max(...pontos.map((d) => d.indice))])
      .nice()
      .range([VB_H - MARGEM.baixo, MARGEM.topo]);

    let xAtual = x;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;
    const larguraUtil = VB_W - MARGEM.esq - MARGEM.direita;

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    // Sombra pro modo 3 ("hover avancado").
    svg
      .append('defs')
      .append('filter')
      .attr('id', 'linha-sombra')
      .attr('x', '-40%')
      .attr('y', '-40%')
      .attr('width', '180%')
      .attr('height', '180%')
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('stdDeviation', 3)
      .attr('flood-opacity', 0.5);

    // ---------------------------------------------------------------- grade
    // O output.png usa theme_minimal(), que desenha grade horizontal E
    // vertical (panel.grid.major) -- sem isso a versao D3 fica mais "pelada"
    // que a miniatura estatica.
    const gradeYSel = svg.append('g').attr('transform', `translate(${MARGEM.esq},0)`);
    const gradeXSel = svg.append('g').attr('transform', `translate(0,${VB_H - MARGEM.baixo})`);

    const estilarGrade = (sel: Selection<SVGGElement, unknown, null, undefined>) => {
      sel.select('.domain').remove();
      sel.selectAll('.tick line').attr('stroke', theme.border).attr('stroke-opacity', 0.6);
    };
    estilarGrade(gradeYSel.call(axisLeft(y).ticks(5).tickSize(-larguraUtil).tickFormat(() => '')));
    estilarGrade(gradeXSel.call(axisBottom(x).ticks(6).tickSize(-alturaUtil).tickFormat(() => '')));

    // ---------------------------------------------------------------- eixos
    // tickFormat customizado: o default do d3-axis so tem nomes de mes em
    // ingles (sem locale pt-BR embutido) -- timeZone:'UTC' pelo mesmo motivo
    // do tooltip (as datas sao meia-noite UTC).
    const formatarTick = (d: Date) =>
      d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' });

    const eixoXSel = svg.append('g').attr('transform', `translate(0,${VB_H - MARGEM.baixo})`);
    const eixoYSel = svg.append('g').attr('transform', `translate(${MARGEM.esq},0)`);

    const estilarEixo = (sel: Selection<SVGGElement, unknown, null, undefined>) => {
      sel.select('.domain').attr('stroke', theme.border);
      sel.selectAll('.tick line').attr('stroke', theme.border);
      sel
        .selectAll('text')
        .attr('fill', theme.inkMuted)
        .attr('font-family', theme.fontMono)
        .attr('font-size', px(11));
    };
    estilarEixo(eixoXSel.call(axisBottom(x).ticks(6).tickSizeOuter(0).tickFormat(formatarTick)));
    estilarEixo(eixoYSel.call(axisLeft(y).ticks(5).tickSizeOuter(0)));

    // ---------------------------------------------------------------- linhas
    const gerarLinhaCom = (xEsc: ScaleTime<number, number>) =>
      line<PontoLido>()
        .x((d) => xEsc(d.data))
        .y((d) => y(d.indice));

    const camadaLinhas = svg.append('g').attr('fill', 'none');
    const linhas = camadaLinhas
      .selectAll<SVGPathElement, [string, PontoLido[]]>('path.linha')
      .data(entradas)
      .join('path')
      .attr('class', 'linha')
      .attr('d', ([, pts]) => gerarLinhaCom(x)(pts))
      .attr('stroke', ([pais]) => meta.paleta[pais] ?? theme.accent)
      .attr('stroke-width', px(2.4))
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('opacity', OPACIDADE_LINHA);

    // Faixa invisivel mais larga por cima de cada linha, so pra facilitar o
    // hover -- um traco de 2.4px e um alvo de ponteiro pequeno demais.
    const alvosHover = camadaLinhas
      .selectAll<SVGPathElement, [string, PontoLido[]]>('path.alvo')
      .data(entradas)
      .join('path')
      .attr('class', 'alvo')
      .attr('d', ([, pts]) => gerarLinhaCom(x)(pts))
      .attr('stroke', 'transparent')
      .attr('stroke-width', px(14));

    const camadaPontos = svg.append('g');
    const pontosSel = camadaPontos
      .selectAll<SVGCircleElement, PontoLido>('circle')
      .data(pontos)
      .join('circle')
      .attr('cx', (d) => x(d.data))
      .attr('cy', (d) => y(d.indice))
      .attr('r', px(2.2))
      .attr('fill', (d) => meta.paleta[d.pais] ?? theme.accent)
      .attr('opacity', OPACIDADE_LINHA);

    // Ponto de destaque que acompanha a posicao mais proxima do cursor.
    const pontoAtivo = svg
      .append('circle')
      .attr('r', px(5))
      .attr('fill', theme.bg)
      .attr('stroke-width', px(2.5))
      .attr('opacity', 0)
      .attr('pointer-events', 'none');

    // -------------------------------------------------------------- estado
    let modoAtivo: Modo = 1;
    let selecionadoUnico: string | null = null;
    const selecionadosMultiplos = new Set<string>();

    const linhaDoPais = (pais: string) => linhas.filter(([p]) => p === pais);
    const pontosDoPais = (pais: string) => pontosSel.filter((d) => d.pais === pais);

    const aplicarNeutro = () => {
      linhas
        .interrupt()
        .attr('opacity', OPACIDADE_LINHA)
        .attr('stroke-width', px(2.4))
        .attr('stroke', ([p]) => meta.paleta[p] ?? theme.accent)
        .attr('stroke-dasharray', null)
        .style('filter', null);
      pontosSel.interrupt().attr('opacity', OPACIDADE_LINHA).attr('r', px(2.2)).attr('stroke', 'none');
      pontoAtivo.attr('opacity', 0);
      tooltip.hide();
    };

    // --------------------------------------------------------------- zoom
    // So o modo 4 usa zoom -- a superficie so captura eventos de ponteiro
    // quando esse modo esta ativo, senao bloquearia o hover por linha dos
    // outros 3 modos (ver "Como foi feito" no README).
    const zoomComportamento = zoom<SVGRectElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([
        [MARGEM.esq, 0],
        [VB_W - MARGEM.direita, VB_H],
      ])
      .extent([
        [MARGEM.esq, MARGEM.topo],
        [VB_W - MARGEM.direita, VB_H - MARGEM.baixo],
      ])
      .on('zoom', (evento) => {
        xAtual = evento.transform.rescaleX(x);
        const gerar = gerarLinhaCom(xAtual);
        linhas.attr('d', ([, pts]) => gerar(pts));
        alvosHover.attr('d', ([, pts]) => gerar(pts));
        pontosSel.attr('cx', (d) => xAtual(d.data));
        estilarEixo(eixoXSel.call(axisBottom(xAtual).ticks(6).tickSizeOuter(0).tickFormat(formatarTick)));
        estilarGrade(gradeXSel.call(axisBottom(xAtual).ticks(6).tickSize(-alturaUtil).tickFormat(() => '')));
      });

    const overlayZoom = svg
      .append('rect')
      .attr('x', MARGEM.esq)
      .attr('y', MARGEM.topo)
      .attr('width', larguraUtil)
      .attr('height', alturaUtil)
      .attr('fill', 'transparent')
      .style('pointer-events', 'none')
      .call(zoomComportamento)
      .on('dblclick.zoom', null)
      .on('dblclick', () => {
        overlayZoom.transition().duration(DURATION.base).call(zoomComportamento.transform, zoomIdentity);
      });

    const buscarMaisProximo = bisector<PontoLido, Date>((d) => d.data).left;
    const encontrarMaisProximo = (pts: PontoLido[], dataAlvo: Date) => {
      const i = buscarMaisProximo(pts, dataAlvo, 1);
      const antes = pts[i - 1];
      const depois = pts[i];
      if (!depois) return antes;
      if (!antes) return depois;
      return +dataAlvo - +antes.data < +depois.data - +dataAlvo ? antes : depois;
    };

    const rotuloData = (d: Date) =>
      d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric', timeZone: 'UTC' });

    overlayZoom
      .on('pointermove', (evento: PointerEvent) => {
        if (modoAtivo !== 4) return;
        const [mx, my] = pointer(evento, svg.node());
        const dataAlvo = xAtual.invert(mx);
        let melhor: { pais: string; p: PontoLido; distY: number } | null = null;
        entradas.forEach(([pais, pts]) => {
          const p = encontrarMaisProximo(pts, dataAlvo);
          if (!p) return;
          const distY = Math.abs(y(p.indice) - my);
          if (!melhor || distY < melhor.distY) melhor = { pais, p, distY };
        });
        if (!melhor) return;
        const { pais, p } = melhor as { pais: string; p: PontoLido; distY: number };

        pontosDoPais(pais).attr('r', px(4.5));
        pontosSel.filter((d) => d.pais !== pais).attr('r', px(2.2));

        pontoAtivo
          .attr('cx', xAtual(p.data))
          .attr('cy', y(p.indice))
          .attr('stroke', meta.paleta[pais] ?? theme.accent)
          .attr('opacity', 1);
        tooltip.show(`<strong>${pais}</strong><br>${rotuloData(p.data)}<br>Índice: ${p.indice.toFixed(1)}`, evento);
      })
      .on('pointerleave', () => {
        if (modoAtivo !== 4) return;
        pontosSel.attr('r', px(2.2));
        pontoAtivo.attr('opacity', 0);
        tooltip.hide();
      });

    // -------------------------------------------------------------- hover
    const conteudoTooltip = (pais: string, p: PontoLido) =>
      `<strong>${pais}</strong><br>${rotuloData(p.data)}<br>Índice: ${p.indice.toFixed(1)}`;

    alvosHover
      .style('cursor', 'pointer')
      .attr('data-interactive', '')
      .on('pointerenter', (_evento: PointerEvent, [pais]) => {
        if (modoAtivo === 1) {
          if (!selecionadoUnico) linhaDoPais(pais).attr('stroke', COR_AMARELA).attr('stroke-width', px(3.2));
        } else if (modoAtivo === 2) {
          linhas
            .transition()
            .duration(DURATION.fast)
            .ease(EASE_STATE)
            .attr('opacity', ([p]) => (p === pais ? 1 : OPACIDADE_APAGADA))
            .attr('stroke', ([p]) => (p === pais ? COR_DESTAQUE : meta.paleta[p] ?? theme.accent))
            .attr('stroke-width', ([p]) => px(p === pais ? 3.2 : 2.4))
            .style('filter', ([p]) => (p === pais ? null : 'grayscale(80%)'));
          pontosSel
            .transition()
            .duration(DURATION.fast)
            .ease(EASE_STATE)
            .attr('opacity', (d) => (d.pais === pais ? OPACIDADE_LINHA : OPACIDADE_APAGADA));
        } else if (modoAtivo === 3) {
          linhaDoPais(pais)
            .attr('stroke-width', px(3))
            .attr('stroke-dasharray', '7,4')
            .style('filter', 'url(#linha-sombra)');
          pontosDoPais(pais).attr('r', px(4.5)).attr('fill', COR_AMARELA).attr('stroke', theme.ink);
          linhas.filter(([p]) => p !== pais).attr('opacity', OPACIDADE_APAGADA);
        }
      })
      .on('pointermove', (evento: PointerEvent, [pais, pts]) => {
        if (modoAtivo === 4) return; // o overlay de zoom cuida do hover nesse modo
        const [mx] = pointer(evento, svg.node());
        const dataAlvo = x.invert(mx);
        const maisProximo = encontrarMaisProximo(pts, dataAlvo);
        if (!maisProximo) return;

        pontoAtivo
          .attr('cx', x(maisProximo.data))
          .attr('cy', y(maisProximo.indice))
          .attr('stroke', meta.paleta[pais] ?? theme.accent)
          .attr('opacity', 1);
        tooltip.show(conteudoTooltip(pais, maisProximo), evento);
      })
      .on('pointerleave', (_evento: PointerEvent, [pais]) => {
        if (modoAtivo === 4) return;
        if (modoAtivo === 1) {
          if (selecionadoUnico !== pais) linhaDoPais(pais).attr('stroke', meta.paleta[pais] ?? theme.accent).attr('stroke-width', px(2.4));
        } else if (modoAtivo === 2) {
          aplicarNeutro();
        } else if (modoAtivo === 3) {
          linhaDoPais(pais).attr('stroke-width', px(2.4)).attr('stroke-dasharray', null).style('filter', null);
          pontosDoPais(pais).attr('r', px(2.2)).attr('fill', meta.paleta[pais] ?? theme.accent).attr('stroke', 'none');
          linhas.attr('opacity', OPACIDADE_LINHA);
        }
        pontoAtivo.attr('opacity', 0);
        tooltip.hide();
      })
      .on('click', (_evento: PointerEvent, [pais]) => {
        if (modoAtivo === 1) {
          selecionadoUnico = selecionadoUnico === pais ? null : pais;
          aplicarNeutro();
          if (selecionadoUnico) linhaDoPais(selecionadoUnico).attr('stroke', COR_SELECAO).attr('stroke-width', px(3.2));
        }
      });

    // --------------------------------------------------------------- legenda
    const legendaSel = select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(paises)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html(
        (pais) => `<span class="viz-swatch" style="background:${meta.paleta[pais]}"></span>${pais}`
      );

    const realcarViaLegenda = (pais: string | null) => {
      if (modoAtivo !== 2) return;
      if (pais === null) {
        aplicarNeutro();
        return;
      }
      linhas
        .attr('opacity', ([p]) => (p === pais ? 1 : OPACIDADE_APAGADA))
        .attr('stroke', ([p]) => (p === pais ? COR_DESTAQUE : meta.paleta[p] ?? theme.accent))
        .style('filter', ([p]) => (p === pais ? null : 'grayscale(80%)'));
    };

    legendaSel
      .on('pointerenter', (_e, pais) => realcarViaLegenda(pais))
      .on('pointerleave', () => realcarViaLegenda(null))
      .on('focus', (_e, pais) => realcarViaLegenda(pais))
      .on('blur', () => realcarViaLegenda(null))
      .on('click', (_e, pais) => {
        if (modoAtivo !== 4) return;
        if (selecionadosMultiplos.has(pais)) selecionadosMultiplos.delete(pais);
        else selecionadosMultiplos.add(pais);
        legendaSel.style('outline', (p) =>
          selecionadosMultiplos.has(p) ? `2px solid ${meta.paleta[p]}` : null
        );
        if (selecionadosMultiplos.size === 0) {
          aplicarNeutro();
          return;
        }
        linhas
          .attr('opacity', ([p]) => (selecionadosMultiplos.has(p) ? 1 : OPACIDADE_APAGADA))
          .attr('stroke-width', ([p]) => px(selecionadosMultiplos.has(p) ? 3.2 : 2.4));
      });

    // -------------------------------------------------------------- seletor
    const controles = select(root).append('div').attr('class', 'viz-controles');
    const botoesModo = controles
      .selectAll('button')
      .data(MODOS)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .attr('aria-pressed', (m) => String(m.id === modoAtivo))
      .text((m) => m.rotulo)
      .on('click', (_e, m) => {
        if (m.id === modoAtivo) return;
        modoAtivo = m.id;
        selecionadoUnico = null;
        selecionadosMultiplos.clear();
        legendaSel.style('outline', null);
        aplicarNeutro();
        overlayZoom.style('pointer-events', modoAtivo === 4 ? 'all' : 'none');
        if (modoAtivo !== 4) {
          overlayZoom.call(zoomComportamento.transform, zoomIdentity);
        }
        botoesModo.attr('aria-pressed', (mm) => String(mm.id === modoAtivo));
      });

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // --------------------------------------------------------------- entrada
    // Cada linha desenha da esquerda pra direita (dasharray/offset), uma
    // depois da outra -- acompanha a leitura natural de uma serie temporal.
    if (animate) {
      const comprimentos = new Map<string, number>();
      linhas.each(function ([pais]) {
        comprimentos.set(pais, this.getTotalLength());
      });

      linhas
        .attr('stroke-dasharray', ([pais]) => comprimentos.get(pais)!)
        .attr('stroke-dashoffset', ([pais]) => comprimentos.get(pais)!)
        .transition()
        .delay((_d, i) => i * 90)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('stroke-dashoffset', 0);

      pontosSel
        .attr('opacity', 0)
        .transition()
        .delay(DURATION.enter * 0.6)
        .duration(DURATION.base)
        .attr('opacity', OPACIDADE_LINHA);

      garantirEstadoFinal(paises.length * 90 + DURATION.enter + 250, () => {
        linhas.interrupt().attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
        pontosSel.interrupt().attr('opacity', OPACIDADE_LINHA);
      });
    }
  },
};

export default chart;
