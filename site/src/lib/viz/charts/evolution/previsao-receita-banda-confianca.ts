/**
 * Linha com banda de confiança: receita realizada e prevista.
 *
 * Primeiro gráfico de `evolution` que trata parte da série como um FATO (o
 * passado, linha sólida) e parte como uma ESTIMATIVA com margem de erro
 * (o futuro, linha tracejada + faixa sombreada) -- os outros gráficos desta
 * categoria tratam todo ponto igual. O R exporta os pontos crus (índice,
 * fase, receita, banda mín/máx, com `null` fora do trecho previsto) e um
 * ponto de emenda repetindo o último mês realizado com banda de largura
 * zero -- o D3 desenha a mesma composição em cima dos mesmos pontos, sem
 * recalcular a banda.
 *
 * A banda exportada pelo R é tratada como a de 95% (±1,96 desvio-padrão,
 * convenção comum em previsão de série temporal) -- o D3 deriva o próprio
 * desvio-padrão implícito (`sigmaDe`) a partir dela e recalcula a banda de
 * 68% (±1 desvio) sob demanda, nunca pedindo um segundo cálculo ao R. Um
 * switcher liga as duas, com a mesma lógica de estado alternável já usada
 * em outros gráficos desta base (ex: `part-of-whole/barplot-agrupado-
 * empilhado`).
 */

import { select, scaleLinear, axisBottom, axisLeft, line, area, curveMonotoneX } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import type { DrawContext, VizChart } from '../../types';

interface Ponto {
  indice: number;
  mes: string;
  fase: 'Realizado' | 'Previsto';
  receita: number;
  bandaMin: number | null;
  bandaMax: number | null;
}

interface Dados {
  meta: { cores: Record<string, string>; corteRealizado: number };
  pontos: Ponto[];
}

const VB_W = 900;
const VB_H = 520;
const MARGEM = { topo: 44, dir: 24, baixo: 36, esq: 68 };

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Linha do tempo de receita mensal: 12 meses de realizado em linha sólida, seguidos de 12 meses de previsão ' +
    'em linha tracejada com uma faixa de intervalo de confiança que se alarga quanto mais distante do presente.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, pontos } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const realizado = pontos.filter((p) => p.fase === 'Realizado');
    const previsto = pontos.filter((p) => p.fase === 'Previsto');

    const x = scaleLinear()
      .domain([1, Math.max(...pontos.map((p) => p.indice))])
      .range([0, larguraUtil]);
    const maxY = Math.max(...pontos.map((p) => p.bandaMax ?? p.receita));
    const minY = Math.min(...pontos.map((p) => p.receita));
    const y = scaleLinear().domain([minY * 0.92, maxY * 1.06]).range([alturaUtil, 0]);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const gGrade = g.append('g');
    gGrade.call(axisLeft(y).ticks(5).tickSize(-larguraUtil).tickFormat(() => ''));
    gGrade.select('.domain').remove();
    gGrade.selectAll('.tick line').attr('stroke', theme.border).attr('stroke-opacity', 0.4);

    const gEixoY = g.append('g');
    gEixoY.call(
      axisLeft(y)
        .ticks(5)
        .tickFormat((v) => `R$ ${Number(v)}mil`)
        .tickSizeOuter(0)
    );
    estilarEixo(gEixoY, theme, px);

    const gEixoX = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    gEixoX.call(
      axisBottom(x)
        .tickValues(pontos.filter((_, i) => i % 3 === 0).map((p) => p.indice))
        .tickFormat((v) => pontos.find((p) => p.indice === v)?.mes ?? '')
        .tickSizeOuter(0)
    );
    estilarEixo(gEixoX, theme, px);

    // ------------------------------------------------------------- banda
    const Z_EXPORTADO = 1.959964; // z de 95% -- convenção da banda que o R exporta
    const NIVEIS = [
      { id: '68', z: 1, rotulo: '68%' },
      { id: '95', z: Z_EXPORTADO, rotulo: '95%' },
    ] as const;
    const sigmaDe = (d: Ponto) =>
      d.bandaMin != null && d.bandaMax != null ? (d.bandaMax - d.bandaMin) / 2 / Z_EXPORTADO : 0;

    function gerarArea(z: number) {
      return area<Ponto>()
        .defined((d) => d.bandaMin != null && d.bandaMax != null)
        .x((d) => x(d.indice))
        .y0((d) => y(d.receita - sigmaDe(d) * z))
        .y1((d) => y(d.receita + sigmaDe(d) * z))
        .curve(curveMonotoneX);
    }

    // O output.png mostra a banda de 95% -- a versão interativa nasce no
    // mesmo nível, o switcher é um jeito de EXPLORAR a partir dali, nunca
    // a leitura padrão diverge da imagem estática.
    let nivelAtual: (typeof NIVEIS)[number] = NIVEIS[1];
    const bandaPath = g
      .append('path')
      .datum(previsto)
      .attr('fill', meta.cores.Previsto)
      .attr('opacity', 0.16)
      .attr('d', gerarArea(nivelAtual.z));

    // -------------------------------------------------------------- hoje
    const indiceCorte = meta.corteRealizado;
    g.append('line')
      .attr('x1', x(indiceCorte))
      .attr('x2', x(indiceCorte))
      .attr('y1', 0)
      .attr('y2', alturaUtil)
      .attr('stroke', theme.inkMuted)
      .attr('stroke-width', px(1))
      .attr('stroke-dasharray', `${px(1.5)},${px(2.5)}`);
    g.append('text')
      .attr('x', x(indiceCorte))
      .attr('y', -px(14))
      .attr('text-anchor', 'middle')
      .attr('font-family', theme.fontBody)
      .attr('font-weight', 700)
      .attr('font-size', px(12))
      .attr('fill', theme.inkMuted)
      .text('hoje');

    // -------------------------------------------------------------- linhas
    const lineGen = line<Ponto>()
      .x((d) => x(d.indice))
      .y((d) => y(d.receita))
      .curve(curveMonotoneX);

    const linhaRealizado = g
      .append('path')
      .datum(realizado)
      .attr('fill', 'none')
      .attr('stroke', meta.cores.Realizado)
      .attr('stroke-width', px(2.6))
      .attr('stroke-linecap', 'round')
      .attr('d', lineGen);

    const linhaPrevisto = g
      .append('path')
      .datum(previsto)
      .attr('fill', 'none')
      .attr('stroke', meta.cores.Previsto)
      .attr('stroke-width', px(2.6))
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', `${px(7)},${px(5)}`)
      .attr('d', lineGen);

    // ------------------------------------------------------------- pontos
    const todos = g
      .selectAll<SVGCircleElement, Ponto>('circle')
      .data(
        pontos.filter((p) => !(p.fase === 'Previsto' && p.indice === indiceCorte)),
        (d) => `${d.fase}-${d.indice}`
      )
      .join('circle')
      .attr('data-interactive', '')
      .attr('cx', (d) => x(d.indice))
      .attr('cy', (d) => y(d.receita))
      .attr('r', px(3.2))
      .attr('fill', (d) => meta.cores[d.fase])
      .attr('stroke', theme.bg)
      .attr('stroke-width', px(1));

    function mostrarTooltip(evento: PointerEvent, d: Ponto) {
      let faixa = '';
      if (d.bandaMin != null && d.bandaMax != null) {
        const sigma = sigmaDe(d);
        const min = (d.receita - sigma * nivelAtual.z).toFixed(1);
        const max = (d.receita + sigma * nivelAtual.z).toFixed(1);
        faixa = `<br>faixa (${nivelAtual.rotulo}): R$ ${min}mil – R$ ${max}mil`;
      }
      tooltip.show(
        `<span class="viz-swatch" style="background:${meta.cores[d.fase]}"></span>` +
          `<strong>${d.mes}</strong> · ${d.fase}<br>R$ ${d.receita}mil${faixa}`,
        evento
      );
    }
    todos.on('pointermove', mostrarTooltip).on('pointerleave', () => tooltip.hide());

    // Switcher de nível de confiança: só a área da banda muda (as duas
    // linhas -- a estimativa central -- ficam paradas), então basta uma
    // transição no próprio `d` do path, sem recriar nada.
    const controlesNivel = select(root).append('div').attr('class', 'viz-controles');
    controlesNivel.append('span').attr('class', 'viz-controles-rotulo').text('Confiança');
    const botoesNivel = controlesNivel
      .selectAll<HTMLButtonElement, (typeof NIVEIS)[number]>('button')
      .data(NIVEIS)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .attr('aria-pressed', (n) => String(n.id === nivelAtual.id))
      .text((n) => n.rotulo)
      .on('click', (_evento, n) => {
        if (n.id === nivelAtual.id) return;
        nivelAtual = n;
        bandaPath.transition().duration(DURATION.base).ease(EASE_STATE).attr('d', gerarArea(n.z));
        botoesNivel.attr('aria-pressed', (m) => String(m.id === n.id));
      });

    if (animate) {
      let clipRectEl: SVGRectElement | null = null;
      const larguraClipFinal = larguraUtil - x(indiceCorte) + px(20);

      [linhaRealizado, linhaPrevisto].forEach((linha, i) => {
        const node = linha.node();
        if (!node) return;
        const comprimento = node.getTotalLength();
        linha.attr('stroke-dasharray', i === 1 ? null : comprimento).attr('stroke-dashoffset', comprimento);
        if (i === 1) {
          // Linha tracejada: preserva o padrão tracejado final, anima só o
          // "crescimento" via clip-path em vez de dasharray (que já está
          // ocupado pelo próprio padrão visual da linha).
          // O <clipPath> usa userSpaceOnUse por padrão: as coordenadas do
          // rect são interpretadas no MESMO sistema de coordenadas de quem
          // referencia o clip-path (o <path> dentro de `g`, já deslocado por
          // `translate(MARGEM.esq, MARGEM.topo)`) -- somar MARGEM.esq aqui
          // de novo deslocaria a janela de corte pra direita do esperado,
          // escondendo o trecho inicial da linha (bug real, pego só depois
          // de inspecionar o `d` do path e comparar com a posição do ponto).
          const clipId = `previsao-clip-${Math.random().toString(36).slice(2, 9)}`;
          const rect = svg
            .append('clipPath')
            .attr('id', clipId)
            .append('rect')
            .attr('x', x(indiceCorte))
            .attr('y', -px(40))
            .attr('width', 0)
            .attr('height', alturaUtil + px(80));
          clipRectEl = rect.node();
          rect
            .transition()
            .delay(DURATION.enter * 0.5)
            .duration(DURATION.enter * 0.7)
            .ease(EASE_ENTER)
            .attr('width', larguraClipFinal);
          linha.attr('clip-path', `url(#${clipId})`);
        } else {
          linha.transition().duration(DURATION.enter).ease(EASE_ENTER).attr('stroke-dashoffset', 0);
        }
      });

      todos.attr('opacity', 0);
      todos
        .transition()
        .delay((d) => (d.fase === 'Realizado' ? DURATION.enter * 0.3 : DURATION.enter * 0.9))
        .duration(DURATION.base)
        .attr('opacity', 1);

      garantirEstadoFinal(DURATION.enter + 400, () => {
        linhaRealizado.interrupt().attr('stroke-dashoffset', 0);
        todos.interrupt().attr('opacity', 1);
        if (clipRectEl) select(clipRectEl).interrupt().attr('width', larguraClipFinal);
      });
    }
  },
};

export default chart;
