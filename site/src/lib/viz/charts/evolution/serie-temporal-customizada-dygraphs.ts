/**
 * Série temporal customizada — versão interativa.
 *
 * O widget dygraphs original combinava três controles prontos (seletor de
 * intervalo, média móvel, crosshair). Nenhum deles tem embutido no D3, então
 * os três são recalculados aqui: um segundo painel em miniatura com
 * `d3.brushX()` faz o recorte de intervalo, um `<input type="range">` HTML
 * recalcula a média móvel em JS a cada mudança, e o crosshair é um
 * bisector comum sobre a série (suavizada ou não) atualmente visível.
 */

import { select, scaleUtc, scaleLinear, area, line, axisBottom, axisLeft, bisector, pointer, brushX, type ScaleTime, type Selection } from 'd3';
import { DURATION, EASE_ENTER, garantirEstadoFinal } from '../../motion';
import type { DrawContext, VizChart } from '../../types';

interface Ponto {
  data: string;
  valor: number;
}

interface Dados {
  meta: { cor: string; unidade: string; rollInicial: number; rollMax: number; nota?: string };
  serie: Ponto[];
}

interface PontoLido {
  data: Date;
  valor: number;
}

const VB_W = 900;
const MARGEM = { esq: 50, dir: 20 };
const FOCO_TOPO = 26;
const FOCO_ALTURA = 300;
const FOCO_EIXO = 24;
const GAP = 22;
const CTX_ALTURA = 64;
const CTX_EIXO = 22;
const CTX_TOPO = FOCO_TOPO + FOCO_ALTURA + FOCO_EIXO + GAP;
const VB_H = CTX_TOPO + CTX_ALTURA + CTX_EIXO + 10;

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Série temporal: downloads diários de um app fictício ao longo de 300 dias, com faixa ' +
    'de seleção de intervalo, média móvel ajustável e leitura ponto a ponto.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, serie } = data as Dados;
    const bruta: PontoLido[] = serie.map((d) => ({ data: new Date(d.data), valor: d.valor }));

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const dominioX: [number, number] = [+bruta[0].data, +bruta[bruta.length - 1].data];
    const dominioY: [number, number] = [0, Math.max(...bruta.map((d) => d.valor)) * 1.04];

    // Domínio Y fica fixo mesmo com zoom no eixo X — dygraphs reescala o eixo
    // vertical ao recortar um intervalo, mas manter fixo evita que a curva
    // "pule" de forma e continua batendo com o output.png, que mostra a
    // série inteira.
    const xBase = scaleUtc().domain(dominioX).range([0, larguraUtil]);
    const yFoco = scaleLinear().domain(dominioY).range([FOCO_ALTURA, 0]);
    const yCtx = scaleLinear().domain(dominioY).range([CTX_ALTURA, 0]);

    let xFoco = xBase.copy();

    const svg = select(root)
      .append('svg')
      .attr('viewBox', `0 0 ${VB_W} ${VB_H}`)
      .attr('aria-hidden', 'true');

    const formatarTick = (d: Date) =>
      d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' });

    // ------------------------------------------------------------- média móvel
    // Janela à direita (trailing), com janela crescente no início da série —
    // mesmo comportamento do dyRoller: nunca descarta as primeiras observações.
    const suavizar = (pts: PontoLido[], janela: number): PontoLido[] => {
      if (janela <= 1) return pts;
      let soma = 0;
      return pts.map((d, i) => {
        soma += d.valor;
        if (i >= janela) soma -= pts[i - janela].valor;
        const n = Math.min(i + 1, janela);
        return { data: d.data, valor: soma / n };
      });
    };

    let janelaAtual = meta.rollInicial;
    let suave = suavizar(bruta, janelaAtual);

    // -------------------------------------------------------------- painel foco
    const gFoco = svg.append('g').attr('transform', `translate(${MARGEM.esq},${FOCO_TOPO})`);

    const gradeYSel = gFoco.append('g');
    const gradeXSel = gFoco.append('g').attr('transform', `translate(0,${FOCO_ALTURA})`);
    const estilarGrade = (sel: Selection<SVGGElement, unknown, null, undefined>) => {
      sel.select('.domain').remove();
      sel.selectAll('.tick line').attr('stroke', theme.border).attr('stroke-opacity', 0.6);
    };
    estilarGrade(gradeYSel.call(axisLeft(yFoco).ticks(5).tickSize(-larguraUtil).tickFormat(() => '')));
    estilarGrade(gradeXSel.call(axisBottom(xFoco).ticks(6).tickSize(-FOCO_ALTURA).tickFormat(() => '')));

    const clipId = `serie-temporal-clip-${Math.random().toString(36).slice(2)}`;
    svg
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('width', larguraUtil)
      .attr('height', FOCO_ALTURA);

    const gDados = gFoco.append('g').attr('clip-path', `url(#${clipId})`);

    const areaFoco = area<PontoLido>()
      .x((d) => xFoco(d.data))
      .y0(FOCO_ALTURA)
      .y1((d) => yFoco(d.valor));
    const linhaFoco = line<PontoLido>()
      .x((d) => xFoco(d.data))
      .y((d) => yFoco(d.valor));

    const areaSel = gDados.append('path').attr('fill', meta.cor).attr('fill-opacity', 0.15);
    const linhaSel = gDados
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', meta.cor)
      .attr('stroke-width', px(2));

    const eixoXFocoSel = gFoco.append('g').attr('transform', `translate(0,${FOCO_ALTURA})`);
    const eixoYFocoSel = gFoco.append('g');
    const estilarEixo = (sel: Selection<SVGGElement, unknown, null, undefined>) => {
      sel.select('.domain').attr('stroke', theme.border);
      sel.selectAll('.tick line').attr('stroke', theme.border);
      sel.selectAll('text').attr('fill', theme.inkMuted).attr('font-family', theme.fontMono).attr('font-size', px(11));
    };

    // Crosshair + ponto ativo: leitura data/valor sob o cursor.
    const crosshair = gFoco
      .append('line')
      .attr('y1', 0)
      .attr('y2', FOCO_ALTURA)
      .attr('stroke', theme.ink)
      .attr('stroke-width', px(1))
      .attr('stroke-dasharray', `${px(3)} ${px(3)}`)
      .attr('opacity', 0)
      .attr('pointer-events', 'none');
    const pontoAtivo = gFoco
      .append('circle')
      .attr('r', px(4.5))
      .attr('fill', theme.bg)
      .attr('stroke', meta.cor)
      .attr('stroke-width', px(2))
      .attr('opacity', 0)
      .attr('pointer-events', 'none');

    const acharPonto = bisector<PontoLido, Date>((d) => d.data).left;
    const rotuloData = (d: Date) =>
      d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

    const overlayFoco = gFoco
      .append('rect')
      .attr('width', larguraUtil)
      .attr('height', FOCO_ALTURA)
      .attr('fill', 'transparent')
      .attr('data-interactive', '')
      .on('pointermove', (evento: PointerEvent) => {
        const [mx] = pointer(evento, gFoco.node());
        const alvo = xFoco.invert(mx);
        const i = Math.min(suave.length - 1, Math.max(0, acharPonto(suave, alvo)));
        const d = suave[i];
        if (!d) return;
        crosshair.attr('x1', xFoco(d.data)).attr('x2', xFoco(d.data)).attr('opacity', 0.5);
        pontoAtivo.attr('cx', xFoco(d.data)).attr('cy', yFoco(d.valor)).attr('opacity', 1);
        tooltip.show(
          `${rotuloData(d.data)}<br><strong>${Math.round(d.valor)}</strong> ${meta.unidade}` +
            (janelaAtual > 1 ? `<br><span style="opacity:.75">média de ${janelaAtual} dias</span>` : ''),
          evento
        );
      })
      .on('pointerleave', () => {
        crosshair.attr('opacity', 0);
        pontoAtivo.attr('opacity', 0);
        tooltip.hide();
      });

    // ------------------------------------------------------------ painel contexto
    const gCtx = svg.append('g').attr('transform', `translate(${MARGEM.esq},${CTX_TOPO})`);
    gCtx
      .append('path')
      .datum(bruta)
      .attr(
        'd',
        area<PontoLido>()
          .x((d) => xBase(d.data))
          .y0(CTX_ALTURA)
          .y1((d) => yCtx(d.valor))
      )
      .attr('fill', meta.cor)
      .attr('fill-opacity', 0.25);
    gCtx
      .append('path')
      .datum(bruta)
      .attr(
        'd',
        line<PontoLido>()
          .x((d) => xBase(d.data))
          .y((d) => yCtx(d.valor))
      )
      .attr('fill', 'none')
      .attr('stroke', meta.cor)
      .attr('stroke-width', px(1));

    const eixoXCtxSel = gCtx.append('g').attr('transform', `translate(0,${CTX_ALTURA})`);
    estilarEixo(eixoXCtxSel.call(axisBottom(xBase).ticks(6).tickSizeOuter(0).tickFormat(formatarTick)));

    // ----------------------------------------------------------------- brush
    const brush = brushX<unknown>()
      .extent([
        [0, 0],
        [larguraUtil, CTX_ALTURA],
      ])
      .on('brush end', (evento) => {
        const selecao = (evento.selection as [number, number] | null) ?? [0, larguraUtil];
        xFoco = xBase.copy().domain([xBase.invert(selecao[0]), xBase.invert(selecao[1])]);
        redesenharFoco();
      });

    const gBrush = gCtx.append('g').call(brush);
    gBrush.selectAll('.selection').attr('fill', meta.cor).attr('fill-opacity', 0.12).attr('stroke', meta.cor);
    gBrush.selectAll('.handle').attr('fill', meta.cor);

    // Duplo clique no painel principal reseta o recorte pro intervalo inteiro.
    overlayFoco.on('dblclick', () => {
      gBrush.call(brush.move, null);
    });

    function redesenharFoco(): void {
      areaSel.attr('d', areaFoco(suave));
      linhaSel.attr('d', linhaFoco(suave));
      estilarGrade(gradeXSel.call(axisBottom(xFoco).ticks(6).tickSize(-FOCO_ALTURA).tickFormat(() => '')));
      estilarEixo(eixoXFocoSel.call(axisBottom(xFoco).ticks(6).tickSizeOuter(0).tickFormat(formatarTick)));
    }
    estilarEixo(eixoYFocoSel.call(axisLeft(yFoco).ticks(5).tickSizeOuter(0)));
    redesenharFoco();

    // --------------------------------------------------------- controle de média
    const controles = select(root).append('div').attr('class', 'viz-slider');
    controles.append('span').attr('class', 'viz-slider-rotulo').text('Média móvel');
    const saida = controles.append('output').text(`${janelaAtual} ${janelaAtual === 1 ? 'dia' : 'dias'}`);
    controles
      .append('input')
      .attr('type', 'range')
      .attr('min', 1)
      .attr('max', meta.rollMax)
      .attr('step', 1)
      .attr('value', janelaAtual)
      .attr('data-interactive', '')
      .on('input', function () {
        janelaAtual = Number((this as HTMLInputElement).value);
        suave = suavizar(bruta, janelaAtual);
        saida.text(`${janelaAtual} ${janelaAtual === 1 ? 'dia' : 'dias'}`);
        redesenharFoco();
      });

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    // -------------------------------------------------------------- entrada
    if (animate) {
      const comprimento = (linhaSel.node() as SVGPathElement).getTotalLength();
      linhaSel
        .attr('stroke-dasharray', comprimento)
        .attr('stroke-dashoffset', comprimento)
        .transition()
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('stroke-dashoffset', 0);
      areaSel
        .attr('opacity', 0)
        .transition()
        .delay(DURATION.enter * 0.35)
        .duration(DURATION.base)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + 250, () => {
        linhaSel.interrupt().attr('stroke-dasharray', null).attr('stroke-dashoffset', null);
        areaSel.interrupt().attr('opacity', 1);
      });
    }
  },
};

export default chart;
