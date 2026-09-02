/**
 * Linha do tempo densa: histórico de releases de um software.
 *
 * Terceira entrada da categoria, pensada pra cobrir a lacuna que os outros
 * dois gráficos já documentam nas próprias variações possíveis: a linha de
 * marcos só alterna 2 lados (cabe bem com <20 eventos) e o Gantt gasta uma
 * linha por tarefa — nenhum dos dois aguenta dezenas de eventos discretos
 * sem colidir ou ficar gigante. Aqui a técnica é empacotamento tipo enxame
 * (mesmo princípio de "camada por colisão" da linha-do-tempo-startup-
 * ficticia, generalizado: sem lado fixo vindo do R, a própria densidade
 * local decide quantas camadas cada ponto precisa, recalculado a cada zoom)
 * mais uma faixa de contexto com `d3.brushX()` pra selecionar o intervalo —
 * mesmo padrão de foco+contexto já usado na série temporal com dygraphs.
 */

import { select, scaleUtc, axisBottom, brushX, type Selection, type Transition } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo, formatarDataUtc } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Release {
  data: string;
  versao: string;
  tipo: string;
}

interface Dados {
  meta: { cores: Record<string, string> };
  releases: Release[];
}

const VB_W = 900;
const MARGEM = { esq: 30, dir: 30 };
const FOCO_TOPO = 20;
const FOCO_ALTURA = 260;
const FOCO_EIXO = 24;
const GAP = 20;
const CTX_ALTURA = 34;
const CTX_EIXO = 22;
const CTX_TOPO = FOCO_TOPO + FOCO_ALTURA + FOCO_EIXO + GAP;
const VB_H = CTX_TOPO + CTX_ALTURA + CTX_EIXO + 10;

const RAIO = 7; // raio do ponto, em unidades de viewBox (nao px real -- ver nota abaixo)
const PASSO_CAMADA = 17;
const LIMIAR_ROTULOS = 14; // acima desse numero de pontos visiveis, rotulo individual vira ruido

/**
 * Sequência de camadas 0, -1, 1, -2, 2, -3, 3... -- cada ponto tenta a
 * primeira camada cuja última borda direita já ocupada não invade a sua
 * borda esquerda (mesmo princípio do `calcularCamadas` da linha de marcos,
 * mas radial em vez de fixo a um lado: aqui nenhum R decide acima/abaixo,
 * a própria colisão local decide, por isso around zero em vez de só >=0).
 */
function proximaCamadaLivre(ocupacao: Map<number, number>, esquerda: number, direita: number): number {
  for (let passo = 0; ; passo++) {
    const camada = passo % 2 === 0 ? passo / 2 : -((passo + 1) / 2);
    if ((ocupacao.get(camada) ?? -Infinity) <= esquerda) {
      ocupacao.set(camada, direita);
      return camada;
    }
  }
}

function formatarTick(d: Date, spanDias: number): string {
  if (spanDias > 400) return formatarDataUtc(d, { year: 'numeric' });
  if (spanDias > 60) return formatarDataUtc(d, { month: 'short', year: '2-digit' });
  return formatarDataUtc(d, { day: '2-digit', month: 'short' });
}

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Histórico denso de releases de um software fictício entre 2022 e 2024 (53 versões), ' +
    'empacotadas ao longo de uma linha do tempo com uma faixa de zoom pra inspecionar períodos de alta atividade.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, releases } = data as Dados;
    const pontos = releases.map((r) => ({ ...r, dataObj: new Date(r.data) }));
    const chaveDe = (d: (typeof pontos)[number]) => d.versao;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const datas = pontos.map((p) => +p.dataObj);
    const folga = (Math.max(...datas) - Math.min(...datas)) * 0.02;
    const xBase = scaleUtc()
      .domain([new Date(Math.min(...datas) - folga), new Date(Math.max(...datas) + folga)])
      .range([0, larguraUtil]);
    let xFoco = xBase.copy();

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');

    const clipId = `linha-tempo-densa-clip-${Math.random().toString(36).slice(2, 9)}`;
    svg
      .append('clipPath')
      .attr('id', clipId)
      .append('rect')
      .attr('x', 0)
      .attr('y', -FOCO_ALTURA / 2)
      .attr('width', larguraUtil)
      .attr('height', FOCO_ALTURA);

    // -------------------------------------------------------------- foco
    const gFoco = svg.append('g').attr('transform', `translate(${MARGEM.esq},${FOCO_TOPO + FOCO_ALTURA / 2})`);

    const overlayFoco = gFoco
      .append('rect')
      .attr('x', 0)
      .attr('y', -FOCO_ALTURA / 2)
      .attr('width', larguraUtil)
      .attr('height', FOCO_ALTURA)
      .attr('fill', 'transparent')
      .attr('data-interactive', '');

    gFoco
      .append('line')
      .attr('x1', 0)
      .attr('x2', larguraUtil)
      .attr('y1', 0)
      .attr('y2', 0)
      .attr('stroke', theme.border)
      .attr('stroke-width', px(1));

    const eixoXFoco = gFoco.append('g').attr('transform', `translate(0,${FOCO_ALTURA / 2})`);

    const gFocoDados = gFoco.append('g').attr('clip-path', `url(#${clipId})`);

    const circulos = gFocoDados
      .selectAll<SVGCircleElement, (typeof pontos)[number]>('circle')
      .data(pontos, chaveDe)
      .join('circle')
      .attr('r', px(RAIO))
      .attr('fill', (d) => meta.cores[d.tipo])
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1.2))
      .attr('data-interactive', '');

    const rotulos = gFocoDados
      .selectAll<SVGTextElement, (typeof pontos)[number]>('text')
      .data(pontos, chaveDe)
      .join('text')
      .attr('font-family', theme.fontMono)
      .attr('font-size', px(9.5))
      .attr('fill', theme.inkMuted)
      .attr('text-anchor', 'start')
      .attr('dy', '0.32em')
      .text((d) => d.versao);

    function mostrarTooltip(evento: PointerEvent, d: (typeof pontos)[number]) {
      tooltip.show(
        `<span class="viz-swatch" style="background:${meta.cores[d.tipo]}"></span>` +
          `<strong>${d.versao}</strong><br>${d.tipo} · ${formatarDataUtc(d.dataObj, { day: 'numeric', month: 'long', year: 'numeric' })}`,
        evento
      );
    }
    circulos.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());

    // A posição vertical (camada) é só anti-sobreposição, recalculada aqui
    // sempre que o zoom muda -- ao contrário do lado da linha de marcos
    // (decidido uma vez no R), aqui não há "resposta certa" fixa: quantas
    // camadas cabem depende de quantos pontos estão visíveis NO ZOOM ATUAL.
    let rotulosVisiveisAtual = new Set<string>();
    let tipoFixado: string | null = null;

    function empacotar(): Map<string, number> {
      const comX = pontos.map((p) => ({ ...p, xPx: xFoco(p.dataObj) }));
      const visiveis = comX
        .filter((p) => p.xPx >= -RAIO * 3 && p.xPx <= larguraUtil + RAIO * 3)
        .sort((a, b) => a.xPx - b.xPx);

      const ocupacao = new Map<number, number>();
      const camadaPorVersao = new Map<string, number>();
      const meiaLargura = RAIO * 2.3;
      for (const p of visiveis) {
        const camada = proximaCamadaLivre(ocupacao, p.xPx - meiaLargura, p.xPx + meiaLargura);
        camadaPorVersao.set(p.versao, camada);
      }

      rotulosVisiveisAtual = visiveis.length <= LIMIAR_ROTULOS ? new Set(visiveis.map((p) => p.versao)) : new Set();
      return camadaPorVersao;
    }

    function aplicarOpacidades() {
      circulos.attr('opacity', (d) => (tipoFixado && d.tipo !== tipoFixado ? 0.15 : 1));
      rotulos.attr('opacity', (d) => {
        const baseVisivel = rotulosVisiveisAtual.has(d.versao) ? 1 : 0;
        const baseFiltro = tipoFixado && d.tipo !== tipoFixado ? 0.15 : 1;
        return baseVisivel * baseFiltro;
      });
    }

    type Ponto = (typeof pontos)[number];
    let camadaPorVersao = new Map<string, number>();
    const yDe = (d: Ponto) => (camadaPorVersao.get(d.versao) ?? 0) * px(PASSO_CAMADA);

    const aplicarCirculos = <S extends Selection<SVGCircleElement, Ponto, SVGGElement, unknown> | Transition<SVGCircleElement, Ponto, SVGGElement, unknown>>(
      s: S
    ) =>
      s
        .attr('cx', (d: Ponto) => xFoco(d.dataObj))
        .attr('cy', (d: Ponto) => yDe(d));

    const aplicarRotulos = <S extends Selection<SVGTextElement, Ponto, SVGGElement, unknown> | Transition<SVGTextElement, Ponto, SVGGElement, unknown>>(
      s: S
    ) =>
      s
        .attr('x', (d: Ponto) => xFoco(d.dataObj) + px(RAIO * 1.7))
        .attr('y', (d: Ponto) => yDe(d));

    function posicionar(transicao: boolean) {
      camadaPorVersao = empacotar();

      aplicarCirculos(transicao ? circulos.transition().duration(DURATION.base).ease(EASE_STATE) : circulos);
      aplicarRotulos(transicao ? rotulos.transition().duration(DURATION.base).ease(EASE_STATE) : rotulos);

      aplicarOpacidades();

      const spanDias = (xFoco.domain()[1].getTime() - xFoco.domain()[0].getTime()) / 86400000;
      estilarEixo(
        eixoXFoco.call(
          axisBottom(xFoco)
            .ticks(6)
            .tickSizeOuter(0)
            .tickFormat(((d: Date) => formatarTick(d, spanDias)) as never) as never
        ),
        theme,
        px
      );
    }

    // ------------------------------------------------------------- contexto
    // Faixa compacta com TODOS os releases no domínio inteiro, sempre —
    // referência de onde o zoom está e onde ficam os outros aglomerados.
    const gCtx = svg.append('g').attr('transform', `translate(${MARGEM.esq},${CTX_TOPO})`);

    gCtx
      .selectAll<SVGCircleElement, (typeof pontos)[number]>('circle')
      .data(pontos, chaveDe)
      .join('circle')
      .attr('cx', (d) => xBase(d.dataObj))
      .attr('cy', CTX_ALTURA / 2)
      .attr('r', px(2.6))
      .attr('fill', (d) => meta.cores[d.tipo])
      .attr('fill-opacity', 0.8)
      .attr('pointer-events', 'none');

    const eixoXCtx = gCtx.append('g').attr('transform', `translate(0,${CTX_ALTURA})`);
    estilarEixo(
      eixoXCtx.call(axisBottom(xBase).ticks(6).tickSizeOuter(0).tickFormat(((d: Date) => formatarDataUtc(d, { year: 'numeric' })) as never) as never),
      theme,
      px
    );

    // --------------------------------------------------------------- brush
    const brush = brushX<unknown>()
      .extent([
        [0, 0],
        [larguraUtil, CTX_ALTURA],
      ])
      .on('brush end', (evento) => {
        const selecao = (evento.selection as [number, number] | null) ?? [0, larguraUtil];
        if (selecao[1] - selecao[0] < 4) return; // ignora clique acidental sem arrastar
        xFoco = xBase.copy().domain([xBase.invert(selecao[0]), xBase.invert(selecao[1])]);
        posicionar(true);
      });

    const gBrush = gCtx.append('g').call(brush);
    gBrush.selectAll('.selection').attr('fill', theme.ink).attr('fill-opacity', 0.08).attr('stroke', theme.ink);
    gBrush.selectAll('.handle').attr('fill', theme.inkMuted);

    // Duplo clique no painel principal reseta o zoom pro período inteiro —
    // mesmo gesto já usado na série temporal com dygraphs deste acervo.
    overlayFoco.on('dblclick', () => {
      gBrush.call(brush.move, null);
      xFoco = xBase.copy();
      posicionar(true);
    });

    posicionar(false);

    // -------------------------------------------------------------- realce
    // Legenda clicável filtra por TIPO de release (mesmo padrão dos outros
    // dois gráficos da categoria) -- só nos círculos/rótulos, nunca na faixa
    // de contexto (que existe pra mostrar todo o histórico, sem filtro).
    function realcar(tipo: string) {
      tipoFixado = tipo;
      aplicarOpacidades();
      legenda.attr('opacity', (t) => (t === tipo ? 1 : 0.5));
    }
    function limpar() {
      tipoFixado = null;
      aplicarOpacidades();
      legenda.attr('opacity', 1);
    }

    const tipos = Object.keys(meta.cores);
    const legenda = select(root)
      .append('div')
      .attr('class', 'viz-legenda')
      .selectAll('button')
      .data(tipos)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .html((t) => `<span class="viz-swatch" style="background:${meta.cores[t]}"></span>${t}`);

    tornarFixavel(
      root,
      [
        { selecao: circulos, chaveDe: (d: (typeof pontos)[number]) => d.tipo },
        { selecao: legenda, chaveDe: (t: string) => t },
      ],
      realcar,
      limpar
    );

    // -------------------------------------------------------------- entrada
    if (animate) {
      const porX = [...pontos].sort((a, b) => +a.dataObj - +b.dataObj);
      const ordemDe = new Map(porX.map((d, i) => [d.versao, i]));
      const delay = (d: (typeof pontos)[number]) => stagger(ordemDe.get(d.versao) ?? 0, pontos.length);

      circulos.attr('r', 0);
      circulos
        .transition()
        .delay(delay)
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('r', px(RAIO));

      garantirEstadoFinal(DURATION.enter + 250, () => {
        circulos.interrupt().attr('r', px(RAIO));
      });
    }
  },
};

export default chart;
