/**
 * Barplot clássico — cinco variações da mesma família, um switcher só.
 *
 * As 6 barras (uma por gênero) nunca entram/saem entre os 5 estados — só
 * mudam de posição, largura, ordem e eixo. Isso permite usar sempre a MESMA
 * seleção de <rect> com chave estável (`d.genero`), sem join de enter/exit:
 * o D3 só recalcula x/y/width/height a cada clique e transiciona entre os
 * valores antigos e novos. É o mesmo princípio do "object constancy" já usado
 * nos gráficos de rede/dendrograma, aplicado a uma reorganização de layout em
 * vez de uma simulação de força.
 *
 * Cada gênero mantém sua própria cor fixa (`meta.paletaGeneros`) em todos os
 * estados — reforça visualmente que é a MESMA barra se reorganizando, não um
 * gráfico novo a cada clique.
 */

import { select, scaleBand, scaleLinear, axisBottom, axisLeft, type Selection, type Transition } from 'd3';
import { DURATION, EASE_ENTER, EASE_STATE, garantirEstadoFinal, stagger } from '../../motion';
import { estilarEixo } from '../../shared/cartesiano';
import { tornarFixavel } from '../../shared/interacao';
import type { DrawContext, VizChart } from '../../types';

interface Genero {
  genero: string;
  horas: number;
  ouvintes: number;
  desvio: number;
}

interface Dados {
  meta: { paletaGeneros: Record<string, string>; nota?: string };
  generos: string[];
  dados: Genero[];
}

type EstadoId = 'basico' | 'ordenado' | 'horizontal' | 'largura' | 'erro';

interface Geometria {
  x: number;
  y: number;
  width: number;
  height: number;
  horizontal: boolean;
}

const ESTADOS: { id: EstadoId; rotulo: string }[] = [
  { id: 'basico', rotulo: 'Básico' },
  { id: 'ordenado', rotulo: 'Ordenado' },
  { id: 'horizontal', rotulo: 'Horizontal' },
  { id: 'largura', rotulo: 'Largura variável' },
  { id: 'erro', rotulo: 'Com barra de erro' },
];

const VB_W = 900;
const VB_H = 560;
const MARGEM = { topo: 24, dir: 24, baixo: 78, esq: 64 };

const chart: VizChart = {
  aspectRatio: VB_W / VB_H,
  label:
    'Barplot com cinco variações alternáveis: básico, ordenado, horizontal, largura ' +
    'variável e com barra de erro — mostrando horas de audição por gênero musical, uma cor por gênero.',

  draw({ root, data, width, theme, tooltip, animate }: DrawContext) {
    const { meta, generos, dados } = data as Dados;

    const escala = VB_W / Math.max(width, 1);
    const px = (v: number) => v * escala;

    const larguraUtil = VB_W - MARGEM.esq - MARGEM.dir;
    const alturaUtil = VB_H - MARGEM.topo - MARGEM.baixo;

    const porGenero = new Map(dados.map((d) => [d.genero, d]));
    const maxHoras = Math.max(...dados.map((d) => d.horas));
    const maxOuvintes = Math.max(...dados.map((d) => d.ouvintes));

    const ordemBasica = generos;
    const ordemDesc = [...generos].sort((a, b) => porGenero.get(b)!.horas - porGenero.get(a)!.horas);

    const xBand = scaleBand<string>().range([0, larguraUtil]).padding(0.28);
    const yBand = scaleBand<string>().range([0, alturaUtil]).padding(0.28);
    const yLinear = scaleLinear().domain([0, maxHoras * 1.12]).range([alturaUtil, 0]);
    const xLinear = scaleLinear().domain([0, maxHoras * 1.12]).range([0, larguraUtil]);

    const svg = select(root).append('svg').attr('viewBox', `0 0 ${VB_W} ${VB_H}`).attr('aria-hidden', 'true');
    const g = svg.append('g').attr('transform', `translate(${MARGEM.esq},${MARGEM.topo})`);

    const eixoBaixoSel = g.append('g').attr('transform', `translate(0,${alturaUtil})`);
    const eixoEsqSel = g.append('g');
    const gErro = g.append('g').attr('opacity', 0);
    const gBarras = g.append('g');

    let estadoAtual: EstadoId = 'basico';
    const geometriaAtual = new Map<string, Geometria>();

    function conteudoTooltip(d: Genero): string {
      const base = `<strong>${d.genero}</strong><br>${d.horas.toFixed(1)} milhões de horas`;
      if (estadoAtual === 'largura') return `${base}<br>${d.ouvintes.toFixed(1)} milhões de ouvintes ativos`;
      if (estadoAtual === 'erro') return `${base}<br>variação semanal: ± ${d.desvio.toFixed(1)}`;
      return base;
    }

    const rects = gBarras
      .selectAll<SVGRectElement, Genero>('rect')
      .data(dados, (d) => d.genero)
      .join('rect')
      .attr('data-interactive', '')
      .attr('fill', (d) => meta.paletaGeneros[d.genero] ?? theme.primary)
      .attr('rx', px(3))
      .attr('stroke', 'none')
      .on('pointermove', (evento: PointerEvent, d: Genero) => tooltip.show(conteudoTooltip(d), evento))
      .on('pointerleave', () => tooltip.hide());

    // Transição nomeada ("hover"): aplicarEstado() anima x/y/width/height do
    // MESMO <rect> numa transição sem nome — sem nomes distintos, a segunda
    // .transition() cancela a primeira mesmo sem sobrepor os mesmos
    // atributos, e a barra congela a meio caminho do estado.
    function realcarBarra(foco: string) {
      rects
        .transition('hover')
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('x', (d) => geometriaAtual.get(d.genero)?.x ?? 0)
        .attr('y', (d) => {
          const geo = geometriaAtual.get(d.genero);
          if (!geo) return 0;
          return d.genero === foco && !geo.horizontal ? geo.y - px(6) : geo.y;
        })
        .attr('width', (d) => {
          const geo = geometriaAtual.get(d.genero);
          if (!geo) return 0;
          return d.genero === foco && geo.horizontal ? geo.width + px(6) : geo.width;
        })
        .attr('height', (d) => {
          const geo = geometriaAtual.get(d.genero);
          if (!geo) return 0;
          return d.genero === foco && !geo.horizontal ? geo.height + px(6) : geo.height;
        })
        .attr('stroke', (d) => (d.genero === foco ? theme.ink : 'none'))
        .attr('stroke-width', (d) => (d.genero === foco ? px(2) : null));
      rects.filter((d) => d.genero === foco).raise();
    }

    function limparBarras() {
      rects
        .transition('hover')
        .duration(DURATION.fast)
        .ease(EASE_STATE)
        .attr('x', (d) => geometriaAtual.get(d.genero)?.x ?? 0)
        .attr('y', (d) => geometriaAtual.get(d.genero)?.y ?? 0)
        .attr('width', (d) => geometriaAtual.get(d.genero)?.width ?? 0)
        .attr('height', (d) => geometriaAtual.get(d.genero)?.height ?? 0)
        .attr('stroke', 'none');
    }

    tornarFixavel(root, { selecao: rects, chaveDe: (d: Genero) => d.genero }, realcarBarra, limparBarras);

    function posicionarErro(transicao: boolean) {
      const bw = xBand.bandwidth();
      const capW = bw * 0.3;
      const grupos = gErro
        .selectAll<SVGGElement, Genero>('g.whisker')
        .data(dados, (d) => d.genero)
        .join('g')
        .attr('class', 'whisker');

      grupos.each(function (d) {
        const cx = (xBand(d.genero) ?? 0) + bw / 2;
        const yTop = yLinear(d.horas + d.desvio);
        const yBot = yLinear(d.horas - d.desvio);
        const gSel = select(this);
        let vertical = gSel.select<SVGLineElement>('line.vertical');
        let capSup = gSel.select<SVGLineElement>('line.cap-sup');
        let capInf = gSel.select<SVGLineElement>('line.cap-inf');
        if (vertical.empty()) {
          vertical = gSel.append('line').attr('class', 'vertical');
          capSup = gSel.append('line').attr('class', 'cap-sup');
          capInf = gSel.append('line').attr('class', 'cap-inf');
          [vertical, capSup, capInf].forEach((l) =>
            l.attr('stroke', theme.ink).attr('stroke-width', px(1.6)).attr('stroke-linecap', 'round')
          );
        }
        const alvo = (sel: typeof vertical) =>
          transicao ? sel.transition().duration(DURATION.slow).ease(EASE_STATE) : sel;
        alvo(vertical).attr('x1', cx).attr('x2', cx).attr('y1', yTop).attr('y2', yBot);
        alvo(capSup).attr('x1', cx - capW / 2).attr('x2', cx + capW / 2).attr('y1', yTop).attr('y2', yTop);
        alvo(capInf).attr('x1', cx - capW / 2).attr('x2', cx + capW / 2).attr('y1', yBot).attr('y2', yBot);
      });
    }

    function desenharEixos(transicao: boolean, horizontal: boolean) {
      const scaleBaixo = horizontal ? xLinear : xBand;
      const scaleEsq = horizontal ? yBand : yLinear;

      const baixoSel: Selection<SVGGElement, unknown, null, undefined> | Transition<SVGGElement, unknown, null, undefined> =
        transicao ? eixoBaixoSel.transition().duration(DURATION.slow).ease(EASE_STATE) : eixoBaixoSel;
      const esqSel: Selection<SVGGElement, unknown, null, undefined> | Transition<SVGGElement, unknown, null, undefined> =
        transicao ? eixoEsqSel.transition().duration(DURATION.slow).ease(EASE_STATE) : eixoEsqSel;

      baixoSel.call(axisBottom(scaleBaixo as never).tickSizeOuter(0));
      esqSel.call(axisLeft(scaleEsq as never).tickSizeOuter(0));

      estilarEixo(eixoBaixoSel, theme, px);
      estilarEixo(eixoEsqSel, theme, px);

      eixoBaixoSel
        .selectAll('text')
        .attr('transform', horizontal ? null : 'rotate(-30)')
        .attr('text-anchor', horizontal ? 'middle' : 'end')
        .attr('dx', horizontal ? null : '-0.6em')
        .attr('dy', horizontal ? '0.9em' : '0.2em');
    }

    function aplicarEstado(id: EstadoId, transicao: boolean) {
      estadoAtual = id;
      // Cancela qualquer transicao 'hover' (do realce por clique) em voo:
      // nomes diferentes nao se cancelam sozinhos, e as duas mexem em
      // x/y/width/height do mesmo <rect> — sem isso, uma troca de estado
      // logo depois de fixar uma barra podia deixar a geometria presa a
      // meio caminho entre os dois layouts.
      rects.interrupt('hover');
      const horizontal = id === 'horizontal';
      const ordem = id === 'basico' ? ordemBasica : ordemDesc;
      xBand.domain(horizontal ? [] : ordem);
      yBand.domain(horizontal ? ordem : []);

      const alvoDe = (d: Genero): Geometria => {
        if (horizontal) {
          return { x: 0, y: yBand(d.genero) ?? 0, width: xLinear(d.horas), height: yBand.bandwidth(), horizontal };
        }
        const bw = xBand.bandwidth();
        let largura = bw;
        let x = xBand(d.genero) ?? 0;
        if (id === 'largura') {
          largura = Math.max(bw * 0.22, bw * (d.ouvintes / maxOuvintes));
          x = (xBand(d.genero) ?? 0) + (bw - largura) / 2;
        }
        return { x, y: yLinear(d.horas), width: largura, height: alturaUtil - yLinear(d.horas), horizontal };
      };

      dados.forEach((d) => geometriaAtual.set(d.genero, alvoDe(d)));

      const aplicarGeometria = <S extends Selection<SVGRectElement, Genero, SVGGElement, unknown> | Transition<SVGRectElement, Genero, SVGGElement, unknown>>(
        s: S
      ) =>
        s
          .attr('x', (d: Genero) => geometriaAtual.get(d.genero)!.x)
          .attr('y', (d: Genero) => geometriaAtual.get(d.genero)!.y)
          .attr('width', (d: Genero) => geometriaAtual.get(d.genero)!.width)
          .attr('height', (d: Genero) => geometriaAtual.get(d.genero)!.height);

      aplicarGeometria(transicao ? rects.transition().duration(DURATION.slow).ease(EASE_STATE) : rects);

      posicionarErro(transicao);
      const gErroSel = transicao ? gErro.transition().duration(DURATION.base) : gErro;
      gErroSel.attr('opacity', id === 'erro' ? 1 : 0);

      desenharEixos(transicao, horizontal);
      botoes.attr('aria-pressed', (m) => String(m.id === id));
    }

    const controles = select(root).append('div').attr('class', 'viz-controles');
    const botoes = controles
      .selectAll('button')
      .data(ESTADOS)
      .join('button')
      .attr('type', 'button')
      .attr('data-interactive', '')
      .attr('aria-pressed', (m) => String(m.id === estadoAtual))
      .text((m) => m.rotulo)
      .on('click', (_e, m) => {
        if (m.id === estadoAtual) return;
        aplicarEstado(m.id, true);
      });

    // Posiciona tudo no estado final "básico" sem transição — a entrada
    // animada (se houver) parte desse layout, não de um estado intermediário.
    aplicarEstado('basico', false);

    if (meta.nota) {
      select(root).append('p').attr('class', 'viz-nota').text(meta.nota);
    }

    if (animate) {
      const yFinal = (d: Genero) => geometriaAtual.get(d.genero)!.y;
      const alturaFinal = (d: Genero) => geometriaAtual.get(d.genero)!.height;
      rects.attr('y', alturaUtil).attr('height', 0);
      rects
        .transition()
        .delay((_d, i) => stagger(i, dados.length))
        .duration(DURATION.enter)
        .ease(EASE_ENTER)
        .attr('y', yFinal)
        .attr('height', alturaFinal);

      garantirEstadoFinal(DURATION.enter + 250, () => {
        rects.interrupt().attr('y', yFinal).attr('height', alturaFinal);
      });
    }
  },
};

export default chart;
